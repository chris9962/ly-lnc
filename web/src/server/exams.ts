import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, like, lte, or, sql, type SQL } from "drizzle-orm";
import type { CreateExamInput, ListExamsQuery } from "@/lib/examForm";
import { scoreBands, type ScoreBands } from "@/lib/examStats";
import { PAGE_SIZE } from "@/lib/paperForm";
import { can, type SessionUser } from "@/lib/permissions";
import { searchKey } from "@/lib/username";
import { finalizeOverdue, paperMax } from "./attempts";
import { writeAudit } from "./audit";
import { getDb, type Reader, type Tx } from "./db";
import { attemptAnswers, attempts, examPapers, exams, papers, users } from "./db/schema";
import { fail, FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";

export type ExamStatus = "upcoming" | "running" | "ended";

export const examStatus = (exam: { startsAt: number; endsAt: number }, now = Date.now()): ExamStatus =>
  now < exam.startsAt ? "upcoming" : now < exam.endsAt ? "running" : "ended";

export type ExamListItem = {
  id: number;
  title: string;
  grade: number;
  startsAt: number;
  endsAt: number;
  durationMinutes: number;
  paperTitle: string | null;
  started: number;
  submitted: number;
  // số bài đã chấm và số bài đạt từ 6,5, từ 8 trên thang 10
  bands: ScoreBands;
  // thang điểm của đề, lấy từ bài làm nên chưa ai vào thi thì chưa có
  maxScore: number | null;
  status: ExamStatus;
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

export function listExams(user: SessionUser, query: ListExamsQuery): Result<{ rows: ExamListItem[]; total: number; page: number; pageSize: number }> {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const db = getDb();
  const now = Date.now();
  const filters: (SQL | undefined)[] = [];
  if (query.grade !== undefined) filters.push(eq(exams.grade, query.grade));
  if (query.status === "upcoming") filters.push(gt(exams.startsAt, now));
  if (query.status === "running") filters.push(and(lte(exams.startsAt, now), gt(exams.endsAt, now)));
  if (query.status === "ended") filters.push(lte(exams.endsAt, now));
  const key = searchKey(query.q);
  if (key) filters.push(like(exams.searchTitle, `%${escapeLike(key)}%`));
  const where = and(...filters);

  const total = db.select({ n: count() }).from(exams).where(where).get()?.n ?? 0;
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const rows = db
    .select({
      id: exams.id,
      title: exams.title,
      grade: exams.grade,
      startsAt: exams.startsAt,
      endsAt: exams.endsAt,
      durationMinutes: exams.durationMinutes,
      paperTitle: sql<string | null>`(select ${sql.raw('"papers"."title"')} from ${sql.raw('"exam_papers" join "papers" on "papers"."id" = "exam_papers"."paper_id"')} where ${sql.raw('"exam_papers"."exam_id" = "exams"."id"')} limit 1)`,
      started: sql<number>`(select count(*) from ${sql.raw('"attempts" where "attempts"."exam_id" = "exams"."id"')})`,
      submitted: sql<number>`(select count(*) from ${sql.raw('"attempts" where "attempts"."exam_id" = "exams"."id" and "attempts"."submitted_at" is not null')})`,
    })
    .from(exams)
    .where(where)
    .orderBy(desc(exams.startsAt), desc(exams.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();
  // điểm của các kỳ thi trong trang lấy bằng một câu hỏi, rồi gom theo kỳ thi
  const scored = rows.length
    ? db
        .select({ examId: attempts.examId, score: attempts.score, maxScore: attempts.maxScore })
        .from(attempts)
        .where(and(inArray(attempts.examId, rows.map((row) => row.id)), isNotNull(attempts.submittedAt), isNotNull(attempts.score)))
        .all()
    : [];
  const byExam = new Map<number, { score: number; maxScore: number }[]>();
  for (const row of scored) byExam.set(row.examId!, [...(byExam.get(row.examId!) ?? []), { score: row.score!, maxScore: row.maxScore }]);
  return ok({ rows: rows.map((row) => ({ ...row, bands: scoreBands(byExam.get(row.id) ?? []), maxScore: byExam.get(row.id)?.[0].maxScore ?? null, status: examStatus(row, now) })), total, page, pageSize: PAGE_SIZE });
}

function checkPaper(tx: Tx, paperId: number): Result {
  const paper = tx.select({ questionCount: papers.questionCount, keyedCount: papers.keyedCount }).from(papers).where(eq(papers.id, paperId)).get();
  if (!paper) return fail("Đề không còn trong ngân hàng", 400, "paperId");
  if (!paper.questionCount || paper.keyedCount < paper.questionCount) return fail("Đề chưa có đủ đáp án", 400, "paperId");
  return ok();
}

function checkTimes(startsAt: number, endsAt: number, now: number): Result {
  if (endsAt <= now) return fail("Giờ kết thúc đã qua", 400, "endTime");
  if (endsAt <= startsAt) return fail("Giờ kết thúc phải sau giờ bắt đầu", 400, "endTime");
  return ok();
}

export function createExam(user: SessionUser, input: CreateExamInput): Result<{ id: number }> {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const now = Date.now();
  const startsAt = input.startsAt ?? now;
  return getDb().transaction((tx): Result<{ id: number }> => {
    const paperCheck = checkPaper(tx, input.paperId);
    if (!paperCheck.ok) return paperCheck;
    const timeCheck = checkTimes(startsAt, input.endsAt, now);
    if (!timeCheck.ok) return timeCheck;
    const row = tx
      .insert(exams)
      .values({ title: input.title, searchTitle: searchKey(input.title), grade: input.grade, startsAt, endsAt: input.endsAt, durationMinutes: input.durationMinutes, answersAt: input.answersAt, createdBy: user.id, createdAt: now })
      .returning({ id: exams.id })
      .get();
    tx.insert(examPapers).values({ examId: row.id, paperId: input.paperId }).run();
    writeAudit(tx, user, "exam.create", { type: "exam", id: row.id }, { ...input, startsAt });
    return ok({ id: row.id });
  });
}

const examPaperId = (tx: Reader, examId: number) => tx.select({ paperId: examPapers.paperId }).from(examPapers).where(eq(examPapers.examId, examId)).orderBy(asc(examPapers.id)).get()?.paperId ?? null;

export function updateExam(user: SessionUser, id: number, input: CreateExamInput): Result {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const now = Date.now();
  return getDb().transaction((tx): Result => {
    const exam = tx.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) return NOT_FOUND;
    const currentPaper = examPaperId(tx, id);
    const hasAttempts = !!tx.select({ id: attempts.id }).from(attempts).where(eq(attempts.examId, id)).get();
    if (input.paperId !== currentPaper) {
      if (hasAttempts) return fail("Đã có học sinh làm bài nên không đổi đề được", 400, "paperId");
      const paperCheck = checkPaper(tx, input.paperId);
      if (!paperCheck.ok) return paperCheck;
    }
    // đã bắt đầu thì giữ giờ bắt đầu cũ khi chọn "thi ngay"
    const startsAt = input.startsAt ?? Math.min(exam.startsAt, now);
    if (input.endsAt <= startsAt) return fail("Giờ kết thúc phải sau giờ bắt đầu", 400, "endTime");
    tx.update(exams).set({ title: input.title, searchTitle: searchKey(input.title), grade: input.grade, startsAt, endsAt: input.endsAt, durationMinutes: input.durationMinutes, answersAt: input.answersAt }).where(eq(exams.id, id)).run();
    if (input.paperId !== currentPaper) tx.update(examPapers).set({ paperId: input.paperId }).where(eq(examPapers.examId, id)).run();
    // gia hạn hay rút ngắn kỳ thi thì bài đang làm phải theo giờ mới
    for (const attempt of tx.select({ id: attempts.id, startedAt: attempts.startedAt }).from(attempts).where(and(eq(attempts.examId, id), isNull(attempts.submittedAt))).all()) {
      tx.update(attempts).set({ deadline: Math.min(attempt.startedAt + input.durationMinutes * 60_000, input.endsAt) }).where(eq(attempts.id, attempt.id)).run();
    }
    writeAudit(tx, user, "exam.update", { type: "exam", id }, { from: { ...exam, paperId: currentPaper }, to: { ...input, startsAt } });
    return ok();
  });
}

export function deleteExam(user: SessionUser, id: number): Result {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  return getDb().transaction((tx): Result => {
    const exam = tx.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) return NOT_FOUND;
    const attemptCount = tx.select({ n: count() }).from(attempts).where(eq(attempts.examId, id)).get()?.n ?? 0;
    writeAudit(tx, user, "exam.delete", { type: "exam", id }, { title: exam.title, attempts: attemptCount });
    tx.delete(exams).where(eq(exams.id, id)).run();
    return ok();
  });
}

export type ExamDetail = typeof exams.$inferSelect & { paperId: number | null; paperTitle: string | null; questionCount: number; maxScore: number | null; status: ExamStatus };

export function getExam(user: SessionUser, id: number): Result<{ exam: ExamDetail }> {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const db = getDb();
  const exam = Number.isInteger(id) ? db.select().from(exams).where(eq(exams.id, id)).get() : undefined;
  if (!exam) return NOT_FOUND;
  const paperId = examPaperId(db, id);
  const paper = paperId ? db.select({ title: papers.title, questionCount: papers.questionCount }).from(papers).where(eq(papers.id, paperId)).get() : undefined;
  const anyAttempt = db.select({ maxScore: attempts.maxScore }).from(attempts).where(eq(attempts.examId, id)).get();
  return ok({ exam: { ...exam, paperId, paperTitle: paper?.title ?? null, questionCount: paper?.questionCount ?? 0, maxScore: anyAttempt?.maxScore ?? (paper && paperId ? paperMax(db, paperId) : null), status: examStatus(exam) } });
}

export type RosterRow = {
  userId: number;
  fullName: string;
  username: string;
  attemptId: number | null;
  status: "absent" | "working" | "submitted";
  startedAt: number | null;
  submittedAt: number | null;
  deadline: number | null;
  score: number | null;
  maxScore: number | null;
  reopenCount: number;
};

// danh sách gồm học sinh của khối và cả học sinh đã làm bài nhưng sau đó chuyển khối
export function examRoster(user: SessionUser, id: number): Result<{ rows: RosterRow[] }> {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const db = getDb();
  const exam = Number.isInteger(id) ? db.select().from(exams).where(eq(exams.id, id)).get() : undefined;
  if (!exam) return NOT_FOUND;
  db.transaction((tx) => finalizeOverdue(tx, { examId: id }));
  const attemptRows = db.select().from(attempts).where(eq(attempts.examId, id)).all();
  const byUser = new Map(attemptRows.map((row) => [row.userId, row]));
  const people = db
    .select({ id: users.id, fullName: users.fullName, username: users.username, searchName: users.searchName })
    .from(users)
    .where(and(eq(users.role, "student"), or(eq(users.grade, exam.grade), attemptRows.length ? inArray(users.id, [...byUser.keys()]) : undefined)))
    .orderBy(asc(users.searchName), asc(users.id))
    .all();
  const rows = people.map((person): RosterRow => {
    const attempt = byUser.get(person.id);
    return {
      userId: person.id,
      fullName: person.fullName,
      username: person.username,
      attemptId: attempt?.id ?? null,
      status: !attempt ? "absent" : attempt.submittedAt ? "submitted" : "working",
      startedAt: attempt?.startedAt ?? null,
      submittedAt: attempt?.submittedAt ?? null,
      deadline: attempt?.deadline ?? null,
      score: attempt?.score ?? null,
      maxScore: attempt?.maxScore ?? null,
      reopenCount: attempt?.reopenCount ?? 0,
    };
  });
  return ok({ rows });
}

// thi lại là làm lại từ đầu: xoá bài cũ, tính lại giờ, hạn nộp không vượt giờ kết thúc kỳ thi
export function retakeAttempt(user: SessionUser, attemptId: number): Result {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const now = Date.now();
  return getDb().transaction((tx): Result => {
    if (!Number.isInteger(attemptId)) return NOT_FOUND;
    finalizeOverdue(tx, { attemptId });
    const attempt = tx.select().from(attempts).where(and(eq(attempts.id, attemptId), isNotNull(attempts.examId))).get();
    const exam = attempt && tx.select().from(exams).where(eq(exams.id, attempt.examId!)).get();
    if (!attempt || !exam) return NOT_FOUND;
    if (attempt.submittedAt === null) return fail("Học sinh chưa nộp bài", 400);
    if (now >= exam.endsAt) return fail("Kỳ thi đã kết thúc", 400);
    tx.delete(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)).run();
    tx.update(attempts)
      .set({ submittedAt: null, score: null, startedAt: now, deadline: Math.min(now + exam.durationMinutes * 60_000, exam.endsAt), reopenCount: attempt.reopenCount + 1 })
      .where(eq(attempts.id, attemptId))
      .run();
    writeAudit(tx, user, "attempt.retake", { type: "attempt", id: attemptId }, { previousScore: attempt.score, userId: attempt.userId });
    return ok();
  });
}
