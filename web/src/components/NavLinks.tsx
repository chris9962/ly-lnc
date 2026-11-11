"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui/cx";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    // màn hẹp đưa menu xuống hàng riêng và cuộn ngang thay vì vỡ dòng
    <nav aria-label="Chính" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto whitespace-nowrap px-1 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:overflow-visible sm:p-0">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx("rounded-lg px-3 py-1.5 no-underline hover:bg-surface-alt", active ? "bg-surface-alt font-semibold text-brand" : "text-ink")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
