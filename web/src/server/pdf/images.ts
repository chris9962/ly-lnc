import "server-only";
import sharp from "sharp";
import type { Box } from "@/lib/paperLayout";
import { putObject } from "../storage";
import { renderBoxes, renderPage, type PdfDocument } from "./layout";

// 200 dpi đủ nét cho chữ và công thức trên cả điện thoại lẫn máy chiếu
const QUESTION_DPI = 200;
const PAGE_DPI = 150;

const toWebp = (png: Uint8Array) => sharp(png).webp({ quality: 80 }).toBuffer();

export async function renderToStorage(doc: PdfDocument, key: string, boxes: Box[]) {
  const image = renderBoxes(doc, boxes, QUESTION_DPI);
  // sharp chạy bất đồng bộ nên giữa hai câu máy chủ vẫn trả lời được các yêu cầu khác
  await putObject(key, await toWebp(image.png));
  return { width: image.width, height: image.height };
}

export async function renderPageWebp(doc: PdfDocument, index: number) {
  return toWebp(renderPage(doc, index, PAGE_DPI).png);
}
