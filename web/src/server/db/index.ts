import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { writeAudit } from "../audit";
import { hashPasswordSync, randomPassword } from "../password";
import * as schema from "./schema";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

export type Db = BetterSQLite3Database<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function seedAdmin(db: Db): string | null {
  return db.transaction(
    (tx) => {
      if (tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "admin")).get()) return null;
      const password = randomPassword(12);
      const admin = tx
        .insert(schema.users)
        .values({ username: "admin", passwordHash: hashPasswordSync(password), fullName: "Quản trị viên", searchName: "quan tri vien", role: "admin", createdAt: Date.now() })
        .returning({ id: schema.users.id })
        .get();
      writeAudit(tx, null, "user.create", { type: "user", id: admin.id }, { username: "admin", role: "admin", seed: true });
      return password;
    },
    // giữ khoá ghi ngay từ đầu để hai tiến trình cùng khởi động không tạo hai admin
    { behavior: "immediate" },
  );
}

function open(): Db {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "app.db"));
  sqlite.pragma("busy_timeout = 10000");
  // WAL cho phép đọc trong lúc ghi, cần khi nhiều học sinh nộp bài cùng lúc
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const adminPassword = seedAdmin(db);
  if (adminPassword) {
    fs.writeFileSync(
      path.join(DATA_DIR, "admin-account.txt"),
      `Tài khoản quản trị ban đầu\n\nTên đăng nhập: admin\nMật khẩu tạm:  ${adminPassword}\n\nXoá file này sau khi đã đổi mật khẩu.\n`,
      "utf8",
    );
  }
  return db;
}

// giữ một kết nối duy nhất qua các lần nạp lại module ở chế độ dev
const holder = globalThis as unknown as { __lncDb?: Db };

// mở ở lần gọi đầu thay vì lúc nạp module, vì bước build nạp module nhưng không cần database
export const getDb = (): Db => holder.__lncDb ?? (holder.__lncDb = open());
