"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ChangeEvent, type FormEvent } from "react";
import { fieldClass } from "./fieldClass";

type Props = { path: string; label: string; value: string; keep?: Record<string, string | undefined> };

const DELAY_MS = 300;

// gõ xong một nhịp là tìm, máy chủ vẫn làm phần lọc, đổi từ khoá thì về trang 1
export function SearchBox({ path, label, value, keep = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(q: string) {
    if (timer.current) clearTimeout(timer.current);
    const search = new URLSearchParams();
    for (const [key, kept] of Object.entries(keep)) if (kept) search.set(key, kept);
    if (q.trim()) search.set("q", q.trim());
    const target = search.size ? `${path}?${search}` : path;
    startTransition(() => (pathname === path ? router.replace(target, { scroll: false }) : router.push(target)));
  }

  function change(event: ChangeEvent<HTMLInputElement>) {
    const q = event.currentTarget.value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(q), DELAY_MS);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(String(new FormData(event.currentTarget).get("q") ?? ""));
  }

  return (
    <form action={path} method="get" role="search" onSubmit={submit} className="relative">
      {Object.entries(keep).map(([key, kept]) => (kept ? <input key={key} type="hidden" name={key} value={kept} /> : null))}
      <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        name="q"
        defaultValue={value}
        onChange={change}
        aria-label={label}
        placeholder={label}
        aria-busy={pending}
        className={`${fieldClass(false)} min-w-0 pl-9 pr-9 sm:w-72`}
      />
      {pending && (
        <span role="status" aria-label="Đang tìm" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-brand" />
      )}
    </form>
  );
}
