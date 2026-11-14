import { describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { folders, papers } from "@/server/db/schema";
import { deletePaper } from "@/server/papers";
import { seedPapers } from "@/server/seed";
import { adminUser } from "./helpers";

const allPapers = () => getDb().select().from(papers).all();

describe("seedPapers", () => {
  it("nạp 12 đề VSAT có sẵn kèm đáp án", async () => {
    await seedPapers();
    const rows = allPapers();
    expect(rows).toHaveLength(12);
    expect(rows.every((row) => row.format === "vsat" && row.questionCount === 25 && row.grade === 12)).toBe(true);
    // đề 03 và đề 12 mỗi đề có một câu mà file đáp án ghi hai kết quả khác nhau, để trống chờ giáo viên
    expect(rows.filter((row) => row.keyedCount === 25)).toHaveLength(10);
    expect(rows.filter((row) => row.keyedCount === 24).map((row) => row.title).sort()).toEqual(["Thi thử VSAT 2027 đề 03", "Thi thử VSAT 2027 đề 12"]);
    const folder = getDb().select().from(folders).all();
    expect(folder.map((row) => row.name)).toEqual(["Đề VSAT"]);
    expect(rows.every((row) => row.folderId === folder[0].id)).toBe(true);
  }, 180000);

  it("chạy lại không nạp trùng, đề đã xoá không quay lại", async () => {
    const first = allPapers()[0];
    expect(deletePaper(adminUser(), first.id).ok).toBe(true);
    await seedPapers();
    expect(allPapers()).toHaveLength(11);
  }, 180000);
});
