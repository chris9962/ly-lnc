import { defaultShape, isComplete, type AnswerValue, type Box, type QuestionKind, type QuestionShape } from "@/lib/paperLayout";

export type EditorBox = Box & { id: string };

export type EditorItem =
  | { id: string; type: "question"; label: number | null; shape: QuestionShape; key: AnswerValue | null; boxes: EditorBox[] }
  | { id: string; type: "context"; count: number; boxes: EditorBox[] };

export type QuestionItem = Extract<EditorItem, { type: "question" }>;

let counter = 0;
// không dùng crypto.randomUUID vì trang mở qua địa chỉ http trong mạng LAN thì hàm đó không có
export const newId = () => `n${Date.now().toString(36)}${(++counter).toString(36)}`;

export const firstBox = (item: EditorItem) =>
  item.boxes.reduce((best, box) => (box.page < best.page || (box.page === best.page && box.y0 < best.y0) ? box : best), item.boxes[0]);

// thứ tự câu là thứ tự đọc của khung đầu tiên, kéo khung lên xuống thì số thứ tự tự đổi theo
export function ordered(items: EditorItem[]) {
  return [...items].sort((a, b) => {
    const boxA = firstBox(a);
    const boxB = firstBox(b);
    return boxA.page - boxB.page || boxA.y0 - boxB.y0 || (a.type === "context" ? -1 : 1);
  });
}

export function numbering(list: EditorItem[]) {
  const seq = new Map<string, number>();
  const contextOf = new Map<string, string>();
  const covered = new Map<string, string[]>();
  let active: { id: string; left: number } | null = null;
  for (const item of list) {
    if (item.type === "context") {
      active = { id: item.id, left: item.count };
      covered.set(item.id, []);
      continue;
    }
    seq.set(item.id, seq.size + 1);
    if (active && active.left > 0) {
      contextOf.set(item.id, active.id);
      covered.get(active.id)!.push(item.id);
      active.left--;
    }
  }
  return { seq, contextOf, covered };
}

export const kindOf = (item: EditorItem): QuestionKind | "context" => (item.type === "context" ? "context" : item.shape.kind);

export const paperColor = (item: EditorItem) => `var(--paper-${kindOf(item)})`;
export const kindColor = (item: EditorItem) => `var(--kind-${kindOf(item)})`;

export const keyed = (item: EditorItem) => item.type === "question" && isComplete(item.shape, item.key);

export function changeKind(item: QuestionItem, kind: QuestionKind): QuestionItem {
  if (item.shape.kind === kind) return item;
  return { ...item, shape: defaultShape(kind), key: null };
}

// đổi số lựa chọn hay số ý thì giữ các ô còn hợp lệ của đáp án cũ
export function reshape(item: QuestionItem, shape: QuestionShape): QuestionItem {
  const key = item.key;
  if (shape.kind === "mcq") return { ...item, shape, key: typeof key === "string" && key.charCodeAt(0) - 65 < shape.options ? key : null };
  if (shape.kind === "short") return { ...item, shape };
  const length = shape.kind === "tf" ? shape.items : shape.rows;
  const cells = Array.isArray(key) ? key : [];
  const next = Array.from({ length }, (_, index) => {
    const cell = cells[index] ?? null;
    if (shape.kind === "match" && cell && cell.charCodeAt(0) - 65 >= shape.cols) return null;
    return cell;
  });
  return { ...item, shape, key: next.some((cell) => cell !== null) ? next : null };
}
