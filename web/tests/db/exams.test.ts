import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getAttemptView, myExams, saveAnswer, startAttempt, startPractice, submitAttempt } from "@/server/attempts";
import { createExam, deleteExam, examRoster, listExams, reopenAttempt, updateExam } from "@/server/exams";
import { deletePaper, getPaper, paperImage, savePaperLayout, uploadPaper } from "@/server/papers";
import { auditActions, makeUser } from "./helpers";

const TEMPLATE_DIR = path.resolve(__dirname, "../../../template");
const templates = fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".pdf")).sort();
const pdf = (index: number) => new Uint8Array(fs.readFileSync(path.join(TEMPLATE_DIR, templates[index])));

type Session = Awaited<ReturnType<typeof makeUser>>["session"];
let teacher: Session;
let student: Session;
let other: Session;
let keyedPaper: number;
let blankPaper: number;

const MINUTE = 60_000;
const at = (time: number) => vi.setSystemTime(time);

beforeAll(async () => {
  teacher = (await makeUser("teacher", "Thầy Bình")).session;
  student = (await makeUser("student", "Trò Giỏi", 12)).session;
  other = (await makeUser("student", "Trò Khối Khác", 10)).session;
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
  createExam(teacher, { title: "Kiểm tra chương 1", grade: 12, paperId: keyedPaper, durationMinutes: 45, startsAt: null, endsAt: Date.now() + 120 * MINUTE, ...extra });

describe("createExam", () => {
  it("đề chưa đủ đáp án thì không tạo được kỳ thi", () => {
    expect(exam({ paperId: blankPaper })).toMatchObject({ ok: false, status: 400, field: "paperId" });
    expect(exam({ paperId: 999999 })).toMatchObject({ ok: false, status: 400, field: "paperId" });
  });

  it("giờ kết thúc đã qua thì báo lỗi", () => {
    expect(exam({ endsAt: Date.now() - MINUTE })).toMatchObject({ ok: false, field: "endTime" });
  });

  it("học sinh không tạo được kỳ thi", () => {
    expect(createExam(student, { title: "x", grade: 12, paperId: keyedPaper, durationMinutes: 10, startsAt: null, endsAt: Date.now() + MINUTE })).toMatchObject({ status: 403 });
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

  it("hết giờ thì máy chủ tự nộp, giáo viên mở lại được", () => {
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

    expect(reopenAttempt(student, begun.attemptId, 10)).toMatchObject({ status: 403 });
    expect(reopenAttempt(teacher, begun.attemptId, 15).ok).toBe(true);
    const view = getAttemptView(student, begun.attemptId);
    if (!view.ok) throw new Error();
    expect(view.attempt).toMatchObject({ submittedAt: null, deadline: start + 26 * MINUTE });
    expect(view.answers[1]).toBe("D");
    expect(saveAnswer(student, begun.attemptId, { seq: 2, value: "C" }).ok).toBe(true);
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

  it("đã có bài làm thì không đổi đề, xoá kỳ thi xoá luôn bài làm", () => {
    const created = exam({ title: "Kỳ thi sẽ xoá" });
    if (!created.ok) throw new Error(created.message);
    const begun = startAttempt(student, created.id);
    if (!begun.ok) throw new Error(begun.message);
    const input = { title: "Đổi tên", grade: 12 as const, paperId: blankPaper, durationMinutes: 30, startsAt: null, endsAt: Date.now() + 60 * MINUTE };
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
