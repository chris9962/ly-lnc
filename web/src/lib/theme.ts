export type Theme = "system" | "light" | "dark";
export type Skin = "plain" | "space";

export const THEME_COOKIE = "theme";

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Hệ thống" },
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
];

// admin giữ giao diện đơn giản, mọi vai trò khác và trang đăng nhập dùng giao diện vũ trụ
export const skinOf = (role: string | undefined): Skin => (role === "admin" ? "plain" : "space");

// chưa chọn thì giao diện vũ trụ dùng nền tối vì đó là mặt chính của nó, giao diện đơn giản thì theo máy
export function parseTheme(value: string | undefined, skin: Skin = "space"): Theme {
  if (value === "light" || value === "dark" || value === "system") return value;
  return skin === "plain" ? "system" : "dark";
}

// học sinh chỉ có giao diện tối: không theo máy, không theo lựa chọn đã lưu trên trình duyệt
export const themeLocked = (role: string | undefined) => role === "student";

export const themeOf = (role: string | undefined, value: string | undefined): Theme => (themeLocked(role) ? "dark" : parseTheme(value, skinOf(role)));

// "hệ thống" cũng phải lưu cookie, nếu không lần tải sau sẽ quay về mặc định tối
export const themeCookie = (theme: Theme) => `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
