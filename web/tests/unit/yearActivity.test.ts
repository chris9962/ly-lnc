import { describe, expect, it } from "vitest";
import { formatStats, monthSpan, monthStarts, onTen, vnIsoDate, vnYear, yearBounds } from "@/lib/yearActivity";

const vn = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h - 7, min);

describe("năm theo giờ Việt Nam", () => {
  it("0 giờ 30 ngày 01/01 đã thuộc năm mới, 23 giờ 30 ngày 31/12 còn năm cũ", () => {
    expect(vnYear(vn(2026, 1, 1, 0, 30))).toBe(2026);
    expect(vnYear(vn(2025, 12, 31, 23, 30))).toBe(2025);
    expect(vnIsoDate(vn(2026, 11, 5, 23, 59))).toBe("2026-11-05");
    expect(yearBounds(2026)).toEqual({ from: vn(2026, 1, 1), to: vn(2027, 1, 1) });
  });
});

describe("khoảng tháng theo giờ Việt Nam", () => {
  it("monthSpan chạy từ đầu tháng của mốc sớm nhất tới đầu tháng sau mốc muộn nhất, qua được năm", () => {
    expect(monthSpan([vn(2027, 1, 3, 9), vn(2026, 11, 15, 10)])).toEqual({ from: vn(2026, 11, 1), to: vn(2027, 2, 1) });
    expect(monthSpan([vn(2026, 12, 31, 23, 30)])).toEqual({ from: vn(2026, 12, 1), to: vn(2027, 1, 1) });
    expect(monthSpan([])).toBeNull();
  });

  it("monthStarts liệt kê đầu từng tháng trong khoảng", () => {
    expect(monthStarts(vn(2026, 11, 1), vn(2027, 2, 1))).toEqual([
      { year: 2026, month: 11, at: vn(2026, 11, 1) },
      { year: 2026, month: 12, at: vn(2026, 12, 1) },
      { year: 2027, month: 1, at: vn(2027, 1, 1) },
    ]);
  });
});

describe("formatStats", () => {
  it("tính riêng trên thang gốc, có thang chung khi mọi bài cùng điểm tối đa", () => {
    expect(formatStats([{ score: 8, maxScore: 10 }, { score: 6.5, maxScore: 10 }])).toEqual({ submitted: 2, average: 7.25, best: 8, scale: 10 });
    expect(formatStats([{ score: 90, maxScore: 150 }, { score: 60, maxScore: 120 }])).toEqual({ submitted: 2, average: 75, best: 90, scale: null });
    expect(formatStats([])).toEqual({ submitted: 0, average: null, best: null, scale: null });
  });

  it("quy về thang 10 để vẽ chung một trục", () => {
    expect(onTen(90, 150)).toBe(6);
    expect(onTen(1, 3)).toBe(3.33);
    expect(onTen(5, 0)).toBe(0);
  });
});
