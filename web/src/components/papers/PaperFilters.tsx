"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { DateField } from "@/components/ui/DateField";
import { fieldClass } from "@/components/ui/fieldClass";
import { Select } from "@/components/ui/Select";
import { cx } from "@/components/ui/cx";
import { UPDATED_LABELS, UPDATED_PRESETS, type UpdatedPreset } from "@/lib/dateRange";
import { GRADES } from "@/lib/grades";

type Filters = { grade: string; answers: string; updated: string; from: string; to: string };
type Props = { path: string; q: string; folder?: number; filters: Filters; total: number };

const EMPTY: Filters = { grade: "", answers: "all", updated: "", from: "", to: "" };
const DELAY_MS = 300;

const GRADE_OPTIONS = [{ value: "", label: "Mọi khối" }, ...GRADES.map((grade) => ({ value: String(grade), label: `Khối ${grade}` }))];
const ANSWER_OPTIONS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "has", label: "Đủ đáp án" },
  { value: "none", label: "Chưa đủ đáp án" },
];
const UPDATED_OPTIONS = [{ value: "", label: "Mọi lúc" }, ...UPDATED_PRESETS.map((preset: UpdatedPreset) => ({ value: preset, label: UPDATED_LABELS[preset] }))];

const same = (a: Filters, b: Filters) => (Object.keys(EMPTY) as (keyof Filters)[]).every((key) => a[key] === b[key]);

// mọi ô lọc đổi là tải lại danh sách ngay, ô tìm chờ ngừng gõ một nhịp
export function PaperFilters({ path, q, folder, filters, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchId = useId();
  const search = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(filters);
  const [seen, setSeen] = useState(filters);
  if (!same(filters, seen)) {
    setSeen(filters);
    setState(filters);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const active = !same(state, EMPTY) || q !== "";

  function go(next: Filters, text: string) {
    if (timer.current) clearTimeout(timer.current);
    const params = new URLSearchParams();
    if (text.trim()) params.set("q", text.trim());
    if (folder) params.set("folder", String(folder));
    if (next.grade) params.set("grade", next.grade);
    if (next.answers !== "all") params.set("answers", next.answers);
    if (next.updated) params.set("updated", next.updated);
    if (next.updated === "range" && next.from) params.set("from", next.from);
    if (next.updated === "range" && next.to) params.set("to", next.to);
    const target = params.size ? `${path}?${params}` : path;
    startTransition(() => (pathname === path ? router.replace(target, { scroll: false }) : router.push(target)));
  }

  function change(patch: Partial<Filters>) {
    const next = { ...state, ...patch };
    setState(next);
    go(next, search.current?.value ?? "");
  }

  function typed(text: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(state, text), DELAY_MS);
  }

  function clear() {
    if (search.current) search.current.value = "";
    setState(EMPTY);
    go(EMPTY, "");
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div role="search" className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_8.5rem_10.5rem_10.5rem]">
        <div className="col-span-2 md:col-span-1">
          <label htmlFor={searchId} className="mb-1 block text-xs font-semibold text-muted">
            Tìm đề theo tên
          </label>
          <div className="relative">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={search}
              id={searchId}
              type="search"
              defaultValue={q}
              onChange={(event) => typed(event.currentTarget.value)}
              onKeyDown={(event) => event.key === "Enter" && go(state, event.currentTarget.value)}
              placeholder="Tên đề"
              aria-busy={pending}
              className={cx(fieldClass(false), "pl-9 pr-9")}
            />
            {pending && (
              <span role="status" aria-label="Đang lọc" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-brand" />
            )}
          </div>
        </div>
        <Select dense label="Khối" options={GRADE_OPTIONS} value={state.grade} onChange={(event) => change({ grade: event.currentTarget.value })} />
        <Select dense label="Đáp án" options={ANSWER_OPTIONS} value={state.answers} onChange={(event) => change({ answers: event.currentTarget.value })} />
        <div className="col-span-2 md:col-span-1">
          <Select dense label="Ngày cập nhật" options={UPDATED_OPTIONS} value={state.updated} onChange={(event) => change({ updated: event.currentTarget.value })} />
        </div>
      </div>

      {state.updated === "range" && (
        <div className="grid grid-cols-2 items-start gap-3 rounded-lg bg-surface-alt p-3 sm:flex">
          <DateField label="Từ ngày" value={state.from} onChange={(from) => change({ from })} className="sm:w-44" />
          <DateField label="Đến ngày" value={state.to} onChange={(to) => change({ to })} className="sm:w-44" />
        </div>
      )}

      <div className="flex min-h-8 items-center justify-between gap-3 text-sm">
        <p className="text-muted" aria-live="polite">
          {total} đề
        </p>
        {active && (
          <button type="button" onClick={clear} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-semibold text-brand hover:bg-surface-alt">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
            Xoá bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}
