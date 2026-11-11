import { z } from "zod";
import { isGrade, type Grade } from "./grades";

export const MAX_BATCH = 200;
export const MAX_NAME_LENGTH = 80;
export const PAGE_SIZE = 15;

const splitNames = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

export const createUsersForm = z
  .object({
    role: z.enum(["teacher", "student"]),
    grade: z.string().default(""),
    names: z.string(),
  })
  .transform((raw, ctx) => {
    const names = splitNames(raw.names);
    if (!names.length) ctx.addIssue({ code: "custom", path: ["names"], message: "Nhập ít nhất một họ tên" });
    if (names.length > MAX_BATCH) ctx.addIssue({ code: "custom", path: ["names"], message: `Mỗi lần tối đa ${MAX_BATCH} tài khoản` });
    if (names.some((name) => name.length > MAX_NAME_LENGTH)) ctx.addIssue({ code: "custom", path: ["names"], message: `Họ tên tối đa ${MAX_NAME_LENGTH} ký tự` });

    let grade: Grade | null = null;
    if (raw.role === "student") {
      const value = Number(raw.grade);
      if (raw.grade !== "" && isGrade(value)) grade = value;
      else ctx.addIssue({ code: "custom", path: ["grade"], message: "Chọn khối" });
    }
    return { role: raw.role, grade, names };
  });

export type CreateUsersInput = z.infer<typeof createUsersForm>;

export const updateUserForm = z
  .object({
    disabled: z.boolean().optional(),
    grade: z.coerce.number().refine(isGrade, "Khối không hợp lệ").optional(),
  })
  .refine((value) => value.disabled !== undefined || value.grade !== undefined, "Không có thay đổi");

export type UpdateUserInput = { disabled?: boolean; grade?: number };

export const listUsersQuery = z.object({
  role: z.enum(["teacher", "student"]),
  grade: z.coerce.number().refine(isGrade).optional().catch(undefined),
  q: z.string().trim().max(MAX_NAME_LENGTH).catch("").default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
