"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/components/ui/cx";
import type { Box } from "@/lib/paperLayout";

export type CanvasBox = {
  itemId: string;
  box: Box & { id: string };
  color: string;
  tag: string;
  label: string;
  selected: boolean;
  focused: boolean;
  dashed: boolean;
};

type Props = {
  index: number;
  size: { width: number; height: number };
  src: string;
  boxes: CanvasBox[];
  onSelect: (itemId: string, boxId: string) => void;
  onChange: (itemId: string, boxId: string, box: Box) => void;
};

type Mode = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Mode[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const MIN = 8;

const handleClass: Record<string, string> = {
  n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
  s: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize",
  e: "top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize",
  w: "top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize",
  ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
  se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value * 10) / 10;

export function PageCanvas({ index, size, src, boxes, onSelect, onChange }: Props) {
  const pageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: Mode; x: number; y: number; scale: number; origin: Box; itemId: string; boxId: string; moved: boolean } | null>(null);

  function resize(origin: Box, mode: Mode, dx: number, dy: number): Box {
    const box = { ...origin };
    if (mode === "move") {
      const width = origin.x1 - origin.x0;
      const height = origin.y1 - origin.y0;
      box.x0 = clamp(origin.x0 + dx, 0, size.width - width);
      box.y0 = clamp(origin.y0 + dy, 0, size.height - height);
      box.x1 = box.x0 + width;
      box.y1 = box.y0 + height;
    } else {
      if (mode.includes("n")) box.y0 = clamp(origin.y0 + dy, 0, origin.y1 - MIN);
      if (mode.includes("s")) box.y1 = clamp(origin.y1 + dy, origin.y0 + MIN, size.height);
      if (mode.includes("w")) box.x0 = clamp(origin.x0 + dx, 0, origin.x1 - MIN);
      if (mode.includes("e")) box.x1 = clamp(origin.x1 + dx, origin.x0 + MIN, size.width);
    }
    return { page: origin.page, x0: round(box.x0), y0: round(box.y0), x1: round(box.x1), y1: round(box.y1) };
  }

  function down(event: PointerEvent<HTMLDivElement>, item: CanvasBox) {
    if (event.button !== 0) return;
    event.preventDefault();
    const mode = ((event.target as HTMLElement).dataset.handle as Mode | undefined) ?? "move";
    const scale = (pageRef.current?.clientWidth ?? size.width) / size.width;
    // giữ con trỏ trên khung để kéo nhanh ra ngoài khung vẫn nhận được sự kiện
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    drag.current = { mode, x: event.clientX, y: event.clientY, scale, origin: item.box, itemId: item.itemId, boxId: item.box.id, moved: false };
    onSelect(item.itemId, item.box.id);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = (event.clientX - state.x) / state.scale;
    const dy = (event.clientY - state.y) / state.scale;
    if (!state.moved && Math.abs(dx) + Math.abs(dy) < 1) return;
    state.moved = true;
    onChange(state.itemId, state.boxId, resize(state.origin, state.mode, dx, dy));
  }

  function up(event: PointerEvent<HTMLDivElement>) {
    if (drag.current && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  }

  // mũi tên dời khung 1 điểm, giữ Shift dời 10 điểm; Alt + mũi tên kéo cạnh dưới và cạnh phải
  function key(event: KeyboardEvent<HTMLDivElement>, item: CanvasBox) {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    event.stopPropagation();
    const amount = event.shiftKey ? 10 : 1;
    const mode: Mode = event.altKey ? (step[0] ? "e" : "s") : "move";
    onChange(item.itemId, item.box.id, resize(item.box, mode, step[0] * amount, step[1] * amount));
  }

  return (
    <figure className="mx-auto mb-8 max-w-[56rem]">
      <figcaption className="mb-1 text-sm text-muted">Trang {index + 1}</figcaption>
      <div ref={pageRef} className="relative select-none bg-white shadow-md ring-1 ring-line" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Trang ${index + 1} của đề`} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
        {boxes.map((item) => (
          <div
            key={item.box.id}
            id={`box-${item.box.id}`}
            data-box="1"
            role="button"
            tabIndex={0}
            aria-label={item.label}
            aria-pressed={item.selected}
            onPointerDown={(event) => down(event, item)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={(event) => key(event, item)}
            onFocus={() => {
              if (!item.focused) onSelect(item.itemId, item.box.id);
            }}
            className={cx("absolute touch-none cursor-move border-2 focus-visible:outline-offset-2", item.dashed ? "border-dashed" : "border-solid", item.selected ? "z-10" : "")}
            style={{
              left: `${(item.box.x0 / size.width) * 100}%`,
              top: `${(item.box.y0 / size.height) * 100}%`,
              width: `${((item.box.x1 - item.box.x0) / size.width) * 100}%`,
              height: `${((item.box.y1 - item.box.y0) / size.height) * 100}%`,
              borderColor: item.color,
              borderWidth: item.selected ? 3 : 2,
              background: `color-mix(in srgb, ${item.color} ${item.selected ? 16 : 6}%, transparent)`,
            }}
          >
            <span
              className={cx(
                "pointer-events-none absolute top-[-2px] whitespace-nowrap px-1.5 text-xs font-semibold leading-5 text-white",
                // nhãn nằm ở lề trái ngoài khung để không che chữ của câu, sát mép trang thì đưa vào trong
                item.box.x0 / size.width > 0.08 ? "right-full rounded-l" : "left-0 rounded-br",
              )}
              style={{ background: item.color }}
            >
              {item.tag}
            </span>
            {item.focused &&
              HANDLES.map((handle) => (
                <span
                  key={handle}
                  data-handle={handle}
                  aria-hidden="true"
                  className={cx("absolute size-3 rounded-sm border-2 bg-white", handleClass[handle])}
                  style={{ borderColor: item.color }}
                />
              ))}
          </div>
        ))}
      </div>
    </figure>
  );
}
