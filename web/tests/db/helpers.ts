import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Grade } from "@/lib/grades";
import type { SessionUser } from "@/lib/permissions";
import { DATA_DIR, getDb } from "@/server/db";
import { auditLog, users } from "@/server/db/schema";
import { createUsers } from "@/server/users";

export function adminUser(): SessionUser {
  const row = getDb().select().from(users).where(eq(users.username, "admin")).get()!;
  return { id: row.id, username: row.username, fullName: row.fullName, role: row.role, grade: row.grade, mustChangePassword: false };
}

export function adminTempPassword(): string {
  // file chỉ được ghi khi database mở lần đầu
  getDb();
  return fs.readFileSync(path.join(DATA_DIR, "admin-account.txt"), "utf8").match(/Mật khẩu tạm:\s+(\S+)/)![1];
}

let phoneCounter = 0;
export const nextPhone = () => `09${String(10000000 + ++phoneCounter)}`;

export async function makeUser(role: "teacher" | "student", fullName: string, grade: Grade | null = role === "student" ? 11 : null) {
  const phone = role === "student" ? nextPhone() : null;
  const result = await createUsers(adminUser(), { role, grade, people: [{ fullName, phone }] });
  if (!result.ok) throw new Error(result.message);
  const issued = result.issued[0];
  const row = getDb().select().from(users).where(eq(users.username, issued.username)).get()!;
  const session: SessionUser = { id: row.id, username: row.username, fullName: row.fullName, role: row.role, grade: row.grade, mustChangePassword: false };
  return { session, password: issued.password };
}

export function auditActions(targetId?: number): string[] {
  const rows = getDb().select().from(auditLog).all();
  return rows.filter((r) => targetId === undefined || r.targetId === targetId).map((r) => r.action);
}
