// Việt Nam không đổi giờ theo mùa nên lệch cố định 7 giờ
const VN_OFFSET_MS = 7 * 3_600_000;

const local = (timestamp: number) => new Date(timestamp + VN_OFFSET_MS);

export const vnYear = (timestamp: number) => local(timestamp).getUTCFullYear();
export const vnIsoDate = (timestamp: number) => local(timestamp).toISOString().slice(0, 10);

export function yearBounds(year: number) {
  return { from: Date.UTC(year, 0, 1) - VN_OFFSET_MS, to: Date.UTC(year + 1, 0, 1) - VN_OFFSET_MS };
}

const monthStart = (year: number, monthIndex: number) => Date.UTC(year, monthIndex, 1) - VN_OFFSET_MS;

// khoảng trục thời gian của biểu đồ: trọn các tháng có bài làm
export function monthSpan(timestamps: number[]): { from: number; to: number } | null {
  if (!timestamps.length) return null;
  const first = local(Math.min(...timestamps));
  const last = local(Math.max(...timestamps));
  return { from: monthStart(first.getUTCFullYear(), first.getUTCMonth()), to: monthStart(last.getUTCFullYear(), last.getUTCMonth() + 1) };
}

export function monthStarts(from: number, to: number): { year: number; month: number; at: number }[] {
  const start = local(from);
  const list: { year: number; month: number; at: number }[] = [];
  for (let index = start.getUTCMonth(), year = start.getUTCFullYear(); ; index++) {
    const at = monthStart(year, index);
    if (at >= to) return list;
    const date = local(at);
    list.push({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, at });
  }
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export type FormatStats = { submitted: number; average: number | null; best: number | null; scale: number | null };

// mỗi loại đề thống kê riêng trên thang gốc; scale chỉ có khi mọi bài cùng điểm tối đa
export function formatStats(results: { score: number; maxScore: number }[]): FormatStats {
  if (!results.length) return { submitted: 0, average: null, best: null, scale: null };
  const scores = results.map((result) => result.score);
  const scales = new Set(results.map((result) => result.maxScore));
  return {
    submitted: results.length,
    average: round2(scores.reduce((sum, value) => sum + value, 0) / scores.length),
    best: Math.max(...scores),
    scale: scales.size === 1 ? results[0].maxScore : null,
  };
}

// hai loại đề khác thang nên biểu đồ vẽ theo phần điểm đạt được, quy về 10
export const onTen = (score: number, maxScore: number) => (maxScore > 0 ? round2((score / maxScore) * 10) : 0);
