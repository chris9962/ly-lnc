import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import type { SessionUser } from "@/lib/permissions";
import { getDb, type Tx } from "./db";
import { sessions, users } from "./db/schema";

export const SESSION_COOKIE = "lnc_session";
const LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

// database chỉ giữ bản băm của mã phiên, lộ file database cũng không dùng lại được phiên
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type IssuedSession = { token: string; expiresAt: number };

export function insertSession(tx: Tx, userId: number): IssuedSession {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + LIFETIME_MS;
  tx.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt }).run();
  tx.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();
  return { token, expiresAt };
}

export function deleteSession(tx: Tx, token: string) {
  tx.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
}

export function deleteSessionsOf(tx: Tx, userId: number) {
  tx.delete(sessions).where(eq(sessions.userId, userId)).run();
}

export function findSessionUser(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = getDb()
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      grade: users.grade,
      mustChangePassword: users.mustChangePassword,
      disabled: users.disabled,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .get();
  if (!row || row.disabled || row.expiresAt < Date.now()) return null;
  return { id: row.id, username: row.username, fullName: row.fullName, role: row.role, grade: row.grade, mustChangePassword: row.mustChangePassword };
}
