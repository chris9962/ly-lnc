export const UPDATED_PRESETS = ["today", "7d", "30d", "month", "range"] as const;
export type UpdatedPreset = (typeof UPDATED_PRESETS)[number];

export const UPDATED_LABELS: Record<UpdatedPreset, string> = {
  today: "Hôm nay",
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
  month: "Tháng này",
  range: "Khoảng ngày",
};

const DAY_MS = 86_400_000;
// Việt Nam không đổi giờ theo mùa nên lệch cố định 7 giờ
const VN_OFFSET_MS = 7 * 3_600_000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const isRealDate = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export function isIsoDate(value: string) {
  const match = ISO.exec(value);
  return !!match && isRealDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function parseVnDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isRealDate(y, m, d) ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export function isoToVn(iso: string) {
  const match = ISO.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function maskVnDate(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

const dayStart = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - VN_OFFSET_MS;
};

const vnDayStart = (now: number) => Math.floor((now + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;

export function updatedBounds(query: { updated?: UpdatedPreset; from?: string; to?: string }, now: number): { from?: number; to?: number } {
  const today = vnDayStart(now);
  switch (query.updated) {
    case "today":
      return { from: today };
    case "7d":
      return { from: today - 6 * DAY_MS };
    case "30d":
      return { from: today - 29 * DAY_MS };
    case "month": {
      const local = new Date(now + VN_OFFSET_MS);
      return { from: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - VN_OFFSET_MS };
    }
    case "range": {
      const [first, last] = query.from && query.to && query.from > query.to ? [query.to, query.from] : [query.from, query.to];
      return { ...(first ? { from: dayStart(first) } : {}), ...(last ? { to: dayStart(last) + DAY_MS } : {}) };
    }
    default:
      return {};
  }
}
