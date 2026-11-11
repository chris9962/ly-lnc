"use client";

import { useId, useState, type DragEvent } from "react";
import { cx } from "./cx";

type Props = { label: string; name: string; accept: string; error?: string; onPick?: (file: File | null) => void };

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function FileField({ label, name, accept, error, onPick }: Props) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);

  function choose(next: File | null) {
    setFile(next);
    onPick?.(next);
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    const dropped = event.dataTransfer.files[0];
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!dropped || !input) return;
    // gắn file kéo thả vào ô input để form gửi đi như file chọn bằng nút
    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    input.files = transfer.files;
    choose(dropped);
  }

  return (
    <div className="mb-4">
      <span className="mb-1 block font-semibold">{label}</span>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center",
          over ? "border-brand bg-surface-alt" : error ? "border-danger" : "border-line hover:bg-surface-alt",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 text-muted">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 3v5h5M12 17v-6m-3 3 3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {file ? (
          <>
            <span className="break-all font-semibold">{file.name}</span>
            <span className="text-sm text-muted">{formatSize(file.size)}, bấm để chọn file khác</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-brand">Chọn file PDF</span>
            <span className="text-sm text-muted">hoặc kéo thả vào đây</span>
          </>
        )}
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
