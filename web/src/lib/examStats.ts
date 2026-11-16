import { onTen } from "./yearActivity";

export type ScoreBands = { total: number; from65: number; from8: number };

// hai mốc tính riêng trên thang 10, bài đạt từ 8 cũng nằm trong nhóm từ 6,5
export function scoreBands(results: { score: number; maxScore: number }[]): ScoreBands {
  const marks = results.map((result) => onTen(result.score, result.maxScore));
  return { total: marks.length, from65: marks.filter((mark) => mark >= 6.5).length, from8: marks.filter((mark) => mark >= 8).length };
}

export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);
