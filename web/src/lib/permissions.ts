import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { findSessionUser, SESSION_COOKIE } from "@/server/session";

export type Role = "admin" | "teacher" | "student";
export type ManagedRole = "teacher" | "student";

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  grade: number | null;
  mustChangePassword: boolean;
};

export type Action = "students.manage" | "teachers.manage" | "exams.take";

const GRANTS: Record<Role, readonly Action[]> = {
  admin: ["students.manage", "teachers.manage"],
  teacher: ["students.manage"],
  student: ["exams.take"],
};

// đang dùng mật khẩu tạm thì chưa có quyền nào, kể cả khi gọi thẳng tầng nghiệp vụ
export const can = (user: SessionUser, action: Action) => !user.mustChangePassword && GRANTS[user.role].includes(action);

export const manageAction = (role: ManagedRole): Action => (role === "teacher" ? "teachers.manage" : "students.manage");

export const manageableRoles = (user: SessionUser): ManagedRole[] =>
  (["teacher", "student"] as const).filter((role) => can(user, manageAction(role)));

export function homePath(user: SessionUser): string {
  if (user.mustChangePassword) return "/change-password";
  return can(user, "exams.take") ? "/my-exams" : "/students";
}

const deny = (message: string, status: number) => NextResponse.json({ ok: false, message, status }, { status });

export async function requireApi(request: NextRequest, action?: Action): Promise<SessionUser | NextResponse> {
  // trình duyệt gửi Origin với mọi yêu cầu ghi, khác host nghĩa là trang lạ gọi sang
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (request.method !== "GET" && origin && new URL(origin).host !== host) return deny("Yêu cầu không hợp lệ", 403);

  const user = findSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return deny("Chưa đăng nhập", 401);
  if (!action) return user;
  if (user.mustChangePassword) return deny("Cần đổi mật khẩu tạm trước", 403);
  if (!can(user, action)) return deny("Không có quyền", 403);
  return user;
}

export const currentUser = cache(async (): Promise<SessionUser | null> => findSessionUser((await cookies()).get(SESSION_COOKIE)?.value));

export async function requirePage(action?: Action, options: { allowTemporaryPassword?: boolean } = {}): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !options.allowTemporaryPassword) redirect("/change-password");
  if (action && !can(user, action)) redirect(homePath(user));
  return user;
}

export async function requirePageWhere(allow: (user: SessionUser) => boolean): Promise<SessionUser> {
  const user = await requirePage();
  if (!allow(user)) notFound();
  return user;
}
