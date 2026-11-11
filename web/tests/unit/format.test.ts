import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDuration, formatRange } from "@/lib/format";

describe("formatDate", () => {
  it("viết ngày dạng dd/MM/yyyy theo giờ Việt Nam", () => {
    // 17:30 UTC ngày 04/11 là 00:30 ngày 05/11 giờ Việt Nam
    expect(formatDate(Date.UTC(2026, 10, 4, 17, 30))).toBe("05/11/2026");
  });
});

describe("formatDateTime", () => {
  it("thêm giờ phút theo giờ Việt Nam", () => {
    expect(formatDateTime(Date.UTC(2026, 10, 4, 17, 30))).toBe("05/11/2026 00:30");
  });
});

describe("formatRange", () => {
  it("cùng ngày chỉ ghi ngày một lần, khác ngày ghi đủ", () => {
    expect(formatRange(Date.UTC(2026, 10, 5, 0, 30), Date.UTC(2026, 10, 5, 2, 0))).toBe("05/11/2026 07:30 đến 09:00");
    expect(formatRange(Date.UTC(2026, 10, 5, 0, 30), Date.UTC(2026, 10, 6, 2, 0))).toBe("05/11/2026 07:30 đến 06/11/2026 09:00");
  });
});

describe("formatDuration", () => {
  it("ghi phút và giây", () => {
    expect(formatDuration(125_000)).toBe("2 phút 5 giây");
    expect(formatDuration(9_000)).toBe("9 giây");
  });
});
