import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { attemptStatus, getAttemptView, myExams, saveAnswer, startAttempt, startPractice, submitAttempt } from "@/server/attempts";
import { getDb } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { createExam, deleteExam, examRoster, getExam, listExams, retakeAttempt, updateExam } from "@/server/exams";
import { deletePaper, getPaper, paperImage, savePaperLayout, uploadPaper } from "@/server/papers";
import { auditActions, makeUser } from "./helpers";

const TEMPLATE_DIR = path.resolve(__dirname, "../../../template");
const templates = fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".pdf")).sort();
const pdf = (index: number) => new Uint8Array(fs.readFileSync(path.join(TEMPLATE_DIR, templates[index])));

type Session = Awaited<ReturnType<typeof makeUser>>["session"];
let teacher: Session;
let student: Session;
let other: Session;
let classmate: Session;
let keyedPaper: number;
let blankPaper: number;

const MINUTE = 60_000;
const at = (time: number) => vi.setSystemTime(time);

beforeAll(async () => {
  teacher = (await makeUser("teacher", "Thầy Bình")).session;
  student = (await makeUser("student", "Trò Giỏi", 12)).session;
  other = (await makeUser("student", "Trò Khối Khác", 10)).session;
  classmate = (await makeUser("student", "Trò Cùng Lớp", 12)).session;
  const keyed = await uploadPaper(teacher, { title: "Ôn tập chương 1", grade: 12, folderId: null }, pdf(2), templates[2]);
  const blank = await uploadPaper(teacher, { title: "VSAT chưa đáp án", grade: 12, folderId: null }, pdf(3), templates[3]);
  if (!keyed.ok || !blank.ok) throw new Error("upload");
  keyedPaper = keyed.id;
  blankPaper = blank.id;
}, 60000);

afterEach(() => {
  vi.useRealTimers();
});

const exam = (extra: Partial<Parameters<typeof createExam>[1]> = {}) =>
  createExam(teacher, { title: "Kiểm tra chương 1", grade: 12, paperId: keyedPaper, durationMinutes: 45, startsAt: null, endsAt: Date.now() + 120 * MINUTE, answersAt: "end", ...extra });

describe("createExam", () => {
  it("đề chưa đủ đáp án thì không tạo được kỳ thi", () => {
    expect(exam({ paperId: blankPaper })).toMatchObject({ ok: false, status: 400, field: "paperId" });
    expect(exam({ paperId: 999999 })).toMatchObject({ ok: false, status: 400, field: "paperId" });
  });

  it("giờ kết thúc đã qua thì báo lỗi", () => {
    expect(exam({ endsAt: Date.now() - MINUTE })).toMatchObject({ ok: false, field: "endTime" });
  });

  it("học sinh không tạo được kỳ thi", () => {
    expect(createExam(student, { title: "x", grade: 12, paperId: keyedPaper, durationMinutes: 10, startsAt: null, endsAt: Date.now() + MINUTE, answersAt: "end" })).toMatchObject({ status: 403 });
  });
});

describe("làm bài", () => {
  it("học sinh đúng khối vào thi, tự lưu, nộp bài, thấy điểm ngay, đáp án sau khi kết thúc", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.UTC(2026, 10, 12, 1, 0);
    at(start);
    const created = exam({ endsAt: start + 60 * MINUTE });
    if (!created.ok) throw new Error(created.message);

    const list = myExams(student);
    expect(list.ok && list.running.map((item) => item.id)).toEqual([created.id]);
    expect(myExams(other)).toMatchObject({ ok: true, running: [] });
    expect(startAttempt(other, created.id)).toMatchObject({ ok: false, status: 404 });

    at(start + 30 * MINUTE);
    const begun = startAttempt(student, created.id);
    if (!begun.ok) throw new Error(begun.message);
    // hạn nộp không vượt giờ kết thúc kỳ thi
    let view = getAttemptView(student, begun.attemptId);
    if (!view.ok) throw new Error(view.message);
    expect(view.attempt.deadline).toBe(start + 60 * MINUTE);
    expect(view.questions).toHaveLength(28);
    expect(JSON.stringify(view)).not.toContain("answerKey");
    expect(view.review).toBeNull();
    expect(startAttempt(student, created.id)).toMatchObject({ ok: true, attemptId: begun.attemptId });

    expect(saveAnswer(student, begun.attemptId, { seq: 1, value: "D" }).ok).toBe(true);
    expect(saveAnswer(student, begun.attemptId, { seq: 2, value: "A" }).ok).toBe(true);
    expect(saveAnswer(student, begun.attemptId, { seq: 19, value: ["S", "Đ", "S", "Đ"] }).ok).toBe(true);
    expect(saveAnswer(student, begun.attemptId, { seq: 26, value: "19.1" }).ok).toBe(true);
    expect(saveAnswer(student, begun.attemptId, { seq: 1, value: "Z" })).toMatchObject({ ok: false, status: 400 });
    expect(saveAnswer(student, begun.attemptId, { seq: 99, value: "A" })).toMatchObject({ ok: false, status: 400 });
    expect(saveAnswer(other, begun.attemptId, { seq: 1, value: "A" })).toMatchObject({ ok: false, status: 404 });

    const submitted = submitAttempt(student, begun.attemptId);
    expect(submitted).toMatchObject({ ok: true, score: 1.5, maxScore: 10 });
    expect(saveAnswer(student, begun.attemptId, { seq: 3, value: "A" })).toMatchObject({ ok: false, status: 409 });
    view = getAttemptView(student, begun.attemptId);
    if (!view.ok) throw new Error();
    expect(view.attempt.score).toBe(1.5);
    expect(view.review).toBeNull();

    at(start + 61 * MINUTE);
    view = getAttemptView(student, begun.attemptId);
    if (!view.ok) throw new Error();
    expect(view.review?.keys[1]).toBe("D");
    expect(view.review?.marks[2]).toEqual({ points: 0, correct: false });
    expect(auditActions(begun.attemptId)).toEqual(expect.arrayContaining(["attempt.start", "attempt.answer", "attempt.submit"]));
  });

  it("kỳ thi cho xem đáp án sau khi nộp thì học sinh thấy đáp án ngay, đổi lại thì phải chờ kỳ thi kết thúc", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.UTC(2026, 10, 16, 1, 0);
    at(start);
    const input = { title: "Xem đáp án sớm", grade: 12 as const, paperId: keyedPaper, durationMinutes: 45, startsAt: null, endsAt: start + 60 * MINUTE };
    const created = createExam(teacher, { ...input, answersAt: "submit" });
    if (!created.ok) throw new Error(created.message);
    const begun = startAttempt(classmate, created.id);
    if (!begun.ok) throw new Error(begun.message);
    expect(saveAnswer(classmate, begun.attemptId, { seq: 1, value: "D" }).ok).toBe(true);
    // đang làm thì chưa lộ đáp án
    expect(getAttemptView(classmate, begun.attemptId)).toMatchObject({ ok: true, review: null });

    at(start + 5 * MINUTE);
    expect(submitAttempt(classmate, begun.attemptId).ok).toBe(true);
    const view = getAttemptView(classmate, begun.attemptId);
    if (!view.ok) throw new Error(view.message);
    expect(view.attempt.answersAt).toBe("submit");
    expect(view.review?.keys[1]).toBe("D");

    expect(updateExam(teacher, created.id, { ...input, answersAt: "end" })).toEqual({ ok: true });
    expect(getAttemptView(classmate, begun.attemptId)).toMatchObject({ ok: true, review: null });
  });

  it("hết giờ thì máy chủ tự nộp, giáo viên cho thi lại khi kỳ thi còn mở", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.UTC(2026, 10, 13, 1, 0);
    at(start);
    const created = exam({ durationMinutes: 10, endsAt: start + 120 * MINUTE });
    if (!created.ok) throw new Error(created.message);
    const begun = startAttempt(student, created.id);
    if (!begun.ok) throw new Error(begun.message);
    saveAnswer(student, begun.attemptId, { seq: 1, value: "D" });

    at(start + 11 * MINUTE);
    expect(saveAnswer(student, begun.attemptId, { seq: 2, value: "C" })).toMatchObject({ ok: false, status: 409 });
    const roster = examRoster(teacher, created.id);
    if (!roster.ok) throw new Error();
    expect(roster.rows.find((row) => row.userId === student.id)).toMatchObject({ status: "submitted", score: 0.25 });
    expect(auditActions(begun.attemptId)).toContain("attempt.auto_submit");

    // cho thi lại: làm lại từ đầu, đủ thời gian làm bài, bài cũ bị xoá
    expect(retakeAttempt(student, begun.attemptId)).toMatchObject({ status: 403 });
    expect(retakeAttempt(teacher, begun.attemptId).ok).toBe(true);
    const view = getAttemptView(student, begun.attemptId);
    if (!view.ok) throw new Error();
    expect(view.attempt).toMatchObject({ submittedAt: null, startedAt: start + 11 * MINUTE, deadline: start + 21 * MINUTE });
    expect(view.answers[1]).toBeUndefined();
    expect(saveAnswer(student, begun.attemptId, { seq: 2, value: "C" }).ok).toBe(true);
    // bài đang làm thì không cho thi lại
    expect(retakeAttempt(teacher, begun.attemptId)).toMatchObject({ ok: false, status: 400 });

    // sát giờ kết thúc thì hạn nộp không vượt giờ kết thúc kỳ thi
    at(start + 22 * MINUTE);
    examRoster(teacher, created.id);
    at(start + 115 * MINUTE);
    expect(retakeAttempt(teacher, begun.attemptId).ok).toBe(true);
    const late = getAttemptView(student, begun.attemptId);
    expect(late.ok && late.attempt.deadline).toBe(start + 120 * MINUTE);

    // kỳ thi kết thúc rồi thì không cho thi lại
    at(start + 121 * MINUTE);
    examRoster(teacher, created.id);
    expect(retakeAttempt(teacher, begun.attemptId)).toMatchObject({ ok: false, status: 400 });
  });

  it("gia hạn kỳ thi dời hạn nộp của bài đang làm, bài đã nộp giữ nguyên", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.UTC(2026, 10, 14, 1, 0);
    at(start);
    const base = { title: "Gia hạn", grade: 12 as const, paperId: keyedPaper, durationMinutes: 60, startsAt: null, answersAt: "end" as const };
    const created = createExam(teacher, { ...base, endsAt: start + 30 * MINUTE });
    if (!created.ok) throw new Error(created.message);
    const working = startAttempt(student, created.id);
    const done = startAttempt(classmate, created.id);
    if (!working.ok || !done.ok) throw new Error();
    expect(submitAttempt(classmate, done.attemptId).ok).toBe(true);
    const deadlineOf = (who: Session, id: number) => {
      const view = getAttemptView(who, id);
      return view.ok ? view.attempt.deadline : null;
    };
    expect(deadlineOf(student, working.attemptId)).toBe(start + 30 * MINUTE);

    at(start + 5 * MINUTE);
    expect(updateExam(teacher, created.id, { ...base, endsAt: start + 90 * MINUTE }).ok).toBe(true);
    expect(deadlineOf(student, working.attemptId)).toBe(start + 60 * MINUTE);
    expect(deadlineOf(classmate, done.attemptId)).toBe(start + 30 * MINUTE);
    expect(attemptStatus(student, working.attemptId)).toMatchObject({ ok: true, deadline: start + 60 * MINUTE, submitted: false });
    expect(attemptStatus(classmate, working.attemptId)).toMatchObject({ ok: false, status: 404 });

    expect(updateExam(teacher, created.id, { ...base, endsAt: start + 20 * MINUTE }).ok).toBe(true);
    expect(deadlineOf(student, working.attemptId)).toBe(start + 20 * MINUTE);
  });

  it("kỳ thi chưa tới giờ thì chưa vào được", () => {
    const created = exam({ startsAt: Date.now() + 60 * MINUTE, endsAt: Date.now() + 120 * MINUTE });
    if (!created.ok) throw new Error(created.message);
    expect(myExams(student)).toMatchObject({ ok: true, upcoming: expect.arrayContaining([expect.objectContaining({ id: created.id })]) });
    expect(startAttempt(student, created.id)).toMatchObject({ ok: false, status: 400 });
  });

  it("học sinh đã vào thi thì xem được ảnh câu hỏi", async () => {
    const created = exam();
    if (!created.ok) throw new Error(created.message);
    expect(await paperImage(student, keyedPaper, "q", 1)).not.toBeNull();
  });
});

describe("quản lý kỳ thi", () => {
  it("danh sách kỳ thi lọc theo trạng thái", () => {
    const created = exam({ title: "Kỳ thi để lọc" });
    if (!created.ok) throw new Error(created.message);
    const running = listExams(teacher, { q: "de loc", grade: 12, status: "running", page: 1 });
    expect(running.ok && running.rows.map((row) => row.id)).toEqual([created.id]);
    const ended = listExams(teacher, { q: "de loc", grade: undefined, status: "ended", page: 1 });
    expect(ended.ok && ended.rows).toEqual([]);
  });

  it("kỳ thi chưa ai vào thi vẫn biết thang điểm của đề", () => {
    const created = exam({ title: "Kỳ thi chưa ai vào" });
    if (!created.ok) throw new Error(created.message);
    expect(getExam(teacher, created.id)).toMatchObject({ ok: true, exam: { maxScore: 10 } });
  });

  it("danh sách kỳ thi kèm số bài đạt từ 6,5 và từ 8 của từng kỳ", () => {
    const created = exam({ title: "Kỳ thi có tỉ lệ" });
    const empty = exam({ title: "Kỳ thi có tỉ lệ nhưng chưa ai nộp" });
    if (!created.ok || !empty.ok) throw new Error("exam");
    const begun = startAttempt(classmate, created.id);
    const second = startAttempt(student, created.id);
    if (!begun.ok || !second.ok) throw new Error("start");
    expect(submitAttempt(classmate, begun.attemptId).ok).toBe(true);
    expect(submitAttempt(student, second.attemptId).ok).toBe(true);
    // đặt thẳng điểm để có một bài 8 điểm và một bài 7 điểm trên thang 10
    getDb().update(attempts).set({ score: 8 }).where(eq(attempts.id, begun.attemptId)).run();
    getDb().update(attempts).set({ score: 7 }).where(eq(attempts.id, second.attemptId)).run();

    const list = listExams(teacher, { q: "co ti le", grade: 12, status: "all", page: 1 });
    if (!list.ok) throw new Error(list.message);
    expect(list.rows.find((row) => row.id === created.id)?.bands).toEqual({ total: 2, from65: 2, from8: 1 });
    expect(list.rows.find((row) => row.id === empty.id)?.bands).toEqual({ total: 0, from65: 0, from8: 0 });
  });

  it("đã có bài làm thì không đổi đề, xoá kỳ thi xoá luôn bài làm", () => {
    const created = exam({ title: "Kỳ thi sẽ xoá" });
    if (!created.ok) throw new Error(created.message);
    const begun = startAttempt(student, created.id);
    if (!begun.ok) throw new Error(begun.message);
    const input = { title: "Đổi tên", grade: 12 as const, paperId: blankPaper, durationMinutes: 30, startsAt: null, endsAt: Date.now() + 60 * MINUTE, answersAt: "end" as const };
    expect(updateExam(teacher, created.id, input)).toMatchObject({ ok: false, field: "paperId" });
    expect(updateExam(teacher, created.id, { ...input, paperId: keyedPaper }).ok).toBe(true);
    expect(deletePaper(teacher, keyedPaper)).toMatchObject({ ok: false, status: 400 });
    expect(deleteExam(teacher, created.id).ok).toBe(true);
    expect(getAttemptView(student, begun.attemptId)).toMatchObject({ ok: false, status: 404 });
    expect(auditActions(created.id)).toEqual(expect.arrayContaining(["exam.create", "exam.update", "exam.delete"]));
  });
});

describe("sửa đáp án sau khi đã có bài nộp", () => {
  it("chấm lại bài đã nộp, không cho đổi số câu", async () => {
    const created = exam({ title: "Chấm lại" });
    if (!created.ok) throw new Error(created.message);
    const begun = startAttempt(student, created.id);
    if (!begun.ok) throw new Error(begun.message);
    saveAnswer(student, begun.attemptId, { seq: 2, value: "A" });
    const before = submitAttempt(student, begun.attemptId);
    if (!before.ok) throw new Error();

    const detail = getPaper(teacher, keyedPaper);
    if (!detail.ok) throw new Error();
    const items = detail.questions.map((question) => ({
      type: "question" as const,
      label: question.label,
      shape: question.shape,
      key: question.seq === 2 ? "A" : question.answerKey,
      boxes: question.boxes,
    }));
    const saved = await savePaperLayout(teacher, keyedPaper, { format: "thpt", items }, detail.paper.imageVersion);
    expect(saved.ok && saved.rescored).toBeGreaterThanOrEqual(1);
    const view = getAttemptView(student, begun.attemptId);
    expect(view.ok && view.attempt.score).toBe((before.score ?? 0) + 0.25);

    const fewer = await savePaperLayout(teacher, keyedPaper, { format: "thpt", items: items.slice(1) }, detail.paper.imageVersion + 1);
    expect(fewer).toMatchObject({ ok: false, status: 409 });
  }, 60000);
});

describe("thi thử", () => {
  it("giáo viên thi thử đề có đáp án, thấy đáp án ngay sau khi nộp", () => {
    expect(startPractice(student, keyedPaper)).toMatchObject({ ok: false, status: 403 });
    expect(startPractice(teacher, blankPaper)).toMatchObject({ ok: false, status: 400 });
    const begun = startPractice(teacher, keyedPaper);
    if (!begun.ok) throw new Error(begun.message);
    saveAnswer(teacher, begun.attemptId, { seq: 1, value: "D" });
    expect(submitAttempt(teacher, begun.attemptId)).toMatchObject({ ok: true, score: 0.25 });
    const view = getAttemptView(teacher, begun.attemptId);
    expect(view.ok && view.attempt.isPractice).toBe(true);
    expect(view.ok && view.review?.keys[1]).toBe("D");
    expect(getAttemptView(student, begun.attemptId)).toMatchObject({ ok: false, status: 404 });
  });
});
