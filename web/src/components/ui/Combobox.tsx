"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "./cx";
import { fieldClass } from "./fieldClass";
import { FieldShell } from "./TextField";

export type ComboOption = { value: number; label: string; hint?: string };

type Props = {
  label: string;
  value: ComboOption | null;
  onChange: (option: ComboOption | null) => void;
  // gọi route tìm riêng của máy chủ, trả tối đa 20 dòng
  search: (query: string) => Promise<ComboOption[]>;
  placeholder?: string;
  error?: string;
  emptyLabel?: string;
};

const DELAY_MS = 250;

export function Combobox({ label, value, onChange, search, placeholder, error, emptyLabel = "Không có kết quả" }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // bấm ra ngoài thì đóng danh sách; document là hệ ngoài nên nghe trong effect
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  function load(query: string) {
    if (timer.current) clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(async () => {
      const ticket = ++request.current;
      const found = await search(query).catch(() => []);
      // chỉ nhận kết quả của lần gõ cuối, kết quả cũ về muộn thì bỏ
      if (ticket !== request.current) return;
      setOptions(found);
      setActive(found.length ? 0 : -1);
      setLoading(false);
    }, DELAY_MS);
  }

  function close() {
    setOpen(false);
    setText(value?.label ?? "");
  }

  function pick(option: ComboOption) {
    onChange(option);
    setText(option.label);
    setOpen(false);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        load(text === value?.label ? "" : text);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (options.length ? (current + step + options.length) % options.length : -1));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (options[active]) pick(options[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  return (
    <FieldShell id={id} label={label} error={error}>
      <div ref={rootRef} className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            if (value) onChange(null);
            load(event.target.value);
          }}
          onFocus={() => {
            if (open) return;
            setOpen(true);
            load(value ? "" : text);
          }}
          onKeyDown={keyDown}
          className={cx(fieldClass(!!error), "pr-9")}
        />
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        {open && (
          <ul id={listId} role="listbox" aria-label={label} className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
            {loading && !options.length && <li className="px-3 py-2 text-muted">Đang tìm</li>}
            {!loading && !options.length && <li className="px-3 py-2 text-muted">{emptyLabel}</li>}
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={value?.value === option.value}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onPointerEnter={() => setActive(index)}
                className={cx("flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2", index === active && "bg-surface-alt", value?.value === option.value && "font-semibold")}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.hint && <span className="shrink-0 text-sm text-muted">{option.hint}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </FieldShell>
  );
}
