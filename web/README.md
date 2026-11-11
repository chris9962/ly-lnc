# LNC: ứng dụng web thi trắc nghiệm Vật lí

Quy tắc viết mã: `../CLAUDE.md`. Kế hoạch và quyết định thiết kế: `../KE-HOACH.md`.

## Chạy

```
bun install
bun run build
bun run start
```

Mở http://localhost:3000.

Lần chạy đầu tiên hệ thống tạo tài khoản `admin` với mật khẩu tạm ngẫu nhiên, ghi trong `data/admin-account.txt`. Đăng nhập xong phải đổi mật khẩu, sau đó xoá file này.

Khi sửa mã dùng `bun run dev`.

## Kiểm tra

| Lệnh | Việc |
|---|---|
| `bun run test` | Test unit (vitest) |
| `bun test:db` | Test tầng nghiệp vụ trên database tạm |
| `bun run e2e` | Build production rồi chạy Playwright bằng Edge có sẵn trên máy |
| `bunx tsc --noEmit` | Kiểm tra kiểu |
| `bun run lint` | ESLint |

Đặt `E2E_SHOT_DIR=<thư mục>` khi chạy E2E để lưu ảnh chụp giao diện sáng và tối.

## Dữ liệu

Mọi dữ liệu nằm trong `data/`: database `app.db`, file đề và ảnh câu hỏi trong `data/files`. Sao lưu hệ thống là chép thư mục này. Đặt biến môi trường `DATA_DIR` để dùng thư mục khác.

Đổi cấu trúc bảng: sửa `src/server/db/schema.ts`, chạy `bun run db:generate`, file SQL mới trong `drizzle/` tự được áp dụng khi máy chủ khởi động.

## Cấu trúc

- `src/lib`: mã dùng chung. `permissions.ts` (quyền, `requireApi`, `requirePage`), các schema zod `*Form.ts`, định dạng ngày.
- `src/lib/paperLayout.ts`, `src/lib/scoring.ts`: dạng câu hỏi, đáp án và cách chấm, dùng chung cho máy chủ và trình duyệt.
- `src/server`: nghiệp vụ. Mỗi hàm nhận `SessionUser`, tự kiểm quyền, trả `{ ok: true, ... }` hoặc `{ ok: false, message, status, field? }`. Thao tác ghi gọi `writeAudit` trong cùng transaction.
- `src/server/pdf`: đọc PDF bằng MuPDF, tìm mốc câu, đọc bảng đáp án, cắt ảnh. `src/server/storage.ts`: lưu file trên ổ đĩa.
- `src/server/papers.ts`, `exams.ts`, `attempts.ts`, `grading.ts`: ngân hàng đề, kỳ thi, bài làm, chấm điểm.
- `src/app/api`: route chỉ parse bằng zod, gọi nghiệp vụ, trả JSON.
- `src/app`: trang. Nhóm `(app)` có thanh menu, `(wide)` dùng cho trình chỉnh đề, `(focus)` dùng cho trang làm bài.
- `src/components/ui`: component giao diện dùng chung. `editor`, `exam`, `exams`, `papers`: component theo màn hình.
- `tests/unit`, `tests/db`, `tests/e2e`. Test cắt đề và E2E dùng các đề mẫu trong `../template`.
