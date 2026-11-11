import type { AnswerValue, PaperFormat, QuestionShape } from "./paperLayout";

// điểm câu Đúng/Sai và Ghép nối tra theo số ý đúng: phần tử thứ k là điểm khi đúng k ý
export type ScoringRules = { mcq: number; short: number; tf: number[]; match: number[] };

export const DEFAULT_RULES: Record<PaperFormat, ScoringRules> = {
  thpt: { mcq: 0.25, short: 0.25, tf: [0, 0.1, 0.25, 0.5, 1], match: [0, 0.25, 0.5, 0.75, 1] },
  vsat: { mcq: 6, short: 6, tf: [0, 1, 2, 3, 6], match: [0, 1.5, 3, 4.5, 6] },
};

const tidy = (value: number) => Math.round(value * 1000) / 1000;

const NUMBER = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;

export function sameShortAnswer(key: string, given: string) {
  const a = key.replace(/\s+/g, "");
  const b = given.replace(/\s+/g, "");
  if (!a || !b) return false;
  if (NUMBER.test(a) && NUMBER.test(b)) return Number(a.replace(",", ".")) === Number(b.replace(",", "."));
  return a.toLowerCase() === b.toLowerCase();
}

function byHits(table: number[], hits: number, slots: number) {
  if (slots === table.length - 1) return table[hits];
  const full = table[table.length - 1];
  // số ý khác bảng thì chia theo tỉ lệ, đúng hết vẫn đủ điểm
  return hits === slots ? full : tidy((full * hits) / slots);
}

export function questionMax(shape: QuestionShape, rules: ScoringRules) {
  if (shape.kind === "mcq") return rules.mcq;
  if (shape.kind === "short") return rules.short;
  const table = shape.kind === "tf" ? rules.tf : rules.match;
  return table[table.length - 1];
}

export function scoreQuestion(shape: QuestionShape, key: AnswerValue | null, given: AnswerValue | null | undefined, rules: ScoringRules) {
  if (key == null) return { points: 0, correct: false };
  if (shape.kind === "mcq") {
    const correct = typeof given === "string" && given === key;
    return { points: correct ? rules.mcq : 0, correct };
  }
  if (shape.kind === "short") {
    const correct = typeof given === "string" && typeof key === "string" && sameShortAnswer(key, given);
    return { points: correct ? rules.short : 0, correct };
  }
  const keys = Array.isArray(key) ? key : [];
  const cells = Array.isArray(given) ? given : [];
  const hits = keys.filter((cell, index) => cell != null && cells[index] === cell).length;
  const table = shape.kind === "tf" ? rules.tf : rules.match;
  return { points: byHits(table, hits, keys.length), correct: hits === keys.length };
}

export const maxScore = (shapes: QuestionShape[], rules: ScoringRules) => tidy(shapes.reduce((sum, shape) => sum + questionMax(shape, rules), 0));

export const formatScore = (value: number) => String(tidy(value)).replace(".", ",");
