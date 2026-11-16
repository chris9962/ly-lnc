import { describe, expect, it } from "vitest";
import { celebrationLevel, percent, scoreBands } from "@/lib/examStats";

describe("scoreBands", () => {
  it("đếm bài đạt từ 6,5 và từ 8 trên thang 10, tính cả điểm đúng mốc", () => {
    const bands = scoreBands([
      { score: 6.4, maxScore: 10 },
      { score: 6.5, maxScore: 10 },
      { score: 7.9, maxScore: 10 },
      { score: 8, maxScore: 10 },
      { score: 10, maxScore: 10 },
    ]);
    expect(bands).toEqual({ total: 5, from65: 4, from8: 2 });
  });

  it("đề VSAT quy về thang 10 trước khi so mốc", () => {
    expect(scoreBands([{ score: 97.5, maxScore: 150 }, { score: 120, maxScore: 150 }, { score: 96, maxScore: 150 }])).toEqual({ total: 3, from65: 2, from8: 1 });
  });

  it("chưa có bài nộp thì mọi số bằng 0", () => {
    expect(scoreBands([])).toEqual({ total: 0, from65: 0, from8: 0 });
  });
});

describe("percent", () => {
  it("làm tròn tới phần trăm, mẫu số 0 thì trả null", () => {
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBeNull();
  });
});

describe("celebrationLevel", () => {
  it("dưới 6,5 thì không chúc mừng", () => {
    expect(celebrationLevel(6.25, 10)).toBeNull();
    expect(celebrationLevel(0, 0)).toBeNull();
  });

  it("từ 6,5 là mức nhẹ, từ 8 là mức mạnh, trọn điểm là mức pháo hoa", () => {
    expect(celebrationLevel(6.5, 10)).toBe("good");
    expect(celebrationLevel(7.75, 10)).toBe("good");
    expect(celebrationLevel(8, 10)).toBe("great");
    expect(celebrationLevel(9.75, 10)).toBe("great");
    expect(celebrationLevel(10, 10)).toBe("perfect");
  });

  it("đề VSAT quy về thang 10, chỉ đủ 150 điểm mới là trọn điểm", () => {
    expect(celebrationLevel(97.5, 150)).toBe("good");
    expect(celebrationLevel(120, 150)).toBe("great");
    expect(celebrationLevel(149.9, 150)).toBe("great");
    expect(celebrationLevel(150, 150)).toBe("perfect");
  });
});
