import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { login } from "@/server/auth";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { findSessionUser } from "@/server/session";
import { bulkUsers, createUsers, deleteUser, listUserIds, listUsers, resetPassword, updateUser } from "@/server/users";
import { adminUser, auditActions, makeUser } from "./helpers";

const rowOf = (id: number) => getDb().select().from(users).where(eq(users.id, id)).get();

describe("createUsers", () => {
  it("học sinh đăng nhập bằng số điện thoại, mật khẩu tạm được băm, có audit", async () => {
    const result = await createUsers(adminUser(), {
      role: "student",
      grade: 11,
      people: [
        { fullName: "Nguyễn Văn An", phone: "0912345678" },
        { fullName: "Nguyen Van An", phone: "0912345679" },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issued.map((a) => a.username)).toEqual(["0912345678", "0912345679"]);
    expect(result.issued.every((a) => a.password.length === 8)).toBe(true);

    const row = getDb().select().from(users).where(eq(users.username, "0912345678")).get()!;
    expect(row).toMatchObject({ role: "student", grade: 11, mustChangePassword: true, disabled: false });
    expect(row.passwordHash).not.toContain(result.issued[0].password);
    expect(auditActions(row.id)).toEqual(["user.create"]);

    const session = await login({ username: "+84 912 345 678", password: result.issued[0].password }, "5.5.5.5");
    expect(session.ok).toBe(true);
  });

  it("số điện thoại đã có tài khoản thì từ chối cả danh sách", async () => {
    await createUsers(adminUser(), { role: "student", grade: 10, people: [{ fullName: "Đã Có", phone: "0933000001" }] });
    const result = await createUsers(adminUser(), {
      role: "student",
      grade: 10,
      people: [
        { fullName: "Người Mới", phone: "0933000002" },
        { fullName: "Trùng Số", phone: "0933000001" },
      ],
    });
    expect(result).toMatchObject({ ok: false, status: 400, field: "names", message: "Số điện thoại đã có tài khoản: 0933000001" });
    expect(getDb().select().from(users).where(eq(users.username, "0933000002")).get()).toBeUndefined();
  });

  it("học sinh thiếu số điện thoại bị từ chối", async () => {
    const result = await createUsers(adminUser(), { role: "student", grade: 10, people: [{ fullName: "Thiếu Số", phone: null }] });
    expect(result).toMatchObject({ ok: false, status: 400, field: "names" });
  });

  it("giáo viên vẫn được sinh tên đăng nhập từ họ tên, không trùng", async () => {
    const result = await createUsers(adminUser(), {
      role: "teacher",
      grade: null,
      people: [
        { fullName: "Lâm Ngọc Cớm", phone: null },
        { fullName: "Lam Ngoc Com", phone: null },
      ],
    });
    expect(result.ok && result.issued.map((a) => a.username)).toEqual(["comln", "comln2"]);
  });

  it("giáo viên không tạo được giáo viên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Một");
    const result = await createUsers(teacher.session, { role: "teacher", grade: null, people: [{ fullName: "Giáo Viên Hai", phone: null }] });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("học sinh không tạo được tài khoản nào", async () => {
    const student = await makeUser("student", "Học Sinh Một");
    const result = await createUsers(student.session, { role: "student", grade: 10, people: [{ fullName: "Học Sinh Hai", phone: "0933000009" }] });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

describe("listUsers", () => {
  it("phân trang 15 dòng, tìm không phân biệt dấu và lọc theo khối ở máy chủ", async () => {
    const names = Array.from({ length: 19 }, (_, i) => `Phạm Quốc Khánh ${String.fromCharCode(65 + i)}`);
    const people = [...names, "Đặng Thị Bình"].map((fullName, i) => ({ fullName, phone: `09440000${String(i).padStart(2, "0")}` }));
    await createUsers(adminUser(), { role: "student", grade: 12, people });

    const page1 = listUsers(adminUser(), { role: "student", grade: 12, q: "", page: 1 });
    expect(page1.ok && { n: page1.rows.length, total: page1.total, pageSize: page1.pageSize }).toEqual({ n: 15, total: 20, pageSize: 15 });
    const page2 = listUsers(adminUser(), { role: "student", grade: 12, q: "", page: 2 });
    expect(page2.ok && page2.rows.length).toBe(5);

    const found = listUsers(adminUser(), { role: "student", grade: undefined, q: "dang thi binh", page: 1 });
    expect(found.ok && found.rows.map((r) => r.fullName)).toEqual(["Đặng Thị Bình"]);
    const byUsername = listUsers(adminUser(), { role: "student", grade: undefined, q: "0944000019", page: 1 });
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

  it("sửa họ tên thì tìm được theo tên mới và ghi audit", async () => {
    const student = await makeUser("student", "Trần Văn Sai");
    expect(updateUser(adminUser(), student.session.id, { fullName: "Trần Văn Đúng" })).toEqual({ ok: true });
    expect(rowOf(student.session.id)).toMatchObject({ fullName: "Trần Văn Đúng", searchName: "tran van dung", username: student.session.username });
    expect(auditActions(student.session.id)).toContain("user.rename");
  });

  it("sửa số điện thoại thì đăng nhập bằng số mới, giữ mật khẩu và phiên đang có", async () => {
    const student = await makeUser("student", "Học Sinh Đổi Số");
    const session = await login({ username: student.session.username, password: student.password }, "1.1.1.4");
    expect(updateUser(adminUser(), student.session.id, { phone: "0977000111" })).toEqual({ ok: true });
    expect(rowOf(student.session.id)?.username).toBe("0977000111");
    expect(auditActions(student.session.id)).toContain("user.change_phone");
    expect(session.ok && findSessionUser(session.token)?.username).toBe("0977000111");
    expect((await login({ username: "0977000111", password: student.password }, "1.1.1.4")).ok).toBe(true);
    expect((await login({ username: student.session.username, password: student.password }, "1.1.1.4")).ok).toBe(false);
  });

  it("số điện thoại đã có tài khoản khác thì từ chối và không sửa gì", async () => {
    const first = await makeUser("student", "Học Sinh Giữ Số");
    const second = await makeUser("student", "Học Sinh Muốn Đổi");
    const result = updateUser(adminUser(), second.session.id, { fullName: "Tên Mới", phone: first.session.username });
    expect(result).toMatchObject({ ok: false, status: 400, field: "phone", message: "Số điện thoại đã có tài khoản" });
    expect(rowOf(second.session.id)).toMatchObject({ fullName: "Học Sinh Muốn Đổi", username: second.session.username });
  });

  it("gửi lại đúng họ tên và số điện thoại cũ thì không ghi audit", async () => {
    const student = await makeUser("student", "Học Sinh Không Đổi");
    const before = auditActions(student.session.id).length;
    expect(updateUser(adminUser(), student.session.id, { fullName: "Học Sinh Không Đổi", phone: student.session.username })).toEqual({ ok: true });
    expect(auditActions(student.session.id).length).toBe(before);
  });

  it("không đổi số điện thoại cho giáo viên, vẫn sửa được họ tên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Mười");
    expect(updateUser(adminUser(), teacher.session.id, { phone: "0977000222" })).toMatchObject({ ok: false, status: 400, field: "phone" });
    expect(updateUser(adminUser(), teacher.session.id, { fullName: "Giáo Viên Mười Một" })).toEqual({ ok: true });
    expect(rowOf(teacher.session.id)).toMatchObject({ fullName: "Giáo Viên Mười Một", username: teacher.session.username });
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

describe("listUserIds", () => {
  it("trả id của mọi tài khoản khớp bộ lọc, không chia trang", async () => {
    const people = Array.from({ length: 17 }, (_, i) => ({ fullName: `Vũ Chọn Hết ${String.fromCharCode(65 + i)}`, phone: `09550000${String(i).padStart(2, "0")}` }));
    await createUsers(adminUser(), { role: "student", grade: 10, people });
    const all = listUserIds(adminUser(), { role: "student", grade: 10, q: "vu chon het", page: 1 });
    expect(all.ok && all.ids.length).toBe(17);
    const page = listUsers(adminUser(), { role: "student", grade: 10, q: "vu chon het", page: 1 });
    expect(all.ok && page.ok && all.ids.slice(0, 15)).toEqual(page.ok && page.rows.map((row) => row.id));
    expect(listUserIds(adminUser(), { role: "student", grade: 11, q: "vu chon het", page: 1 })).toMatchObject({ ok: true, ids: [] });
  });

  it("giáo viên không lấy được id của giáo viên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Lấy Id");
    expect(listUserIds(teacher.session, { role: "teacher", grade: undefined, q: "", page: 1 })).toMatchObject({ ok: false, status: 403 });
  });
});

describe("bulkUsers", () => {
  it("chuyển khối nhiều học sinh một lần, mỗi học sinh một dòng audit, học sinh đã ở khối đó thì bỏ qua", async () => {
    const a = await makeUser("student", "Chuyển Khối Một", 10);
    const b = await makeUser("student", "Chuyển Khối Hai", 10);
    const c = await makeUser("student", "Chuyển Khối Ba", 11);
    const result = bulkUsers(adminUser(), { action: "grade", grade: 11, ids: [a.session.id, b.session.id, c.session.id] });
    expect(result).toEqual({ ok: true, count: 2 });
    expect([a, b, c].map((item) => rowOf(item.session.id)?.grade)).toEqual([11, 11, 11]);
    expect(auditActions(a.session.id)).toContain("user.change_grade");
    expect(auditActions(c.session.id)).not.toContain("user.change_grade");
  });

  it("xoá nhiều học sinh một lần và ghi audit", async () => {
    const a = await makeUser("student", "Xoá Nhiều Một");
    const b = await makeUser("student", "Xoá Nhiều Hai");
    expect(bulkUsers(adminUser(), { action: "delete", ids: [a.session.id, b.session.id] })).toEqual({ ok: true, count: 2 });
    expect(rowOf(a.session.id)).toBeUndefined();
    expect(rowOf(b.session.id)).toBeUndefined();
    expect(auditActions(a.session.id)).toContain("user.delete");
  });

  it("bỏ qua id không tồn tại và tài khoản ngoài phạm vi", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Làm Nhiều");
    const other = await makeUser("teacher", "Giáo Viên Bị Chọn");
    const student = await makeUser("student", "Học Sinh Bị Chọn");
    const result = bulkUsers(teacher.session, { action: "delete", ids: [other.session.id, adminUser().id, 999999, student.session.id] });
    expect(result).toEqual({ ok: true, count: 1 });
    expect(rowOf(other.session.id)).toBeDefined();
    expect(rowOf(adminUser().id)).toBeDefined();
    expect(rowOf(student.session.id)).toBeUndefined();
  });

  it("chuyển khối không áp cho giáo viên", async () => {
    const teacher = await makeUser("teacher", "Giáo Viên Không Khối");
    expect(bulkUsers(adminUser(), { action: "grade", grade: 12, ids: [teacher.session.id] })).toEqual({ ok: true, count: 0 });
    expect(rowOf(teacher.session.id)?.grade).toBeNull();
  });

  it("học sinh không làm được thao tác nhiều tài khoản", async () => {
    const student = await makeUser("student", "Học Sinh Tự Xoá");
    const victim = await makeUser("student", "Học Sinh Nạn Nhân");
    expect(bulkUsers(student.session, { action: "delete", ids: [victim.session.id] })).toMatchObject({ ok: false, status: 403 });
    expect(rowOf(victim.session.id)).toBeDefined();
  });
});
