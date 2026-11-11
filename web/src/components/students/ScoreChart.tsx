"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { formatDateTime } from "@/lib/format";
import { FORMAT_NAMES, type PaperFormat } from "@/lib/paperLayout";
import { formatScore } from "@/lib/scoring";

export type ScorePoint = { id: number; at: number; title: string; format: PaperFormat; score: number; maxScore: number; value: number };

type Props = { year: number; from: number; to: number; points: ScorePoint[] };

const FORMATS: PaperFormat[] = ["thpt", "vsat"];
const COLOR: Record<PaperFormat, string> = { thpt: "var(--series-thpt)", vsat: "var(--series-vsat)" };
const HEIGHT = 260;
const PAD = { left: 30, right: 18, top: 18, bottom: 26 };
const Y_TICKS = [0, 2, 4, 6, 8, 10];

// hai loại đề khác thang điểm nên vẽ chung một trục theo điểm quy về 10, điểm gốc nằm trong chú thích
export function ScoreChart({ year, from, to, points }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  // chiều rộng lấy từ khung chứa để chữ trên biểu đồ không bị co theo màn hình
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (at: number) => PAD.left + ((at - from) / (to - from)) * innerW;
  const y = (value: number) => PAD.top + (1 - value / 10) * innerH;
  const sorted = [...points].sort((a, b) => a.at - b.at);
  const series = FORMATS.map((format) => ({ format, points: sorted.filter((point) => point.format === format) })).filter((item) => item.points.length);
  const monthStep = width < 480 ? 3 : width < 640 ? 2 : 1;
  const months = Array.from({ length: 12 }, (_, month) => ({ month, at: Date.UTC(year, month, 1) - 7 * 3_600_000 })).filter((item) => item.month % monthStep === 0);

  function track(event: PointerEvent<SVGSVGElement>) {
    if (!sorted.length) return;
    const pointerX = event.clientX - event.currentTarget.getBoundingClientRect().left;
    const nearest = sorted.reduce((best, point) => (Math.abs(x(point.at) - pointerX) < Math.abs(x(best.at) - pointerX) ? point : best));
    setActive(nearest.id);
  }

  const current = sorted.find((point) => point.id === active) ?? null;
  // hộp chú thích nằm bên cạnh đường gióng, phía còn nhiều chỗ, để không che điểm đang xem
  const tipOnLeft = current ? x(current.at) > width / 2 : false;

  if (!sorted.length) return <p className="py-8 text-center text-muted">Chưa có bài đã nộp trong năm {year}</p>;

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {series.map((item) => (
          <li key={item.format} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-5 rounded-full" style={{ background: COLOR[item.format] }} />
            {FORMAT_NAMES[item.format]}
          </li>
        ))}
      </ul>
      <div ref={box} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="group"
          aria-label={`Điểm các bài đã nộp năm ${year}, quy về thang 10`}
          onPointerMove={track}
          onPointerLeave={() => setActive(null)}
          className="block touch-pan-y select-none"
        >
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth={1} strokeDasharray={tick === 0 ? undefined : "2 4"} />
              <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted)">
                {tick}
              </text>
            </g>
          ))}
          {months.map((item) => (
            <text key={item.month} x={x(item.at)} y={HEIGHT - 8} fontSize={11} fill="var(--muted)">
              Th{item.month + 1}
            </text>
          ))}
          {current && <line x1={x(current.at)} x2={x(current.at)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted)" strokeWidth={1} />}
          {series.map((item) => (
            <polyline key={item.format} points={item.points.map((point) => `${x(point.at)},${y(point.value)}`).join(" ")} fill="none" stroke={COLOR[item.format]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((item) => {
            const last = item.points[item.points.length - 1];
            const nearRight = x(last.at) > width - 70;
            return (
              <text key={item.format} x={x(last.at) + (nearRight ? -8 : 8)} y={y(last.value) - 10} textAnchor={nearRight ? "end" : "start"} fontSize={11} fontWeight={600} fill="var(--ink)">
                {item.format === "thpt" ? "THPT" : "VSAT"}
              </text>
            );
          })}
          {sorted.map((point) => (
            <circle
              key={point.id}
              cx={x(point.at)}
              cy={y(point.value)}
              r={point.id === active ? 6 : 4.5}
              fill={COLOR[point.format]}
              stroke="var(--surface)"
              strokeWidth={2}
              tabIndex={0}
              role="img"
              aria-label={`${formatDateTime(point.at)}, ${point.title}, ${FORMAT_NAMES[point.format]}: ${formatScore(point.score)} trên ${formatScore(point.maxScore)}`}
              onFocus={() => setActive(point.id)}
              onBlur={() => setActive(null)}
              className="outline-none"
            />
          ))}
        </svg>
        {current && (
          <div role="status" className="pointer-events-none absolute top-0 z-10 w-max max-w-56 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg"
            style={tipOnLeft ? { right: width - x(current.at) + 12 } : { left: x(current.at) + 12 }}>
            <p className="text-xs text-muted">{formatDateTime(current.at)}</p>
            <p className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: COLOR[current.format] }} />
              <span className="font-bold">
                {formatScore(current.score)} / {formatScore(current.maxScore)}
              </span>
              <span className="text-muted">{FORMAT_NAMES[current.format]}</span>
            </p>
            <p className="truncate text-muted">{current.title}</p>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">Trục dọc là điểm quy về thang 10</p>
    </div>
  );
}
