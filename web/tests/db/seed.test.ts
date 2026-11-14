import { describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { folders, papers } from "@/server/db/schema";
import { deletePaper } from "@/server/papers";
import { seedPapers } from "@/server/seed";
import { adminUser } from "./helpers";

const allPapers = () => getDb().select().from(papers).all();

describe("seedPapers", () => {
  it("nạp 12 đề VSAT kèm đáp án và 20 đề ôn thi TN THPT chưa có đáp án", async () => {
    await seedPapers();
    const rows = allPapers();
    expect(rows).toHaveLength(32);
    expect(rows.every((row) => row.grade === 12)).toBe(true);
    const names = new Map(getDb().select().from(folders).all().map((row) => [row.id, row.name]));
    expect([...names.values()].sort()).toEqual(["Đề VSAT", "Đề ôn thi TN THPT 2026"]);

    const vsat = rows.filter((row) => row.format === "vsat");
    expect(vsat).toHaveLength(12);
    expect(vsat.every((row) => row.questionCount === 25 && names.get(row.folderId!) === "Đề VSAT")).toBe(true);
    // đề 03 và đề 12 mỗi đề có một câu mà file đáp án ghi hai kết quả khác nhau, để trống chờ giáo viên
    expect(vsat.filter((row) => row.keyedCount === 25)).toHaveLength(10);
    expect(vsat.filter((row) => row.keyedCount === 24).map((row) => row.title).sort()).toEqual(["Thi thử VSAT 2027 đề 03", "Thi thử VSAT 2027 đề 12"]);

    const thpt = rows.filter((row) => row.format === "thpt");
    expect(thpt).toHaveLength(20);
    expect(thpt.every((row) => row.questionCount === 28 && row.keyedCount === 0 && names.get(row.folderId!) === "Đề ôn thi TN THPT 2026")).toBe(true);
  }, 300000);

  it("chạy lại không nạp trùng, đề đã xoá không quay lại", async () => {
    const first = allPapers()[0];
    expect(deletePaper(adminUser(), first.id).ok).toBe(true);
    await seedPapers();
    expect(allPapers()).toHaveLength(31);
  }, 300000);
});
