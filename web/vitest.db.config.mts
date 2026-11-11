import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const alias = {
  "@": path.resolve(root, "src"),
  // "server-only" ném lỗi khi nạp ngoài Next, test thay bằng module rỗng
  "server-only": path.resolve(root, "tests/stubs/empty.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    include: ["tests/db/**/*.test.ts"],
    setupFiles: ["tests/db/setup.ts"],
    pool: "forks",
    testTimeout: 20000,
  },
});
