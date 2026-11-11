"use client";

import { useEffect, useId, useRef } from "react";

type Props = { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; closeOnOutside?: boolean };

export function Dialog({ open, onClose, title, children, wide, closeOnOutside = true }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
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
      // phần đệm nằm ở khối bên trong, nên sự kiện có đích là chính thẻ dialog nghĩa là bấm vào nền mờ
      onMouseDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // phải nhấn và thả đều ở ngoài, để kéo chọn chữ từ trong ra ngoài không làm đóng hộp thoại
        if (closeOnOutside && pressedOutside.current && event.target === event.currentTarget) onClose();
        pressedOutside.current = false;
      }}
      className={`m-auto w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-0 text-ink ${wide ? "max-w-2xl" : "max-w-md"}`}
    >
      <div className="p-5">
        <h2 id={titleId} className="mb-4 text-lg font-bold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
