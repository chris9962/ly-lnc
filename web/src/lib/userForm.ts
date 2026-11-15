import { z } from "zod";
import { isGrade, type Grade } from "./grades";
import { normalizePhone } from "./phone";

export const MAX_BATCH = 200;
export const MAX_BULK = 1000;
export const MAX_NAME_LENGTH = 80;
export const PAGE_SIZE = 15;

export type Person = { fullName: string; phone: string | null };

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

function parseStudentLine(line: string): Person {
  const cells = line.split(/[\t,;]+/).map(tidy).filter(Boolean);
  if (cells.length > 1) {
    const at = cells.findIndex((cell) => normalizePhone(cell));
    if (at < 0) return { fullName: cells.join(" "), phone: null };
    return { fullName: cells.filter((_, i) => i !== at).join(" "), phone: normalizePhone(cells[at]) };
  }
  // một ô duy nhất: số điện thoại là các cụm chữ số cuối dòng, có thể viết cách nhau
  const words = tidy(line).split(" ");
  for (let take = 1; take <= 4 && take < words.length; take++) {
    const phone = normalizePhone(words.slice(-take).join(""));
    if (phone) return { fullName: words.slice(0, -take).join(" "), phone };
  }
  return { fullName: tidy(line), phone: null };
}

export const createUsersForm = z
  .object({
    role: z.enum(["teacher", "student"]),
    grade: z.string().default(""),
    names: z.string(),
  })
  .transform((raw, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const lines = raw.names.split(/\r?\n/).filter((line) => line.trim());
    const people: Person[] = lines.map((line) => (raw.role === "student" ? parseStudentLine(line) : { fullName: tidy(line), phone: null }));

    if (!people.length) issue("names", "Nhập ít nhất một người");
    if (people.length > MAX_BATCH) issue("names", `Mỗi lần tối đa ${MAX_BATCH} tài khoản`);
    if (people.some((person) => person.fullName.length > MAX_NAME_LENGTH)) issue("names", `Họ tên tối đa ${MAX_NAME_LENGTH} ký tự`);

    let grade: Grade | null = null;
    if (raw.role === "student") {
      const missing = people.findIndex((person) => !person.phone || !person.fullName);
      if (missing >= 0) issue("names", `Dòng ${missing + 1} thiếu số điện thoại hợp lệ`);
      const phones = people.map((person) => person.phone).filter(Boolean);
      const repeated = phones.find((phone, i) => phones.indexOf(phone) !== i);
      if (repeated) issue("names", `Số điện thoại ${repeated} bị lặp`);

      const value = Number(raw.grade);
      if (raw.grade !== "" && isGrade(value)) grade = value;
      else issue("grade", "Chọn khối");
    }
    return { role: raw.role, grade, people };
  });

export type CreateUsersInput = z.infer<typeof createUsersForm>;

export const updateUserForm = z
  .object({
    disabled: z.boolean().optional(),
    grade: z.coerce.number().refine(isGrade, "Khối không hợp lệ").optional(),
    fullName: z
      .string()
      .transform(tidy)
      .pipe(z.string().min(1, "Nhập họ tên").max(MAX_NAME_LENGTH, `Họ tên tối đa ${MAX_NAME_LENGTH} ký tự`))
      .optional(),
    phone: z
      .string()
      .transform((raw, ctx) => {
        const phone = normalizePhone(raw);
        if (phone) return phone;
        ctx.addIssue({ code: "custom", message: "Số điện thoại không hợp lệ" });
        return z.NEVER;
      })
      .optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Không có thay đổi");

export type UpdateUserInput = { disabled?: boolean; grade?: number; fullName?: string; phone?: string };

export const bulkUsersForm = z
  .object({
    action: z.enum(["grade", "delete"]),
    grade: z.coerce.number().refine(isGrade, "Khối không hợp lệ").optional(),
    ids: z
      .array(z.number().int().positive())
      .min(1, "Chưa chọn tài khoản nào")
      .max(MAX_BULK, `Mỗi lần tối đa ${MAX_BULK} tài khoản`)
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine((value, ctx) => {
    if (value.action === "grade" && value.grade === undefined) ctx.addIssue({ code: "custom", path: ["grade"], message: "Chọn khối" });
  })
  .transform((value) => (value.action === "grade" ? { action: "grade" as const, grade: value.grade as Grade, ids: value.ids } : { action: "delete" as const, ids: value.ids }));

export type BulkUsersInput = z.infer<typeof bulkUsersForm>;

export const listUsersQuery = z.object({
  role: z.enum(["teacher", "student"]),
  grade: z.coerce.number().refine(isGrade).optional().catch(undefined),
  q: z.string().trim().max(MAX_NAME_LENGTH).catch("").default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
