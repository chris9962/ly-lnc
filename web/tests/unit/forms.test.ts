import { describe, expect, it } from "vitest";
import { loginForm } from "@/lib/loginForm";
import { passwordForm } from "@/lib/passwordForm";
import { createUsersForm, listUsersQuery, updateUserForm } from "@/lib/userForm";

const firstIssue = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) => result.error?.issues[0];

describe("loginForm", () => {
  it("cắt khoảng trắng quanh tên đăng nhập, giữ nguyên mật khẩu", () => {
    expect(loginForm.parse({ username: "  annv ", password: " a b " })).toEqual({ username: "annv", password: " a b " });
  });

  it("báo lỗi đúng trường khi bỏ trống", () => {
    expect(firstIssue(loginForm.safeParse({ username: " ", password: "x" }))?.path).toEqual(["username"]);
    expect(firstIssue(loginForm.safeParse({ username: "a", password: "" }))?.path).toEqual(["password"]);
  });
});

describe("passwordForm", () => {
  const valid = { current: "cu-12345", next: "moi-12345", confirm: "moi-12345" };

  it("nhận mật khẩu mới hợp lệ", () => {
    expect(passwordForm.safeParse(valid).success).toBe(true);
  });

  it("từ chối mật khẩu mới ngắn hơn 8 ký tự", () => {
    expect(firstIssue(passwordForm.safeParse({ ...valid, next: "ngan", confirm: "ngan" }))?.path).toEqual(["next"]);
  });

  it("từ chối khi nhập lại không khớp", () => {
    expect(firstIssue(passwordForm.safeParse({ ...valid, confirm: "khac-12345" }))?.path).toEqual(["confirm"]);
  });

  it("từ chối khi mật khẩu mới trùng mật khẩu hiện tại", () => {
    expect(firstIssue(passwordForm.safeParse({ current: "moi-12345", next: "moi-12345", confirm: "moi-12345" }))?.path).toEqual(["next"]);
  });
});

describe("createUsersForm", () => {
  it("học sinh: tách họ tên và số điện thoại, nhận dấu tab, dấu phẩy hoặc khoảng trắng", () => {
    const parsed = createUsersForm.parse({
      role: "student",
      grade: "11",
      names: "Nguyễn Văn An\t0912345678\r\n\n  Trần   Thị Bình , 0987 654 321 \nLê Văn C 912345679\n0911222333;Phạm D\n",
    });
    expect(parsed).toEqual({
      role: "student",
      grade: 11,
      people: [
        { fullName: "Nguyễn Văn An", phone: "0912345678" },
        { fullName: "Trần Thị Bình", phone: "0987654321" },
        { fullName: "Lê Văn C", phone: "0912345679" },
        { fullName: "Phạm D", phone: "0911222333" },
      ],
    });
  });

  it("học sinh: báo dòng thiếu số điện thoại", () => {
    const issue = firstIssue(createUsersForm.safeParse({ role: "student", grade: "11", names: "Nguyễn Văn An 0912345678\nTrần Thị Bình" }));
    expect(issue?.path).toEqual(["names"]);
    expect(issue?.message).toBe("Dòng 2 thiếu số điện thoại hợp lệ");
  });

  it("học sinh: báo số điện thoại lặp trong danh sách", () => {
    const issue = firstIssue(createUsersForm.safeParse({ role: "student", grade: "11", names: "A 0912345678\nB 0912 345 678" }));
    expect(issue?.path).toEqual(["names"]);
    expect(issue?.message).toBe("Số điện thoại 0912345678 bị lặp");
  });

  it("giáo viên: chỉ cần họ tên, không có khối và số điện thoại", () => {
    expect(createUsersForm.parse({ role: "teacher", grade: "", names: "Lâm Ngọc Cớm" })).toEqual({
      role: "teacher",
      grade: null,
      people: [{ fullName: "Lâm Ngọc Cớm", phone: null }],
    });
  });

  it("học sinh bắt buộc có khối 10, 11 hoặc 12", () => {
    expect(firstIssue(createUsersForm.safeParse({ role: "student", grade: "", names: "A 0912345678" }))?.path).toEqual(["grade"]);
    expect(firstIssue(createUsersForm.safeParse({ role: "student", grade: "9", names: "A 0912345678" }))?.path).toEqual(["grade"]);
  });

  it("từ chối danh sách trống, quá 200 dòng hoặc tên quá 80 ký tự", () => {
    expect(firstIssue(createUsersForm.safeParse({ role: "teacher", grade: "", names: " \n " }))?.path).toEqual(["names"]);
    expect(createUsersForm.safeParse({ role: "teacher", grade: "", names: Array(201).fill("A").join("\n") }).success).toBe(false);
    expect(createUsersForm.safeParse({ role: "teacher", grade: "", names: "A".repeat(81) }).success).toBe(false);
  });
});

describe("updateUserForm", () => {
  it("nhận khoá hoặc đổi khối", () => {
    expect(updateUserForm.parse({ disabled: true })).toEqual({ disabled: true });
    expect(updateUserForm.parse({ grade: "12" })).toEqual({ grade: 12 });
  });

  it("từ chối khi không có trường nào hoặc khối sai", () => {
    expect(updateUserForm.safeParse({}).success).toBe(false);
    expect(updateUserForm.safeParse({ grade: "13" }).success).toBe(false);
  });
});

describe("listUsersQuery", () => {
  it("điền giá trị mặc định", () => {
    expect(listUsersQuery.parse({ role: "student" })).toEqual({ role: "student", grade: undefined, q: "", page: 1 });
  });

  it("đọc chuỗi từ URL", () => {
    expect(listUsersQuery.parse({ role: "student", grade: "12", q: "  bình ", page: "3" })).toEqual({ role: "student", grade: 12, q: "bình", page: 3 });
  });

  it("giá trị sai thì quay về mặc định thay vì báo lỗi", () => {
    expect(listUsersQuery.parse({ role: "student", grade: "abc", page: "-2" })).toEqual({ role: "student", grade: undefined, q: "", page: 1 });
  });
});
