import "server-only";
import { eq } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/permissions";
import { getDb } from "./db";
import { papers } from "./db/schema";
import { fail, FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";

// trình chỉnh báo lại mỗi 5 giây; quá hạn này không báo thì coi như đã rời trang
export const LOCK_TTL_MS = 15_000;

type Holder = { userId: number; name: string; token: string };
type Lock = Holder & { until: number };

// đặt trên globalThis để mọi route trong cùng tiến trình dùng chung một bảng khoá
const store = globalThis as typeof globalThis & { lncPaperLocks?: Map<number, Lock> };
const locks = (store.lncPaperLocks ??= new Map());

export function lockHolder(paperId: number, now: number): Holder | null {
  const lock = locks.get(paperId);
  if (!lock) return null;
  if (lock.until < now) {
    locks.delete(paperId);
    return null;
  }
  return lock;
}

// khoá theo từng tab, nên cùng một người mở tab thứ hai cũng bị chặn
export function holdPaper(paperId: number, holder: Holder, now: number): { ok: true } | { ok: false; heldBy: string } {
  const current = lockHolder(paperId, now);
  if (current && current.token !== holder.token) return { ok: false, heldBy: current.name };
  locks.set(paperId, { ...holder, until: now + LOCK_TTL_MS });
  return { ok: true };
}

export function releasePaper(paperId: number, token: string) {
  if (locks.get(paperId)?.token === token) locks.delete(paperId);
}

export const heldMessage = (name: string) => `${name} đang chỉnh đề này`;

export function holdPaperFor(user: SessionUser, paperId: number, token: string): Result {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  if (!Number.isInteger(paperId) || !getDb().select({ id: papers.id }).from(papers).where(eq(papers.id, paperId)).get()) return NOT_FOUND;
  const held = holdPaper(paperId, { userId: user.id, name: user.fullName, token }, Date.now());
  return held.ok ? ok() : fail(heldMessage(held.heldBy), 409);
}

export function releasePaperFor(user: SessionUser, paperId: number, token: string): Result {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  releasePaper(paperId, token);
  return ok();
}
