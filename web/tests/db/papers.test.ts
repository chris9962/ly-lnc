import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { paperQuestions, papers } from "@/server/db/schema";
import { createFolder, deleteFolder, listFolders, renameFolder } from "@/server/folders";
import { defaultLayout, deletePaper, getPaper, listPapers, pageImage, paperImage, paperOptions, savePaperLayout, updatePaperMeta, uploadPaper } from "@/server/papers";
import { holdPaper } from "@/server/paperLocks";
import { getObject, paperKeys } from "@/server/storage";
import { adminUser, auditActions, makeUser } from "./helpers";

const TEMPLATE_DIR = path.resolve(__dirname, "../../../template");
const templates = fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".pdf")).sort();
const pdf = (index: number) => new Uint8Array(fs.readFileSync(path.join(TEMPLATE_DIR, templates[index])));

let teacher: Awaited<ReturnType<typeof makeUser>>["session"];
let student: Awaited<ReturnType<typeof makeUser>>["session"];

beforeAll(async () => {
  teacher = (await makeUser("teacher", "Cô Giáo Lan")).session;
  student = (await makeUser("student", "Học Sinh Một")).session;
});

async function upload(index: number, meta: Partial<{ title: string; grade: 10 | 11 | 12; folderId: number | null }> = {}) {
  const result = await uploadPaper(teacher, { title: "Đề ôn tập", grade: 12, folderId: null, ...meta }, pdf(index), templates[index]);
  if (!result.ok) throw new Error(result.message);
  return result.id;
}

describe("uploadPaper", () => {
  it("cắt câu, đọc bảng đáp án, lưu ảnh từng câu", async () => {
    const id = await upload(2, { title: "Ôn tập chương 1" });
    const paper = getDb().select().from(papers).where(eq(papers.id, id)).get()!;
    expect(paper).toMatchObject({ title: "Ôn tập chương 1", searchTitle: "on tap chuong 1", grade: 12, format: "thpt", questionCount: 28, keyedCount: 28 });
    const rows = getDb().select().from(paperQuestions).where(eq(paperQuestions.paperId, id)).all();
    expect(rows).toHaveLength(28);
    expect(rows[0]).toMatchObject({ seq: 1, label: 1, shape: { kind: "mcq", options: 4 }, answerKey: "D" });
    expect(rows[18]).toMatchObject({ seq: 19, label: 1, shape: { kind: "tf", items: 4 }, answerKey: ["S", "Đ", "S", "Đ"] });
    const image = await getObject(paperKeys.question(id, paper.imageVersion, 1));
    expect(image?.subarray(8, 12).toString()).toBe("WEBP");
    expect(await getObject(paperKeys.source(id))).not.toBeNull();
    expect(auditActions(id)).toContain("paper.create");
  }, 30000);

  it("đề VSAT không có bảng đáp án thì chưa có đáp án, có đoạn dẫn chung", async () => {
    const id = await upload(3);
    const detail = getPaper(teacher, id);
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    expect(detail.paper).toMatchObject({ format: "vsat", questionCount: 25, keyedCount: 0 });
    expect(detail.contexts).toHaveLength(2);
    expect(detail.questions.filter((question) => question.contextSeq !== null).length).toBeGreaterThanOrEqual(4);
  }, 30000);

  it("file không phải PDF bị từ chối", async () => {
    const result = await uploadPaper(teacher, { title: "Lỗi", grade: 10, folderId: null }, new TextEncoder().encode("hello"), "a.pdf");
    expect(result).toMatchObject({ ok: false, status: 400, field: "file" });
  });

  it("học sinh không up được đề", async () => {
    const result = await uploadPaper(student, { title: "X", grade: 10, folderId: null }, pdf(0), templates[0]);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("thư mục không tồn tại thì báo lỗi ở ô thư mục", async () => {
    const result = await uploadPaper(teacher, { title: "X", grade: 10, folderId: 99999 }, pdf(0), templates[0]);
    expect(result).toMatchObject({ ok: false, status: 400, field: "folderId" });
  });
});

describe("thư mục", () => {
  it("tạo cây thư mục, không trùng tên cùng cấp, chỉ xoá được thư mục rỗng", async () => {
    const root = createFolder(teacher, { name: "Khối 12", parentId: null });
    expect(root.ok).toBe(true);
    if (!root.ok) return;
    expect(createFolder(teacher, { name: "khối 12", parentId: null })).toMatchObject({ ok: false, field: "name" });
    const child = createFolder(teacher, { name: "Học kỳ 1", parentId: root.id });
    if (!child.ok) throw new Error(child.message);
    expect(createFolder(teacher, { name: "Lạc", parentId: 99999 })).toMatchObject({ ok: false, status: 404 });

    const list = listFolders(teacher);
    expect(list.ok && list.folders.map((folder) => folder.name)).toEqual(expect.arrayContaining(["Khối 12", "Học kỳ 1"]));

    expect(deleteFolder(teacher, root.id)).toMatchObject({ ok: false, status: 400 });
    const id = await upload(0, { folderId: child.id });
    expect(deleteFolder(teacher, child.id)).toMatchObject({ ok: false, status: 400 });
    expect(updatePaperMeta(teacher, id, { title: "Đề GK1", grade: 12, folderId: null }).ok).toBe(true);
    expect(deleteFolder(teacher, child.id).ok).toBe(true);
    expect(renameFolder(teacher, root.id, { name: "Lớp 12" }).ok).toBe(true);
    expect(auditActions(root.id)).toEqual(expect.arrayContaining(["folder.create", "folder.rename"]));
  }, 30000);

  it("không chuyển thư mục vào chính nó hay thư mục con của nó", () => {
    const a = createFolder(teacher, { name: "A", parentId: null });
    if (!a.ok) throw new Error();
    const b = createFolder(teacher, { name: "B", parentId: a.id });
    if (!b.ok) throw new Error();
    expect(renameFolder(teacher, a.id, { name: "A", parentId: b.id })).toMatchObject({ ok: false, status: 400 });
  });
});

describe("listPapers", () => {
  it("lọc theo khối, trạng thái đáp án, thư mục và tìm không dấu", async () => {
    const folder = createFolder(teacher, { name: "Lọc", parentId: null });
    if (!folder.ok) throw new Error();
    const keyed = await upload(0, { title: "Kiểm tra giữa kì Lọc", grade: 11, folderId: folder.id });
    const blank = await upload(4, { title: "VSAT Lọc", grade: 11, folderId: folder.id });

    const has = listPapers(teacher, { q: "loc", grade: 11, answers: "has", page: 1, folder: undefined });
    expect(has.ok && has.rows.map((row) => row.id)).toEqual([keyed]);
    const none = listPapers(teacher, { q: "", grade: undefined, answers: "none", page: 1, folder: folder.id });
    expect(none.ok && none.rows.map((row) => row.id)).toEqual([blank]);
    const search = listPapers(teacher, { q: "giữa kì", grade: undefined, answers: "all", page: 1, folder: undefined });
    expect(search.ok && search.rows.map((row) => row.id)).toEqual([keyed]);
    expect(listPapers(student, { q: "", grade: undefined, answers: "all", page: 1, folder: undefined })).toMatchObject({ ok: false, status: 403 });

    const options = paperOptions(teacher, { q: "lọc", grade: 11 });
    expect(options.ok && options.papers.map((paper) => paper.id)).toEqual([keyed]);

    // 05/11/2026 23:59 và 06/11/2026 00:00 giờ Việt Nam
    getDb().update(papers).set({ updatedAt: Date.UTC(2026, 10, 5, 16, 59) }).where(eq(papers.id, keyed)).run();
    getDb().update(papers).set({ updatedAt: Date.UTC(2026, 10, 5, 17, 0) }).where(eq(papers.id, blank)).run();
    const byDate = (from?: string, to?: string) => {
      const result = listPapers(teacher, { q: "", answers: "all", page: 1, folder: folder.id, updated: "range", from, to });
      return result.ok && result.rows.map((row) => row.id);
    };
    expect(byDate("2026-11-05", "2026-11-05")).toEqual([keyed]);
    expect(byDate("2026-11-06")).toEqual([blank]);
    expect(byDate(undefined, "2026-11-06")).toEqual([blank, keyed]);
  }, 60000);
});

describe("defaultLayout", () => {
  it("trả lại bố cục cắt tự động dù đề đã bị sửa, không ghi gì vào database", async () => {
    const id = await upload(2);
    const before = getPaper(teacher, id);
    if (!before.ok) throw new Error();
    const kept = before.questions.slice(0, 1).map((question) => ({ type: "question" as const, label: 9, shape: question.shape, key: null, boxes: [{ ...question.boxes[0], y1: question.boxes[0].y1 + 30 }] }));
    expect((await savePaperLayout(teacher, id, { format: "thpt", items: kept }, before.paper.imageVersion)).ok).toBe(true);

    const result = await defaultLayout(teacher, id);
    if (!result.ok) throw new Error(result.message);
    const questions = result.items.filter((item) => item.type === "question");
    expect(questions).toHaveLength(28);
    expect(questions[0]).toMatchObject({ label: 1, shape: { kind: "mcq", options: 4 }, key: "D", boxes: before.questions[0].boxes });
    const after = getPaper(teacher, id);
    expect(after.ok && after.paper).toMatchObject({ questionCount: 1, imageVersion: before.paper.imageVersion + 1 });

    expect(await defaultLayout(student, id)).toMatchObject({ ok: false, status: 403 });
    expect(await defaultLayout(teacher, 99999)).toMatchObject({ ok: false, status: 404 });
  }, 60000);
});

describe("savePaperLayout", () => {
  it("hai lần lưu cùng lúc: một lần được, ảnh của bản mới vẫn còn", async () => {
    const id = await upload(0);
    const before = getPaper(teacher, id);
    if (!before.ok) throw new Error();
    const items = before.questions.map((question) => ({ type: "question" as const, label: question.label, shape: question.shape, key: question.answerKey ?? null, boxes: question.boxes }));
    const version = before.paper.imageVersion;
    const results = await Promise.all([savePaperLayout(teacher, id, { format: "thpt", items }, version), savePaperLayout(teacher, id, { format: "thpt", items }, version)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ status: 409 });
    const after = getPaper(teacher, id);
    if (!after.ok) throw new Error();
    expect(after.paper.imageVersion).toBe(version + 1);
    expect(await getObject(paperKeys.question(id, version + 1, 1))).not.toBeNull();
  }, 60000);

  it("đề đang có người khác giữ thì không lưu được", async () => {
    const id = await upload(0);
    const before = getPaper(teacher, id);
    if (!before.ok) throw new Error();
    const items = before.questions.map((question) => ({ type: "question" as const, label: question.label, shape: question.shape, key: question.answerKey ?? null, boxes: question.boxes }));
    expect(holdPaper(id, { userId: 999, name: "Cô Khác", token: "tab-khac" }, Date.now())).toEqual({ ok: true });
    expect(await savePaperLayout(teacher, id, { format: "thpt", items }, before.paper.imageVersion, "tab-toi")).toMatchObject({ ok: false, status: 409 });
    expect(await savePaperLayout(teacher, id, { format: "thpt", items }, before.paper.imageVersion, "tab-khac")).toMatchObject({ ok: true });
  }, 60000);

  it("lưu khung và đáp án, cắt lại ảnh, xoá ảnh cũ", async () => {
    const id = await upload(3);
    const before = getPaper(teacher, id);
    if (!before.ok) throw new Error();
    const items = [
      { type: "context" as const, count: 1, boxes: before.contexts[0].boxes },
      ...before.questions.slice(0, 2).map((question, index) => ({
        type: "question" as const,
        label: question.label,
        shape: { kind: "mcq" as const, options: 4 },
        key: index === 0 ? "C" : null,
        boxes: question.boxes,
      })),
    ];
    const result = await savePaperLayout(teacher, id, { format: "thpt", items }, before.paper.imageVersion);
    expect(result.ok).toBe(true);
    const after = getPaper(teacher, id);
    if (!after.ok) throw new Error();
    expect(after.paper).toMatchObject({ questionCount: 2, keyedCount: 1, format: "thpt", imageVersion: before.paper.imageVersion + 1 });
    expect(after.questions[0]).toMatchObject({ seq: 1, contextSeq: 1, answerKey: "C" });
    expect(after.questions[1].contextSeq).toBeNull();
    expect(await getObject(paperKeys.question(id, before.paper.imageVersion, 1))).toBeNull();
    expect(await getObject(paperKeys.question(id, after.paper.imageVersion, 2))).not.toBeNull();
    expect(auditActions(id)).toContain("paper.save_layout");

    // lưu từ bản cũ sau khi người khác đã lưu thì bị chặn
    const stale = await savePaperLayout(teacher, id, { format: "thpt", items }, before.paper.imageVersion);
    expect(stale).toMatchObject({ ok: false, status: 409 });
  }, 60000);
});

describe("ảnh đề", () => {
  it("giáo viên xem được ảnh trang và ảnh câu, học sinh chưa thi thì không", async () => {
    const id = await upload(0);
    const detail = getPaper(teacher, id);
    if (!detail.ok) throw new Error();
    const page = await pageImage(teacher, id, 0);
    expect(page?.subarray(8, 12).toString()).toBe("WEBP");
    expect(await pageImage(teacher, id, 99)).toBeNull();
    expect(await paperImage(teacher, id, "q", 1)).not.toBeNull();
    expect(await paperImage(student, id, "q", 1)).toBeNull();
    expect(await pageImage(student, id, 0)).toBeNull();
  }, 30000);
});

describe("deletePaper", () => {
  it("xoá đề cùng file, có audit", async () => {
    const id = await upload(1);
    expect(deletePaper(student, id)).toMatchObject({ ok: false, status: 403 });
    const result = await deletePaper(teacher, id);
    expect(result.ok).toBe(true);
    expect(getPaper(teacher, id)).toMatchObject({ ok: false, status: 404 });
    expect(await getObject(paperKeys.source(id))).toBeNull();
    expect(auditActions(id)).toContain("paper.delete");
  }, 30000);

  it("admin cũng quản lý được đề", async () => {
    const id = await upload(5);
    expect(getPaper(adminUser(), id).ok).toBe(true);
  }, 30000);
});
