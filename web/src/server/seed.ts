import "server-only";
import fs from "node:fs";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { isGrade } from "@/lib/grades";
import { paperLayoutForm } from "@/lib/paperForm";
import { writeAudit } from "./audit";
import { getDb } from "./db";
import { auditLog, folders } from "./db/schema";
import { importSeedPaper } from "./papers";

const SEED_DIR = path.join(process.cwd(), "seed", "papers");

const manifestSchema = z.object({
  folder: z.string().min(1),
  papers: z.array(z.object({ file: z.string().regex(/^[a-z0-9-]+\.pdf$/), title: z.string().min(1), grade: z.number().refine(isGrade), layout: paperLayoutForm })),
});

function seedFolder(name: string) {
  return getDb().transaction((tx) => {
    const existing = tx.select({ id: folders.id }).from(folders).where(and(eq(folders.name, name), isNull(folders.parentId))).get();
    if (existing) return existing.id;
    const created = tx.insert(folders).values({ name, createdAt: Date.now() }).returning({ id: folders.id }).get();
    writeAudit(tx, null, "folder.create", { type: "folder", id: created.id }, { name, seed: true });
    return created.id;
  });
}

// mỗi file chỉ nạp một lần theo dấu trong audit_log, nên đề giáo viên đã xoá không tự quay lại
export async function seedPapers() {
  const manifestPath = path.join(SEED_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;
  const manifest = manifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const marks = getDb().select({ detail: auditLog.detail }).from(auditLog).where(eq(auditLog.action, "paper.seed")).all();
  const done = new Set(marks.map((mark) => (JSON.parse(mark.detail ?? "{}") as { file?: string }).file));
  const pending = manifest.papers.filter((paper) => !done.has(paper.file));
  if (!pending.length) return;
  const folderId = seedFolder(manifest.folder);
  for (const paper of pending) {
    await importSeedPaper({ ...paper, folderId }, fs.readFileSync(path.join(SEED_DIR, paper.file)));
  }
}
