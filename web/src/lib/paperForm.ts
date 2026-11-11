import { z } from "zod";
import { UPDATED_PRESETS, isIsoDate } from "./dateRange";
import { isGrade, type Grade } from "./grades";
import { LIMITS, MAX_SHORT_ANSWER, PAPER_FORMATS, fitsShape, type AnswerValue } from "./paperLayout";

export const PAGE_SIZE = 15;
export const MAX_TITLE = 150;
export const MAX_FOLDER_NAME = 60;
export const MAX_PDF_BYTES = 30 * 1024 * 1024;
export const MAX_ITEMS = 150;
export { MAX_SHORT_ANSWER };

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();
const optionalId = z.union([z.string(), z.number(), z.null()]).transform((value) => (value === "" || value === null ? null : Number(value)));

export const paperMetaForm = z.object({
  title: z.string().transform(tidy).pipe(z.string().min(1, "Nhập tên đề").max(MAX_TITLE, `Tên đề tối đa ${MAX_TITLE} ký tự`)),
  grade: z.coerce.number().refine(isGrade, "Chọn khối").transform((value) => value as Grade),
  folderId: optionalId.pipe(z.number().int().positive().nullable()),
});

export type PaperMetaInput = z.infer<typeof paperMetaForm>;

export const folderForm = z.object({
  name: z.string().transform(tidy).pipe(z.string().min(1, "Nhập tên thư mục").max(MAX_FOLDER_NAME, `Tên thư mục tối đa ${MAX_FOLDER_NAME} ký tự`)),
  parentId: optionalId.pipe(z.number().int().positive().nullable()),
});

export type FolderInput = z.infer<typeof folderForm>;

export const renameFolderForm = folderForm.pick({ name: true });

const isoDate = z.string().refine(isIsoDate).optional().catch(undefined);

export const listPapersQuery = z.object({
  q: z.string().trim().max(MAX_TITLE).catch("").default(""),
  grade: z.coerce.number().refine(isGrade).optional().catch(undefined),
  answers: z.enum(["all", "has", "none"]).catch("all").default("all"),
  folder: z.coerce.number().int().positive().optional().catch(undefined),
  updated: z.enum(UPDATED_PRESETS).optional().catch(undefined),
  from: isoDate,
  to: isoDate,
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type ListPapersQuery = z.infer<typeof listPapersQuery>;

const coordinate = z.number().finite().min(0).max(5000);
export const boxSchema = z
  .object({ page: z.number().int().min(0).max(200), x0: coordinate, y0: coordinate, x1: coordinate, y1: coordinate })
  .refine((box) => box.x1 - box.x0 >= 4 && box.y1 - box.y0 >= 4, "Khung quá nhỏ");

const between = ([min, max]: readonly [number, number]) => z.number().int().min(min).max(max);

const shapeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mcq"), options: between(LIMITS.options) }),
  z.object({ kind: z.literal("tf"), items: between(LIMITS.items) }),
  z.object({ kind: z.literal("match"), rows: between(LIMITS.rows), cols: between(LIMITS.cols) }),
  z.object({ kind: z.literal("short") }),
]);

const keySchema = z.union([z.string(), z.array(z.string().nullable()).max(10), z.null()]);

const normalizeKey = (key: AnswerValue | null): AnswerValue | null => {
  if (typeof key !== "string") return key && key.every((cell) => cell === null) ? null : key;
  const trimmed = key.replace(/\s+/g, "");
  return trimmed ? trimmed : null;
};

const questionSchema = z
  .object({
    type: z.literal("question"),
    label: z.number().int().min(0).max(999).nullable(),
    shape: shapeSchema,
    key: keySchema.transform(normalizeKey),
    boxes: z.array(boxSchema).min(1).max(6),
  })
  .refine((question) => fitsShape(question.shape, question.key), { message: "Đáp án không khớp loại câu", path: ["key"] });

const contextSchema = z.object({
  type: z.literal("context"),
  count: z.number().int().min(1).max(10),
  boxes: z.array(boxSchema).min(1).max(6),
});

export const paperLayoutForm = z.object({
  format: z.enum(PAPER_FORMATS),
  items: z
    .array(z.discriminatedUnion("type", [questionSchema, contextSchema]))
    .max(MAX_ITEMS)
    .refine((items) => items.some((item) => item.type === "question"), "Đề cần ít nhất một câu"),
});

export type PaperLayoutInput = z.infer<typeof paperLayoutForm>;

export const saveLayoutForm = paperLayoutForm.extend({ baseVersion: z.number().int().min(1) });
export type LayoutQuestionInput = Extract<PaperLayoutInput["items"][number], { type: "question" }>;
