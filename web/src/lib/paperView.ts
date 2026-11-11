import { FALSE, KIND_NAMES, TRUE, itemLabel, type AnswerValue, type PaperFormat, type QuestionShape } from "./paperLayout";

export const imageUrl = (paperId: number, version: number, kind: "q" | "c", seq: number) => `/api/papers/${paperId}/images/${kind}${seq}.webp?v=${version}`;

export const pageUrl = (paperId: number, page: number) => `/api/papers/${paperId}/pages/${page}`;

// mỗi nhóm câu liền nhau cùng loại là một phần, giống cách đề in "PHẦN I, PHẦN II"
export function partsOf<T extends { shape: QuestionShape }>(questions: T[]) {
  const parts: { kind: QuestionShape["kind"]; number: number; questions: T[] }[] = [];
  for (const question of questions) {
    const last = parts.at(-1);
    if (last && last.kind === question.shape.kind) last.questions.push(question);
    else parts.push({ kind: question.shape.kind, number: parts.length + 1, questions: [question] });
  }
  return parts;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const partTitle = (number: number, kind: QuestionShape["kind"]) => `Phần ${ROMAN[number - 1] ?? number}: ${KIND_NAMES[kind]}`;

export const questionName = (question: { seq: number; label: number | null }) => `Câu ${question.label ?? question.seq}`;

// chữ hiển thị một đáp án hay một bài làm, ô bỏ trống ghi "bỏ trống"
export function describeAnswer(shape: QuestionShape, value: AnswerValue | null | undefined, format: PaperFormat) {
  if (value == null || (typeof value === "string" && !value.trim())) return "Bỏ trống";
  if (typeof value === "string") return value;
  if (shape.kind === "tf") return value.map((cell, index) => `${itemLabel(format, index)} ${cell === TRUE ? "Đúng" : cell === FALSE ? "Sai" : "bỏ trống"}`).join(", ");
  return value.map((cell, index) => `${index + 1}-${cell ?? "?"}`).join(", ");
}
