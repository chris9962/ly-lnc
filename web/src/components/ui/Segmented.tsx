"use client";

import { useId } from "react";
import { cx } from "./cx";

// value có thể chưa khớp lựa chọn nào, khi đó chưa ô nào được chọn
type Props<T extends string> = { label: string; name: string; value: T | ""; options: { value: T; label: string }[]; onChange: (value: T) => void; error?: string };

// nhóm nút radio thật bên dưới, nên dùng phím mũi tên và trình đọc màn hình như radio thường
export function Segmented<T extends string>({ label, name, value, options, onChange, error }: Props<T>) {
  const id = useId();
  return (
    <fieldset className="mb-4" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1 font-semibold">{label}</legend>
      <div className={cx("flex w-full rounded-lg border bg-surface-alt p-0.5", error ? "border-danger" : "border-line")}>
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${id}-${option.value}`}
            className={cx(
              "flex-1 cursor-pointer whitespace-nowrap rounded-md px-4 py-1.5 text-center transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
              value === option.value ? "bg-brand font-semibold text-on-brand shadow-sm" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <input
              id={`${id}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
