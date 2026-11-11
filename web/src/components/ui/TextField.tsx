"use client";

import { useId, type ComponentProps, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { fieldClass } from "./fieldClass";

type Shared = { label: string; error?: string };

export function FieldShell({ id, label, error, children }: Shared & { id: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, error, className, ...rest }: Shared & ComponentProps<"input">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error}>
      <input id={id} type="text" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={cx(fieldClass(!!error), className)} {...rest} />
    </FieldShell>
  );
}

export function TextArea({ label, error, className, ...rest }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error}>
      <textarea id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={cx(fieldClass(!!error), "min-h-36 resize-y", className)} {...rest} />
    </FieldShell>
  );
}
