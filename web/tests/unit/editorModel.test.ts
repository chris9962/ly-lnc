import { describe, expect, it } from "vitest";
import { numbering, ordered, removeOption, reshape, type EditorItem, type QuestionItem } from "@/components/editor/model";

const box = (page: number, y0: number) => ({ id: `${page}-${y0}`, page, x0: 40, y0, x1: 550, y1: y0 + 40 });
const question = (id: string, page: number, y0: number): QuestionItem => ({ id, type: "question", label: null, shape: { kind: "mcq", options: 4 }, key: null, boxes: [box(page, y0)] });

describe("ordered và numbering", () => {
  it("sắp theo trang rồi theo chiều dọc, đoạn dẫn gắn vào số câu ngay sau nó", () => {
    const items: EditorItem[] = [question("c", 1, 50), question("a", 0, 100), { id: "ctx", type: "context", count: 2, boxes: [box(0, 300)] }, question("b", 0, 400), question("d", 1, 500)];
    const list = ordered(items);
    expect(list.map((item) => item.id)).toEqual(["a", "ctx", "b", "c", "d"]);
    const { seq, contextOf, covered } = numbering(list);
    expect([...seq.entries()]).toEqual([["a", 1], ["b", 2], ["c", 3], ["d", 4]]);
    expect(covered.get("ctx")).toEqual(["b", "c"]);
    expect(contextOf.get("d")).toBeUndefined();
  });
});

describe("reshape", () => {
  it("bớt lựa chọn thì bỏ đáp án nằm ngoài", () => {
    const item = { ...question("a", 0, 0), key: "D" };
    expect(reshape(item, { kind: "mcq", options: 3 }).key).toBeNull();
    expect(reshape({ ...item, key: "B" }, { kind: "mcq", options: 3 }).key).toBe("B");
  });

  it("thêm ý đúng sai giữ các ý cũ", () => {
    const item: QuestionItem = { ...question("a", 0, 0), shape: { kind: "tf", items: 2 }, key: ["Đ", "S"] };
    expect(reshape(item, { kind: "tf", items: 3 }).key).toEqual(["Đ", "S", null]);
    expect(reshape(item, { kind: "tf", items: 1 }).key).toEqual(["Đ"]);
  });

  it("bớt cột ghép nối thì bỏ chữ nằm ngoài", () => {
    const item: QuestionItem = { ...question("a", 0, 0), shape: { kind: "match", rows: 2, cols: 6 }, key: ["F", "A"] };
    expect(reshape(item, { kind: "match", rows: 2, cols: 5 }).key).toEqual([null, "A"]);
  });
});

describe("removeOption", () => {
  const mcq = (key: string | null): QuestionItem => ({ id: "q", type: "question", label: 1, shape: { kind: "mcq", options: 4 }, key, boxes: [] });

  it("xoá lựa chọn đứng trước đáp án thì đáp án lùi một chữ", () => {
    expect(removeOption(mcq("D"), 1)).toMatchObject({ shape: { kind: "mcq", options: 3 }, key: "C" });
  });

  it("xoá đúng lựa chọn đang là đáp án thì mất đáp án, xoá lựa chọn phía sau thì giữ", () => {
    expect(removeOption(mcq("B"), 1)).toMatchObject({ shape: { options: 3 }, key: null });
    expect(removeOption(mcq("B"), 3)).toMatchObject({ shape: { options: 3 }, key: "B" });
  });

  it("không xoá khi chỉ còn số lựa chọn tối thiểu", () => {
    const two: QuestionItem = { ...mcq("A"), shape: { kind: "mcq", options: 2 } };
    expect(removeOption(two, 0)).toBe(two);
  });
});
