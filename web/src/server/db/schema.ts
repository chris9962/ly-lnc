import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    // AUTOINCREMENT để id không bị cấp lại sau khi xoá, audit_log vẫn chỉ đúng tài khoản cũ
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    // họ tên không dấu viết thường, phục vụ tìm kiếm không phân biệt dấu
    searchName: text("search_name").notNull(),
    role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
    grade: integer("grade"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("users_role_grade_idx").on(table.role, table.grade)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at").notNull(),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    // không đặt khoá ngoại: bản ghi audit phải còn sau khi đối tượng bị xoá
    targetId: integer("target_id"),
    detail: text("detail"),
  },
  (table) => [index("audit_log_target_idx").on(table.targetType, table.targetId), index("audit_log_at_idx").on(table.at)],
);
