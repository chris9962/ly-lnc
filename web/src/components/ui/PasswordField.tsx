"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { cx } from "./cx";
import { fieldClass } from "./fieldClass";
import { FieldShell } from "./TextField";

type Props = { label: string; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordField({ label, error, className, ...rest }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cx(fieldClass(!!error), "pr-12", className)}
          {...rest}
        />
        <button
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
    </FieldShell>
  );
}
