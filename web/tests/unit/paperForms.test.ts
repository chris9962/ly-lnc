import { describe, expect, it } from "vitest";
import { createExamForm, parseVnDateTime } from "@/lib/examForm";
import { folderForm, listPapersQuery, paperLayoutForm, paperMetaForm } from "@/lib/paperForm";
import { saveAnswerForm } from "@/lib/attemptForm";

const box = { page: 0, x0: 40, y0: 100, x1: 550, y1: 160 };

describe("paperMetaForm", () => {
  it("cắt khoảng trắng tên đề, khối bắt buộc", () => {
    expect(paperMetaForm.parse({ title: "  Đề   giữa kì ", grade: "12", folderId: "" })).toEqual({ title: "Đề giữa kì", grade: 12, folderId: null });
    const missing = paperMetaForm.safeParse({ title: "", grade: "9", folderId: "3" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.map((issue) => issue.path[0])).toEqual(["title", "grade"]);
  });
});

describe("folderForm", () => {
  it("tên thư mục không rỗng, thư mục cha có thể trống", () => {
    expect(folderForm.parse({ name: " Chương 1 ", parentId: "" })).toEqual({ name: "Chương 1", parentId: null });
    expect(folderForm.parse({ name: "Học kỳ 1", parentId: 4 })).toEqual({ name: "Học kỳ 1", parentId: 4 });
    expect(folderForm.safeParse({ name: "  ", parentId: null }).success).toBe(false);
  });
});

describe("listPapersQuery", () => {
  it("giá trị lạ trở về mặc định", () => {
    expect(listPapersQuery.parse({ grade: "13", answers: "x", page: "-1", folder: "abc" })).toEqual({ q: "", grade: undefined, answers: "all", page: 1, folder: undefined });
    expect(listPapersQuery.parse({ grade: "10", answers: "none", page: "2", folder: "5", q: " x " })).toEqual({ q: "x", grade: 10, answers: "none", page: 2, folder: 5 });
  });
});

describe("paperLayoutForm", () => {
  const question = (extra: object) => ({ type: "question", label: 1, boxes: [box], ...extra });

  it("nhận đủ bốn loại câu và đoạn dẫn chung", () => {
    const parsed = paperLayoutForm.parse({
      format: "vsat",
      items: [
        { type: "context", count: 2, boxes: [box] },
        question({ shape: { kind: "mcq", options: 4 }, key: "B" }),
        question({ shape: { kind: "tf", items: 4 }, key: ["Đ", "S", null, "Đ"] }),
        question({ shape: { kind: "match", rows: 4, cols: 6 }, key: ["A", "F", null, null] }),
        question({ shape: { kind: "short" }, key: " 19,1 " }),
        question({ shape: { kind: "short" }, key: null }),
      ],
    });
    expect(parsed.items).toHaveLength(6);
    expect(parsed.items[4]).toMatchObject({ key: "19,1" });
    expect(parsed.items[5]).toMatchObject({ key: null });
  });

  it("đáp án phải nằm trong số lựa chọn", () => {
    const result = paperLayoutForm.safeParse({ format: "thpt", items: [question({ shape: { kind: "mcq", options: 4 }, key: "E" })] });
    expect(result.success).toBe(false);
  });

  it("đáp án đúng sai phải đủ số ý", () => {
    const result = paperLayoutForm.safeParse({ format: "thpt", items: [question({ shape: { kind: "tf", items: 4 }, key: ["Đ"] })] });
    expect(result.success).toBe(false);
  });

  it("khung phải có chiều cao và chiều rộng", () => {
    const result = paperLayoutForm.safeParse({ format: "thpt", items: [question({ shape: { kind: "short" }, key: null, boxes: [{ ...box, y1: box.y0 }] })] });
    expect(result.success).toBe(false);
  });

  it("cần ít nhất một câu", () => {
    expect(paperLayoutForm.safeParse({ format: "thpt", items: [{ type: "context", count: 2, boxes: [box] }] }).success).toBe(false);
  });
});

describe("parseVnDateTime", () => {
  it("đọc ngày giờ Việt Nam", () => {
    expect(parseVnDateTime("05/11/2026", "07:30")).toBe(Date.UTC(2026, 10, 5, 0, 30));
    expect(parseVnDateTime("5/11/2026", "7:30")).toBe(Date.UTC(2026, 10, 5, 0, 30));
    expect(parseVnDateTime("31/02/2026", "07:30")).toBeNull();
    expect(parseVnDateTime("05/11/2026", "25:00")).toBeNull();
  });
});

describe("createExamForm", () => {
  const base = { title: "Kiểm tra 15 phút", grade: "11", paperId: "3", duration: "45", startDate: "05/11/2026", startTime: "07:30", endDate: "05/11/2026", endTime: "09:00" };

  it("hẹn giờ thì đọc giờ bắt đầu và kết thúc", () => {
    const parsed = createExamForm.parse({ ...base, mode: "scheduled" });
    expect(parsed).toMatchObject({ title: "Kiểm tra 15 phút", grade: 11, paperId: 3, durationMinutes: 45, startsAt: Date.UTC(2026, 10, 5, 0, 30), endsAt: Date.UTC(2026, 10, 5, 2, 0) });
  });

  it("thi ngay thì giờ bắt đầu để trống cho máy chủ điền", () => {
    const parsed = createExamForm.parse({ ...base, mode: "now", startDate: "", startTime: "" });
    expect(parsed.startsAt).toBeNull();
  });

  it("giờ kết thúc phải sau giờ bắt đầu", () => {
    const result = createExamForm.safeParse({ ...base, mode: "scheduled", endTime: "07:00" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["endTime"] });
  });

  it("thời điểm xem đáp án mặc định là sau khi kỳ thi kết thúc", () => {
    expect(createExamForm.parse({ ...base, mode: "now" }).answersAt).toBe("end");
    expect(createExamForm.parse({ ...base, mode: "now", answersAt: "submit" }).answersAt).toBe("submit");
    expect(createExamForm.safeParse({ ...base, mode: "now", answersAt: "never" }).success).toBe(false);
  });

  it("thời lượng từ 1 đến 300 phút", () => {
    expect(createExamForm.safeParse({ ...base, mode: "scheduled", duration: "0" }).success).toBe(false);
  });
});

describe("saveAnswerForm", () => {
  it("nhận chữ hoặc mảng ô, ô trống là null", () => {
    expect(saveAnswerForm.parse({ seq: 3, value: "A" })).toEqual({ seq: 3, value: "A" });
    expect(saveAnswerForm.parse({ seq: 3, value: ["Đ", null] })).toEqual({ seq: 3, value: ["Đ", null] });
    expect(saveAnswerForm.parse({ seq: 3, value: null })).toEqual({ seq: 3, value: null });
    expect(saveAnswerForm.safeParse({ seq: 0, value: "A" }).success).toBe(false);
    expect(saveAnswerForm.safeParse({ seq: 1, value: "x".repeat(60) }).success).toBe(false);
  });
});
