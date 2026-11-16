"use client";

import { Check, FileText, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { fieldClass } from "@/components/ui/fieldClass";
import { formatDate } from "@/lib/format";
import { FORMAT_NAMES, type PaperFormat } from "@/lib/paperLayout";

// đề đang gắn với kỳ thi chỉ biết id và tên, các thông tin còn lại có khi đề nằm trong kết quả tìm
export type PickedPaper = { id: number; title: string; grade?: number; questionCount?: number; format?: PaperFormat; folderName?: string | null; updatedAt?: number };

type Props = { value: PickedPaper | null; onChange: (paper: PickedPaper) => void; grade: number | null; error?: string };

const DELAY_MS = 250;

const details = (paper: PickedPaper) =>
  [
    paper.format && FORMAT_NAMES[paper.format],
    paper.grade !== undefined && `Khối ${paper.grade}`,
    paper.questionCount !== undefined && `${paper.questionCount} câu`,
    paper.folderName && `thư mục ${paper.folderName}`,
    paper.updatedAt !== undefined && `sửa ngày ${formatDate(paper.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(", ");

// hộp tìm và chọn đề mở riêng, form kỳ thi chỉ giữ một dòng tên đề nên không bị đẩy dài ra
function PaperSearchDialog({ value, grade, onPick, onClose }: { value: PickedPaper | null; grade: number | null; onPick: (paper: PickedPaper) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<PickedPaper[] | null>(null);

  // máy chủ tìm và lọc theo khối, trả tối đa 20 đề; huỷ lần gọi cũ khi gõ tiếp
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const search = new URLSearchParams({ q: query });
      if (grade) search.set("grade", String(grade));
      const result = await fetch(`/api/papers/options?${search}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ papers?: PickedPaper[] }>)
        .catch(() => null);
      if (!controller.signal.aborted) setFound(result?.papers ?? []);
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, grade]);

  return (
    <Dialog open onClose={onClose} title={grade ? `Chọn đề thi khối ${grade}` : "Chọn đề thi"} wide>
      <div className="relative mb-3">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          aria-label="Tìm đề thi"
          autoComplete="off"
          autoFocus
          value={query}
          placeholder="Tìm đề theo tên"
          onChange={(event) => setQuery(event.target.value)}
          // hộp này nằm trong form kỳ thi, Enter ở ô tìm không được gửi form đó
          onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
          className={cx(fieldClass(false), "pl-9")}
        />
      </div>
      <ul aria-label="Đề thi" className="max-h-[55vh] overflow-y-auto rounded-lg border border-line">
        {found?.map((paper) => {
          const current = paper.id === value?.id;
          return (
            <li key={paper.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                onClick={() => onPick(paper)}
                className={cx("flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-alt focus-visible:-outline-offset-2", current && "bg-surface-alt")}
              >
                <span className="min-w-0 flex-1">
                  <span className={cx("block break-words", current && "font-semibold")}>{paper.title}</span>
                  <span className="block text-sm text-muted">{details(paper)}</span>
                </span>
                {current && <Check aria-hidden="true" strokeWidth={2.6} className="size-5 flex-none text-brand" />}
              </button>
            </li>
          );
        })}
        {found === null && <li className="px-3 py-3 text-muted">Đang tìm</li>}
        {found !== null && !found.length && <li className="px-3 py-3 text-muted">Không có đề đủ đáp án khớp</li>}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Đóng</Button>
      </div>
    </Dialog>
  );
}

export function PaperPicker({ value, onChange, grade, error }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <span id={`${id}-label`} className="mb-1 block font-semibold">
        Đề thi
      </span>
      <div role="group" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : undefined} className={cx("flex items-center gap-3 rounded-lg border bg-surface px-3 py-2", error ? "border-danger" : "border-line")}>
        <FileText aria-hidden="true" className={cx("size-5 flex-none", value ? "text-brand" : "text-muted")} />
        <div className="min-w-0 flex-1">
          {value ? (
            <>
              <p className="break-words font-semibold">{value.title}</p>
              {details(value) && <p className="text-sm text-muted">{details(value)}</p>}
            </>
          ) : (
            <p className="text-muted">Chưa chọn đề</p>
          )}
        </div>
        <Button size="sm" variant={value ? "secondary" : "primary"} onClick={() => setOpen(true)}>
          {value ? "Đổi đề" : "Chọn đề"}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
      {open && (
        <PaperSearchDialog
          value={value}
          grade={grade}
          onClose={() => setOpen(false)}
          onPick={(paper) => {
            onChange(paper);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
