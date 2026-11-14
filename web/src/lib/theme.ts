export type Theme = "system" | "light" | "dark";

export const THEME_COOKIE = "theme";

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Hệ thống" },
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
];

export const parseTheme = (value: string | undefined): Theme => (value === "light" || value === "dark" ? value : "system");

// "hệ thống" là không có cookie, để máy chủ không gắn data-theme và CSS theo thiết lập của máy
export const themeCookie = (theme: Theme) =>
  theme === "system" ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax` : `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
