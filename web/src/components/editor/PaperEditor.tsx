"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerInput } from "@/components/exam/AnswerInput";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cx } from "@/components/ui/cx";
import { fieldClass } from "@/components/ui/fieldClass";
import { StatusTag } from "@/components/ui/StatusTag";
import { callApi } from "@/lib/api";
import { FORMAT_NAMES, KIND_NAMES, LIMITS, QUESTION_KINDS, defaultShape, formatAnswer, letter, type Box, type PaperFormat, type QuestionShape } from "@/lib/paperLayout";
import { pageUrl } from "@/lib/paperView";
import { changeKind, keyed, kindColor, newId, numbering, ordered, paperColor, reshape, type EditorItem, type QuestionItem } from "./model";
import { PageCanvas, type CanvasBox } from "./PageCanvas";

type Props = {
  paperId: number;
  title: string;
  version: number;
  format: PaperFormat;
  pageSizes: { width: number; height: number }[];
  initial: EditorItem[];
  locked: boolean;
};

type Selection = { item: string; box: string | null } | null;
type Notice = { tone: "success" | "danger"; text: string } | null;

const small = "min-h-8 px-2.5 py-1 text-sm";

export function PaperEditor({ paperId, title, version: initialVersion, format: initialFormat, pageSizes, initial, locked }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [format, setFormat] = useState(initialFormat);
  const [selection, setSelection] = useState<Selection>(null);
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(initialVersion);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirm, setConfirm] = useState<"remove" | "leave" | null>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => ordered(items), [items]);
  const { seq, contextOf, covered } = useMemo(() => numbering(list), [list]);
  const questions = list.filter((item): item is QuestionItem => item.type === "question");
  const keyedCount = questions.filter(keyed).length;
  const selected = items.find((item) => item.id === selection?.item) ?? null;

  const nameOf = (item: EditorItem) => (item.type === "context" ? "Đoạn dẫn chung" : `Câu ${item.label ?? seq.get(item.id)}`);

  // rời trang khi còn thay đổi chưa lưu thì trình duyệt hỏi lại
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: (items: EditorItem[]) => EditorItem[]) {
    setItems(next);
    setDirty(true);
    setNotice(null);
  }

  const updateItem = (id: string, fn: (item: EditorItem) => EditorItem) => change((current) => current.map((item) => (item.id === id ? fn(item) : item)));
  const updateQuestion = (id: string, fn: (item: QuestionItem) => QuestionItem) => updateItem(id, (item) => (item.type === "question" ? fn(item) : item));

  function moveBox(itemId: string, boxId: string, box: Box) {
    updateItem(itemId, (item) => ({ ...item, boxes: item.boxes.map((current) => (current.id === boxId ? { ...box, id: boxId } : current)) }));
  }

  function select(itemId: string, boxId: string | null = null, scroll = false) {
    const item = items.find((candidate) => candidate.id === itemId);
    setSelection({ item: itemId, box: boxId ?? item?.boxes[0]?.id ?? null });
    if (scroll && item) {
      const target = boxId ? item.boxes.find((box) => box.id === boxId) : item.boxes[0];
      document.getElementById(`box-${target?.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function step(direction: 1 | -1) {
    const current = selected?.type === "question" ? questions.indexOf(selected) : -1;
    const next = questions[current === -1 ? (direction === 1 ? 0 : questions.length - 1) : current + direction];
    if (next) select(next.id, null, true);
  }

  // khung mới đặt giữa phần trang đang nằm giữa màn hình
  function boxInView(height: number): Box {
    let best = { page: 0, distance: Infinity, y: 100 };
    pagesRef.current?.querySelectorAll<HTMLElement>("[data-page]").forEach((element) => {
      const rect = element.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.bottom) / 2 - window.innerHeight / 2);
      const page = Number(element.dataset.page);
      if (distance < best.distance) best = { page, distance, y: ((window.innerHeight / 2 - rect.top) / rect.height) * pageSizes[page].height };
    });
    const size = pageSizes[best.page];
    const y0 = Math.max(10, Math.min(size.height - height - 10, best.y - height / 2));
    return { page: best.page, x0: 40, y0: Math.round(y0), x1: Math.round(size.width - 40), y1: Math.round(y0 + height) };
  }

  function addQuestion() {
    const box = { ...boxInView(80), id: newId() };
    const kind = selected?.type === "question" ? selected.shape.kind : "mcq";
    const item: QuestionItem = { id: newId(), type: "question", label: null, shape: defaultShape(kind), key: null, boxes: [box] };
    change((current) => [...current, item]);
    setSelection({ item: item.id, box: box.id });
  }

  function addContext() {
    const box = { ...boxInView(120), id: newId() };
    const item: EditorItem = { id: newId(), type: "context", count: 2, boxes: [box] };
    change((current) => [...current, item]);
    setSelection({ item: item.id, box: box.id });
  }

  function addBoxToSelected() {
    if (!selected || selected.boxes.length >= 6) return;
    const box = { ...boxInView(80), id: newId() };
    updateItem(selected.id, (item) => ({ ...item, boxes: [...item.boxes, box] }));
    setSelection({ item: selected.id, box: box.id });
  }

  function removeSelectedBox() {
    if (!selected || selected.boxes.length < 2 || !selection?.box) return;
    updateItem(selected.id, (item) => ({ ...item, boxes: item.boxes.filter((box) => box.id !== selection.box) }));
    setSelection({ item: selected.id, box: selected.boxes.find((box) => box.id !== selection.box)!.id });
  }

  function removeSelectedItem() {
    if (!selected) return;
    change((current) => current.filter((item) => item.id !== selected.id));
    setSelection(null);
    setConfirm(null);
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    const plain = (boxes: Box[]) => boxes.map(({ page, x0, y0, x1, y1 }) => ({ page, x0, y0, x1, y1 }));
    const payload = list.map((item) =>
      item.type === "context"
        ? { type: "context", count: item.count, boxes: plain(item.boxes) }
        : { type: "question", label: item.label, shape: item.shape, key: item.key, boxes: plain(item.boxes) },
    );
    const result = await callApi<{ rescored: number }>(`/api/papers/${paperId}/layout`, "PUT", { format, items: payload, baseVersion: version });
    setSaving(false);
    if (!result.ok) {
      setNotice({ tone: "danger", text: result.message });
      return;
    }
    setVersion(version + 1);
    setDirty(false);
    // không tải lại trang để giữ nguyên câu đang chọn và vị trí cuộn
    setNotice({ tone: "success", text: result.rescored ? `Đã lưu và chấm lại ${result.rescored} bài` : "Đã lưu" });
  }

  // phím tắt: chữ A đến H chọn đáp án câu nhiều lựa chọn rồi sang câu sau; mũi tên trái phải đổi câu
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.closest("dialog") || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        if (target.getAttribute("role") === "button" && target.dataset.box) return;
        event.preventDefault();
        step(event.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (selected?.type !== "question" || selected.shape.kind !== "mcq" || !/^[a-h]$/i.test(event.key)) return;
      const option = event.key.toUpperCase();
      if (option.charCodeAt(0) - 65 >= selected.shape.options) return;
      event.preventDefault();
      updateQuestion(selected.id, (item) => ({ ...item, key: option }));
      step(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const canvasBoxes = (page: number): CanvasBox[] =>
    list.flatMap((item) =>
      item.boxes
        .filter((box) => box.page === page)
        .map((box) => {
          const parts = item.boxes.length > 1 ? ` (${item.boxes.indexOf(box) + 1}/${item.boxes.length})` : "";
          const summary = item.type === "question" ? formatAnswer(item.shape, item.key) : "";
          return {
            itemId: item.id,
            box,
            color: paperColor(item),
            tag: item.type === "context" ? `Đoạn dẫn${parts}` : `${nameOf(item)}${parts}${summary ? ` = ${summary}` : ""}`,
            label: `${nameOf(item)}${parts}, ${item.type === "question" ? (keyed(item) ? `đáp án ${summary}` : "chưa có đáp án") : `dùng cho ${item.count} câu`}`,
            selected: item.id === selection?.item,
            focused: box.id === selection?.box,
            dashed: item.type === "question" && !keyed(item),
          };
        }),
    );

  const selectedShape = selected?.type === "question" ? selected.shape : null;
  const setShape = (shape: QuestionShape) => selected && updateQuestion(selected.id, (item) => reshape(item, shape));
  const bounded = (value: number, [min, max]: readonly [number, number]) => Math.max(min, Math.min(max, value));

  return (
    <div>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
        {dirty ? (
          <button type="button" onClick={() => setConfirm("leave")} className="cursor-pointer text-sm text-muted hover:text-brand">
            Về trang đề
          </button>
        ) : (
          <Link href={`/papers/${paperId}`} className="text-sm text-muted hover:text-brand">
            Về trang đề
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate font-bold">{title}</h1>
        <StatusTag tone={questions.length && keyedCount === questions.length ? "success" : "warning"}>
          Đáp án {keyedCount}/{questions.length}
        </StatusTag>
        <span role="status" className={cx("hidden text-sm sm:inline", notice?.tone === "danger" ? "text-danger" : notice ? "text-success" : "text-muted")}>
          {saving ? "Đang lưu và cắt ảnh" : notice ? notice.text : dirty ? "Chưa lưu" : "Đã lưu"}
        </span>
        <Button variant="primary" onClick={save} disabled={saving || !dirty}>
          Lưu
        </Button>
      </div>
      {notice?.tone === "danger" && (
        <p role="alert" className="border-b border-danger bg-danger-soft px-4 py-2 text-danger sm:hidden">
          {notice.text}
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div ref={pagesRef} className="min-w-0 bg-bg px-4 py-6">
          {pageSizes.map((size, index) => (
            <div key={index} data-page={index}>
              <PageCanvas index={index} size={size} src={pageUrl(paperId, index)} boxes={canvasBoxes(index)} onSelect={(itemId, boxId) => setSelection({ item: itemId, box: boxId })} onChange={moveBox} />
            </div>
          ))}
        </div>

        <aside aria-label="Câu đang chọn" className="border-l border-line bg-surface lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          <div className="space-y-3 border-b border-line p-4">
            {locked && <p className="rounded-lg border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">Đề đã có học sinh làm bài, chỉ sửa được khung và đáp án</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button className={small} onClick={addQuestion} disabled={locked}>
                Thêm câu
              </Button>
              <Button className={small} onClick={addContext}>
                Thêm đoạn dẫn
              </Button>
              <label className="flex w-full items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted">Thang điểm</span>
                <select
                  value={format}
                  disabled={locked}
                  onChange={(event) => {
                    setFormat(event.target.value as PaperFormat);
                    setDirty(true);
                  }}
                  className={cx(fieldClass(false), "flex-1 py-1 text-sm")}
                >
                  {(["thpt", "vsat"] as const).map((value) => (
                    <option key={value} value={value}>
                      {FORMAT_NAMES[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {selected ? (
            <section aria-labelledby="selected-title" className="border-b border-line p-4">
              <div className="mb-3 flex items-center gap-2">
                <span aria-hidden="true" className="size-3 rounded-full" style={{ background: kindColor(selected) }} />
                <h2 id="selected-title" className="flex-1 text-lg font-bold">
                  {nameOf(selected)}
                </h2>
                {selected.type === "question" && <span className="text-sm text-muted">thứ {seq.get(selected.id)} trong đề</span>}
              </div>

              {selected.type === "question" ? (
                <>
                  <div className="mb-3 grid grid-cols-[1fr_7rem] gap-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold">Loại câu</span>
                      <select
                        value={selected.shape.kind}
                        disabled={locked}
                        onChange={(event) => updateQuestion(selected.id, (item) => changeKind(item, event.target.value as QuestionItem["shape"]["kind"]))}
                        className={fieldClass(false)}
                      >
                        {QUESTION_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {KIND_NAMES[kind]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-semibold">Số trên đề</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={selected.label ?? ""}
                        placeholder={String(seq.get(selected.id))}
                        onChange={(event) => updateQuestion(selected.id, (item) => ({ ...item, label: event.target.value ? Math.max(1, Math.min(999, Number(event.target.value))) : null }))}
                        className={fieldClass(false)}
                      />
                    </label>
                  </div>

                  <div className="mb-3 rounded-lg border border-line bg-surface-alt p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">Đáp án</span>
                      {keyed(selected) ? <StatusTag tone="success">Đã nhập</StatusTag> : <StatusTag tone="warning">Chưa nhập</StatusTag>}
                    </div>
                    <AnswerInput
                      shape={selected.shape}
                      value={selected.key}
                      format={format}
                      name={nameOf(selected)}
                      onChange={(key) => updateQuestion(selected.id, (item) => ({ ...item, key }))}
                      onEnter={() => step(1)}
                    />
                    {selectedShape && selectedShape.kind !== "short" && !locked && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedShape.kind === "mcq" && (
                          <>
                            <Button className={small} disabled={selectedShape.options >= LIMITS.options[1]} onClick={() => setShape({ ...selectedShape, options: bounded(selectedShape.options + 1, LIMITS.options) })}>
                              Thêm lựa chọn {letter(selectedShape.options)}
                            </Button>
                            <Button className={small} disabled={selectedShape.options <= LIMITS.options[0]} onClick={() => setShape({ ...selectedShape, options: bounded(selectedShape.options - 1, LIMITS.options) })}>
                              Bớt lựa chọn
                            </Button>
                          </>
                        )}
                        {selectedShape.kind === "tf" && (
                          <>
                            <Button className={small} disabled={selectedShape.items >= LIMITS.items[1]} onClick={() => setShape({ ...selectedShape, items: bounded(selectedShape.items + 1, LIMITS.items) })}>
                              Thêm ý
                            </Button>
                            <Button className={small} disabled={selectedShape.items <= LIMITS.items[0]} onClick={() => setShape({ ...selectedShape, items: bounded(selectedShape.items - 1, LIMITS.items) })}>
                              Bớt ý
                            </Button>
                          </>
                        )}
                        {selectedShape.kind === "match" && (
                          <>
                            <Button className={small} disabled={selectedShape.rows >= LIMITS.rows[1]} onClick={() => setShape({ ...selectedShape, rows: bounded(selectedShape.rows + 1, LIMITS.rows) })}>
                              Thêm ý
                            </Button>
                            <Button className={small} disabled={selectedShape.rows <= LIMITS.rows[0]} onClick={() => setShape({ ...selectedShape, rows: bounded(selectedShape.rows - 1, LIMITS.rows) })}>
                              Bớt ý
                            </Button>
                            <Button className={small} disabled={selectedShape.cols >= LIMITS.cols[1]} onClick={() => setShape({ ...selectedShape, cols: bounded(selectedShape.cols + 1, LIMITS.cols) })}>
                              Thêm cột {letter(selectedShape.cols)}
                            </Button>
                            <Button className={small} disabled={selectedShape.cols <= LIMITS.cols[0]} onClick={() => setShape({ ...selectedShape, cols: bounded(selectedShape.cols - 1, LIMITS.cols) })}>
                              Bớt cột
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {contextOf.get(selected.id) && (
                    <Button className={cx(small, "mb-3")} onClick={() => select(contextOf.get(selected.id)!, null, true)}>
                      Xem đoạn dẫn chung của câu này
                    </Button>
                  )}
                </>
              ) : (
                <div className="mb-3">
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Dùng cho</span>
                    <select
                      value={selected.count}
                      onChange={(event) => updateItem(selected.id, (item) => (item.type === "context" ? { ...item, count: Number(event.target.value) } : item))}
                      className={fieldClass(false)}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>
                          {count} câu ngay sau
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-2 text-sm text-muted">
                    {(covered.get(selected.id) ?? []).length
                      ? `Gồm ${(covered.get(selected.id) ?? []).map((id) => nameOf(items.find((item) => item.id === id)!)).join(", ")}`
                      : "Chưa có câu nào phía sau"}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <Button className={small} onClick={addBoxToSelected} disabled={selected.boxes.length >= 6}>
                  Thêm khung
                </Button>
                {selected.boxes.length > 1 && (
                  <Button className={small} onClick={removeSelectedBox}>
                    Xoá khung đang chọn
                  </Button>
                )}
                <Button variant="danger" className={cx(small, "ml-auto")} onClick={() => setConfirm("remove")} disabled={locked && selected.type === "question"}>
                  {selected.type === "question" ? "Xoá câu" : "Xoá đoạn dẫn"}
                </Button>
              </div>

              {selected.type === "question" && (
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => step(-1)} disabled={questions.indexOf(selected) <= 0}>
                    Câu trước
                  </Button>
                  <Button className="flex-1" onClick={() => step(1)} disabled={questions.indexOf(selected) >= questions.length - 1}>
                    Câu sau
                  </Button>
                </div>
              )}
            </section>
          ) : (
            <p className="border-b border-line p-4 text-sm text-muted">Chưa chọn câu</p>
          )}

          <section aria-labelledby="all-title" className="p-4">
            <h2 id="all-title" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Tất cả câu
            </h2>
            {list.length ? (
              <ul className="space-y-1">
                {list.map((item) => {
                  const summary = item.type === "question" ? formatAnswer(item.shape, item.key) : "";
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-current={item.id === selection?.item ? "true" : undefined}
                        onClick={() => select(item.id, null, true)}
                        className={cx(
                          "flex w-full cursor-pointer items-center gap-2 rounded-md border-l-4 px-2 py-1.5 text-left text-sm",
                          item.id === selection?.item ? "bg-surface-alt font-semibold" : "hover:bg-surface-alt",
                          item.type === "context" && "pl-4",
                        )}
                        style={{ borderLeftColor: kindColor(item) }}
                      >
                        <span className="w-16 shrink-0">{item.type === "context" ? "Đoạn dẫn" : nameOf(item)}</span>
                        <span className="flex-1 truncate text-muted">{item.type === "context" ? `cho ${item.count} câu` : KIND_NAMES[item.shape.kind]}</span>
                        {item.type === "question" && (summary && keyed(item) ? <span className="max-w-28 truncate font-bold">{summary}</span> : <span className="text-warning">Chưa có</span>)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Chưa có câu nào</p>
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === "remove"}
        question={`Xoá ${selected ? nameOf(selected).toLowerCase() : ""} cùng các khung của nó?`}
        confirmLabel="Xoá"
        danger
        onConfirm={removeSelectedItem}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "leave"}
        question="Bỏ các thay đổi chưa lưu?"
        confirmLabel="Bỏ thay đổi"
        danger
        onConfirm={() => {
          setDirty(false);
          router.push(`/papers/${paperId}`);
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
