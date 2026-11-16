import { describe, expect, it } from "vitest";
import { parseTheme, skinOf, themeCookie, themeOf } from "@/lib/theme";

describe("parseTheme", () => {
  it("nhận sáng, tối và hệ thống", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
  });

  it("mặc định là tối khi chưa chọn hoặc sai giá trị", () => {
    expect(parseTheme(undefined)).toBe("dark");
    expect(parseTheme("")).toBe("dark");
    expect(parseTheme("blue")).toBe("dark");
  });
});

describe("themeCookie", () => {
  it("lưu lựa chọn một năm, kể cả hệ thống", () => {
    expect(themeCookie("dark")).toBe("theme=dark; path=/; max-age=31536000; samesite=lax");
    expect(themeCookie("system")).toBe("theme=system; path=/; max-age=31536000; samesite=lax");
  });
});

describe("giao diện đơn giản của admin", () => {
  it("chỉ admin dùng giao diện đơn giản, các vai trò khác và trang đăng nhập dùng giao diện vũ trụ", () => {
    expect(skinOf("admin")).toBe("plain");
    expect(skinOf("teacher")).toBe("space");
    expect(skinOf("student")).toBe("space");
    expect(skinOf(undefined)).toBe("space");
  });

  it("giao diện đơn giản chưa chọn sáng tối thì theo máy", () => {
    expect(parseTheme(undefined, "plain")).toBe("system");
    expect(parseTheme("dark", "plain")).toBe("dark");
    expect(parseTheme(undefined, "space")).toBe("dark");
  });
});

describe("themeOf", () => {
  it("học sinh luôn dùng giao diện tối, bỏ qua lựa chọn đã lưu và thiết lập của máy", () => {
    expect(themeOf("student", "light")).toBe("dark");
    expect(themeOf("student", "system")).toBe("dark");
    expect(themeOf("student", undefined)).toBe("dark");
  });

  it("các vai trò khác giữ lựa chọn của mình", () => {
    expect(themeOf("teacher", "light")).toBe("light");
    expect(themeOf("teacher", undefined)).toBe("dark");
    expect(themeOf("admin", undefined)).toBe("system");
    expect(themeOf(undefined, "light")).toBe("light");
  });
});
