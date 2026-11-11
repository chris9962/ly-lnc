const DAY_MS = 86_400_000;
// Việt Nam không đổi giờ theo mùa nên lệch cố định 7 giờ
const VN_OFFSET_MS = 7 * 3_600_000;

const local = (timestamp: number) => new Date(timestamp + VN_OFFSET_MS);

export const vnYear = (timestamp: number) => local(timestamp).getUTCFullYear();
export const vnIsoDate = (timestamp: number) => local(timestamp).toISOString().slice(0, 10);

export function yearBounds(year: number) {
  return { from: Date.UTC(year, 0, 1) - VN_OFFSET_MS, to: Date.UTC(year + 1, 0, 1) - VN_OFFSET_MS };
}

// lưới như biểu đồ hoạt động: mỗi cột một tuần từ thứ hai, ô ngoài năm để trống
export function yearWeeks(year: number): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = [];
  for (let time = Date.UTC(year, 0, 1); new Date(time).getUTCFullYear() === year; time += DAY_MS) {
    const date = new Date(time);
    const weekday = (date.getUTCDay() + 6) % 7;
    if (!week.length) week = Array.from({ length: weekday }, () => null);
    week.push(date.toISOString().slice(0, 10));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array.from({ length: 7 - week.length }, () => null)]);
  return weeks;
}

// đề có thang điểm khác nhau nên quy từng bài về thang 10 trước khi lấy trung bình
export function averageOn10(results: { score: number; maxScore: number }[]): number | null {
  const scaled = results.filter((result) => result.maxScore > 0).map((result) => (result.score / result.maxScore) * 10);
  if (!scaled.length) return null;
  return Math.round((scaled.reduce((sum, value) => sum + value, 0) / scaled.length) * 100) / 100;
}

export const bestOn10 = (results: { score: number; maxScore: number }[]) => {
  const scaled = results.filter((result) => result.maxScore > 0).map((result) => (result.score / result.maxScore) * 10);
  return scaled.length ? Math.round(Math.max(...scaled) * 100) / 100 : null;
};
