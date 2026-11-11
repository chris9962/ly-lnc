import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("giữ nguyên số 10 chữ số bắt đầu bằng 0", () => {
    expect(normalizePhone("0912345678")).toBe("0912345678");
  });

  it("bỏ khoảng trắng, dấu chấm, gạch nối", () => {
    expect(normalizePhone("0912 345 678")).toBe("0912345678");
    expect(normalizePhone("0912.345.678")).toBe("0912345678");
    expect(normalizePhone("0912-345-678")).toBe("0912345678");
  });

  it("đổi đầu số quốc tế 84 thành 0", () => {
    expect(normalizePhone("+84912345678")).toBe("0912345678");
    expect(normalizePhone("84912345678")).toBe("0912345678");
  });

  it("thêm lại số 0 đầu mà Excel đã bỏ", () => {
    expect(normalizePhone("912345678")).toBe("0912345678");
  });

  it("trả null khi không phải số điện thoại", () => {
    expect(normalizePhone("091234567")).toBeNull();
    expect(normalizePhone("09123456789")).toBeNull();
    expect(normalizePhone("annv")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});
