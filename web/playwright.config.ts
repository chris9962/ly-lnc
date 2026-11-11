import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 60000,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${process.env.E2E_PORT ?? 3210}`,
    // dùng Edge có sẵn trên máy, không tải trình duyệt riêng
    channel: "msedge",
    locale: "vi-VN",
  },
});
