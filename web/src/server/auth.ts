import "server-only";
import { eq } from "drizzle-orm";
import type { LoginInput } from "@/lib/loginForm";
import type { PasswordInput } from "@/lib/passwordForm";
import type { SessionUser } from "@/lib/permissions";
import { writeAudit } from "./audit";
import { getDb } from "./db";
import { users } from "./db/schema";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { clearFails, loginKey, recordFail, secondsBlocked } from "./rateLimit";
import { fail, ok, type Result } from "./result";
import { deleteSession, deleteSessionsOf, insertSession, type IssuedSession } from "./session";

export async function login(input: LoginInput, ip: string): Promise<Result<IssuedSession & { user: SessionUser }>> {
  const db = getDb();
  const username = input.username.toLowerCase();
  const key = loginKey(ip, username);
  const wait = secondsBlocked(key);
  if (wait > 0) return fail(`Sai quá nhiều lần, thử lại sau ${Math.ceil(wait / 60)} phút`, 429);

  const row = db.select().from(users).where(eq(users.username, username)).get();
  const matched = await verifyPassword(input.password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !matched) {
    recordFail(key);
    return fail("Tên đăng nhập hoặc mật khẩu không đúng", 401);
  }
  if (row.disabled) return fail("Tài khoản đã bị khoá", 403);

  clearFails(key);
  const session = db.transaction((tx) => {
    const issued = insertSession(tx, row.id);
    writeAudit(tx, row, "auth.login", { type: "user", id: row.id });
    return issued;
  });
  const user: SessionUser = { id: row.id, username: row.username, fullName: row.fullName, role: row.role, grade: row.grade, mustChangePassword: row.mustChangePassword };
  return ok({ ...session, user });
}

export function logout(user: SessionUser, token: string): Result {
  getDb().transaction((tx) => {
    deleteSession(tx, token);
    writeAudit(tx, user, "auth.logout", { type: "user", id: user.id });
  });
  return ok();
}

export async function changePassword(user: SessionUser, input: PasswordInput): Promise<Result<IssuedSession>> {
  const db = getDb();
  const row = db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).get();
  if (!row) return fail("Chưa đăng nhập", 401);
  if (!(await verifyPassword(input.current, row.passwordHash))) return fail("Mật khẩu hiện tại không đúng", 400, "current");

  const passwordHash = await hashPassword(input.next);
  const session = db.transaction((tx) => {
    tx.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, user.id)).run();
    // đăng xuất mọi thiết bị khác rồi cấp phiên mới cho thiết bị đang dùng
    deleteSessionsOf(tx, user.id);
    writeAudit(tx, user, "auth.change_password", { type: "user", id: user.id });
    return insertSession(tx, user.id);
  });
  return ok(session);
}
