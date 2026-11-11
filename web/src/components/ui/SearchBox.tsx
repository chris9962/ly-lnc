import { buttonClass } from "./Button";
import { fieldClass } from "./fieldClass";

type Props = { path: string; label: string; value: string; keep?: Record<string, string | undefined> };

// form GET thuần: máy chủ làm phần tìm, không cần JavaScript, đổi từ khoá thì tự về trang 1
export function SearchBox({ path, label, value, keep = {} }: Props) {
  return (
    <form action={path} method="get" role="search" className="flex gap-2">
      {Object.entries(keep).map(([key, kept]) => (kept ? <input key={key} type="hidden" name={key} value={kept} /> : null))}
      <input type="search" name="q" defaultValue={value} aria-label={label} placeholder={label} className={`${fieldClass(false)} min-w-0 sm:w-64`} />
      <button type="submit" className={buttonClass("secondary")}>
        Tìm
      </button>
    </form>
  );
}
