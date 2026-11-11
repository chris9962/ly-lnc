import { describe, expect, it } from "vitest";
import { isoToVn, maskVnDate, parseVnDate, updatedBounds } from "@/lib/dateRange";
import { listPapersQuery } from "@/lib/paperForm";

const vn = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h - 7, min);

describe("ngày dạng 05/11/2026", () => {
  it("đọc ngày đủ và hợp lệ, ngày sai hay thiếu trả null", () => {
    expect(parseVnDate("05/11/2026")).toBe("2026-11-05");
    expect(parseVnDate("31/02/2026")).toBeNull();
    expect(parseVnDate("05/11")).toBeNull();
    expect(parseVnDate("00/11/2026")).toBeNull();
    expect(isoToVn("2026-11-05")).toBe("05/11/2026");
  });

  it("tự chèn dấu gạch chéo khi gõ số", () => {
    expect(maskVnDate("05112026")).toBe("05/11/2026");
    expect(maskVnDate("0511")).toBe("05/11");
    expect(maskVnDate("051")).toBe("05/1");
    expect(maskVnDate("05/11/20261")).toBe("05/11/2026");
    expect(maskVnDate("ab")).toBe("");
  });
});

describe("updatedBounds theo giờ Việt Nam", () => {
  const now = vn(2026, 11, 11, 10);

  it("các mốc nhanh tính từ đầu ngày", () => {
    expect(updatedBounds({ updated: "today" }, now)).toEqual({ from: vn(2026, 11, 11) });
    expect(updatedBounds({ updated: "7d" }, now)).toEqual({ from: vn(2026, 11, 5) });
    expect(updatedBounds({ updated: "30d" }, now)).toEqual({ from: vn(2026, 10, 13) });
    expect(updatedBounds({ updated: "month" }, now)).toEqual({ from: vn(2026, 11, 1) });
    expect(updatedBounds({}, now)).toEqual({});
  });

  it("23 giờ 30 vẫn là hôm nay, 0 giờ 30 đã sang ngày mới", () => {
    expect(updatedBounds({ updated: "today" }, vn(2026, 11, 11, 23, 30))).toEqual({ from: vn(2026, 11, 11) });
    expect(updatedBounds({ updated: "today" }, vn(2026, 11, 12, 0, 30))).toEqual({ from: vn(2026, 11, 12) });
  });

  it("khoảng ngày lấy trọn ngày cuối, đảo lại nếu nhập ngược", () => {
    expect(updatedBounds({ updated: "range", from: "2026-11-01", to: "2026-11-05" }, now)).toEqual({ from: vn(2026, 11, 1), to: vn(2026, 11, 6) });
    expect(updatedBounds({ updated: "range", from: "2026-11-05", to: "2026-11-01" }, now)).toEqual({ from: vn(2026, 11, 1), to: vn(2026, 11, 6) });
    expect(updatedBounds({ updated: "range", from: "2026-11-01" }, now)).toEqual({ from: vn(2026, 11, 1) });
    expect(updatedBounds({ updated: "range", to: "2026-11-05" }, now)).toEqual({ to: vn(2026, 11, 6) });
    expect(updatedBounds({ from: "2026-11-01" }, now)).toEqual({});
  });
});

describe("listPapersQuery với ngày cập nhật", () => {
  it("giữ giá trị đúng, bỏ giá trị lạ", () => {
    expect(listPapersQuery.parse({ updated: "range", from: "2026-11-01", to: "2026-11-05" })).toMatchObject({ updated: "range", from: "2026-11-01", to: "2026-11-05" });
    expect(listPapersQuery.parse({ updated: "x", from: "2026-13-01", to: "05/11/2026" })).toMatchObject({ updated: undefined, from: undefined, to: undefined });
  });
});
