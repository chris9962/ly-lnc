import { describe, expect, it } from "vitest";
import { LOCK_TTL_MS, holdPaper, lockHolder, releasePaper } from "@/server/paperLocks";

const an = { userId: 1, name: "Cô An", token: "tab-an" };
const binh = { userId: 2, name: "Thầy Bình", token: "tab-binh" };

describe("khoá đề khi đang chỉnh", () => {
  it("người đầu giữ đề, người sau bị chặn cho tới khi hết hạn giữ", () => {
    const now = 1_000_000;
    expect(holdPaper(101, an, now)).toEqual({ ok: true });
    expect(holdPaper(101, binh, now + 1000)).toEqual({ ok: false, heldBy: "Cô An" });
    // báo lại đều thì giữ tiếp
    expect(holdPaper(101, an, now + 5000)).toEqual({ ok: true });
    expect(holdPaper(101, binh, now + 5000 + LOCK_TTL_MS - 1)).toEqual({ ok: false, heldBy: "Cô An" });
    // ngừng báo quá hạn thì coi như không ai giữ
    expect(holdPaper(101, binh, now + 5000 + LOCK_TTL_MS + 1)).toEqual({ ok: true });
    expect(lockHolder(101, now + 5000 + LOCK_TTL_MS + 2)).toMatchObject({ name: "Thầy Bình" });
  });

  it("cùng một người mở tab thứ hai cũng bị chặn", () => {
    expect(holdPaper(102, an, 0)).toEqual({ ok: true });
    expect(holdPaper(102, { ...an, token: "tab-an-2" }, 10)).toEqual({ ok: false, heldBy: "Cô An" });
  });

  it("nhả khoá thì người khác vào được ngay, người không giữ thì không nhả được", () => {
    expect(holdPaper(103, an, 0)).toEqual({ ok: true });
    releasePaper(103, binh.token);
    expect(holdPaper(103, binh, 10)).toEqual({ ok: false, heldBy: "Cô An" });
    releasePaper(103, an.token);
    expect(holdPaper(103, binh, 20)).toEqual({ ok: true });
    expect(lockHolder(104, 0)).toBeNull();
  });
});
