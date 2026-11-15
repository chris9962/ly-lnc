# Quy tắc dự án

Kế hoạch và các quyết định thiết kế: `KE-HOACH.md`.

Cài đặt trên máy mới: `SETUP.md`. Khi chủ dự án yêu cầu "setup máy prod", làm theo `SETUP.md` mục 10 từ đầu tới cuối.

## Phạm vi áp dụng cho LNC

Chốt ngày 2026-11-11. Bộ quy tắc bên dưới lấy từ một dự án khác, các điểm sau khác đi ở LNC:

- Ứng dụng nằm trong `web/`. Mọi đường dẫn `src/...` trong quy tắc tính từ `web/`.
- Database là SQLite qua Drizzle (`better-sqlite3`). SQLite không có pool, quy tắc về pool không áp dụng.
- File đề và ảnh câu hỏi lưu trên ổ đĩa local, vẫn đi qua `src/server/storage.ts`. Không dùng S3, không có lệnh `bun test:s3`.
- Không áp dụng: bảng `banks`, `src/lib/month.ts`, `MonthPicker`, bucket `mgst-images`.
- `bun run test` và `bun test:db` chạy vitest. `requireApi`, `requirePage`, `requirePageWhere` nằm trong `src/lib/permissions.ts`.
- Component trong `src/components/ui` được thêm dần khi có trang cần tới.

## Code

- Tên biến, hàm, file, route viết tiếng Anh. Comment và chữ trên màn hình viết tiếng Việt.
- Comment chỉ giải thích lý do, một dòng, không lặp lại code. Không thêm docstring.
- Nghiệp vụ nằm ở `src/server/*.ts`, nhận `SessionUser`, trả `{ ok: true, ... } | { ok: false, message, status, field? }`.
- Route chỉ parse bằng zod ở `src/lib/*Form.ts`, gọi nghiệp vụ, trả JSON.
- Mỗi thao tác ghi phải ghi `audit_log` qua `writeAudit` trong cùng transaction.
- Quyền: chỉ dùng `src/lib/permissions.ts`. Route gọi `requireApi(request, action?)`. Trang gọi `requirePage` / `requirePageWhere`.
- Tầng nghiệp vụ kiểm quyền lại. Bản ghi ngoài phạm vi trả 404, không trả 403.
- Danh sách lớn dần phân trang 15 dòng. Máy chủ làm phần tìm và lọc. Ô chọn tìm qua route riêng, tối đa 20 dòng.
- Câu đếm con trong `sql` phải ghi rõ tên bảng, ví dụ `sql.raw('"banks"."id"')`.
- Form gửi dữ liệu thô lên máy chủ. Máy chủ parse lại bằng cùng schema.
- S3: dùng `src/server/storage.ts`, bucket local `mgi-bank-dev`. Không dùng `mgst-images`. Không in giá trị khoá S3 ra log hay output.
- Tháng tính theo giờ Việt Nam, dùng `src/lib/month.ts`.

## Giao diện

- Tailwind với token trong `src/app/globals.css`, có sáng và tối. Không viết mã màu cứng trong component, trừ khối thương hiệu.
- Dùng component có sẵn ở `src/components/ui`: Button, TextField, PasswordField, Select, Combobox, MultiSelect, Checkbox, Dialog, Card, StatusTag, Pager, FilterBar, DateField, MonthPicker, ConfirmDialog. Icon lấy từ `lucide-react`, không tự vẽ.
- WCAG AA: mọi input có label, nút chỉ có icon có aria-label, dùng được bằng bàn phím, không truyền thông tin chỉ bằng màu.
- React: không dùng `useEffect` cho giá trị suy ra được. Xử lý tương tác trong event handler. Effect chỉ đồng bộ hệ ngoài và phải có cleanup.
- Chữ trên màn hình: không câu giải thích, không xưng "Bạn", hộp xác nhận chỉ một câu hỏi, không dùng gạch ngang dài, không dùng dấu chấm giữa. Ngày dạng 05/11/2026, giờ Việt Nam.

## Test và commit

- Lệnh test: `bun run test`, `bun test:db`, `bun test:s3`, `bun run e2e`, `bunx tsc --noEmit`, `bun run lint`.
- E2E chạy trên bản build production qua `scripts/e2e-run.sh`.
- Viết test trước, xem test fail, rồi mới viết code.
- Không đóng pool trong file test DB.
- Commit trên nhánh `dev`, ký `chuyentina2 <chuyentina2@gmail.com>`. Không merge vào `main`, không push, không deploy.
- Message tiếng Việt, không dùng gạch ngang dài, kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Văn xuôi tiếng Việt viết câu ngắn, chủ động, ngày dạng YYYY-MM-DD, không ví von.
