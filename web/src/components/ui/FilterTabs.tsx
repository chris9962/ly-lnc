import Link from "next/link";
import { cx } from "./cx";

type Item = { href: string; label: string; active: boolean };

export function FilterTabs({ label, items }: { label: string; items: Item[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cx(
            "rounded-full border px-3.5 py-1 text-sm no-underline",
            item.active ? "border-brand bg-brand font-semibold text-on-brand" : "border-line bg-surface text-ink hover:bg-surface-alt",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// dựng đường dẫn giữ các bộ lọc khác, đổi bộ lọc thì về trang 1
export function hrefWith(path: string, params: Record<string, string | number | undefined>, change: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...change, page: undefined })) if (value !== undefined && value !== "") search.set(key, String(value));
  return search.size ? `${path}?${search}` : path;
}
