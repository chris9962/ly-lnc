import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const passwordForm = z
  .object({
    current: z.string().min(1, "Nhập mật khẩu hiện tại").max(200, "Mật khẩu quá dài"),
    next: z.string().min(MIN_PASSWORD_LENGTH, `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`).max(200, "Mật khẩu quá dài"),
    confirm: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.next === value.current) ctx.addIssue({ code: "custom", path: ["next"], message: "Mật khẩu mới phải khác mật khẩu hiện tại" });
    if (value.next !== value.confirm) ctx.addIssue({ code: "custom", path: ["confirm"], message: "Hai lần nhập không giống nhau" });
  });

export type PasswordInput = z.infer<typeof passwordForm>;
