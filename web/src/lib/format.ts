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
