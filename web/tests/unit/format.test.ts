import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "@/lib/format";

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
