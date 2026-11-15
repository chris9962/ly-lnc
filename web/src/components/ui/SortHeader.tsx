import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { cx } from "./cx";

type Props = { label: string; href: string; dir: "asc" | "desc" | null; className?: string };

// tiêu đề cột là link nên sắp xếp chạy ở máy chủ và giữ được trên URL khi tải lại trang
export function SortHeader({ label, href, dir, className }: Props) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className={className}>
      <Link href={href} scroll={false} className={cx("-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 no-underline hover:bg-surface-alt hover:text-ink", dir ? "text-ink" : "text-muted")}>
        {label}
        <Icon aria-hidden="true" className={cx("size-3.5", !dir && "opacity-60")} />
      </Link>
    </th>
  );
}
