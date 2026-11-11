import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const PDF = path.join(process.cwd(), "..", "template", "2026.on tap chuong 1_Vat li Nhiet 12D1 (29.09) DAP AN.pdf");
const PAPER_TITLE = "Ôn tập nhiệt E2E";
const EXAM_TITLE = "Kiểm tra nhiệt E2E";
const STUDENT = "0933000001";
const state = { admin: "", student: "", paperId: 0, examId: 0 };

const adminFile = () => path.join(process.env.E2E_DATA_DIR!, "e2e-admin.txt");

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function changePassword(page: Page, current: string, next: string) {
  await page.getByLabel("Mật khẩu hiện tại").fill(current);
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(next);
  await page.getByLabel("Nhập lại mật khẩu mới").fill(next);
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
}

const newPassword = (label: string) => `${label}-${Math.random().toString(36).slice(2, 10)}A1`;

// chạy riêng file này thì admin vẫn còn mật khẩu tạm, phải đổi trước
test.beforeAll(async ({ browser }) => {
  if (fs.existsSync(adminFile())) {
    state.admin = fs.readFileSync(adminFile(), "utf8").trim();
    return;
  }
  const temp = fs.readFileSync(path.join(process.env.E2E_DATA_DIR!, "admin-account.txt"), "utf8").match(/Mật khẩu tạm:\s+(\S+)/)![1];
  const page = await browser.newPage();
  await login(page, "admin", temp);
  state.admin = newPassword("admin");
  await changePassword(page, temp, state.admin);
  await expect(page).toHaveURL(/\/exams$/);
  fs.writeFileSync(adminFile(), state.admin);
  await page.close();
});

async function asAdmin(browser: Browser) {
  const page = await browser.newPage();
  await login(page, "admin", state.admin);
  return page;
}

test("up đề PDF, hệ thống cắt câu và đọc đủ đáp án", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto("/papers");
  await page.getByRole("button", { name: "Up đề" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles(PDF);
  // tên đề tự điền theo tên file
  await expect(dialog.getByLabel("Tên đề")).not.toHaveValue("");
  await dialog.getByLabel("Tên đề").fill(PAPER_TITLE);
  await dialog.getByLabel("Khối").selectOption("12");
  await dialog.getByRole("button", { name: "Up và cắt câu" }).click();

  await page.waitForURL(/\/papers\/\d+\/edit$/, { timeout: 60000 });
  state.paperId = Number(page.url().match(/papers\/(\d+)/)![1]);
  await expect(page.getByText("Đáp án 28/28")).toBeVisible();
  await expect(page.locator("[data-box]").first()).toBeVisible();
  await page.close();
});

test("tìm đề khi gõ, không cần bấm nút", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto("/papers");
  await expect(page.getByRole("button", { name: "Tìm" })).toHaveCount(0);
  await page.getByLabel("Tìm đề theo tên").pressSequentially("nhiet e2e");
  await expect(page).toHaveURL(/q=nhiet\+e2e/);
  await expect(page.getByRole("link", { name: PAPER_TITLE })).toBeVisible();
  await page.getByLabel("Tìm đề theo tên").fill("khong co de nay");
  await expect(page.getByText("Không có đề khớp bộ lọc")).toBeVisible();
  await page.getByRole("button", { name: "Xoá bộ lọc" }).click();
  await expect(page.getByLabel("Tìm đề theo tên")).toHaveValue("");
  await expect(page.getByRole("link", { name: PAPER_TITLE })).toBeVisible();
  await page.close();
});

test("lọc đề theo ngày cập nhật", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto("/papers");
  await page.getByLabel("Ngày cập nhật").selectOption("today");
  await expect(page).toHaveURL(/updated=today/);
  await expect(page.getByRole("link", { name: PAPER_TITLE })).toBeVisible();

  await page.getByLabel("Ngày cập nhật").selectOption("range");
  await page.getByLabel("Từ ngày", { exact: true }).pressSequentially("01012020");
  await page.getByLabel("Đến ngày", { exact: true }).pressSequentially("02012020");
  await expect(page).toHaveURL(/from=2020-01-01&to=2020-01-02/);
  await expect(page.getByLabel("Từ ngày", { exact: true })).toHaveValue("01/01/2020");
  await expect(page.getByText("Không có đề khớp bộ lọc")).toBeVisible();

  await page.getByLabel("Đến ngày", { exact: true }).fill("31/02/2020");
  await expect(page.getByText("Ngày không hợp lệ")).toBeVisible();
  await page.close();
});

test("sửa đáp án trong trình chỉnh rồi lưu", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto(`/papers/${state.paperId}/edit`);
  await page.getByRole("button", { name: /^Câu 1\b/ }).first().click();
  const group = page.getByRole("radiogroup", { name: /Chọn đáp án Câu 1/ });
  await expect(group.getByRole("radio", { name: "D" })).toHaveAttribute("aria-checked", "true");
  await group.getByRole("radio", { name: "B" }).click();
  await expect(page.getByText("Chưa lưu")).toBeVisible();
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({ timeout: 60000 });
  // trả lại đáp án gốc cho các bước sau
  await group.getByRole("radio", { name: "D" }).click();
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({ timeout: 60000 });
  await page.close();
});

test("đặt lại khung về kết quả cắt tự động, giữ đáp án", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto(`/papers/${state.paperId}/edit`);
  await page.getByRole("button", { name: /^Câu 1\b/ }).first().click();

  // thêm lựa chọn E rồi xoá lựa chọn A: đáp án D lùi thành C
  const group = page.getByRole("radiogroup", { name: /Chọn đáp án Câu 1/ });
  await page.getByRole("button", { name: "Thêm lựa chọn E" }).click();
  await expect(group.getByRole("radio")).toHaveCount(5);
  await page.getByRole("button", { name: "Xoá lựa chọn A" }).click();
  await expect(group.getByRole("radio")).toHaveCount(4);
  await expect(group.getByRole("radio", { name: "C" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Xoá câu" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xoá", exact: true }).click();
  await expect(page.getByText("Đáp án 27/27")).toBeVisible();

  await page.getByRole("button", { name: "Đặt lại khung" }).click();
  await expect(page.getByRole("dialog")).toContainText("Đặt lại mọi khung về kết quả cắt tự động?");
  await page.getByRole("dialog").getByRole("button", { name: "Đặt lại" }).click();
  await expect(page.getByText("Đáp án 28/28")).toBeVisible();
  await expect(page.getByText("Chưa lưu")).toBeVisible();
  await page.close();
});

test("tạo kỳ thi thi ngay cho khối 12", async ({ browser }) => {
  const page = await asAdmin(browser);
  const created = await page.request.post("/api/users", { data: { role: "student", grade: "12", names: `Hoc Sinh Thi ${STUDENT}` } });
  const body = await created.json();
  expect(body.ok).toBe(true);
  state.student = body.issued[0].password;

  await page.goto("/exams");
  await page.getByRole("button", { name: "Tạo kỳ thi" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên kỳ thi").fill(EXAM_TITLE);
  await dialog.getByLabel("Khối").selectOption("12");
  await dialog.getByRole("combobox", { name: "Đề thi" }).pressSequentially("nhiet e2e");
  await dialog.getByRole("option", { name: new RegExp(PAPER_TITLE) }).click();
  await dialog.getByLabel("Số phút làm bài").fill("30");
  await dialog.getByRole("button", { name: "Tạo kỳ thi" }).click();

  await page.waitForURL(/\/exams\/\d+$/);
  state.examId = Number(page.url().match(/exams\/(\d+)/)![1]);
  await expect(page.getByRole("heading", { level: 1, name: EXAM_TITLE })).toBeVisible();
  await expect(page.getByText("Đang diễn ra").first()).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: STUDENT })).toContainText("Chưa vào thi");

  await page.goto("/exams");
  await page.getByLabel("Trạng thái").selectOption("ended");
  await expect(page.getByText("Không có kỳ thi khớp bộ lọc")).toBeVisible();
  await page.getByLabel("Trạng thái").selectOption("running");
  await page.getByLabel("Khối", { exact: true }).selectOption("12");
  await expect(page).toHaveURL(/status=running&grade=12|grade=12&status=running/);
  await expect(page.getByRole("link", { name: EXAM_TITLE })).toBeVisible();
  await page.close();
});

test("đề đang dùng trong kỳ thi thì không xoá được", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto(`/papers/${state.paperId}`);
  await page.getByRole("button", { name: "Xoá đề" }).click();
  await expect(page.getByRole("dialog")).toContainText(`Xoá đề ${PAPER_TITLE}?`);
  await page.getByRole("dialog").getByRole("button", { name: "Xoá đề" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /kỳ thi/ })).toBeVisible();
  await page.goto(`/papers/${state.paperId}`);
  await expect(page.getByRole("heading", { level: 1, name: PAPER_TITLE })).toBeVisible();
  await page.close();
});

test("học sinh vào thi, làm bài, nộp và thấy điểm ngay", async ({ page }) => {
  await login(page, STUDENT, state.student);
  const next = newPassword("hs");
  await changePassword(page, state.student, next);
  state.student = next;
  await expect(page).toHaveURL(/\/my-exams$/);

  await page.getByRole("button", { name: "Vào thi" }).click();
  await expect(page.getByRole("dialog")).toContainText(`Bắt đầu làm bài ${EXAM_TITLE} trong 30 phút?`);
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu" }).click();
  await page.waitForURL(/\/attempts\/\d+$/);

  // câu 1 đúng là D, câu 2 chọn sai
  await page.getByRole("radio", { name: "D" }).click();
  await expect(page.getByText("Đã làm 1/28")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: /Câu 2/ })).toBeVisible();
  await page.keyboard.press("a");
  await expect(page.getByText("Đã làm 2/28")).toBeVisible();
  await expect(page.getByText("Đã lưu bài làm")).toBeVisible();

  // tải lại trang vẫn giữ bài đã làm
  await page.reload();
  await expect(page.getByText("Đã làm 2/28")).toBeVisible();

  await page.getByRole("button", { name: "Nộp bài", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Nộp bài khi còn 26 câu chưa làm xong?");
  await page.getByRole("dialog").getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.getByText("0,25 / 10")).toBeVisible();
  await expect(page.getByText(/Đáp án mở sau/)).toBeVisible();

  // chỉ được làm một lần
  await page.goto("/my-exams");
  await expect(page.getByRole("button", { name: "Vào thi" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Xem bài" })).toBeVisible();
});

test("giáo viên thấy bài đã nộp, mở lại cho học sinh và tải bảng điểm", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto(`/exams/${state.examId}`);
  const row = page.getByRole("row").filter({ hasText: STUDENT });
  await expect(row).toContainText("0,25 / 10");
  await page.getByLabel("Trạng thái bài làm").selectOption("absent");
  await expect(row).toHaveCount(0);
  await page.getByLabel("Trạng thái bài làm").selectOption("submitted");
  await expect(page).toHaveURL(/status=submitted/);
  await expect(row).toContainText("0,25 / 10");
  await page.getByRole("button", { name: "Xoá bộ lọc" }).click();
  await expect(page).toHaveURL(/\/exams\/\d+$/);

  const download = await page.request.get(`/api/exams/${state.examId}/export`);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-type"]).toContain("spreadsheetml");

  await row.getByRole("button", { name: "Mở lại" }).click();
  await expect(page.getByRole("dialog")).toContainText("Mở lại bài của Hoc Sinh Thi?");
  await page.getByRole("dialog").getByLabel("Số phút làm tiếp").fill("10");
  await page.getByRole("dialog").getByRole("button", { name: "Mở lại bài" }).click();
  await expect(row).toContainText("Đang làm");
  await page.close();

  const student = await browser.newPage();
  await login(student, STUDENT, state.student);
  await expect(student.getByRole("link", { name: "Làm tiếp" })).toBeVisible();
  await student.close();
});

test("trang chi tiết học sinh hiện hoạt động theo năm", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto(`/students?q=${STUDENT}`);
  await page.getByRole("link", { name: "Hoc Sinh Thi" }).click();
  await page.waitForURL(/\/students\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hoc Sinh Thi" })).toBeVisible();
  const year = new Date().getFullYear();
  await expect(page.getByRole("heading", { level: 2, name: `Năm ${year}` })).toBeVisible();
  await expect(page.getByRole("group", { name: `Hoạt động năm ${year}` }).getByRole("link")).toHaveCount(1);
  const entry = page.getByRole("listitem").filter({ hasText: EXAM_TITLE });
  await expect(entry).toContainText("Đang làm");
  await expect(entry.getByRole("link", { name: "Xem bài" })).toBeVisible();
  const studentUrl = page.url();
  await page.close();

  const student = await browser.newPage();
  await login(student, STUDENT, state.student);
  await student.goto(studentUrl);
  await expect(student).toHaveURL(/\/my-exams$/);
  await student.close();
});

test("giáo viên thi thử đề và thấy đáp án ngay sau khi nộp", async ({ browser }) => {
  const page = await asAdmin(browser);
  await page.goto(`/papers/${state.paperId}`);
  await page.getByRole("button", { name: "Thi thử" }).click();
  await page.waitForURL(/\/attempts\/\d+$/);
  await page.getByRole("radio", { name: "D" }).click();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.getByText("Thi thử")).toBeVisible();
  await expect(page.getByText("1/18 câu đúng hết")).toBeVisible();
  await page.close();
});

test("học sinh không xem được ngân hàng đề và kỳ thi của giáo viên", async ({ page }) => {
  await login(page, STUDENT, state.student);
  await page.goto("/papers");
  await expect(page).toHaveURL(/\/my-exams$/);
  const api = await page.request.get(`/api/papers/${state.paperId}/pages/0`);
  expect([403, 404]).toContain(api.status());
  const exam = await page.request.get(`/api/exams/${state.examId}/export`);
  expect([403, 404]).toContain(exam.status());
});
