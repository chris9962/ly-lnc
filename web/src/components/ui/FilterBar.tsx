"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cx } from "./cx";
import { DateField } from "./DateField";
import { fieldClass } from "./fieldClass";
import { Select, type Option } from "./Select";

type Values = Record<string, string>;
// base là giá trị mặc định, không ghi lên đường dẫn
export type FilterSelect = { name: string; label: string; options: Option[]; base: string };
type Props = {
  path: string;
  searchLabel: string;
  q: string;
  selects?: FilterSelect[];
  values?: Values;
  keep?: Record<string, string | undefined>;
  // tên ô chọn có giá trị "range" mở hai ô từ ngày, đến ngày
  rangeOf?: string;
  total: number;
  unit: string;
};

const DELAY_MS = 300;
const RANGE_KEYS = ["from", "to"];

const same = (a: Values, b: Values) => Object.keys({ ...a, ...b }).every((key) => (a[key] ?? "") === (b[key] ?? ""));

// mọi ô lọc đổi là tải lại danh sách ngay, ô tìm chờ ngừng gõ một nhịp
export function FilterBar({ path, searchLabel, q, selects = [], values = {}, keep = {}, rangeOf, total, unit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchId = useId();
  const search = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(values);
  const [seen, setSeen] = useState(values);
  if (!same(values, seen)) {
    setSeen(values);
    setState(values);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const empty: Values = Object.fromEntries(selects.map((select) => [select.name, select.base]));
  const ranged = !!rangeOf && state[rangeOf] === "range";
  const active = q !== "" || selects.some((select) => (state[select.name] ?? select.base) !== select.base);

  function go(next: Values, text: string) {
    if (timer.current) clearTimeout(timer.current);
    const params = new URLSearchParams();
    if (text.trim()) params.set("q", text.trim());
    for (const [key, kept] of Object.entries(keep)) if (kept) params.set(key, kept);
    for (const select of selects) {
      const value = next[select.name] ?? select.base;
      if (value !== select.base) params.set(select.name, value);
    }
    if (rangeOf && next[rangeOf] === "range") for (const key of RANGE_KEYS) if (next[key]) params.set(key, next[key]);
    const target = params.size ? `${path}?${params}` : path;
    startTransition(() => (pathname === path ? router.replace(target, { scroll: false }) : router.push(target)));
  }

  function change(patch: Values) {
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
    setState(empty);
    go(empty, "");
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div role="search" className="flex flex-wrap gap-3">
        <div className={cx("min-w-0 basis-full md:flex-1 md:basis-0", !selects.length && "md:max-w-md")}>
          <label htmlFor={searchId} className="mb-1 block text-xs font-semibold text-muted">
            {searchLabel}
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              ref={search}
              id={searchId}
              type="search"
              defaultValue={q}
              onChange={(event) => typed(event.currentTarget.value)}
              onKeyDown={(event) => event.key === "Enter" && go(state, event.currentTarget.value)}
              aria-busy={pending}
              className={cx(fieldClass(false), "pl-9 pr-9")}
            />
            {pending && (
              <span role="status" aria-label="Đang lọc" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-brand" />
            )}
          </div>
        </div>
        {selects.map((select) => (
          <div key={select.name} className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] md:w-44 md:flex-none md:basis-auto">
            <Select
              dense
              label={select.label}
              options={select.options}
              value={state[select.name] ?? select.base}
              onChange={(event) => change({ [select.name]: event.currentTarget.value })}
            />
          </div>
        ))}
      </div>

      {ranged && (
        <div className="grid grid-cols-2 items-start gap-3 rounded-lg bg-surface-alt p-3 sm:flex">
          <DateField label="Từ ngày" value={state.from ?? ""} onChange={(from) => change({ from })} className="sm:w-44" />
          <DateField label="Đến ngày" value={state.to ?? ""} onChange={(to) => change({ to })} className="sm:w-44" />
        </div>
      )}

      <div className="flex min-h-8 items-center justify-between gap-3 text-sm">
        <p className="text-muted" aria-live="polite">
          {total} {unit}
        </p>
        {active && (
          <button type="button" onClick={clear} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-semibold text-brand hover:bg-surface-alt">
            <X aria-hidden="true" strokeWidth={2.4} className="size-3.5" />
            Xoá bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}
