import { z } from "zod";

export const loginForm = z.object({
  username: z.string().trim().min(1, "Nhập tên đăng nhập").max(64, "Tên đăng nhập quá dài"),
  password: z.string().min(1, "Nhập mật khẩu").max(200, "Mật khẩu quá dài"),
});

export type LoginInput = z.infer<typeof loginForm>;
