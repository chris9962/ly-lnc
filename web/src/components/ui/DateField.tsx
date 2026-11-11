"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { isoToVn, maskVnDate, parseVnDate } from "@/lib/dateRange";
import { cx } from "./cx";
import { fieldClass } from "./fieldClass";

type Props = { label: string; value: string; onChange: (iso: string) => void; className?: string };

// gõ được dạng 05/11/2026 hoặc chọn trên lịch, chỉ báo ra ngoài khi ngày đủ và đúng
export function DateField({ label, value, onChange, className }: Props) {
  const id = useId();
  const picker = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(isoToVn(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(isoToVn(value));
  }
  const invalid = text.length === 10 && !parseVnDate(text);

  function type(event: ChangeEvent<HTMLInputElement>) {
    const next = maskVnDate(event.currentTarget.value);
    setText(next);
    const iso = parseVnDate(next);
    if (iso && iso !== value) {
      setSeen(iso);
      onChange(iso);
    } else if (!next && value) {
      setSeen("");
      onChange("");
    }
  }

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const iso = event.currentTarget.value;
    setSeen(iso);
    setText(isoToVn(iso));
    onChange(iso);
  }

  function openPicker() {
    const input = picker.current;
    if (!input) return;
    input.value = value;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  return (
    <div className={cx("relative", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          value={text}
          onChange={type}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={cx(fieldClass(invalid), "pr-10 tabular-nums")}
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label={`${label} trên lịch`}
          className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-alt hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
            <path d="M3 8.5h14M7 3v3M13 3v3" />
          </svg>
        </button>
        <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" onChange={pick} className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0" />
      </div>
      {invalid && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          Ngày không hợp lệ
        </p>
      )}
    </div>
  );
}
