import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "./Button";

type Props = { path: string; params: Record<string, string | undefined>; page: number; pageCount: number };

function hrefFor(path: string, params: Props["params"], page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function Pager({ path, params, page, pageCount }: Props) {
  if (pageCount <= 1) return null;
  const step = (label: string, target: number, enabled: boolean, back: boolean) =>
    enabled ? (
      <Link href={hrefFor(path, params, target)} className={buttonClass("secondary", "sm")}>
        {back && <ChevronLeft aria-hidden="true" className="size-4" />}
        {label}
        {!back && <ChevronRight aria-hidden="true" className="size-4" />}
      </Link>
    ) : (
      <span aria-disabled="true" className={buttonClass("secondary", "sm", "cursor-default opacity-50")}>
        {back && <ChevronLeft aria-hidden="true" className="size-4" />}
        {label}
        {!back && <ChevronRight aria-hidden="true" className="size-4" />}
      </span>
    );
  return (
    <nav aria-label="Phân trang" className="mt-4 flex items-center justify-center gap-3">
      {step("Trang trước", page - 1, page > 1, true)}
      <span className="text-sm text-muted">
        Trang {page}/{pageCount}
      </span>
      {step("Trang sau", page + 1, page < pageCount, false)}
    </nav>
  );
}
