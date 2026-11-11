export type Box = { page: number; x0: number; y0: number; x1: number; y1: number };

export const QUESTION_KINDS = ["mcq", "tf", "match", "short"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const KIND_NAMES: Record<QuestionKind, string> = {
  mcq: "Nhiều lựa chọn",
  tf: "Đúng/Sai",
  match: "Ghép nối",
  short: "Trả lời ngắn",
};

export const PAPER_FORMATS = ["thpt", "vsat"] as const;
export type PaperFormat = (typeof PAPER_FORMATS)[number];

export const FORMAT_NAMES: Record<PaperFormat, string> = { thpt: "Đề 3 phần", vsat: "Đề VSAT" };

// mcq và short lưu một chuỗi, tf và match lưu mỗi ý một ô, ô trống là null
export type AnswerValue = string | (string | null)[];

export type QuestionShape =
  | { kind: "mcq"; options: number }
  | { kind: "tf"; items: number }
  | { kind: "match"; rows: number; cols: number }
  | { kind: "short" };

export const LIMITS = { options: [2, 8], items: [1, 8], rows: [1, 8], cols: [2, 10] } as const;

export function defaultShape(kind: QuestionKind): QuestionShape {
  if (kind === "mcq") return { kind, options: 4 };
  if (kind === "tf") return { kind, items: 4 };
  if (kind === "match") return { kind, rows: 4, cols: 6 };
  return { kind };
}

export type LayoutItem =
  | { type: "question"; label: number; kind: QuestionKind | null; boxes: Box[]; key?: AnswerValue }
  | { type: "context"; count: number; boxes: Box[] };

export const letter = (index: number) => String.fromCharCode(65 + index);
export const TRUE = "Đ";
export const FALSE = "S";

export function slotCount(shape: QuestionShape) {
  if (shape.kind === "tf") return shape.items;
  if (shape.kind === "match") return shape.rows;
  return 0;
}

// câu đã trả lời đủ: mcq có chữ, short có chữ, tf và match điền hết các ô
export function isComplete(shape: QuestionShape, value: AnswerValue | null | undefined) {
  if (value == null) return false;
  if (shape.kind === "mcq" || shape.kind === "short") return typeof value === "string" && value.trim() !== "";
  return Array.isArray(value) && value.length === slotCount(shape) && value.every((cell) => cell != null && cell !== "");
}

export function isTouched(value: AnswerValue | null | undefined) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return value.some((cell) => cell != null && cell !== "");
}

// ý của câu Đúng/Sai: đề VSAT ghi 1. 2. 3. 4., đề 3 phần ghi a) b) c) d)
export const itemLabel = (format: PaperFormat, index: number) => (format === "vsat" ? `${index + 1}.` : `${String.fromCharCode(97 + index)})`);

export function formatAnswer(shape: QuestionShape, value: AnswerValue | null | undefined) {
  if (!isTouched(value)) return "";
  if (typeof value === "string") return value.trim();
  if (shape.kind === "match") return value!.map((cell, index) => `${index + 1}${cell ?? "_"}`).join(" ");
  return value!.map((cell) => cell ?? "_").join("");
}

export const MAX_SHORT_ANSWER = 30;

// giá trị rỗng luôn hợp lệ; giá trị đã điền phải khớp hình dạng câu, ô chưa chọn để null
export function fitsShape(shape: QuestionShape, value: AnswerValue | null) {
  if (value === null) return true;
  if (shape.kind === "mcq") return typeof value === "string" && (value === "" || Array.from({ length: shape.options }, (_, i) => letter(i)).includes(value));
  if (shape.kind === "short") return typeof value === "string" && value.length <= MAX_SHORT_ANSWER;
  if (!Array.isArray(value)) return false;
  if (shape.kind === "tf") return value.length === shape.items && value.every((cell) => cell === null || cell === TRUE || cell === FALSE);
  const letters = Array.from({ length: shape.cols }, (_, i) => letter(i));
  return value.length === shape.rows && value.every((cell) => cell === null || letters.includes(cell));
}
