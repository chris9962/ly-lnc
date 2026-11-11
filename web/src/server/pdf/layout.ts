import "server-only";
import * as mupdf from "mupdf";
import { FALSE, TRUE, type AnswerValue, type Box, type LayoutItem, type PaperFormat, type QuestionKind } from "@/lib/paperLayout";

type Line = { x0: number; y0: number; x1: number; y1: number; text: string; bold: boolean };
type PageLine = Line & { page: number };
type Area = { x0: number; y0: number; x1: number; y1: number };

export type PageSize = { width: number; height: number };

export type Analysis = {
  pages: PageSize[];
  format: PaperFormat;
  items: LayoutItem[];
  warnings: string[];
  tailText: string;
};

const RE_QUESTION = /^\s*Câu\s*(\d+)\s*[.:]/u;
const RE_PART = /^\s*PHẦN\s+([IVX]+)/u;
const RE_RANGE = /^\s*Từ câu hỏi\s*(\d+)\s*đến\s*(\d+)/u;
const RE_CONTEXT = /^\s*(Sử dụng các thông tin sau cho|Đọc nội dung sau)/u;
const RE_END = /-{3,}\s*HẾT\s*-{3,}/u;
const RE_FOOTER = /^\s*(Trang\s*\d+|GV\s*:)/u;
// mốc "Câu N" luôn nằm sát lề trái, chữ "câu 3" giữa đoạn văn thì nằm xa hơn
const MARGIN_X = 75;

export function openPdf(data: Uint8Array | ArrayBuffer) {
  return mupdf.Document.openDocument(data instanceof Uint8Array ? data : new Uint8Array(data), "application/pdf");
}

export type PdfDocument = ReturnType<typeof openPdf>;

function kindOf(text: string): QuestionKind | null {
  const t = text.toLowerCase();
  if (t.includes("đúng sai") || t.includes("đúng hoặc sai")) return "tf";
  if (t.includes("ghép")) return "match";
  if (t.includes("trả lời ngắn") || t.includes("ghi câu trả lời")) return "short";
  if (t.includes("nhiều phương án") || t.includes("a, b, c, d")) return "mcq";
  return null;
}

function pageLines(page: mupdf.Page): Line[] {
  const lines: Line[] = [];
  let current: Line | null = null;
  let boldSeen: boolean | null = null;
  page.toStructuredText("preserve-whitespace").walk({
    beginLine(bbox) {
      current = { x0: bbox[0], y0: bbox[1], x1: bbox[2], y1: bbox[3], text: "", bold: false };
      boldSeen = null;
    },
    onChar(c, _origin, font) {
      if (!current) return;
      current.text += c;
      // in đậm xét theo chữ đầu tiên không phải khoảng trắng, giống cách đọc span đầu của bản thử
      if (boldSeen === null && c.trim()) {
        boldSeen = font.isBold() || /bold/i.test(font.getName());
        current.bold = boldSeen;
      }
    },
    endLine() {
      if (current && current.text.trim()) lines.push(current);
      current = null;
    },
  });
  return lines.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
}

function pageFigures(page: mupdf.Page, size: PageSize): Area[] {
  const areas: Area[] = [];
  const push = (rect: number[]) => areas.push({ x0: rect[0], y0: rect[1], x1: rect[2], y1: rect[3] });
  // lấy khung của chính đường vẽ, không cộng độ dày nét, giống get_drawings của bản thử
  const hairline = new mupdf.StrokeState({ lineCap: "Butt", lineJoin: "Miter", lineWidth: 0, miterLimit: 10 });
  const vector = (path: mupdf.Path, ctm: mupdf.Matrix) => {
    const rect = path.getBounds(hairline, ctm);
    // khung viền cả trang không phải hình của câu nào
    if (rect[2] - rect[0] < size.width * 0.98 || rect[3] - rect[1] < size.height * 0.9) push(rect);
  };
  const image = (ctm: mupdf.Matrix) => push(mupdf.Rect.transform([0, 0, 1, 1], ctm));
  const device = new mupdf.Device({
    fillPath: (path, _evenOdd, ctm) => vector(path, ctm),
    strokePath: (path, _state, ctm) => vector(path, ctm),
    fillImage: (_image, ctm) => image(ctm),
    fillImageMask: (_image, ctm) => image(ctm),
  });
  page.run(device, mupdf.Matrix.identity);
  device.close();
  return areas;
}

type Anchor = { page: number; y: number; type: "question" | "section" | "context"; text: string };
type Segment = { type: Anchor["type"]; text: string; boxes: (Box & { clipped: number })[] };

const round = (value: number) => Math.round(value * 10) / 10;

export function analyzePdf(doc: PdfDocument): Analysis {
  const pageCount = doc.countPages();
  const pages: PageSize[] = [];
  const bottoms: number[] = [];
  const texts: Line[][] = [];
  const figures: Area[][] = [];
  const anchors: Anchor[] = [];
  const tail: PageLine[] = [];
  let ended = false;

  for (let index = 0; index < pageCount; index++) {
    const page = doc.loadPage(index);
    const bounds = page.getBounds();
    const size = { width: bounds[2] - bounds[0], height: bounds[3] - bounds[1] };
    pages.push(size);
    const lines = pageLines(page);
    if (ended) {
      tail.push(...lines.map((line) => ({ ...line, page: index })));
      continue;
    }
    const isFooter = (line: Line) => RE_FOOTER.test(line.text) && line.y0 > size.height - 90;
    let bottom = Math.min(size.height - 30, ...lines.filter(isFooter).map((line) => line.y0)) - 2;
    const kept: Line[] = [];
    for (const line of lines.filter((line) => !isFooter(line))) {
      if (ended) {
        tail.push({ ...line, page: index });
        continue;
      }
      if (RE_END.test(line.text)) {
        bottom = line.y0 - 2;
        ended = true;
        continue;
      }
      kept.push(line);
      if (line.x0 > MARGIN_X) continue;
      if (RE_QUESTION.test(line.text) && line.bold) anchors.push({ page: index, y: line.y0, type: "question", text: line.text.trim() });
      else if (RE_PART.test(line.text) || RE_RANGE.test(line.text)) anchors.push({ page: index, y: line.y0, type: "section", text: line.text.trim() });
      else if (RE_CONTEXT.test(line.text)) anchors.push({ page: index, y: line.y0, type: "context", text: line.text.trim() });
    }
    bottoms.push(bottom);
    texts.push(kept);
    figures.push(pageFigures(page, size).filter((area) => area.y0 < bottom));
  }
  const lastPage = bottoms.length - 1;

  // đường cắt nằm ngay trên dòng mốc; hình của câu bắt đầu cao hơn dòng mốc thì dời đường cắt lên để ôm trọn hình
  const cuts = anchors.map((anchor) => {
    let cut = anchor.y - 0.5;
    let previousEnd = cut;
    const straddling = figures[anchor.page].filter(
      (area) => area.y0 < cut - 1 && area.y1 > anchor.y + 2 && area.y1 - anchor.y > 2 * (anchor.y - area.y0) && area.y1 - area.y0 > 15,
    );
    if (straddling.length) {
      const figureLeft = Math.min(...straddling.map((area) => area.x0));
      const want = Math.min(...straddling.map((area) => area.y0)) - 2;
      const above = texts[anchor.page].filter((line) => line.y0 < anchor.y - 5 && line.x0 < figureLeft - 5).map((line) => line.y1);
      const moved = Math.max(want, Math.min(Math.max(0, ...above) + 0.5, cut));
      if (moved < cut - 0.5) previousEnd = moved;
      cut = moved;
    }
    return { ...anchor, cut, previousEnd };
  });

  const segments: Segment[] = cuts.map((anchor, index) => {
    const next = cuts[index + 1];
    const endPage = next ? next.page : lastPage;
    const endY = next ? next.previousEnd : bottoms[lastPage];
    const boxes: Segment["boxes"] = [];
    for (let page = anchor.page; page <= endPage; page++) {
      const y0 = page === anchor.page ? anchor.cut : 0;
      const y1 = page === endPage ? endY : bottoms[page];
      const inside = [...texts[page], ...figures[page]].filter((area) => area.y1 > y0 + 1 && area.y0 < y1 - 1);
      if (!inside.length) continue;
      const width = pages[page].width;
      boxes.push({
        page,
        y0: round(Math.max(y0, Math.min(...inside.map((area) => area.y0)) - 3)),
        y1: round(Math.min(y1, Math.max(...inside.map((area) => area.y1)) + 4)),
        x0: round(Math.max(0, Math.min(50, Math.min(...inside.map((area) => area.x0)) - 4))),
        x1: round(Math.min(width, Math.max(width - 45, Math.max(...inside.map((area) => area.x1)) + 4))),
        clipped: inside.filter((area) => area.y0 < y0 - 2 || area.y1 > y1 + 2).length,
      });
    }
    return { type: anchor.type, text: anchor.text, boxes };
  });

  const items: LayoutItem[] = [];
  const warnings: string[] = [];
  let kind: QuestionKind | null = null;
  let previousLabel = 0;
  for (const segment of segments) {
    const boxes = segment.boxes.map((box) => ({ page: box.page, x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 }));
    if (segment.type === "section") {
      kind = kindOf(segment.text) ?? kind;
      continue;
    }
    if (!boxes.length) continue;
    if (segment.type === "context") {
      const numbers = [...segment.text.slice(0, 70).matchAll(/\d+/g)].map((match) => Number(match[0]));
      const count = numbers.length >= 2 ? Math.max(...numbers) - Math.min(...numbers) + 1 : 2;
      items.push({ type: "context", count: Math.min(Math.max(count, 1), 10), boxes });
      continue;
    }
    const label = Number(RE_QUESTION.exec(segment.text)![1]);
    // đề THPT đánh số lại từ 1 ở mỗi phần nên số 1 không tính là lạ
    if (previousLabel && label !== 1 && label === previousLabel) warnings.push(`Câu ${label} ghi hai lần liền nhau`);
    else if (previousLabel && label !== 1 && label !== previousLabel + 1) warnings.push(`Câu ${label} đứng sau câu ${previousLabel}`);
    previousLabel = label;
    if (segment.boxes.some((box) => box.clipped)) warnings.push(`Câu ${label} có thể bị cắt mất một phần hình`);
    items.push({ type: "question", label, kind, boxes });
  }
  if (!items.some((item) => item.type === "question")) warnings.push("Không tìm thấy dòng Câu 1, Câu 2 trên đề");
  const format: PaperFormat = items.some((item) => item.type === "question" && item.kind === "match") ? "vsat" : "thpt";
  const keys = readAnswerTable(tail);
  const questionCount = items.filter((item) => item.type === "question").length;
  let filled = 0;
  for (const item of items) {
    if (item.type !== "question" || !item.kind) continue;
    const key = keys[item.kind]?.get(item.label);
    if (key !== undefined) {
      item.key = key;
      filled++;
    }
  }
  if (keys.found && filled < questionCount) warnings.push("Bảng đáp án sau dòng HẾT chưa đọc được hết");
  return { pages, format, items, warnings, tailText: tail.map((line) => line.text).join("\n") };
}

type AnswerTable = { found: boolean } & Partial<Record<QuestionKind, Map<number, AnswerValue>>>;

const sameRow = (a: Line, b: Line) => Math.abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2) < 4;
const SUB_LABEL = /^[a-h]\)$/;

// bảng đáp án in sau HẾT: mỗi phần một cột, đầu cột ghi "Câu"; đọc theo toạ độ vì ô gộp làm lệch thứ tự chữ
function readAnswerTable(lines: PageLine[]): AnswerTable {
  const table: AnswerTable = { found: false };
  const pagesWithTable = [...new Set(lines.filter((line) => line.text.trim() === "Câu").map((line) => line.page))];
  for (const page of pagesWithTable) {
    const onPage = lines.filter((line) => line.page === page).map((line) => ({ ...line, text: line.text.trim() }));
    const headers = onPage.filter((line) => line.text === "Câu").sort((a, b) => a.x0 - b.x0);
    headers.forEach((header, index) => {
      const left = header.x0 - 15;
      const right = index + 1 < headers.length ? headers[index + 1].x0 - 15 : Infinity;
      const cells = onPage.filter((line) => line !== header && line.x0 >= left && line.x0 < right && line.y0 > header.y1 - 1 && !/^MĐ/.test(line.text));
      const numbers = cells.filter((line) => /^\d{1,2}$/.test(line.text) && line.x1 < header.x1 + 10).sort((a, b) => a.y0 - b.y0);
      const rest = cells.filter((line) => !numbers.includes(line));
      const subLabels = rest.filter((line) => SUB_LABEL.test(line.text)).sort((a, b) => a.y0 - b.y0);
      if (subLabels.length) {
        const values = rest.filter((line) => /^(Đúng|Sai)$/.test(line.text));
        const groups: (string | null)[][] = [];
        for (const sub of subLabels) {
          if (sub.text === "a)" || !groups.length) groups.push([]);
          const value = values.find((line) => sameRow(line, sub));
          groups.at(-1)!.push(value ? (value.text === "Đúng" ? TRUE : FALSE) : null);
        }
        const map = (table.tf ??= new Map());
        groups.forEach((group, order) => map.set(numbers[order] ? Number(numbers[order].text) : order + 1, group));
      } else {
        const pairs = numbers.map((number) => [Number(number.text), rest.find((line) => sameRow(line, number))?.text] as const);
        const isChoice = pairs.length > 0 && pairs.every(([, value]) => value && /^[A-H]$/.test(value));
        const map = (table[isChoice ? "mcq" : "short"] ??= new Map());
        for (const [number, value] of pairs) if (value) map.set(number, value);
      }
      table.found = true;
    });
  }
  return table;
}

export function pageSizes(doc: PdfDocument): PageSize[] {
  return Array.from({ length: doc.countPages() }, (_, index) => {
    const bounds = doc.loadPage(index).getBounds();
    return { width: bounds[2] - bounds[0], height: bounds[3] - bounds[1] };
  });
}

export type RenderedImage = { png: Uint8Array; width: number; height: number };

export function renderPage(doc: PdfDocument, index: number, dpi: number): RenderedImage {
  const scale = dpi / 72;
  const pixmap = doc.loadPage(index).toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, false);
  return { png: pixmap.asPNG(), width: pixmap.getWidth(), height: pixmap.getHeight() };
}

// các khung của một câu ghép dọc thành một ảnh, mỗi khung chỉ vẽ phần nằm trong khung
export function renderBoxes(doc: PdfDocument, boxes: Box[], dpi: number): RenderedImage {
  const scale = dpi / 72;
  const left = Math.min(...boxes.map((box) => box.x0));
  const right = Math.max(...boxes.map((box) => box.x1));
  const width = Math.round((right - left) * scale);
  const heights = boxes.map((box) => Math.round((box.y1 - box.y0) * scale));
  const height = heights.reduce((sum, value) => sum + value, 0);
  const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, height], false);
  pixmap.clear(255);
  const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
  let offset = 0;
  boxes.forEach((box, index) => {
    const ctm = mupdf.Matrix.concat(mupdf.Matrix.translate(-left, -box.y0), mupdf.Matrix.scale(scale, scale));
    const placed = mupdf.Matrix.concat(ctm, mupdf.Matrix.translate(0, offset));
    const clip = new mupdf.Path();
    clip.rect(box.x0, box.y0, box.x1, box.y1);
    device.clipPath(clip, false, placed);
    doc.loadPage(box.page).run(device, placed);
    device.popClip();
    offset += heights[index];
  });
  device.close();
  return { png: pixmap.asPNG(), width, height };
}
