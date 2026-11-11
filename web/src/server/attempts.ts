import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull, lte, or, type SQL } from "drizzle-orm";
import type { SaveAnswerInput } from "@/lib/attemptForm";
import { fitsShape, type AnswerValue, type PaperFormat, type QuestionShape } from "@/lib/paperLayout";
import { can, type SessionUser } from "@/lib/permissions";
import { maxScore } from "@/lib/scoring";
import { writeAudit } from "./audit";
import { getDb, type Tx } from "./db";
import { attemptAnswers, attempts, examPapers, exams, paperContexts, paperQuestions, papers, users } from "./db/schema";
import { examStatus, type ExamStatus } from "./exams";
import { gradeAttempt, grade as gradeAll, loadAnswers } from "./grading";
import { fail, FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";

// lệch vài giây giữa đồng hồ máy học sinh và máy chủ không làm mất câu vừa chọn sát giờ
const GRACE_MS = 5_000;

type AttemptRow = typeof attempts.$inferSelect;

function finalize(tx: Tx, attempt: AttemptRow, submittedAt: number, actor: SessionUser | null) {
  const result = gradeAttempt(tx, attempt.id, attempt.paperId);
  tx.update(attempts).set({ submittedAt, score: result.score, maxScore: result.max }).where(eq(attempts.id, attempt.id)).run();
  writeAudit(tx, actor, actor ? "attempt.submit" : "attempt.auto_submit", { type: "attempt", id: attempt.id }, { score: result.score, max: result.max });
  return result;
}

// không có tiến trình chạy nền: bài quá hạn được chốt ở lần đầu tiên có người đọc tới
export function finalizeOverdue(tx: Tx, scope: { examId?: number; attemptId?: number; userId?: number }) {
  const now = Date.now();
  const filters: (SQL | undefined)[] = [isNull(attempts.submittedAt), isNotNull(attempts.deadline), lte(attempts.deadline, now - GRACE_MS)];
  if (scope.examId !== undefined) filters.push(eq(attempts.examId, scope.examId));
  if (scope.attemptId !== undefined) filters.push(eq(attempts.id, scope.attemptId));
  if (scope.userId !== undefined) filters.push(eq(attempts.userId, scope.userId));
  for (const attempt of tx.select().from(attempts).where(and(...filters)).all()) finalize(tx, attempt, attempt.deadline!, null);
}

export type MyExam = {
  id: number;
  title: string;
  startsAt: number;
  endsAt: number;
  durationMinutes: number;
  questionCount: number;
  attempt: { id: number; submitted: boolean; deadline: number | null; score: number | null; maxScore: number } | null;
};

export function myExams(user: SessionUser): Result<Record<ExamStatus, MyExam[]>> {
  if (!can(user, "exams.take")) return FORBIDDEN;
  const db = getDb();
  db.transaction((tx) => finalizeOverdue(tx, { userId: user.id }));
  const mine = db.select().from(attempts).where(and(eq(attempts.userId, user.id), isNotNull(attempts.examId))).all();
  const byExam = new Map(mine.map((attempt) => [attempt.examId!, attempt]));
  const rows = db
    .select({ id: exams.id, title: exams.title, startsAt: exams.startsAt, endsAt: exams.endsAt, durationMinutes: exams.durationMinutes, questionCount: papers.questionCount })
    .from(exams)
    .leftJoin(examPapers, eq(examPapers.examId, exams.id))
    .leftJoin(papers, eq(papers.id, examPapers.paperId))
    .where(or(user.grade !== null ? eq(exams.grade, user.grade) : undefined, byExam.size ? inArray(exams.id, [...byExam.keys()]) : undefined))
    .orderBy(asc(exams.startsAt))
    .all();
  const groups: Record<ExamStatus, MyExam[]> = { running: [], upcoming: [], ended: [] };
  const seen = new Set<number>();
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const attempt = byExam.get(row.id);
    const item: MyExam = {
      ...row,
      questionCount: row.questionCount ?? 0,
      attempt: attempt ? { id: attempt.id, submitted: attempt.submittedAt !== null, deadline: attempt.deadline, score: attempt.score, maxScore: attempt.maxScore } : null,
    };
    // bài được mở lại vẫn làm tiếp được dù kỳ thi đã hết giờ
    const status = attempt && !attempt.submittedAt ? "running" : examStatus(row);
    groups[status].push(item);
  }
  groups.ended.reverse();
  return ok(groups);
}

function paperMax(tx: Tx, paperId: number) {
  const paper = tx.select({ scoring: papers.scoring }).from(papers).where(eq(papers.id, paperId)).get()!;
  const shapes = tx.select({ shape: paperQuestions.shape }).from(paperQuestions).where(eq(paperQuestions.paperId, paperId)).all();
  return maxScore(shapes.map((row) => row.shape), paper.scoring);
}

export function startAttempt(user: SessionUser, examId: number): Result<{ attemptId: number }> {
  if (!can(user, "exams.take")) return FORBIDDEN;
  const now = Date.now();
  return getDb().transaction(
    (tx): Result<{ attemptId: number }> => {
      const exam = Number.isInteger(examId) ? tx.select().from(exams).where(eq(exams.id, examId)).get() : undefined;
      const existing = exam && tx.select().from(attempts).where(and(eq(attempts.examId, examId), eq(attempts.userId, user.id))).get();
      if (existing) return ok({ attemptId: existing.id });
      if (!exam || exam.grade !== user.grade) return NOT_FOUND;
      const status = examStatus(exam, now);
      if (status === "upcoming") return fail("Kỳ thi chưa bắt đầu", 400);
      if (status === "ended") return fail("Kỳ thi đã kết thúc", 400);
      const paperId = tx.select({ paperId: examPapers.paperId }).from(examPapers).where(eq(examPapers.examId, examId)).orderBy(asc(examPapers.id)).get()?.paperId;
      if (!paperId) return fail("Kỳ thi chưa có đề", 400);
      const row = tx
        .insert(attempts)
        .values({ examId, paperId, userId: user.id, startedAt: now, deadline: Math.min(now + exam.durationMinutes * 60_000, exam.endsAt), maxScore: paperMax(tx, paperId) })
        .returning({ id: attempts.id })
        .get();
      writeAudit(tx, user, "attempt.start", { type: "attempt", id: row.id }, { examId, paperId });
      return ok({ attemptId: row.id });
    },
    // hai tab cùng bấm vào thi không được tạo hai lượt
    { behavior: "immediate" },
  );
}

export function startPractice(user: SessionUser, paperId: number): Result<{ attemptId: number }> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  return getDb().transaction((tx): Result<{ attemptId: number }> => {
    const paper = Number.isInteger(paperId) ? tx.select().from(papers).where(eq(papers.id, paperId)).get() : undefined;
    if (!paper) return NOT_FOUND;
    if (!paper.questionCount || paper.keyedCount < paper.questionCount) return fail("Đề chưa có đủ đáp án", 400);
    const row = tx
      .insert(attempts)
      .values({ examId: null, paperId, userId: user.id, startedAt: Date.now(), deadline: null, maxScore: paperMax(tx, paperId) })
      .returning({ id: attempts.id })
      .get();
    writeAudit(tx, user, "attempt.start_practice", { type: "attempt", id: row.id }, { paperId });
    return ok({ attemptId: row.id });
  });
}

export type AttemptView = {
  attempt: {
    id: number;
    title: string;
    examId: number | null;
    isPractice: boolean;
    startedAt: number;
    deadline: number | null;
    submittedAt: number | null;
    score: number | null;
    maxScore: number;
    examEndsAt: number | null;
    ownerId: number;
    ownerName: string;
    ownerUsername: string;
    readOnly: boolean;
  };
  paper: { id: number; format: PaperFormat; imageVersion: number };
  questions: { seq: number; label: number | null; shape: QuestionShape; contextSeq: number | null; imageWidth: number; imageHeight: number }[];
  contexts: { seq: number; imageWidth: number; imageHeight: number }[];
  answers: Record<number, AnswerValue | null>;
  review: { keys: Record<number, AnswerValue | null>; marks: Record<number, { points: number; correct: boolean }> } | null;
  now: number;
};

// chủ bài làm luôn xem được; giáo viên xem được bài thi của học sinh nhưng không sửa
function findViewable(tx: Tx, user: SessionUser, attemptId: number) {
  if (!Number.isInteger(attemptId)) return null;
  const attempt = tx.select().from(attempts).where(eq(attempts.id, attemptId)).get();
  if (!attempt) return null;
  if (attempt.userId === user.id) return { attempt, readOnly: false };
  if (attempt.examId !== null && can(user, "exams.manage")) return { attempt, readOnly: true };
  return null;
}

export function getAttemptView(user: SessionUser, attemptId: number): Result<AttemptView> {
  const db = getDb();
  return db.transaction((tx): Result<AttemptView> => {
    const found = findViewable(tx, user, attemptId);
    if (!found) return NOT_FOUND;
    finalizeOverdue(tx, { attemptId });
    const attempt = tx.select().from(attempts).where(eq(attempts.id, attemptId)).get()!;
    const exam = attempt.examId ? tx.select().from(exams).where(eq(exams.id, attempt.examId)).get() : undefined;
    const paper = tx.select().from(papers).where(eq(papers.id, attempt.paperId)).get()!;
    const owner = tx.select({ fullName: users.fullName, username: users.username }).from(users).where(eq(users.id, attempt.userId)).get()!;
    const questions = tx.select().from(paperQuestions).where(eq(paperQuestions.paperId, paper.id)).orderBy(asc(paperQuestions.seq)).all();
    const contexts = tx.select().from(paperContexts).where(eq(paperContexts.paperId, paper.id)).orderBy(asc(paperContexts.seq)).all();
    const answers = loadAnswers(tx, attempt.id);
    const now = Date.now();

    // đáp án chỉ lộ ra khi bài đã nộp và kỳ thi đã kết thúc; thi thử thì xem ngay sau khi nộp
    const submitted = attempt.submittedAt !== null;
    const showKeys = found.readOnly || (submitted && (!exam || now >= exam.endsAt));
    let review: AttemptView["review"] = null;
    if (showKeys && (submitted || found.readOnly)) {
      const graded = gradeAll(questions, answers, paper.scoring);
      review = {
        keys: Object.fromEntries(questions.map((question) => [question.seq, question.answerKey])),
        marks: Object.fromEntries(graded.marks),
      };
    }
    return ok({
      attempt: {
        id: attempt.id,
        title: exam ? exam.title : paper.title,
        examId: attempt.examId,
        isPractice: attempt.examId === null,
        startedAt: attempt.startedAt,
        deadline: attempt.deadline,
        submittedAt: attempt.submittedAt,
        score: attempt.score,
        maxScore: attempt.maxScore,
        examEndsAt: exam?.endsAt ?? null,
        ownerId: attempt.userId,
        ownerName: owner.fullName,
        ownerUsername: owner.username,
        readOnly: found.readOnly,
      },
      paper: { id: paper.id, format: paper.format, imageVersion: paper.imageVersion },
      questions: questions.map(({ seq, label, shape, contextSeq, imageWidth, imageHeight }) => ({ seq, label, shape, contextSeq, imageWidth, imageHeight })),
      contexts: contexts.map(({ seq, imageWidth, imageHeight }) => ({ seq, imageWidth, imageHeight })),
      answers: Object.fromEntries(answers),
      review,
      now,
    });
  });
}

const ownAttempt = (tx: Tx, user: SessionUser, attemptId: number) =>
  Number.isInteger(attemptId) ? tx.select().from(attempts).where(and(eq(attempts.id, attemptId), eq(attempts.userId, user.id))).get() : undefined;

const timeUp = fail("Đã hết giờ làm bài", 409);

export function saveAnswer(user: SessionUser, attemptId: number, input: SaveAnswerInput): Result<{ savedAt: number }> {
  const now = Date.now();
  return getDb().transaction((tx): Result<{ savedAt: number }> => {
    const attempt = ownAttempt(tx, user, attemptId);
    if (!attempt) return NOT_FOUND;
    if (attempt.submittedAt !== null) return fail("Bài đã nộp", 409);
    if (attempt.deadline !== null && now > attempt.deadline + GRACE_MS) {
      finalize(tx, attempt, attempt.deadline, null);
      return timeUp;
    }
    const question = tx
      .select({ shape: paperQuestions.shape })
      .from(paperQuestions)
      .where(and(eq(paperQuestions.paperId, attempt.paperId), eq(paperQuestions.seq, input.seq)))
      .get();
    if (!question) return fail("Câu hỏi không có trong đề", 400);
    if (!fitsShape(question.shape, input.value)) return fail("Câu trả lời không hợp lệ", 400);
    tx.insert(attemptAnswers)
      .values({ attemptId, seq: input.seq, value: input.value, savedAt: now })
      .onConflictDoUpdate({ target: [attemptAnswers.attemptId, attemptAnswers.seq], set: { value: input.value, savedAt: now } })
      .run();
    writeAudit(tx, user, "attempt.answer", { type: "attempt", id: attemptId }, { seq: input.seq, value: input.value });
    return ok({ savedAt: now });
  });
}

export function submitAttempt(user: SessionUser, attemptId: number): Result<{ score: number | null; maxScore: number }> {
  const now = Date.now();
  return getDb().transaction((tx): Result<{ score: number | null; maxScore: number }> => {
    const attempt = ownAttempt(tx, user, attemptId);
    if (!attempt) return NOT_FOUND;
    // bấm nộp hai lần hoặc đồng hồ tự nộp sau khi đã nộp thì trả lại kết quả cũ
    if (attempt.submittedAt !== null) return ok({ score: attempt.score, maxScore: attempt.maxScore });
    const overdue = attempt.deadline !== null && now > attempt.deadline + GRACE_MS;
    const result = finalize(tx, attempt, overdue ? attempt.deadline! : now, overdue ? null : user);
    return ok({ score: result.score, maxScore: result.max });
  });
}
