import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzePdf, openPdf, renderBoxes } from "@/server/pdf/layout";

const TEMPLATE_DIR = path.resolve(__dirname, "../../../template");
const files = fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".pdf")).sort();
const load = (name: string) => openPdf(fs.readFileSync(path.join(TEMPLATE_DIR, name)));

// số liệu lấy từ bản thử Python đã kiểm bằng mắt, ghi ở KE-HOACH.md mục 3.6
const expected = [
  { file: "2025. GK1", total: 28, kinds: { mcq: 18, tf: 4, short: 6 }, contexts: 0, format: "thpt" },
  { file: "2026. de 7", total: 28, kinds: { mcq: 18, tf: 4, short: 6 }, contexts: 5, format: "thpt" },
  { file: "2026.on tap", total: 28, kinds: { mcq: 18, tf: 4, short: 6 }, contexts: 0, format: "thpt" },
  { file: "2027. DE VSAT (DE 0207)", total: 25, kinds: { tf: 9, mcq: 6, match: 5, short: 5 }, contexts: 2, format: "vsat" },
  { file: "2027. DE VSAT (DE 05)", total: 25, kinds: { tf: 9, mcq: 6, match: 5, short: 5 }, contexts: 1, format: "vsat" },
  { file: "Đề 4", total: 25, kinds: { tf: 9, mcq: 6, match: 5, short: 5 }, contexts: 2, format: "vsat" },
];

describe("analyzePdf trên đề mẫu", () => {
  it("có đủ 6 đề mẫu", () => {
    expect(files).toHaveLength(6);
  });

  for (const [index, want] of expected.entries()) {
    it(want.file, () => {
      const name = files[index];
      expect(name.startsWith(want.file)).toBe(true);
      const result = analyzePdf(load(name));
      const questions = result.items.filter((item) => item.type === "question");
      const contexts = result.items.filter((item) => item.type === "context");
      expect(questions).toHaveLength(want.total);
      const kinds: Record<string, number> = {};
      for (const question of questions) kinds[question.kind ?? "?"] = (kinds[question.kind ?? "?"] ?? 0) + 1;
      expect(kinds).toEqual(want.kinds);
      expect(contexts).toHaveLength(want.contexts);
      expect(result.format).toBe(want.format);
      for (const item of result.items) {
        expect(item.boxes.length).toBeGreaterThan(0);
        for (const box of item.boxes) {
          expect(box.y1).toBeGreaterThan(box.y0);
          expect(box.x1).toBeGreaterThan(box.x0);
          expect(box.page).toBeLessThan(result.pages.length);
        }
      }
    });
  }

  it("khung câu 1 và câu 2 của đề GK1 khớp bản thử", () => {
    const result = analyzePdf(load(files[0]));
    const [first, second] = result.items;
    expect(first.boxes[0].page).toBe(0);
    expect(first.boxes[0].y0).toBeCloseTo(112.8, 0);
    expect(second.boxes[0].y0).toBeCloseTo(160.2, 0);
  });

  it("đọc bảng đáp án sau dòng HẾT", () => {
    const result = analyzePdf(load(files[2]));
    const keys = result.items.flatMap((item) => (item.type === "question" ? [item.key] : []));
    expect(keys).toEqual([
      "D", "C", "A", "D", "C", "A", "C", "D", "C", "A", "A", "B", "C", "B", "B", "B", "D", "A",
      ["S", "Đ", "S", "Đ"], ["S", "Đ", "Đ", "S"], ["Đ", "S", "S", "Đ"], ["Đ", "Đ", "S", "Đ"],
      "56", "80", "2940", "19,1", "962", "68,8",
    ]);
    expect(result.warnings.some((warning) => warning.includes("Bảng đáp án"))).toBe(false);
  });

  it("đề GK1 cũng đọc đủ đáp án", () => {
    const result = analyzePdf(load(files[0]));
    const questions = result.items.filter((item) => item.type === "question");
    expect(questions.every((question) => question.key !== undefined)).toBe(true);
    expect(questions[18].key).toEqual(["Đ", "S", "S", "S"]);
    expect(questions[25].key).toBe("96,2");
  });

  it("đề không có bảng đáp án thì để trống", () => {
    const result = analyzePdf(load(files[3]));
    expect(result.items.every((item) => item.type !== "question" || item.key === undefined)).toBe(true);
  });

  it("câu vắt qua hai trang có hai khung", () => {
    const result = analyzePdf(load(files[1]));
    expect(result.items.some((item) => new Set(item.boxes.map((box) => box.page)).size > 1)).toBe(true);
  });

  it("không lấy gì sau dòng HẾT", () => {
    const result = analyzePdf(load(files[2]));
    const last = result.items.at(-1)!;
    expect(last.type).toBe("question");
    expect(result.tailText).toMatch(/\S/);
  });

  it("cảnh báo khi số câu ghi trên đề bị lặp", () => {
    const result = analyzePdf(load(files[4]));
    expect(result.warnings.some((warning) => warning.includes("Câu 16"))).toBe(true);
  });

  it("đoạn dẫn chung ghi số câu dùng chung", () => {
    const result = analyzePdf(load(files[1]));
    const context = result.items.find((item) => item.type === "context");
    expect(context && context.type === "context" && context.count).toBeGreaterThanOrEqual(2);
  });
});

describe("renderBoxes", () => {
  it("ghép hai khung thành một ảnh PNG cao bằng tổng hai khung", () => {
    const doc = load(files[0]);
    const image = renderBoxes(doc, [
      { page: 0, x0: 50, y0: 100, x1: 550, y1: 150 },
      { page: 1, x0: 50, y0: 40, x1: 550, y1: 90 },
    ], 144);
    expect(image.width).toBe(1000);
    expect(image.height).toBe(200);
    expect([...image.png.slice(1, 4)].map((code) => String.fromCharCode(code)).join("")).toBe("PNG");
  });
});
