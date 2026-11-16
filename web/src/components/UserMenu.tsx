"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { THEME_OPTIONS, themeCookie, type Theme } from "@/lib/theme";
import { LogoutButton } from "./LogoutButton";
import { Segmented } from "./ui/Segmented";
import { StatusTag } from "./ui/StatusTag";

// themeLocked: vai trò này không được đổi giao diện nên không hiện ô chọn
type Props = { fullName: string; username: string; roleLabel: string; theme: Theme; themeLocked?: boolean };

const item = "flex min-h-10 w-full cursor-pointer items-center rounded-lg px-3 text-left text-ink no-underline transition-colors duration-150 hover:bg-surface-alt";

export function UserMenu({ fullName, username, roleLabel, theme: initialTheme, themeLocked }: Props) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initial = fullName.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "?";

  // document là hệ ngoài: chỉ nghe bấm ra ngoài và phím Esc trong lúc bảng đang mở
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function changeTheme(next: Theme) {
    setTheme(next);
    document.cookie = themeCookie(next);
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Tài khoản ${fullName}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-ink transition duration-150 ease-out hover:bg-surface-alt hover:shadow-md active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100"
      >
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-bold text-on-brand">
          {initial}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-semibold sm:inline">{fullName}</span>
        <ChevronDown aria-hidden="true" strokeWidth={2.5} className={open ? "size-3.5 rotate-180" : "size-3.5"} />
      </button>
      {open && (
        <div role="group" aria-label="Tài khoản" className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <div className="font-semibold">{fullName}</div>
            <div className="mb-2 font-mono text-sm text-muted">{username}</div>
            <StatusTag>{roleLabel}</StatusTag>
          </div>
          {!themeLocked && (
            <div className="border-b border-line px-3 pt-3">
              <Segmented label="Giao diện" name="theme" value={theme} options={THEME_OPTIONS} onChange={changeTheme} />
            </div>
          )}
          <div className="pt-2">
            <Link href="/change-password" className={item} onClick={() => setOpen(false)}>
              Đổi mật khẩu
            </Link>
            <LogoutButton className={item} />
          </div>
        </div>
      )}
    </div>
  );
}
