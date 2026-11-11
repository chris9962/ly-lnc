import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, formatScore, sameShortAnswer, scoreQuestion, maxScore } from "@/lib/scoring";

const thpt = DEFAULT_RULES.thpt;
const vsat = DEFAULT_RULES.vsat;

describe("scoreQuestion theo thang THPT", () => {
  it("nhiều lựa chọn đúng được 0,25", () => {
    expect(scoreQuestion({ kind: "mcq", options: 4 }, "B", "B", thpt)).toEqual({ points: 0.25, correct: true });
    expect(scoreQuestion({ kind: "mcq", options: 4 }, "B", "C", thpt)).toEqual({ points: 0, correct: false });
    expect(scoreQuestion({ kind: "mcq", options: 4 }, "B", null, thpt)).toEqual({ points: 0, correct: false });
  });

  it("đúng sai tính theo số ý đúng", () => {
    const shape = { kind: "tf" as const, items: 4 };
    const key = ["Đ", "S", "Đ", "S"];
    expect(scoreQuestion(shape, key, ["S", "Đ", "S", "Đ"], thpt).points).toBe(0);
    expect(scoreQuestion(shape, key, ["Đ", "Đ", "S", "Đ"], thpt).points).toBe(0.1);
    expect(scoreQuestion(shape, key, ["Đ", "S", "S", "Đ"], thpt).points).toBe(0.25);
    expect(scoreQuestion(shape, key, ["Đ", "S", "Đ", null], thpt).points).toBe(0.5);
    expect(scoreQuestion(shape, key, ["Đ", "S", "Đ", "S"], thpt)).toEqual({ points: 1, correct: true });
  });

  it("trả lời ngắn chấp nhận dấu phẩy và dấu chấm", () => {
    expect(scoreQuestion({ kind: "short" }, "19,1", "19.1", thpt)).toEqual({ points: 0.25, correct: true });
    expect(scoreQuestion({ kind: "short" }, "19,1", "19,10", thpt).correct).toBe(true);
    expect(scoreQuestion({ kind: "short" }, "19,1", "19", thpt).correct).toBe(false);
  });

  it("đề đủ 28 câu tối đa 10 điểm", () => {
    const shapes = [
      ...Array.from({ length: 18 }, () => ({ kind: "mcq" as const, options: 4 })),
      ...Array.from({ length: 4 }, () => ({ kind: "tf" as const, items: 4 })),
      ...Array.from({ length: 6 }, () => ({ kind: "short" as const })),
    ];
    expect(maxScore(shapes, thpt)).toBe(10);
  });
});

describe("scoreQuestion theo thang VSAT", () => {
  it("đúng sai: 1, 2, 3 ý được 1, 2, 3 điểm, đủ 4 ý được 6", () => {
    const shape = { kind: "tf" as const, items: 4 };
    const key = ["Đ", "Đ", "Đ", "Đ"];
    expect(scoreQuestion(shape, key, ["Đ", "S", "S", "S"], vsat).points).toBe(1);
    expect(scoreQuestion(shape, key, ["Đ", "Đ", "Đ", "S"], vsat).points).toBe(3);
    expect(scoreQuestion(shape, key, key, vsat).points).toBe(6);
  });

  it("ghép nối: mỗi ý 1,5 điểm, đủ 4 ý được 6", () => {
    const shape = { kind: "match" as const, rows: 4, cols: 6 };
    const key = ["C", "A", "F", "B"];
    expect(scoreQuestion(shape, key, ["C", "B", "A", "D"], vsat).points).toBe(1.5);
    expect(scoreQuestion(shape, key, ["C", "A", "F", "D"], vsat).points).toBe(4.5);
    expect(scoreQuestion(shape, key, key, vsat).points).toBe(6);
  });

  it("đề 25 câu tối đa 150 điểm", () => {
    const shapes = [
      ...Array.from({ length: 9 }, () => ({ kind: "tf" as const, items: 4 })),
      ...Array.from({ length: 6 }, () => ({ kind: "mcq" as const, options: 4 })),
      ...Array.from({ length: 5 }, () => ({ kind: "match" as const, rows: 4, cols: 6 })),
      ...Array.from({ length: 5 }, () => ({ kind: "short" as const })),
    ];
    expect(maxScore(shapes, vsat)).toBe(150);
  });
});

describe("câu có số ý khác 4", () => {
  it("chia theo tỉ lệ số ý đúng, đúng hết thì đủ điểm", () => {
    const shape = { kind: "tf" as const, items: 2 };
    expect(scoreQuestion(shape, ["Đ", "S"], ["Đ", "Đ"], vsat).points).toBe(3);
    expect(scoreQuestion(shape, ["Đ", "S"], ["Đ", "S"], vsat).points).toBe(6);
  });
});

describe("sameShortAnswer", () => {
  it("bỏ khoảng trắng, so số theo giá trị", () => {
    expect(sameShortAnswer("2940", " 2 940 ")).toBe(true);
    expect(sameShortAnswer("-0,5", "-0.50")).toBe(true);
    expect(sameShortAnswer("0,5", "")).toBe(false);
  });

  it("đáp án không phải số thì so chữ không phân biệt hoa thường", () => {
    expect(sameShortAnswer("ABC", "abc")).toBe(true);
  });
});

describe("formatScore", () => {
  it("viết dấu phẩy thập phân, bỏ số 0 thừa", () => {
    expect(formatScore(7.75)).toBe("7,75");
    expect(formatScore(10)).toBe("10");
    expect(formatScore(0.1 + 0.2)).toBe("0,3");
  });
});
