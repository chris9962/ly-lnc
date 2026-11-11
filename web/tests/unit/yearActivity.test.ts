import { describe, expect, it } from "vitest";
import { averageOn10, vnIsoDate, vnYear, yearBounds } from "@/lib/yearActivity";

const vn = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h - 7, min);

describe("năm theo giờ Việt Nam", () => {
  it("0 giờ 30 ngày 01/01 đã thuộc năm mới, 23 giờ 30 ngày 31/12 còn năm cũ", () => {
    expect(vnYear(vn(2026, 1, 1, 0, 30))).toBe(2026);
    expect(vnYear(vn(2025, 12, 31, 23, 30))).toBe(2025);
    expect(vnIsoDate(vn(2026, 11, 5, 23, 59))).toBe("2026-11-05");
    expect(yearBounds(2026)).toEqual({ from: vn(2026, 1, 1), to: vn(2027, 1, 1) });
  });
});

describe("averageOn10", () => {
  it("quy mỗi bài về thang 10 rồi mới lấy trung bình", () => {
    expect(averageOn10([{ score: 8, maxScore: 10 }, { score: 60, maxScore: 150 }])).toBe(6);
    expect(averageOn10([{ score: 1, maxScore: 3 }])).toBe(3.33);
    expect(averageOn10([])).toBeNull();
    expect(averageOn10([{ score: 5, maxScore: 0 }])).toBeNull();
  });
});
