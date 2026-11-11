import { cx } from "@/components/ui/cx";
import { isoToVn } from "@/lib/dateRange";

export type DayActivity = { done: number; missed: number };

type Props = { year: number; weeks: (string | null)[][]; days: Record<string, DayActivity> };

const WEEKDAYS = ["T2", "", "T4", "", "T6", "", "CN"];

const level = (day: DayActivity | undefined) => {
  if (!day) return "border-line bg-surface-alt";
  if (!day.done) return "border-warning bg-warning-soft";
  return day.done >= 3 ? "border-brand bg-brand" : day.done === 2 ? "border-brand bg-brand/70" : "border-brand bg-brand/40";
};

const describe = (day: DayActivity) => [day.done && `${day.done} bài làm`, day.missed && `${day.missed} kỳ thi không vào`].filter(Boolean).join(", ");

// mỗi cột một tuần, ô có hoạt động dẫn xuống đúng ngày đó trên dòng thời gian
export function YearHeatmap({ year, weeks, days }: Props) {
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div role="group" aria-label={`Hoạt động năm ${year}`} className="inline-grid grid-flow-col grid-rows-[1rem_repeat(7,0.8rem)] gap-[3px] pt-9 text-[0.65rem] leading-none text-muted">
          <span />
          {WEEKDAYS.map((name, index) => (
            <span key={index} aria-hidden="true" className="flex items-center pr-1">
              {name}
            </span>
          ))}
          {weeks.map((week, column) => {
            const first = week.find((day) => day?.endsWith("-01"));
            return [
              <span key={`m${column}`} aria-hidden="true" className="w-[0.8rem] overflow-visible whitespace-nowrap">
                {first ? `Th${Number(first.slice(5, 7))}` : ""}
              </span>,
              ...week.map((day, row) => {
                const key = `${column}-${row}`;
                if (!day) return <span key={key} />;
                const activity = days[day];
                const box = cx("block size-[0.8rem] rounded-[3px] border", level(activity));
                if (!activity) return <span key={key} aria-hidden="true" className={box} />;
                const text = `${isoToVn(day)}: ${describe(activity)}`;
                return (
                  <a key={key} href={`#day-${day}`} aria-label={text} className={cx("group relative", box, "hover:ring-2 hover:ring-ink/40")}>
                    <span
                      role="tooltip"
                      className={cx(
                        "pointer-events-none invisible absolute bottom-full z-10 mb-1.5 w-max rounded-md bg-ink px-2 py-1 text-xs text-surface opacity-0 shadow-lg group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100",
                        column < 6 ? "left-0" : column > weeks.length - 7 ? "right-0" : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      {text}
                    </span>
                  </a>
                );
              }),
            ];
          })}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {[
          ["border-line bg-surface-alt", "Không có kỳ thi"],
          ["border-brand bg-brand/40", "1 bài làm"],
          ["border-brand bg-brand/70", "2 bài làm"],
          ["border-brand bg-brand", "Từ 3 bài làm"],
          ["border-warning bg-warning-soft", "Không vào thi"],
        ].map(([box, text]) => (
          <li key={text} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cx("size-[0.8rem] rounded-[3px] border", box)} />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
