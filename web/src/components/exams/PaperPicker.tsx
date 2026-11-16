"use client";

import { CircleCheck, Circle, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cx } from "@/components/ui/cx";
import { fieldClass } from "@/components/ui/fieldClass";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatDate } from "@/lib/format";
import { FORMAT_NAMES, type PaperFormat } from "@/lib/paperLayout";

// đề đang gắn với kỳ thi chỉ biết id và tên, các thông tin còn lại có khi đề nằm trong kết quả tìm
export type PickedPaper = { id: number; title: string; grade?: number; questionCount?: number; format?: PaperFormat; folderName?: string | null; updatedAt?: number };

type Props = { value: PickedPaper | null; onChange: (paper: PickedPaper) => void; grade: number | null; error?: string };

const DELAY_MS = 250;

const details = (paper: PickedPaper) =>
  [
    paper.grade !== undefined && `Khối ${paper.grade}`,
    paper.questionCount !== undefined && `${paper.questionCount} câu`,
    paper.folderName && `thư mục ${paper.folderName}`,
    paper.updatedAt !== undefined && `sửa ngày ${formatDate(paper.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(", ");

export function PaperPicker({ value, onChange, grade, error }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<PickedPaper[] | null>(null);

  // máy chủ tìm và lọc theo khối, trả tối đa 20 đề; huỷ lần gọi cũ khi gõ tiếp hoặc đổi khối
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

  // đề đang chọn luôn nằm trong danh sách, kể cả khi không khớp chữ đang tìm
  const selected = value && (found?.find((paper) => paper.id === value.id) ?? value);
  const rows = found ? [...(selected ? [selected] : []), ...found.filter((paper) => paper.id !== value?.id)] : selected ? [selected] : [];

  return (
    <fieldset className="mb-4" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1 font-semibold">Đề thi</legend>
      <div className="relative mb-2">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          aria-label="Tìm đề thi"
          autoComplete="off"
          value={query}
          placeholder={grade ? `Tìm đề khối ${grade} theo tên` : "Tìm đề theo tên"}
          onChange={(event) => setQuery(event.target.value)}
          // Enter trong ô tìm không được gửi cả form tạo kỳ thi
          onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
          className={cx(fieldClass(!!error), "pl-9")}
        />
      </div>
      <div className={cx("max-h-72 space-y-2 overflow-y-auto rounded-lg border bg-surface-alt p-2", error ? "border-danger" : "border-line")}>
        {rows.map((paper) => {
          const checked = paper.id === value?.id;
          const Mark = checked ? CircleCheck : Circle;
          return (
            <label
              key={paper.id}
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-lg border bg-surface px-3 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                checked ? "border-brand ring-1 ring-brand" : "border-line hover:border-muted",
              )}
            >
              <input type="radio" name="paperId" value={paper.id} checked={checked} onChange={() => onChange(paper)} className="sr-only" />
              <Mark aria-hidden="true" className={cx("mt-0.5 size-5 flex-none", checked ? "text-brand" : "text-muted")} />
              <span className="min-w-0 flex-1">
                <span className={cx("block break-words", checked && "font-semibold")}>{paper.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  {paper.format && <StatusTag>{FORMAT_NAMES[paper.format]}</StatusTag>}
                  {details(paper)}
                </span>
              </span>
            </label>
          );
        })}
        {found === null && !rows.length && <p className="px-2 py-3 text-muted">Đang tìm</p>}
        {found !== null && !found.length && <p className="px-2 py-3 text-muted">Không có đề đủ đáp án khớp</p>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
