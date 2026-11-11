const TIME_ZONE = "Asia/Ho_Chi_Minh";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const parts = (timestamp: number) => Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));

export function formatDate(timestamp: number): string {
  const p = parts(timestamp);
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatDateTime(timestamp: number): string {
  const p = parts(timestamp);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function formatTime(timestamp: number): string {
  const p = parts(timestamp);
  return `${p.hour}:${p.minute}`;
}

// cùng ngày thì chỉ ghi ngày một lần
export function formatRange(start: number, end: number): string {
  return formatDate(start) === formatDate(end) ? `${formatDateTime(start)} đến ${formatTime(end)}` : `${formatDateTime(start)} đến ${formatDateTime(end)}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} phút ${seconds} giây` : `${seconds} giây`;
}
