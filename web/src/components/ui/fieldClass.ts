import { cx } from "./cx";

// nằm ngoài file "use client" để component máy chủ như SearchBox cũng gọi được
export const fieldClass = (invalid: boolean) =>
  cx("w-full rounded-lg border bg-surface px-3 py-2 text-ink placeholder:text-muted", invalid ? "border-danger" : "border-line");
