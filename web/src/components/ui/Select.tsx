"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";
import { fieldClass } from "./fieldClass";
import { FieldShell } from "./TextField";

export type Option = { value: string; label: string };

type Props = { label: string; options: Option[]; placeholder?: string; error?: string; compact?: boolean; dense?: boolean } & SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ label, options, placeholder, error, compact, dense, className, ...rest }: Props) {
  const id = useId();
  const select = (
    <select
      id={id}
      aria-label={compact ? label : undefined}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cx(fieldClass(!!error), compact && "w-auto py-1 pl-2 pr-7 text-sm", className)}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  // dạng gọn dùng trong bảng: nhãn nằm trong aria-label thay cho thẻ label hiển thị
  if (compact) return select;
  // dạng dùng trong thanh lọc: nhãn nhỏ, không chừa lề dưới
  if (dense)
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">
          {label}
        </label>
        {select}
      </div>
    );
  return (
    <FieldShell id={id} label={label} error={error}>
      {select}
    </FieldShell>
  );
}
