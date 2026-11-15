import { z } from "zod";
import { isGrade, type Grade } from "./grades";
import { MAX_TITLE } from "./paperForm";
import { ROSTER_SORTS } from "./rosterSort";

export const MAX_DURATION = 300;
// giờ Việt Nam là UTC+7 quanh năm, không đổi giờ theo mùa
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function parseVnDateTime(date: string, time: string): number | null {
  const d = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(date);
  const t = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(time);
  if (!d || !t) return null;
  const [day, month, year, hour, minute] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  if (hour > 23 || minute > 59) return null;
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(utc);
  if (check.getUTCDate() !== day || check.getUTCMonth() !== month - 1) return null;
  return utc - VN_OFFSET_MS;
}

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

export const createExamForm = z
  .object({
    title: z.string().transform(tidy).pipe(z.string().min(1, "Nhập tên kỳ thi").max(MAX_TITLE, `Tên kỳ thi tối đa ${MAX_TITLE} ký tự`)),
    grade: z.coerce.number().refine(isGrade, "Chọn khối").transform((value) => value as Grade),
    paperId: z.coerce.number({ error: "Chọn đề" }).int().positive("Chọn đề"),
    duration: z.coerce.number({ error: "Nhập số phút" }).int("Nhập số phút").min(1, "Ít nhất 1 phút").max(MAX_DURATION, `Tối đa ${MAX_DURATION} phút`),
    mode: z.enum(["now", "scheduled"]),
    startDate: z.string().default(""),
    startTime: z.string().default(""),
    endDate: z.string().default(""),
    endTime: z.string().default(""),
  })
  .transform((raw, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const startsAt = raw.mode === "scheduled" ? parseVnDateTime(raw.startDate, raw.startTime) : null;
    if (raw.mode === "scheduled" && startsAt === null) issue("startTime", "Nhập giờ bắt đầu dạng 05/11/2026 07:30");
    const endsAt = parseVnDateTime(raw.endDate, raw.endTime);
    if (endsAt === null) issue("endTime", "Nhập giờ kết thúc dạng 05/11/2026 09:00");
    else if (startsAt !== null && endsAt <= startsAt) issue("endTime", "Giờ kết thúc phải sau giờ bắt đầu");
    return { title: raw.title, grade: raw.grade, paperId: raw.paperId, durationMinutes: raw.duration, startsAt, endsAt: endsAt ?? 0 };
  });

export type CreateExamInput = z.infer<typeof createExamForm>;

export const updateExamForm = createExamForm;

export const reopenForm = z.object({
  minutes: z.coerce.number({ error: "Nhập số phút" }).int("Nhập số phút").min(1, "Ít nhất 1 phút").max(MAX_DURATION, `Tối đa ${MAX_DURATION} phút`),
});

export const listExamsQuery = z.object({
  q: z.string().trim().max(MAX_TITLE).catch("").default(""),
  grade: z.coerce.number().refine(isGrade).optional().catch(undefined),
  status: z.enum(["all", "upcoming", "running", "ended"]).catch("all").default("all"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type ListExamsQuery = z.infer<typeof listExamsQuery>;

export const paperOptionsQuery = z.object({
  q: z.string().trim().max(MAX_TITLE).catch("").default(""),
  grade: z.coerce.number().refine(isGrade).optional().catch(undefined),
});

export const rosterQuery = z.object({
  q: z.string().trim().max(80).catch("").default(""),
  status: z.enum(["all", "submitted", "working", "absent"]).catch("all").default("all"),
  sort: z.enum(ROSTER_SORTS).catch("name").default("name"),
  dir: z.enum(["asc", "desc"]).catch("asc").default("asc"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});
