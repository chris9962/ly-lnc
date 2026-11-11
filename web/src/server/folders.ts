import "server-only";
import { and, asc, count, eq, isNull, ne } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/permissions";
import type { FolderInput } from "@/lib/paperForm";
import { searchKey } from "@/lib/username";
import { writeAudit } from "./audit";
import { getDb, type Tx } from "./db";
import { folders, papers } from "./db/schema";
import { fail, FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";

export type FolderItem = { id: number; name: string; parentId: number | null; paperCount: number };

export function listFolders(user: SessionUser): Result<{ folders: FolderItem[] }> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  const db = getDb();
  const counts = new Map(
    db
      .select({ folderId: papers.folderId, n: count() })
      .from(papers)
      .groupBy(papers.folderId)
      .all()
      .map((row) => [row.folderId, row.n]),
  );
  const rows = db.select({ id: folders.id, name: folders.name, parentId: folders.parentId }).from(folders).orderBy(asc(folders.name)).all();
  return ok({ folders: rows.map((row) => ({ ...row, paperCount: counts.get(row.id) ?? 0 })) });
}

const findFolder = (tx: Tx, id: number) => tx.select().from(folders).where(eq(folders.id, id)).get();

// tên so không phân biệt dấu và hoa thường để tránh hai thư mục "Chương 1" và "chuong 1" đứng cạnh nhau
function nameTaken(tx: Tx, name: string, parentId: number | null, exceptId?: number) {
  const siblings = tx
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(and(parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId), exceptId ? ne(folders.id, exceptId) : undefined))
    .all();
  return siblings.some((folder) => searchKey(folder.name) === searchKey(name));
}

export function createFolder(user: SessionUser, input: FolderInput): Result<{ id: number }> {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  return getDb().transaction((tx): Result<{ id: number }> => {
    if (input.parentId !== null && !findFolder(tx, input.parentId)) return NOT_FOUND;
    if (nameTaken(tx, input.name, input.parentId)) return fail("Đã có thư mục cùng tên ở đây", 400, "name");
    const created = tx.insert(folders).values({ name: input.name, parentId: input.parentId, createdBy: user.id, createdAt: Date.now() }).returning({ id: folders.id }).get();
    writeAudit(tx, user, "folder.create", { type: "folder", id: created.id }, { name: input.name, parentId: input.parentId });
    return ok({ id: created.id });
  });
}

export function renameFolder(user: SessionUser, id: number, input: { name: string; parentId?: number | null }): Result {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  return getDb().transaction((tx): Result => {
    const folder = findFolder(tx, id);
    if (!folder) return NOT_FOUND;
    const parentId = input.parentId === undefined ? folder.parentId : input.parentId;
    if (parentId !== null) {
      // đi ngược lên gốc từ thư mục cha mới, gặp lại chính nó nghĩa là tạo vòng
      for (let cursor: number | null = parentId; cursor !== null; ) {
        if (cursor === id) return fail("Không chuyển được thư mục vào bên trong chính nó", 400, "parentId");
        const parent = findFolder(tx, cursor);
        if (!parent) return NOT_FOUND;
        cursor = parent.parentId;
      }
    }
    if (nameTaken(tx, input.name, parentId, id)) return fail("Đã có thư mục cùng tên ở đây", 400, "name");
    tx.update(folders).set({ name: input.name, parentId }).where(eq(folders.id, id)).run();
    writeAudit(tx, user, "folder.rename", { type: "folder", id }, { from: folder.name, to: input.name, parentId });
    return ok();
  });
}

export function deleteFolder(user: SessionUser, id: number): Result {
  if (!can(user, "papers.manage")) return FORBIDDEN;
  return getDb().transaction((tx): Result => {
    const folder = findFolder(tx, id);
    if (!folder) return NOT_FOUND;
    const children = tx.select({ n: count() }).from(folders).where(eq(folders.parentId, id)).get()?.n ?? 0;
    const inside = tx.select({ n: count() }).from(papers).where(eq(papers.folderId, id)).get()?.n ?? 0;
    if (children || inside) return fail("Thư mục còn đề hoặc thư mục con", 400);
    writeAudit(tx, user, "folder.delete", { type: "folder", id }, { name: folder.name });
    tx.delete(folders).where(eq(folders.id, id)).run();
    return ok();
  });
}

export const folderExists = (tx: Tx, id: number) => !!findFolder(tx, id);
