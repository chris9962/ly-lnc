import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { startAttempt, submitAttempt } from "@/server/attempts";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { createExam } from "@/server/exams";
import { uploadPaper } from "@/server/papers";
import { getStudentProfile } from "@/server/students";
import { makeUser } from "./helpers";

const TEMPLATE_DIR = path.resolve(__dirname, "../../../template");
const templates = fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".pdf")).sort();

type Session = Awaited<ReturnType<typeof makeUser>>["session"];
let teacher: Session;
let student: Session;
let paperId: number;

const MINUTE = 60_000;
const vn = (y: number, m: number, d: number, h = 8) => Date.UTC(y, m - 1, d, h - 7);

beforeAll(async () => {
  teacher = (await makeUser("teacher", "Cô Hồ Sơ")).session;
  student = (await makeUser("student", "Trò Hồ Sơ", 12)).session;
  // tài khoản có từ đầu 2025 để các kỳ thi giả lập bên dưới đều mở sau ngày tạo
  getDb().update(users).set({ createdAt: Date.UTC(2025, 0, 1) }).where(eq(users.id, student.id)).run();
  const paper = await uploadPaper(teacher, { title: "Đề hồ sơ", grade: 12, folderId: null }, new Uint8Array(fs.readFileSync(path.join(TEMPLATE_DIR, templates[2]))), templates[2]);
  if (!paper.ok) throw new Error(paper.message);
  paperId = paper.id;
}, 60000);

afterEach(() => {
  vi.useRealTimers();
});

function examAt(time: number, title: string, take: boolean, grade: 11 | 12 = 12) {
  vi.setSystemTime(time);
  const created = createExam(teacher, { title, grade, paperId, durationMinutes: 30, startsAt: null, endsAt: time + 60 * MINUTE });
  if (!created.ok) throw new Error(created.message);
  if (!take) return created.id;
  // học sinh vào thi lúc còn ở khối của kỳ thi đó
  const begun = startAttempt({ ...student, grade }, created.id);
  if (!begun.ok) throw new Error(begun.message);
  vi.setSystemTime(time + 10 * MINUTE);
  if (!submitAttempt(student, begun.attemptId).ok) throw new Error("submit");
  return created.id;
}

describe("getStudentProfile", () => {
  it("lấy bài làm theo khối của kỳ thi, mặc định là khối hiện tại, không tách theo năm", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const old11 = examAt(vn(2025, 3, 5), "Khối 11 đã làm", true, 11);
    examAt(vn(2025, 4, 5), "Khối 11 không vào thi", false, 11);
    const taken25 = examAt(vn(2025, 12, 31, 22), "Cuối năm 2025", true);
    const taken26 = examAt(vn(2026, 3, 10), "Giữa kì 2026", true);
    const missed = examAt(vn(2026, 5, 20), "Cuối kì 2026", false);
    vi.setSystemTime(vn(2026, 11, 11));

    const profile = getStudentProfile(teacher, student.id, undefined);
    if (!profile.ok) throw new Error(profile.message);
    expect(profile.student).toMatchObject({ id: student.id, fullName: "Trò Hồ Sơ", grade: 12 });
    expect(profile.grade).toBe(12);
    expect(profile.grades).toEqual([12, 11]);
    expect(profile.entries.map((entry) => [entry.examId, entry.status])).toEqual([
      [missed, "absent"],
      [taken26, "submitted"],
      [taken25, "submitted"],
    ]);
    expect(profile.entries[1]).toMatchObject({ day: "2026-03-10", score: 0, maxScore: 10, format: "thpt" });
    expect(profile.stats).toEqual({
      working: 0,
      absent: 1,
      thpt: { submitted: 2, average: 0, best: 0, scale: 10 },
      vsat: { submitted: 0, average: null, best: null, scale: null },
    });

    // khối cũ: chỉ có bài đã làm, không đếm kỳ thi không vào thi vì không biết học sinh ở khối đó tới khi nào
    const last = getStudentProfile(teacher, student.id, 11);
    if (!last.ok) throw new Error(last.message);
    expect(last.grade).toBe(11);
    expect(last.entries.map((entry) => entry.examId)).toEqual([old11]);
    expect(last.stats.absent).toBe(0);
    // khối học sinh chưa từng có bài thì về khối hiện tại
    expect(getStudentProfile(teacher, student.id, 10)).toMatchObject({ ok: true, grade: 12 });
  });

  it("học sinh không xem được, tài khoản không phải học sinh trả 404", () => {
    expect(getStudentProfile(student, student.id, 12)).toMatchObject({ ok: false, status: 403 });
    expect(getStudentProfile(teacher, teacher.id, 12)).toMatchObject({ ok: false, status: 404 });
    expect(getStudentProfile(teacher, 999999, 12)).toMatchObject({ ok: false, status: 404 });
  });
});
