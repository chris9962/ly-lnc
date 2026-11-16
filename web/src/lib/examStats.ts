import { onTen } from "./yearActivity";

export type ScoreBands = { total: number; from65: number; from8: number };

// hai mốc tính riêng trên thang 10, bài đạt từ 8 cũng nằm trong nhóm từ 6,5
export function scoreBands(results: { score: number; maxScore: number }[]): ScoreBands {
  const marks = results.map((result) => onTen(result.score, result.maxScore));
  return { total: marks.length, from65: marks.filter((mark) => mark >= 6.5).length, from8: marks.filter((mark) => mark >= 8).length };
}

// mốc 6,5 và 8 tính trên thang 10; đề VSAT thang 150 thì đổi ra 97,5 và 120 để hiển thị đúng thang của đề
export const markOnScale = (mark: number, maxScore: number) => Math.round(mark * maxScore * 10) / 100;

export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);

export type CelebrationLevel = "good" | "great" | "perfect";

// mức chúc mừng khi nộp bài: từ 6,5 là nhẹ, từ 8 là mạnh, trọn điểm thì bắn pháo hoa
export function celebrationLevel(score: number, maxScore: number): CelebrationLevel | null {
  if (maxScore <= 0) return null;
  if (score >= maxScore) return "perfect";
  const mark = onTen(score, maxScore);
  return mark >= 8 ? "great" : mark >= 6.5 ? "good" : null;
}
