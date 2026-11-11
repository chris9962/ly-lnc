"use client";

import { cx } from "@/components/ui/cx";
import { fieldClass } from "@/components/ui/fieldClass";
import { FALSE, TRUE, itemLabel, letter, type AnswerValue, type PaperFormat, type QuestionShape } from "@/lib/paperLayout";

type Props = {
  shape: QuestionShape;
  value: AnswerValue | null;
  onChange: (value: AnswerValue | null) => void;
  format: PaperFormat;
  name: string;
  disabled?: boolean;
  large?: boolean;
  onEnter?: () => void;
};

const choice = (on: boolean, large?: boolean) =>
  cx(
    "inline-flex cursor-pointer items-center justify-center rounded-lg border-2 font-bold disabled:cursor-default disabled:opacity-60",
    large ? "h-12 min-w-16 px-4 text-lg" : "h-10 min-w-11 px-3",
    on ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-ink hover:border-brand",
  );

export function AnswerInput({ shape, value, onChange, format, name, disabled, large, onEnter }: Props) {
  if (shape.kind === "mcq") {
    return (
      <div role="radiogroup" aria-label={`Chọn đáp án ${name}`} className="flex flex-wrap gap-2">
        {Array.from({ length: shape.options }, (_, index) => {
          const option = letter(index);
          const on = value === option;
          return (
            <button key={option} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(on ? null : option)} className={choice(on, large)}>
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (shape.kind === "tf" || shape.kind === "match") {
    const count = shape.kind === "tf" ? shape.items : shape.rows;
    const cells = Array.isArray(value) && value.length === count ? value : Array.from({ length: count }, () => null);
    const set = (index: number, cell: string | null) => {
      const next = cells.map((current, i) => (i === index ? cell : current));
      onChange(next.some((item) => item !== null) ? next : null);
    };
    return (
      <div className="space-y-2">
        {cells.map((cell, index) => {
          const label = shape.kind === "tf" ? itemLabel(format, index) : `${index + 1}.`;
          if (shape.kind === "tf") {
            return (
              <div key={index} role="radiogroup" aria-label={`${name} ý ${label}`} className="flex items-center gap-2">
                <span className="w-8 font-bold">{label}</span>
                {[
                  [TRUE, "Đúng"],
                  [FALSE, "Sai"],
                ].map(([mark, text]) => (
                  <button key={mark} type="button" role="radio" aria-checked={cell === mark} disabled={disabled} onClick={() => set(index, cell === mark ? null : mark)} className={cx(choice(cell === mark, large), "min-w-20")}>
                    {text}
                  </button>
                ))}
              </div>
            );
          }
          return (
            <label key={index} className="flex items-center gap-2">
              <span className="w-8 font-bold">{label}</span>
              <span className="text-muted">ghép với</span>
              <select
                value={cell ?? ""}
                disabled={disabled}
                aria-label={`${name} ý ${index + 1} ghép với`}
                onChange={(event) => set(index, event.target.value || null)}
                className={cx(fieldClass(false), "w-28 font-bold", cell && "border-brand", large && "py-2.5")}
              >
                <option value="">Chọn</option>
                {Array.from({ length: shape.cols }, (_, col) => (
                  <option key={col} value={letter(col)}>
                    {letter(col)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      maxLength={30}
      aria-label={`Đáp án ${name}`}
      placeholder="Ví dụ 19,1"
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value || null)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && onEnter) {
          event.preventDefault();
          onEnter();
        }
      }}
      className={cx(fieldClass(false), "max-w-xs font-semibold", large && "py-3 text-lg")}
    />
  );
}
