import { describe, expect, it } from "vitest";
import { can, homePath, manageableRoles, type SessionUser } from "@/lib/permissions";

const user = (role: SessionUser["role"]): SessionUser => ({
  id: 1,
  username: "u",
  fullName: "U",
  role,
  grade: role === "student" ? 11 : null,
  mustChangePassword: false,
});

describe("can", () => {
  it("admin quản lý được học sinh và giáo viên", () => {
    expect(can(user("admin"), "students.manage")).toBe(true);
    expect(can(user("admin"), "teachers.manage")).toBe(true);
    expect(can(user("admin"), "exams.take")).toBe(false);
  });

  it("giáo viên chỉ quản lý được học sinh", () => {
    expect(can(user("teacher"), "students.manage")).toBe(true);
    expect(can(user("teacher"), "teachers.manage")).toBe(false);
  });

  it("học sinh chỉ được dự thi", () => {
    expect(can(user("student"), "exams.take")).toBe(true);
    expect(can(user("student"), "students.manage")).toBe(false);
    expect(can(user("student"), "teachers.manage")).toBe(false);
  });
});

describe("manageableRoles", () => {
  it("trả về các loại tài khoản mà người dùng được sửa", () => {
    expect(manageableRoles(user("admin"))).toEqual(["teacher", "student"]);
    expect(manageableRoles(user("teacher"))).toEqual(["student"]);
    expect(manageableRoles(user("student"))).toEqual([]);
  });
});

describe("homePath", () => {
  it("đưa mỗi vai trò về trang chính của mình", () => {
    expect(homePath(user("admin"))).toBe("/students");
    expect(homePath(user("teacher"))).toBe("/students");
    expect(homePath(user("student"))).toBe("/my-exams");
  });

  it("đang dùng mật khẩu tạm thì về trang đổi mật khẩu", () => {
    expect(homePath({ ...user("student"), mustChangePassword: true })).toBe("/change-password");
  });
});
