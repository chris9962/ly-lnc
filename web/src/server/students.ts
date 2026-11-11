import "server-only";
import { and, eq, gte, isNotNull, lt, lte, notInArray } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/permissions";
import type { PaperFormat } from "@/lib/paperLayout";
import { formatStats, vnIsoDate, vnYear, yearBounds, type FormatStats } from "@/lib/yearActivity";
import { finalizeOverdue } from "./attempts";
import { getDb } from "./db";
import { attempts, exams, papers, users } from "./db/schema";
import { FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";

export type StudentEntry = {
  examId: number;
  examTitle: string;
  attemptId: number | null;
  status: "submitted" | "working" | "absent";
  // mốc xếp trên dòng thời gian: lúc vào thi, hoặc lúc kỳ thi mở nếu bỏ lỡ
  at: number;
  day: string;
  submittedAt: number | null;
  score: number | null;
  maxScore: number | null;
  // loại đề của bài làm, kỳ thi bỏ lỡ thì không có
  format: PaperFormat | null;
};

export type StudentProfile = {
  student: { id: number; fullName: string; username: string; grade: number | null; disabled: boolean; mustChangePassword: boolean; createdAt: number };
  year: number;
  years: number[];
  entries: StudentEntry[];
  stats: { working: number; absent: number } & Record<PaperFormat, FormatStats>;
};

export function getStudentProfile(user: SessionUser, id: number, year: number | undefined): Result<StudentProfile> {
  if (!can(user, "students.manage")) return FORBIDDEN;
  const db = getDb();
  const student = Number.isInteger(id) ? db.select().from(users).where(and(eq(users.id, id), eq(users.role, "student"))).get() : undefined;
  if (!student) return NOT_FOUND;
  db.transaction((tx) => finalizeOverdue(tx, { userId: id }));

  const now = Date.now();
  const thisYear = vnYear(now);
  const taken = db
    .select({ attemptId: attempts.id, examId: exams.id, examTitle: exams.title, startedAt: attempts.startedAt, submittedAt: attempts.submittedAt, score: attempts.score, maxScore: attempts.maxScore, format: papers.format })
    .from(attempts)
    .innerJoin(exams, eq(exams.id, attempts.examId))
    .innerJoin(papers, eq(papers.id, attempts.paperId))
    .where(and(eq(attempts.userId, id), isNotNull(attempts.examId)))
    .all();
  const years = [...new Set([thisYear, ...taken.map((row) => vnYear(row.startedAt))])].sort((a, b) => b - a);
  const chosen = year !== undefined && years.includes(year) ? year : thisYear;
  const bounds = yearBounds(chosen);

  const entries: StudentEntry[] = taken
    .filter((row) => row.startedAt >= bounds.from && row.startedAt < bounds.to)
    .map((row) => ({
      examId: row.examId,
      examTitle: row.examTitle,
      attemptId: row.attemptId,
      status: row.submittedAt ? "submitted" : "working",
      at: row.startedAt,
      day: vnIsoDate(row.startedAt),
      submittedAt: row.submittedAt,
      score: row.score,
      maxScore: row.maxScore,
      format: row.format,
    }));

  // bỏ lỡ: kỳ thi của khối hiện tại đã kết thúc, mở sau khi có tài khoản, mà không vào thi
  if (student.grade !== null) {
    const takenIds = taken.map((row) => row.examId);
    const missed = db
      .select({ id: exams.id, title: exams.title, startsAt: exams.startsAt })
      .from(exams)
      .where(
        and(
          eq(exams.grade, student.grade),
          lte(exams.endsAt, now),
          gte(exams.startsAt, Math.max(bounds.from, student.createdAt)),
          lt(exams.startsAt, bounds.to),
          takenIds.length ? notInArray(exams.id, takenIds) : undefined,
        ),
      )
      .all();
    for (const exam of missed) {
      entries.push({ examId: exam.id, examTitle: exam.title, attemptId: null, status: "absent", at: exam.startsAt, day: vnIsoDate(exam.startsAt), submittedAt: null, score: null, maxScore: null, format: null });
    }
  }
  entries.sort((a, b) => b.at - a.at || b.examId - a.examId);

  const scored = entries.filter((entry): entry is StudentEntry & { score: number; maxScore: number } => entry.status === "submitted" && entry.score !== null && entry.maxScore !== null);
  const count = (status: StudentEntry["status"]) => entries.filter((entry) => entry.status === status).length;
  return ok({
    student: { id: student.id, fullName: student.fullName, username: student.username, grade: student.grade, disabled: student.disabled, mustChangePassword: student.mustChangePassword, createdAt: student.createdAt },
    year: chosen,
    years,
    entries,
    stats: { working: count("working"), absent: count("absent"), thpt: formatStats(scored.filter((entry) => entry.format === "thpt")), vsat: formatStats(scored.filter((entry) => entry.format === "vsat")) },
  });
}
