"use client";

import { useId } from "react";
import { cx } from "./cx";

type Props<T extends string> = { label: string; name: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void };

// nhóm nút radio thật bên dưới, nên dùng phím mũi tên và trình đọc màn hình như radio thường
export function Segmented<T extends string>({ label, name, value, options, onChange }: Props<T>) {
  const id = useId();
  return (
    <fieldset className="mb-4">
      <legend className="mb-1 font-semibold">{label}</legend>
      <div className="flex w-full rounded-lg border border-line bg-surface-alt p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${id}-${option.value}`}
            className={cx(
              "flex-1 cursor-pointer rounded-md px-4 py-1.5 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
              value === option.value ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink",
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
    </fieldset>
  );
}
