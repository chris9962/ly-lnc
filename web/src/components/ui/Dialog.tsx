"use client";

import { useEffect, useId, useRef } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean };

export function Dialog({ open, onClose, title, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // thẻ dialog của trình duyệt là hệ ngoài: showModal lo việc giữ focus và phím Esc
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-5 text-ink ${wide ? "max-w-2xl" : "max-w-md"}`}
    >
      <h2 id={titleId} className="mb-4 text-lg font-bold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
