import "server-only";
import { and, asc, count, desc, eq, gt, gte, isNotNull, like, lt, ne, or, type SQL } from "drizzle-orm";
import { updatedBounds } from "@/lib/dateRange";
import { can, type SessionUser } from "@/lib/permissions";
import { MAX_PDF_BYTES, PAGE_SIZE, type ListPapersQuery, type PaperLayoutInput, type PaperMetaInput } from "@/lib/paperForm";
import { defaultShape, isComplete, type AnswerValue, type Box, type PaperFormat, type QuestionShape } from "@/lib/paperLayout";
import { DEFAULT_RULES } from "@/lib/scoring";
import { searchKey } from "@/lib/username";
import { writeAudit } from "./audit";
import { getDb, type Reader, type Tx } from "./db";
import { attempts, examPapers, folders, paperContexts, paperQuestions, papers, users } from "./db/schema";
import { folderExists } from "./folders";
import { rescorePaper } from "./grading";
import { renderPageWebp, renderToStorage } from "./pdf/images";
import { analyzePdf, openPdf, type Analysis, type PdfDocument } from "./pdf/layout";
import { fail, FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";
import { deletePrefix, getObject, paperKeys, putObject } from "./storage";

export type PaperListItem = {
  id: number;
  title: string;
  grade: number;
  format: PaperFormat;
  folderId: number | null;
  folderName: string | null;
  questionCount: number;
  keyedCount: number;
  updatedAt: number;
  createdByName: string | null;
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);
const fullyKeyed = and(gt(papers.questionCount, 0), eq(papers.keyedCount, papers.questionCount));

export function listPapers(user: SessionUser, query: ListPapersQuery): Result<{ rows: PaperListItem[]; total: number; page: number; pageSize: number }> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  const db = getDb();
  const filters: (SQL | undefined)[] = [];
  if (query.grade !== undefined) filters.push(eq(papers.grade, query.grade));
  if (query.folder !== undefined) filters.push(eq(papers.folderId, query.folder));
  if (query.answers === "has") filters.push(fullyKeyed);
  if (query.answers === "none") filters.push(or(eq(papers.questionCount, 0), lt(papers.keyedCount, papers.questionCount)));
  const key = searchKey(query.q);
  if (key) filters.push(like(papers.searchTitle, `%${escapeLike(key)}%`));
  const bounds = updatedBounds(query, Date.now());
  if (bounds.from !== undefined) filters.push(gte(papers.updatedAt, bounds.from));
  if (bounds.to !== undefined) filters.push(lt(papers.updatedAt, bounds.to));
  const where = and(...filters);

  const total = db.select({ n: count() }).from(papers).where(where).get()?.n ?? 0;
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const rows = db
    .select({
      id: papers.id,
      title: papers.title,
      grade: papers.grade,
      format: papers.format,
      folderId: papers.folderId,
      folderName: folders.name,
      questionCount: papers.questionCount,
      keyedCount: papers.keyedCount,
      updatedAt: papers.updatedAt,
      createdByName: users.fullName,
    })
    .from(papers)
    .leftJoin(folders, eq(folders.id, papers.folderId))
    .leftJoin(users, eq(users.id, papers.createdBy))
    .where(where)
    .orderBy(desc(papers.updatedAt), desc(papers.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();
  return ok({ rows, total, page, pageSize: PAGE_SIZE });
}

export function paperOptions(user: SessionUser, query: { q: string; grade?: number }): Result<{ papers: { id: number; title: string; grade: number; questionCount: number }[] }> {
  if (!can(user, "exams.manage")) return FORBIDDEN;
  const key = searchKey(query.q);
  const rows = getDb()
    .select({ id: papers.id, title: papers.title, grade: papers.grade, questionCount: papers.questionCount })
    .from(papers)
    .where(and(fullyKeyed, query.grade !== undefined ? eq(papers.grade, query.grade) : undefined, key ? like(papers.searchTitle, `%${escapeLike(key)}%`) : undefined))
    .orderBy(desc(papers.updatedAt))
    .limit(20)
    .all();
  return ok({ papers: rows });
}

type StoredQuestion = { seq: number; label: number | null; shape: QuestionShape; answerKey: AnswerValue | null; boxes: Box[]; contextSeq: number | null };
type StoredContext = { seq: number; count: number; boxes: Box[] };

// đoạn dẫn chung gắn vào N câu ngay sau nó theo thứ tự đọc
function materialize(items: PaperLayoutInput["items"]) {
  const questions: StoredQuestion[] = [];
  const contexts: StoredContext[] = [];
  let active: { seq: number; left: number } | null = null;
  for (const item of items) {
    if (item.type === "context") {
      contexts.push({ seq: contexts.length + 1, count: item.count, boxes: item.boxes });
      active = { seq: contexts.length, left: item.count };
      continue;
    }
    questions.push({
      seq: questions.length + 1,
      label: item.label,
      shape: item.shape,
      answerKey: item.key,
      boxes: item.boxes,
      contextSeq: active && active.left > 0 ? active.seq : null,
    });
    if (active) active.left--;
  }
  return { questions, contexts };
}

function fromAnalysis(analysis: Analysis): { items: PaperLayoutInput["items"]; warnings: string[] } {
  const warnings = [...analysis.warnings];
  const items = analysis.items.map((item): PaperLayoutInput["items"][number] => {
    if (item.type === "context") return item;
    if (!item.kind) warnings.push(`Câu ${item.label} chưa rõ loại, tạm đặt là nhiều lựa chọn`);
    const shape = defaultShape(item.kind ?? "mcq");
    const key = item.key !== undefined && isComplete(shape, item.key) ? item.key : null;
    return { type: "question", label: item.label, shape, key, boxes: item.boxes };
  });
  return { items, warnings };
}

async function renderAll(doc: PdfDocument, paperId: number, version: number, layout: ReturnType<typeof materialize>) {
  const questions = [];
  for (const question of layout.questions) {
    const size = await renderToStorage(doc, paperKeys.question(paperId, version, question.seq), question.boxes);
    questions.push({ ...question, imageWidth: size.width, imageHeight: size.height });
  }
  const contexts = [];
  for (const context of layout.contexts) {
    const size = await renderToStorage(doc, paperKeys.context(paperId, version, context.seq), context.boxes);
    contexts.push({ ...context, imageWidth: size.width, imageHeight: size.height });
  }
  return { questions, contexts };
}

type Rendered = Awaited<ReturnType<typeof renderAll>>;

function writeLayout(tx: Tx, paperId: number, rendered: Rendered) {
  tx.delete(paperQuestions).where(eq(paperQuestions.paperId, paperId)).run();
  tx.delete(paperContexts).where(eq(paperContexts.paperId, paperId)).run();
  if (rendered.questions.length) tx.insert(paperQuestions).values(rendered.questions.map((question) => ({ ...question, paperId }))).run();
  if (rendered.contexts.length) tx.insert(paperContexts).values(rendered.contexts.map((context) => ({ ...context, paperId }))).run();
  return { questionCount: rendered.questions.length, keyedCount: rendered.questions.filter((question) => isComplete(question.shape, question.answerKey)).length };
}

const isPdf = (bytes: Uint8Array) => bytes.length > 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";

export async function uploadPaper(user: SessionUser, meta: PaperMetaInput, bytes: Uint8Array, fileName: string): Promise<Result<{ id: number; warnings: string[] }>> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  if (bytes.length > MAX_PDF_BYTES) return fail("File lớn hơn 30 MB", 400, "file");
  if (!isPdf(bytes)) return fail("File không phải PDF", 400, "file");
  let doc: PdfDocument;
  let analysis: Analysis;
  try {
    doc = openPdf(bytes);
    analysis = analyzePdf(doc);
  } catch {
    return fail("Không đọc được file PDF", 400, "file");
  }
  const { items, warnings } = fromAnalysis(analysis);
  const now = Date.now();

  const created = getDb().transaction((tx): Result<{ id: number }> => {
    if (meta.folderId !== null && !folderExists(tx, meta.folderId)) return fail("Thư mục không còn", 400, "folderId");
    const row = tx
      .insert(papers)
      .values({
        title: meta.title,
        searchTitle: searchKey(meta.title),
        grade: meta.grade,
        folderId: meta.folderId,
        format: analysis.format,
        scoring: DEFAULT_RULES[analysis.format],
        pageSizes: analysis.pages,
        warnings,
        sourceName: fileName.slice(0, 200),
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: papers.id })
      .get();
    writeAudit(tx, user, "paper.create", { type: "paper", id: row.id }, { title: meta.title, grade: meta.grade, file: fileName });
    return ok({ id: row.id });
  });
  if (!created.ok) return created;

  try {
    await putObject(paperKeys.source(created.id), bytes);
    const rendered = await renderAll(doc, created.id, 1, materialize(items));
    getDb().transaction((tx) => {
      const counts = writeLayout(tx, created.id, rendered);
      tx.update(papers).set(counts).where(eq(papers.id, created.id)).run();
    });
  } catch (error) {
    // cắt ảnh hỏng giữa chừng thì bỏ cả đề, không để lại đề thiếu ảnh
    getDb().transaction((tx) => {
      tx.delete(papers).where(eq(papers.id, created.id)).run();
      writeAudit(tx, user, "paper.create_failed", { type: "paper", id: created.id }, { error: String(error).slice(0, 300) });
    });
    deletePrefix(paperKeys.root(created.id));
    return fail("Không cắt được đề này", 500, "file");
  }
  return ok({ id: created.id, warnings });
}

const paperRow = (id: number) => (Number.isInteger(id) ? getDb().select().from(papers).where(eq(papers.id, id)).get() : undefined);

export type PaperDetail = {
  paper: typeof papers.$inferSelect & { folderName: string | null; examCount: number; lockedByAttempts: boolean };
  questions: (typeof paperQuestions.$inferSelect)[];
  contexts: (typeof paperContexts.$inferSelect)[];
};

function usage(tx: Reader, paperId: number) {
  const examCount = tx.select({ n: count() }).from(examPapers).where(eq(examPapers.paperId, paperId)).get()?.n ?? 0;
  const examAttempts = tx.select({ n: count() }).from(attempts).where(and(eq(attempts.paperId, paperId), isNotNull(attempts.examId))).get()?.n ?? 0;
  return { examCount, lockedByAttempts: examAttempts > 0 };
}

export function getPaper(user: SessionUser, id: number): Result<PaperDetail> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  const db = getDb();
  const paper = paperRow(id);
  if (!paper) return NOT_FOUND;
  const folderName = paper.folderId ? (db.select({ name: folders.name }).from(folders).where(eq(folders.id, paper.folderId)).get()?.name ?? null) : null;
  const questions = db.select().from(paperQuestions).where(eq(paperQuestions.paperId, id)).orderBy(asc(paperQuestions.seq)).all();
  const contexts = db.select().from(paperContexts).where(eq(paperContexts.paperId, id)).orderBy(asc(paperContexts.seq)).all();
  return ok({ paper: { ...paper, folderName, ...usage(db, id) }, questions, contexts });
}

// chỉ đọc file gốc và cắt lại, người dùng bấm Lưu thì mới ghi
export async function defaultLayout(user: SessionUser, id: number): Promise<Result<{ items: PaperLayoutInput["items"]; warnings: string[] }>> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  if (!paperRow(id)) return NOT_FOUND;
  const source = await getObject(paperKeys.source(id));
  if (!source) return fail("Không còn file PDF gốc của đề", 404);
  try {
    return ok(fromAnalysis(analyzePdf(openPdf(source))));
  } catch {
    return fail("Không đọc được file PDF gốc", 500);
  }
}

export function updatePaperMeta(user: SessionUser, id: number, meta: PaperMetaInput): Result {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  return getDb().transaction((tx): Result => {
    const paper = tx.select().from(papers).where(eq(papers.id, id)).get();
    if (!paper) return NOT_FOUND;
    if (meta.folderId !== null && !folderExists(tx, meta.folderId)) return fail("Thư mục không còn", 400, "folderId");
    tx.update(papers).set({ title: meta.title, searchTitle: searchKey(meta.title), grade: meta.grade, folderId: meta.folderId, updatedAt: Date.now() }).where(eq(papers.id, id)).run();
    writeAudit(tx, user, "paper.update", { type: "paper", id }, { from: { title: paper.title, grade: paper.grade, folderId: paper.folderId }, to: meta });
    return ok();
  });
}

const sameStructure = (a: QuestionShape[], b: QuestionShape[]) => a.length === b.length && a.every((shape, index) => JSON.stringify(shape) === JSON.stringify(b[index]));

export async function savePaperLayout(user: SessionUser, id: number, input: PaperLayoutInput, baseVersion: number): Promise<Result<{ rescored: number }>> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  const paper = paperRow(id);
  if (!paper) return NOT_FOUND;
  const stale = fail("Đề vừa được lưu ở nơi khác, tải lại trang để lấy bản mới", 409);
  if (baseVersion !== paper.imageVersion) return stale;
  const layout = materialize(input.items);
  if (input.items.some((item) => item.boxes.some((box) => box.page >= paper.pageSizes.length))) return fail("Khung nằm ngoài số trang của đề", 400);

  const db = getDb();
  if (usage(db, id).lockedByAttempts) {
    const current = db.select({ shape: paperQuestions.shape }).from(paperQuestions).where(eq(paperQuestions.paperId, id)).orderBy(asc(paperQuestions.seq)).all();
    if (!sameStructure(current.map((row) => row.shape), layout.questions.map((question) => question.shape)))
      return fail("Đề đã có học sinh làm bài nên chỉ sửa được khung và đáp án, không đổi số câu hay loại câu", 409);
  }

  const source = await getObject(paperKeys.source(id));
  if (!source) return fail("Không tìm thấy file PDF gốc của đề", 500);
  const version = paper.imageVersion + 1;
  let rendered: Rendered;
  try {
    rendered = await renderAll(openPdf(source), id, version, layout);
  } catch {
    deletePrefix(paperKeys.images(id, version));
    return fail("Không cắt được ảnh từ các khung này", 500);
  }

  const result = db.transaction((tx): Result<{ rescored: number }> => {
    // chỉ ghi khi chưa ai lưu chen vào trong lúc đang cắt ảnh
    const claimed = tx.update(papers).set({ imageVersion: version }).where(and(eq(papers.id, id), eq(papers.imageVersion, paper.imageVersion))).run();
    if (claimed.changes !== 1) return stale;
    const counts = writeLayout(tx, id, rendered);
    const formatChanged = input.format !== paper.format;
    tx.update(papers)
      .set({ ...counts, format: input.format, scoring: formatChanged ? DEFAULT_RULES[input.format] : paper.scoring, warnings: [], updatedAt: Date.now() })
      .where(eq(papers.id, id))
      .run();
    const rescored = rescorePaper(tx, id);
    writeAudit(tx, user, "paper.save_layout", { type: "paper", id }, { ...counts, format: input.format, rescored });
    return ok({ rescored });
  });
  deletePrefix(paperKeys.images(id, result.ok ? paper.imageVersion : version));
  return result;
}

export function deletePaper(user: SessionUser, id: number): Result {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  const result = getDb().transaction((tx): Result => {
    const paper = tx.select().from(papers).where(eq(papers.id, id)).get();
    if (!paper) return NOT_FOUND;
    if (usage(tx, id).examCount) return fail("Đề đang dùng trong kỳ thi, xoá kỳ thi trước", 400);
    writeAudit(tx, user, "paper.delete", { type: "paper", id }, { title: paper.title });
    tx.delete(papers).where(eq(papers.id, id)).run();
    return ok();
  });
  if (result.ok) deletePrefix(paperKeys.root(id));
  return result;
}

// học sinh chỉ xem được ảnh của đề mình đang hoặc đã làm
function canSeeImages(user: SessionUser, paperId: number) {
  if (can(user, "papers.manage")) return true;
  if (!can(user, "exams.take")) return false;
  return !!getDb()
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.userId, user.id), eq(attempts.paperId, paperId)))
    .get();
}

export async function paperImage(user: SessionUser, paperId: number, kind: "q" | "c", seq: number) {
  if (!Number.isInteger(paperId) || !Number.isInteger(seq) || !canSeeImages(user, paperId)) return null;
  const paper = paperRow(paperId);
  if (!paper) return null;
  return getObject(kind === "q" ? paperKeys.question(paperId, paper.imageVersion, seq) : paperKeys.context(paperId, paper.imageVersion, seq));
}

export async function pageImage(user: SessionUser, paperId: number, page: number) {
  if (!can(user, "papers.manage") || !Number.isInteger(page) || page < 0) return null;
  const paper = paperRow(paperId);
  if (!paper || page >= paper.pageSizes.length) return null;
  const key = paperKeys.page(paperId, page);
  const cached = await getObject(key);
  if (cached) return cached;
  const source = await getObject(paperKeys.source(paperId));
  if (!source) return null;
  const image = await renderPageWebp(openPdf(source), page);
  await putObject(key, image);
  return image;
}

export const paperUsedElsewhere = (tx: Tx, paperId: number, examId: number) =>
  !!tx.select({ id: examPapers.id }).from(examPapers).where(and(eq(examPapers.paperId, paperId), ne(examPapers.examId, examId))).get();
