import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

// học sinh đăng nhập bằng số điện thoại
const AN = "0911000001";
const AN2 = "0911000002";
const BINH = "0911000003";

const secrets = { admin: "", teacher: "", teacherTemp: "", student: "", studentTemp: "", lockedTemp: "" };
const newPassword = (label: string) => `${label}-${Math.random().toString(36).slice(2, 10)}A1`;

const adminTempPassword = () =>
  fs.readFileSync(path.join(process.env.E2E_DATA_DIR!, "admin-account.txt"), "utf8").match(/Mật khẩu tạm:\s+(\S+)/)![1];

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function changePassword(page: Page, current: string, next: string) {
  await page.getByLabel("Mật khẩu hiện tại").fill(current);
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(next);
  await page.getByLabel("Nhập lại mật khẩu mới").fill(next);
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
}

async function createAccounts(page: Page, button: string, names: string[], grade?: string) {
  await page.getByRole("button", { name: button }).click();
  const dialog = page.getByRole("dialog");
  if (grade) await dialog.getByLabel("Khối").selectOption(grade);
  await dialog.getByLabel(/mỗi dòng một người/).fill(names.join("\n"));
  await dialog.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(dialog.getByRole("heading", { name: "Tài khoản vừa cấp" })).toBeVisible();
  const rows = await dialog.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent ?? "")));
  await dialog.getByRole("button", { name: "Đóng" }).click();
  return rows.map(([fullName, username, password]) => ({ fullName, username, password }));
}

// Next tự chèn một vùng role="alert" để đọc tên trang, phải loại ra
const alert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

// chỉ chụp khi đặt E2E_SHOT_DIR, dùng để xem lại giao diện sáng và tối bằng mắt
async function snapshot(page: Page, name: string) {
  const dir = process.env.E2E_SHOT_DIR;
  if (!dir) return;
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.screenshot({ path: path.join(dir, `${name}-${colorScheme}.png`) });
  }
  await page.emulateMedia({ colorScheme: "light" });
}

const row = (page: Page, username: string) => page.getByRole("row").filter({ has: page.getByRole("cell", { name: username, exact: true }) });

test("chưa đăng nhập thì về trang đăng nhập", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login$/);
});

test("sai mật khẩu thì báo lỗi và ở lại trang đăng nhập", async ({ page }) => {
  await login(page, "admin", "sai-mat-khau");
  await expect(alert(page)).toHaveText("Tên đăng nhập hoặc mật khẩu không đúng");
  await expect(page).toHaveURL(/\/login$/);
});

test("admin phải đổi mật khẩu tạm trước khi vào trang quản lý", async ({ page }) => {
  const temp = adminTempPassword();
  await login(page, "admin", temp);
  await expect(page).toHaveURL(/\/change-password$/);
  await page.goto("/students");
  await expect(page).toHaveURL(/\/change-password$/);

  await changePassword(page, "khong-dung-1", newPassword("x"));
  await expect(page.getByText("Mật khẩu hiện tại không đúng")).toBeVisible();

  secrets.admin = newPassword("admin");
  await changePassword(page, temp, secrets.admin);
  await expect(page).toHaveURL(/\/exams$/);
  // file spec khác dùng lại mật khẩu admin vì mỗi file chạy trong tiến trình riêng
  fs.writeFileSync(path.join(process.env.E2E_DATA_DIR!, "e2e-admin.txt"), secrets.admin);
  await expect(page.getByRole("heading", { level: 1, name: "Kỳ thi" })).toBeVisible();
});

test("admin tạo học sinh, tìm, lọc theo khối và phân trang", async ({ page }) => {
  await login(page, "admin", secrets.admin);
  await expect(page).toHaveURL(/\/exams$/);
  await page.goto("/students");
  const issued = await createAccounts(page, "Thêm học sinh", ["Nguyễn Văn An 0911000001", "Nguyen Van An\t+84911000002", "  Trần   Thị Bình , 0911 000 003 "], "11");
  expect(issued.map((a) => a.username)).toEqual([AN, AN2, BINH]);
  expect(issued[2].fullName).toBe("Trần Thị Bình");
  secrets.studentTemp = issued[0].password;
  secrets.lockedTemp = issued[2].password;

  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(row(page, AN)).toContainText("Mật khẩu tạm");
  await expect(page.getByRole("columnheader", { name: "Số điện thoại" })).toBeVisible();

  // số đã có tài khoản thì báo lỗi ngay trong hộp thoại, không tạo ai cả
  await page.getByRole("button", { name: "Thêm học sinh" }).click();
  await page.getByRole("dialog").getByLabel("Khối").selectOption("10");
  await page.getByRole("dialog").getByLabel(/mỗi dòng một người/).fill("Người Mới 0911000050\nTrùng Số 0911000001");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByRole("dialog")).toContainText("Số điện thoại đã có tài khoản: 0911000001");
  await page.getByRole("dialog").getByRole("button", { name: "Huỷ" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await snapshot(page, "students");

  await createAccounts(page, "Thêm học sinh", Array.from({ length: 14 }, (_, i) => `Phạm Quốc Khánh ${String.fromCharCode(65 + i)} 09120000${String(i).padStart(2, "0")}`), "12");
  await expect(page.locator("tbody tr")).toHaveCount(15);
  await expect(page.getByRole("navigation", { name: "Phân trang" })).toContainText("Trang 1/2");
  await page.getByRole("link", { name: "Trang sau" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);

  // gõ xong là tự tìm, không có nút
  await page.getByLabel("Tìm học sinh").pressSequentially("tran thi binh", { delay: 20 });
  await expect(page).toHaveURL(/q=tran\+thi\+binh/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Tìm" })).toHaveCount(0);
  await expect(row(page, BINH)).toBeVisible();

  await page.goto("/students");
  await page.getByLabel("Khối", { exact: true }).selectOption("11");
  await expect(page).toHaveURL(/grade=11/);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByText("3 học sinh", { exact: true })).toBeVisible();
  await page.getByLabel("Khối", { exact: true }).selectOption("10");
  await expect(page.getByText("Chưa có học sinh")).toBeVisible();
  await page.getByRole("button", { name: "Xoá bộ lọc" }).click();
  await expect(page).toHaveURL(/\/students$/);
});

test("admin tạo giáo viên", async ({ page }) => {
  await login(page, "admin", secrets.admin);
  await page.getByRole("link", { name: "Giáo viên" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Giáo viên" })).toBeVisible();
  const issued = await createAccounts(page, "Thêm giáo viên", ["Lâm Ngọc Cớm", "Giáo Viên Hai"]);
  expect(issued.map((a) => a.username)).toEqual(["comln", "haigv"]);
  secrets.teacherTemp = issued[0].password;
});

test("học sinh đổi mật khẩu tạm, vào trang chủ, không vào được trang quản lý", async ({ page }) => {
  // gõ số có khoảng trắng vẫn đăng nhập được
  await login(page, "0911 000 001", secrets.studentTemp);
  await expect(page).toHaveURL(/\/change-password$/);
  secrets.student = newPassword("hs");
  await changePassword(page, secrets.studentTemp, secrets.student);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 2, name: "Kết quả khối 11" })).toBeVisible();

  await page.goto("/students");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/teachers");
  await expect(page).toHaveURL(/\/home$/);

  const api = await page.request.get("/api/users?role=student");
  expect(api.status()).toBe(403);
});

test("giáo viên quản lý học sinh nhưng không đụng được tới giáo viên", async ({ page, browser }) => {
  await login(page, "comln", secrets.teacherTemp);
  secrets.teacher = newPassword("gv");
  await changePassword(page, secrets.teacherTemp, secrets.teacher);
  await expect(page).toHaveURL(/\/exams$/);
  await expect(page.getByRole("link", { name: "Giáo viên" })).toHaveCount(0);
  await page.goto("/teachers");
  await expect(page).toHaveURL(/\/exams$/);

  const teachers = await page.request.get("/api/users?role=teacher");
  expect(teachers.status()).toBe(403);
  // tài khoản admin có id 1, nằm ngoài phạm vi của giáo viên
  const outOfScope = await page.request.delete("/api/users/1");
  expect(outOfScope.status()).toBe(404);

  // đặt lại mật khẩu: học sinh đang đăng nhập bị đăng xuất, mật khẩu cũ hết dùng được
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await login(studentPage, AN, secrets.student);
  await expect(studentPage).toHaveURL(/\/home$/);

  await page.goto(`/students?q=${AN}`);
  await row(page, AN).getByRole("button", { name: "Đặt lại mật khẩu" }).click();
  await expect(page.getByRole("dialog")).toContainText(`Đặt lại mật khẩu của ${AN}?`);
  await page.getByRole("dialog").getByRole("button", { name: "Đặt lại" }).click();
  const issuedDialog = page.getByRole("dialog").filter({ hasText: "Tài khoản vừa cấp" });
  const resetPassword = (await issuedDialog.locator("tbody tr td").nth(2).textContent()) ?? "";
  expect(resetPassword).toHaveLength(8);
  await issuedDialog.getByRole("button", { name: "Đóng" }).click();

  await studentPage.goto("/home");
  await expect(studentPage).toHaveURL(/\/login$/);
  await login(studentPage, AN, secrets.student);
  await expect(alert(studentPage)).toHaveText("Tên đăng nhập hoặc mật khẩu không đúng");
  await studentContext.close();

  // khoá: danh sách đã quá một trang nên phải tìm trước
  await page.goto(`/students?q=${BINH}`);
  await row(page, BINH).getByRole("button", { name: "Khoá", exact: true }).click();
  await expect(row(page, BINH)).toContainText("Đã khoá");
  const lockedContext = await browser.newContext();
  const lockedPage = await lockedContext.newPage();
  await login(lockedPage, BINH, secrets.lockedTemp);
  await expect(alert(lockedPage)).toHaveText("Tài khoản đã bị khoá");
  await lockedContext.close();
  await row(page, BINH).getByRole("button", { name: "Mở khoá" }).click();
  await expect(row(page, BINH)).not.toContainText("Đã khoá");

  // đổi khối
  await page.goto(`/students?q=${AN2}`);
  await row(page, AN2).getByLabel("Khối của Nguyen Van An").selectOption("10");
  await page.getByLabel("Khối", { exact: true }).selectOption("10");
  await expect(page).toHaveURL(/grade=10/);
  await expect(page.locator("tbody tr")).toHaveCount(1);

  // xoá: huỷ thì còn, xác nhận thì mất
  await row(page, AN2).getByRole("button", { name: "Xoá" }).click();
  await expect(page.getByRole("dialog")).toContainText(`Xoá tài khoản ${AN2}?`);
  await page.getByRole("dialog").getByRole("button", { name: "Huỷ" }).click();
  await expect(row(page, AN2)).toBeVisible();
  await row(page, AN2).getByRole("button", { name: "Xoá" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xoá" }).click();
  await expect(page.getByText("Chưa có học sinh")).toBeVisible();
});

test("đăng xuất xong không vào lại được", async ({ page }) => {
  await login(page, "comln", secrets.teacher);
  await page.getByRole("button", { name: "Tài khoản" }).click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/users?role=student")).status()).toBe(401);
});

test("thanh trên cùng gom thông tin người dùng vào một nút, mở ra mới thấy đổi mật khẩu và đăng xuất", async ({ page }) => {
  await login(page, "comln", secrets.teacher);
  const trigger = page.getByRole("button", { name: "Tài khoản" });
  const panel = page.getByRole("group", { name: "Tài khoản" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Đổi mật khẩu" })).toHaveCount(0);

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toContainText("Lâm Ngọc Cớm");
  await expect(panel).toContainText("comln");
  await expect(panel).toContainText("Giáo viên");
  await expect(panel.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
  await snapshot(page, "user-menu");

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(panel).toHaveCount(0);

  await trigger.click();
  await panel.getByRole("link", { name: "Đổi mật khẩu" }).click();
  await expect(page).toHaveURL(/\/change-password$/);
});

test("hộp thoại đóng khi bấm ra ngoài, trừ lúc đang hiện mật khẩu tạm", async ({ page }) => {
  await login(page, "comln", secrets.teacher);
  await expect(page).toHaveURL(/\/exams$/);
  await page.goto("/students");
  const dialog = page.getByRole("dialog");

  await page.getByRole("button", { name: "Thêm học sinh" }).click();
  await expect(dialog).toBeVisible();
  // bấm vào trong hộp thoại thì không đóng
  await dialog.getByRole("heading", { name: "Thêm học sinh" }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Thêm học sinh" }).click();
  await dialog.getByLabel("Khối").selectOption("10");
  await dialog.getByLabel(/mỗi dòng một người/).fill("Bấm Ra Ngoài 0911000099");
  await dialog.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(dialog.getByRole("heading", { name: "Tài khoản vừa cấp" })).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog.getByRole("heading", { name: "Tài khoản vừa cấp" })).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng" }).click();
  await expect(dialog).toHaveCount(0);
});

test("trang đăng nhập dùng được bằng bàn phím và có nhãn cho mọi ô nhập", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Tên đăng nhập")).toBeFocused();
  const unlabeled = await page.locator("input, select, textarea").evaluateAll(
    (fields) => fields.filter((field) => !(field as HTMLInputElement).labels?.length && !field.getAttribute("aria-label")).length,
  );
  expect(unlabeled).toBe(0);
});
