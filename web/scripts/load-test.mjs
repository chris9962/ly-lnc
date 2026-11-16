// Thử tải: giả lập nhiều học sinh cùng đăng nhập, vào thi, tải ảnh câu, lưu đáp án rồi nộp.
// Chạy qua scripts/load-test.sh để có máy chủ riêng với thư mục dữ liệu tạm, không đụng dữ liệu thật.
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.LOAD_BASE ?? "http://127.0.0.1:3212";
const DATA = process.env.DATA_DIR;
const COUNT = Number(process.env.LOAD_STUDENTS ?? 200);
// khoảng nghỉ giữa hai lần lưu đáp án của một học sinh, thực tế dài hơn nhiều nên đây là mức nặng hơn thật
const THINK_MS = [Number(process.env.LOAD_THINK_MIN ?? 500), Number(process.env.LOAD_THINK_MAX ?? 2500)];
// học sinh đăng nhập rải trong RAMP_MS, sau đó tất cả cùng vào thi trong START_MS
const RAMP_MS = Number(process.env.LOAD_RAMP_MS ?? 20000);
const START_MS = Number(process.env.LOAD_START_MS ?? 2000);
const TEMPLATE = path.resolve(import.meta.dirname, "..", "..", "template");

const stats = new Map();
const errors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const between = ([min, max]) => min + Math.random() * (max - min);

function client() {
  let cookie = "";
  return async function call(step, url, method = "GET", body, form) {
    const started = performance.now();
    let status = 0;
    let json = null;
    try {
      const response = await fetch(BASE + url, {
        method,
        headers: { cookie, origin: BASE, ...(body ? { "content-type": "application/json" } : {}) },
        body: form ?? (body ? JSON.stringify(body) : undefined),
        redirect: "manual",
      });
      status = response.status;
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      if (response.headers.get("content-type")?.includes("json")) json = await response.json();
      else await response.arrayBuffer();
    } catch (error) {
      errors.push(`${step}: ${error.cause?.code ?? error.message}`);
    }
    const took = performance.now() - started;
    if (!stats.has(step)) stats.set(step, []);
    stats.get(step).push(took);
    const failed = status === 0 || status >= 400 || (json && json.ok === false);
    if (failed && status !== 0) errors.push(`${step}: HTTP ${status} ${json?.message ?? ""}`);
    return { ok: !failed, status, json };
  };
}

async function setup() {
  const call = client();
  for (let i = 0; i < 60 && !fs.existsSync(path.join(DATA, "admin-account.txt")); i++) {
    await fetch(BASE + "/login").catch(() => null);
    await sleep(500);
  }
  const temp = fs.readFileSync(path.join(DATA, "admin-account.txt"), "utf8").match(/Mật khẩu tạm:\s+(\S+)/)[1];
  const password = "Load-" + Math.random().toString(36).slice(2, 12) + "A1";
  await call("setup", "/api/auth/login", "POST", { username: "admin", password: temp });
  await call("setup", "/api/auth/password", "POST", { current: temp, next: password, confirm: password });
  const file = fs.readdirSync(TEMPLATE).filter((name) => name.endsWith(".pdf")).sort()[2];
  const form = new FormData();
  form.set("file", new Blob([fs.readFileSync(path.join(TEMPLATE, file))], { type: "application/pdf" }), file);
  form.set("title", "Đề thử tải");
  form.set("grade", "12");
  form.set("folderId", "");
  const paper = await call("setup", "/api/papers", "POST", undefined, form);
  const issued = [];
  for (let offset = 0; offset < COUNT; offset += 50) {
    const names = Array.from({ length: Math.min(50, COUNT - offset) }, (_, i) => `Hoc Sinh Tai ${offset + i + 1} 09${String(70000000 + offset + i)}`).join("\n");
    const created = await call("setup", "/api/users", "POST", { role: "student", grade: "12", names });
    if (!created.ok) throw new Error("tạo học sinh: " + JSON.stringify(created.json));
    issued.push(...created.json.issued);
  }
  const end = new Date(Date.now() + 2 * 3600e3 + 7 * 3600e3);
  const two = (n) => String(n).padStart(2, "0");
  const exam = await call("setup", "/api/exams", "POST", {
    title: "Kỳ thi thử tải",
    grade: "12",
    paperId: paper.json.id,
    duration: "60",
    mode: "now",
    endDate: `${two(end.getUTCDate())}/${two(end.getUTCMonth() + 1)}/${end.getUTCFullYear()}`,
    endTime: `${two(end.getUTCHours())}:${two(end.getUTCMinutes())}`,
  });
  if (!exam.ok) throw new Error("tạo kỳ thi: " + JSON.stringify(exam.json));
  return { paperId: paper.json.id, examId: exam.json.id, students: issued, admin: call };
}

// chờ mọi học sinh đăng nhập xong rồi mới cùng bấm vào thi, giống lúc kỳ thi mở
let ready = 0;
let release;
const gate = new Promise((resolve) => (release = resolve));

async function student(account, context, index) {
  const call = client();
  await sleep((index / COUNT) * RAMP_MS);
  const login = await call("đăng nhập", "/api/auth/login", "POST", { username: account.username, password: account.password });
  const next = account.password + "-Moi1";
  if (login.ok) await call("đổi mật khẩu", "/api/auth/password", "POST", { current: account.password, next, confirm: next });
  if (++ready === COUNT) release();
  await gate;
  if (!login.ok) return false;

  await sleep(Math.random() * START_MS);
  await call("trang chủ", "/home");
  const started = await call("vào thi", `/api/exams/${context.examId}/start`, "POST");
  if (!started.ok) return false;
  const attemptId = started.json.attemptId;
  await call("trang làm bài", `/attempts/${attemptId}`);
  // trang làm bài hiện từng câu, ảnh của câu nào chỉ tải khi mở câu đó
  for (let seq = 1; seq <= 28; seq++) {
    await call("ảnh câu hỏi", `/api/papers/${context.paperId}/images/q${seq}.webp?v=1`);
    await sleep(between(THINK_MS));
    const value = seq <= 18 ? "ABCD"[Math.floor(Math.random() * 4)] : seq <= 22 ? ["Đ", "S", "Đ", "S"] : String(Math.floor(Math.random() * 100));
    await call("lưu đáp án", `/api/attempts/${attemptId}/answers`, "PUT", { seq, value });
  }
  const submitted = await call("nộp bài", `/api/attempts/${attemptId}/submit`, "POST");
  await call("trang kết quả", `/attempts/${attemptId}`);
  return submitted.ok;
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

const context = await setup();
stats.clear();
console.log(`Đã tạo ${context.students.length} học sinh, bắt đầu thử tải`);
const begun = performance.now();
const results = await Promise.all(context.students.map((account, index) => student(account, context, index)));
const seconds = (performance.now() - begun) / 1000;

const roster = await context.admin("bảng điểm", `/api/exams/${context.examId}/export`);
const total = [...stats.values()].reduce((sum, list) => sum + list.length, 0);
console.log(`\n${results.filter(Boolean).length}/${COUNT} học sinh nộp bài thành công trong ${seconds.toFixed(1)} giây`);
console.log(`${total} yêu cầu, trung bình ${(total / seconds).toFixed(0)} yêu cầu mỗi giây, ${errors.length} lỗi, tải bảng điểm HTTP ${roster.status}\n`);
console.log("Bước".padEnd(16), "Số lần".padStart(7), "Giữa".padStart(8), "p95".padStart(8), "p99".padStart(8), "Chậm nhất".padStart(10), " (ms)");
for (const [step, list] of stats) {
  const sorted = [...list].sort((a, b) => a - b);
  console.log(step.padEnd(16), String(sorted.length).padStart(7), ...[0.5, 0.95, 0.99].map((p) => percentile(sorted, p).toFixed(0).padStart(8)), sorted.at(-1).toFixed(0).padStart(10));
}
if (errors.length) {
  const groups = new Map();
  for (const error of errors) groups.set(error, (groups.get(error) ?? 0) + 1);
  console.log("\nLỗi:");
  for (const [error, count] of groups) console.log(`  ${count} lần: ${error}`);
}
process.exit(errors.length || results.some((ok) => !ok) ? 1 : 0);
