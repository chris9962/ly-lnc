import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { changePassword, login, logout } from "@/server/auth";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { findSessionUser } from "@/server/session";
import { updateUser } from "@/server/users";
import { adminTempPassword, adminUser, auditActions, makeUser } from "./helpers";

describe("khởi tạo", () => {
  it("tạo sẵn admin với mật khẩu tạm ghi ra file", async () => {
    const result = await login({ username: "admin", password: adminTempPassword() }, "2.2.2.1");
    expect(result.ok && result.user).toMatchObject({ username: "admin", role: "admin", mustChangePassword: true });
  });
});

describe("login", () => {
  it("đúng mật khẩu thì cấp phiên và ghi audit", async () => {
    const student = await makeUser("student", "Đăng Nhập Một");
    const result = await login({ username: student.session.username.toUpperCase(), password: student.password }, "2.2.2.2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expiresAt).toBeGreaterThan(Date.now());
    expect(findSessionUser(result.token)).toMatchObject({ id: student.session.id, mustChangePassword: true });
    expect(auditActions(student.session.id)).toContain("auth.login");
  });

  it("sai mật khẩu hoặc sai tên đều trả cùng một thông báo 401", async () => {
    const student = await makeUser("student", "Đăng Nhập Hai");
    const wrongPassword = await login({ username: student.session.username, password: "sai-mat-khau" }, "2.2.2.3");
    const wrongUser = await login({ username: "khong-ton-tai", password: "sai-mat-khau" }, "2.2.2.3");
    expect(wrongPassword).toMatchObject({ ok: false, status: 401 });
    expect(wrongUser).toEqual(wrongPassword);
  });

  it("tài khoản bị khoá trả 403", async () => {
    const student = await makeUser("student", "Đăng Nhập Ba");
    updateUser(adminUser(), student.session.id, { disabled: true });
    expect(await login({ username: student.session.username, password: student.password }, "2.2.2.4")).toMatchObject({ ok: false, status: 403 });
  });

  it("sai quá 8 lần từ cùng một địa chỉ thì bị chặn, địa chỉ khác vẫn đăng nhập được", async () => {
    const student = await makeUser("student", "Đăng Nhập Bốn");
    for (let i = 0; i < 8; i++) await login({ username: student.session.username, password: "sai" }, "3.3.3.3");
    expect(await login({ username: student.session.username, password: student.password }, "3.3.3.3")).toMatchObject({ ok: false, status: 429 });
    expect((await login({ username: student.session.username, password: student.password }, "4.4.4.4")).ok).toBe(true);
  });
});

describe("logout", () => {
  it("xoá phiên", async () => {
    const student = await makeUser("student", "Đăng Xuất Một");
    const session = await login({ username: student.session.username, password: student.password }, "2.2.2.5");
    if (!session.ok) throw new Error("login");
    expect(logout(student.session, session.token)).toEqual({ ok: true });
    expect(findSessionUser(session.token)).toBeNull();
  });
});

describe("changePassword", () => {
  it("sai mật khẩu hiện tại thì báo lỗi ở trường current", async () => {
    const student = await makeUser("student", "Đổi Mật Khẩu Một");
    const result = await changePassword(student.session, { current: "khong-dung", next: "moi-12345", confirm: "moi-12345" });
    expect(result).toMatchObject({ ok: false, status: 400, field: "current" });
  });

  it("đổi xong thì hết trạng thái mật khẩu tạm, phiên cũ mất, có phiên mới", async () => {
    const student = await makeUser("student", "Đổi Mật Khẩu Hai");
    const old = await login({ username: student.session.username, password: student.password }, "2.2.2.6");
    if (!old.ok) throw new Error("login");

    const result = await changePassword(student.session, { current: student.password, next: "moi-12345", confirm: "moi-12345" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findSessionUser(old.token)).toBeNull();
    expect(findSessionUser(result.token)).toMatchObject({ id: student.session.id, mustChangePassword: false });
    expect(getDb().select().from(users).where(eq(users.id, student.session.id)).get()?.mustChangePassword).toBe(false);
    expect(auditActions(student.session.id)).toContain("auth.change_password");
    expect((await login({ username: student.session.username, password: "moi-12345" }, "2.2.2.7")).ok).toBe(true);
  });
});

describe("findSessionUser", () => {
  it("không có mã hoặc mã lạ thì trả null", () => {
    expect(findSessionUser(undefined)).toBeNull();
    expect(findSessionUser("khong-co-that")).toBeNull();
  });
});
