import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { login } from "@/server/auth";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { findSessionUser } from "@/server/session";
import { createUsers, deleteUser, listUsers, resetPassword, updateUser } from "@/server/users";
import { adminUser, auditActions, makeUser } from "./helpers";

const rowOf = (id: number) => getDb().select().from(users).where(eq(users.id, id)).get();

describe("createUsers", () => {
  it("sinh tên đăng nhập không trùng và mật khẩu tạm, ghi audit cho từng tài khoản", async () => {
    const result = await createUsers(adminUser(), { role: "student", grade: 11, names: ["Nguyễn Văn An", "Nguyen Van An"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issued.map((a) => a.username)).toEqual(["annv", "annv2"]);
    expect(result.issued.every((a) => a.password.length === 8)).toBe(true);

    const row = getDb().select().from(users).where(eq(users.username, "annv")).get()!;
    expect(row).toMatchObject({ role: "student", grade: 11, mustChangePassword: true, disabled: false });
    expect(row.passwordHash).not.toContain(result.issued[0].password);
    expect(auditActions(row.id)).toEqual(["user.create"]);
  });

  it("giáo viên không tạo được giáo viên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Một");
    const result = await createUsers(teacher.session, { role: "teacher", grade: null, names: ["Giáo Viên Hai"] });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("học sinh không tạo được tài khoản nào", async () => {
    const student = await makeUser("student", "Học Sinh Một");
    const result = await createUsers(student.session, { role: "student", grade: 10, names: ["Học Sinh Hai"] });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

describe("listUsers", () => {
  it("phân trang 15 dòng, tìm không phân biệt dấu và lọc theo khối ở máy chủ", async () => {
    const names = Array.from({ length: 19 }, (_, i) => `Phạm Quốc Khánh ${String.fromCharCode(65 + i)}`);
    await createUsers(adminUser(), { role: "student", grade: 12, names: [...names, "Đặng Thị Bình"] });

    const page1 = listUsers(adminUser(), { role: "student", grade: 12, q: "", page: 1 });
    expect(page1.ok && { n: page1.rows.length, total: page1.total, pageSize: page1.pageSize }).toEqual({ n: 15, total: 20, pageSize: 15 });
    const page2 = listUsers(adminUser(), { role: "student", grade: 12, q: "", page: 2 });
    expect(page2.ok && page2.rows.length).toBe(5);

    const found = listUsers(adminUser(), { role: "student", grade: undefined, q: "dang thi binh", page: 1 });
    expect(found.ok && found.rows.map((r) => r.fullName)).toEqual(["Đặng Thị Bình"]);
    const byUsername = listUsers(adminUser(), { role: "student", grade: undefined, q: "binhdt", page: 1 });
    expect(byUsername.ok && byUsername.total).toBe(1);

    const otherGrade = listUsers(adminUser(), { role: "student", grade: 10, q: "khanh", page: 1 });
    expect(otherGrade.ok && otherGrade.total).toBe(0);
  });

  it("không trả về mật khẩu băm", async () => {
    const list = listUsers(adminUser(), { role: "student", grade: undefined, q: "", page: 1 });
    expect(list.ok && Object.keys(list.rows[0])).not.toContain("passwordHash");
  });

  it("giáo viên không xem được danh sách giáo viên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Ba");
    expect(listUsers(teacher.session, { role: "teacher", grade: undefined, q: "", page: 1 })).toMatchObject({ ok: false, status: 403 });
  });
});

describe("resetPassword", () => {
  it("cấp mật khẩu tạm mới, bắt đổi lại và đăng xuất mọi phiên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Bốn");
    const student = await makeUser("student", "Học Sinh Ba");
    const session = await login({ username: student.session.username, password: student.password }, "1.1.1.1");
    expect(session.ok).toBe(true);
    if (!session.ok) return;

    const result = await resetPassword(teacher.session, student.session.id);
    expect(result.ok && result.issued.password).not.toBe(student.password);
    expect(findSessionUser(session.token)).toBeNull();
    expect(rowOf(student.session.id)?.mustChangePassword).toBe(true);
    expect(auditActions(student.session.id)).toContain("user.reset_password");

    const oldLogin = await login({ username: student.session.username, password: student.password }, "1.1.1.2");
    expect(oldLogin.ok).toBe(false);
  });

  it("tài khoản ngoài phạm vi hoặc không tồn tại trả 404", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Năm");
    const other = await makeUser("teacher", "Giáo Viên Sáu");
    expect(await resetPassword(teacher.session, other.session.id)).toMatchObject({ ok: false, status: 404 });
    expect(await resetPassword(teacher.session, adminUser().id)).toMatchObject({ ok: false, status: 404 });
    expect(await resetPassword(teacher.session, 999999)).toMatchObject({ ok: false, status: 404 });
  });
});

describe("updateUser", () => {
  it("khoá tài khoản thì đăng xuất và ghi audit", async () => {
    const student = await makeUser("student", "Học Sinh Bốn");
    const session = await login({ username: student.session.username, password: student.password }, "1.1.1.3");
    expect(updateUser(adminUser(), student.session.id, { disabled: true })).toEqual({ ok: true });
    expect(rowOf(student.session.id)?.disabled).toBe(true);
    expect(session.ok && findSessionUser(session.token)).toBeNull();
    expect(auditActions(student.session.id)).toContain("user.disable");

    expect(updateUser(adminUser(), student.session.id, { disabled: false })).toEqual({ ok: true });
    expect(auditActions(student.session.id)).toContain("user.enable");
  });

  it("đổi khối cho học sinh", async () => {
    const student = await makeUser("student", "Học Sinh Năm", 10);
    expect(updateUser(adminUser(), student.session.id, { grade: 12 })).toEqual({ ok: true });
    expect(rowOf(student.session.id)?.grade).toBe(12);
    expect(auditActions(student.session.id)).toContain("user.change_grade");
  });

  it("không đổi khối cho giáo viên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Bảy");
    expect(updateUser(adminUser(), teacher.session.id, { grade: 12 })).toMatchObject({ ok: false, status: 400, field: "grade" });
  });

  it("giáo viên sửa tài khoản giáo viên khác trả 404", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Tám");
    const other = await makeUser("teacher", "Giáo Viên Chín");
    expect(updateUser(teacher.session, other.session.id, { disabled: true })).toMatchObject({ ok: false, status: 404 });
    expect(rowOf(other.session.id)?.disabled).toBe(false);
  });
});

describe("deleteUser", () => {
  it("xoá tài khoản và ghi audit", async () => {
    const student = await makeUser("student", "Học Sinh Sáu");
    expect(deleteUser(adminUser(), student.session.id)).toEqual({ ok: true });
    expect(rowOf(student.session.id)).toBeUndefined();
    expect(auditActions(student.session.id)).toContain("user.delete");
  });

  it("không ai xoá được tài khoản admin", async () => {
    const admin = adminUser();
    expect(deleteUser(admin, admin.id)).toMatchObject({ ok: false, status: 404 });
    expect(rowOf(admin.id)).toBeDefined();
  });
});
