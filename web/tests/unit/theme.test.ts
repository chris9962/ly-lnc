import { describe, expect, it } from "vitest";
import { parseTheme, themeCookie } from "@/lib/theme";

describe("parseTheme", () => {
  it("nhận sáng và tối", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("trả hệ thống khi không có hoặc sai giá trị", () => {
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("")).toBe("system");
    expect(parseTheme("blue")).toBe("system");
  });
});

describe("themeCookie", () => {
  it("lưu sáng và tối một năm", () => {
    expect(themeCookie("dark")).toBe("theme=dark; path=/; max-age=31536000; samesite=lax");
  });

  it("xoá cookie khi chọn hệ thống", () => {
    expect(themeCookie("system")).toBe("theme=; path=/; max-age=0; samesite=lax");
  });
});
