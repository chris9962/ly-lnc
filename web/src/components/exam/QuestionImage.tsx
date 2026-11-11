"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

type Props = { src: string; width: number; height: number; alt: string };

// ảnh cắt ở 200 dpi nên phóng to vẫn nét; trên điện thoại chữ nhỏ, bấm để xem cỡ thật
export function QuestionImage({ src, width, height, alt }: Props) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      {/* màn hẹp giữ ảnh đủ rộng để đọc được chữ, cho cuộn ngang thay vì thu nhỏ */}
      <div className="overflow-x-auto overscroll-x-contain">
        <button type="button" onClick={() => setZoom(true)} aria-label={`Phóng to ${alt.toLowerCase()}`} className="block w-full min-w-[38rem] cursor-zoom-in rounded-md bg-white p-0 sm:min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={width} height={height} alt={alt} loading="lazy" draggable={false} className="block h-auto w-full select-none" />
        </button>
      </div>
      <Dialog open={zoom} onClose={() => setZoom(false)} title={alt} wide>
        <div className="max-h-[75vh] overflow-auto rounded-md bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={width} height={height} alt={alt} className="block h-auto max-w-none" style={{ width: Math.max(width / 2, 0) }} />
        </div>
      </Dialog>
    </>
  );
}
