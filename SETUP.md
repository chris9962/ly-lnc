# Cài đặt LNC trên một máy mới

File này dành cho người hoặc agent dựng lại hệ thống trên máy khác. Quy tắc viết mã: `CLAUDE.md`. Thiết kế và lộ trình: `KE-HOACH.md`. Chi tiết lệnh và cấu trúc mã: `web/README.md`.

Trạng thái ghi ngày 2026-11-13.

## 1. Hệ thống gồm những gì

- Một web app Next.js trong `web/`, chạy một tiến trình ở cổng 3000, chỉ lắng nghe `127.0.0.1`.
- Database SQLite và file đề nằm trong `web/data/`. Thư mục này không nằm trong git.
- Truy cập từ internet đi qua Cloudflare Tunnel (`cloudflared`). Không mở cổng modem.
- `start.bat` ở thư mục gốc chạy cả web app và tunnel.

## 2. Phần mềm cần có

| Phần mềm | Phiên bản đã dùng | Ghi chú |
|---|---|---|
| Windows | 11 | `start.bat` chỉ chạy trên Windows |
| bun | 1.4.4 | https://bun.sh. Dùng để cài thư viện, build và chạy |
| Node.js | 22 | `bun run load` và Playwright cần `node` |
| Git for Windows | bất kỳ | Có Git Bash. `bun run e2e` và `bun run load` gọi `bash` |
| Microsoft Edge | có sẵn | Playwright chạy E2E bằng Edge trên máy |
| cloudflared | bản mới nhất | Chỉ cần khi mở ra internet |

## 3. Dựng lần đầu

```
git clone https://github.com/chris9962/ly-lnc.git
cd ly-lnc
git checkout dev
```

Mã mới nhất nằm ở nhánh `dev`. Không merge vào `main`, không push, không deploy khi chưa được yêu cầu.

Sau đó bấm đúp `start.bat`. File này tự làm các việc sau:

1. Kiểm tra đã cài bun và cổng 3000 còn trống.
2. Chạy `bun install` nếu chưa có `web/node_modules`.
3. Chạy `bun run build` nếu chưa có `web/.next/BUILD_ID`.
4. Chạy `cloudflared tunnel run` nếu máy có `cloudflared` và có file `%USERPROFILE%\.cloudflared\config.yml`.
5. Chạy web app tại http://localhost:3000.

Lần khởi động đầu tiên, máy chủ nạp 12 đề VSAT kèm đáp án từ `web/seed/papers/` vào thư mục "Đề VSAT". Bước này mất khoảng 20 giây. Mỗi đề chỉ nạp một lần, đề đã xoá không tự quay lại. Đặt `SEED_PAPERS=0` nếu không muốn nạp.

Đóng cửa sổ là dừng tất cả.

`start.bat` chỉ build khi chưa có bản build. Sau khi kéo mã mới về phải tự build lại:

```
cd web
bun install
bun run build
```

## 4. Tài khoản admin lần đầu

- Lần chạy đầu tiên với thư mục `web/data/` trống, hệ thống tạo tài khoản `admin` và ghi mật khẩu tạm vào `web/data/admin-account.txt`.
- Đăng nhập xong phải đổi mật khẩu. Sau đó xoá file này.
- Không ghi mật khẩu vào git, vào file tài liệu hay vào khung chat.

## 5. Chuyển dữ liệu từ máy cũ

Toàn bộ dữ liệu là thư mục `web/data/`:

- `app.db`, `app.db-wal`, `app.db-shm`: database.
- `files/`: file PDF gốc và ảnh câu hỏi.

Cách chuyển:

1. Dừng máy chủ trên máy cũ (đóng cửa sổ `start.bat`). Không chép khi máy chủ đang chạy, vì file `-wal` có thể chưa ghi hết vào `app.db`.
2. Chép cả thư mục `web/data/` sang đúng vị trí trên máy mới.
3. Chạy `start.bat`. Cấu trúc bảng mới trong `web/drizzle/` tự được áp dụng khi máy chủ khởi động.

Sao lưu định kỳ cũng là chép thư mục này. Đặt biến môi trường `DATA_DIR` nếu muốn để dữ liệu ở thư mục khác.

## 6. Cloudflare Tunnel

Tên miền đã có. Tính đến ngày 2026-11-13, máy phát triển chưa cài `cloudflared` và chưa tạo tunnel. Các bước dưới đây chưa được chạy thử.

Mọi bước chỉ làm một lần trên mỗi máy. Sau đó chỉ cần bấm `start.bat`.

1. Đưa tên miền về Cloudflare: thêm tên miền ở https://dash.cloudflare.com (gói Free), đổi nameserver ở nơi mua tên miền, chờ trạng thái "Active".
2. Cài cloudflared, rồi mở lại cửa sổ lệnh:
   ```
   winget install --id Cloudflare.cloudflared
   ```
3. Đăng nhập. Bước này mở trình duyệt, chủ tài khoản Cloudflare phải tự bấm Authorize:
   ```
   cloudflared tunnel login
   ```
4. Tạo tunnel. Lệnh in ra mã tunnel và tạo file khoá `<MÃ-TUNNEL>.json` trong `%USERPROFILE%\.cloudflared\`:
   ```
   cloudflared tunnel create lnc
   ```
5. Tạo file `%USERPROFILE%\.cloudflared\config.yml`. Thay mã tunnel và tên miền:
   ```yaml
   tunnel: <MÃ-TUNNEL>
   credentials-file: C:\Users\<TÊN-USER>\.cloudflared\<MÃ-TUNNEL>.json
   ingress:
     - hostname: thi.tenmien.vn
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```
6. Tạo bản ghi DNS trỏ tên miền về tunnel:
   ```
   cloudflared tunnel route dns lnc thi.tenmien.vn
   ```
7. Chạy `start.bat`. Cửa sổ phải hiện "Tunnel: dang chay". Nhật ký tunnel nằm ở `web/data/cloudflared.log`.
8. Mở tên miền trên điện thoại dùng 4G để chắc chắn vào được từ ngoài mạng.

Chuyển tunnel sang máy khác: chép thư mục `%USERPROFILE%\.cloudflared\` sang máy mới và sửa đường dẫn `credentials-file` cho đúng tên user. Không chạy cùng một tunnel trên hai máy cho hai bộ dữ liệu khác nhau, vì Cloudflare sẽ chia người dùng ngẫu nhiên giữa hai máy.

Thư mục `.cloudflared` chứa khoá chạy tunnel dưới tên miền. Không đưa vào git, không gửi cho người khác.

Mã nguồn đã sẵn cho việc chạy sau tunnel, không cần sửa:

- Cookie đăng nhập tự bật `secure` khi yêu cầu tới qua HTTPS (`x-forwarded-proto`).
- Giới hạn đăng nhập sai lấy địa chỉ người dùng từ header `cf-connecting-ip`.
- Kiểm tra `origin` so với `x-forwarded-host`.

## 7. Kiểm tra sau khi dựng

Chạy trong `web/`:

| Lệnh | Việc | Thời gian |
|---|---|---|
| `bunx tsc --noEmit` | Kiểm tra kiểu | vài giây |
| `bun run lint` | ESLint | vài giây |
| `bun run test` | Test unit | vài giây |
| `bun test:db` | Test nghiệp vụ trên database tạm | khoảng 1 phút |
| `bun run e2e` | Build rồi chạy Playwright | khoảng 1 phút |
| `bun run load` | Thử tải 200 học sinh. Cần `bun run build` trước | khoảng 1,5 phút |

Các lệnh test đều dùng thư mục dữ liệu tạm, không đụng `web/data/`. Test cắt đề, E2E và thử tải cần các file PDF mẫu trong `template/`.

Trên máy sẽ dùng để thi thật, nên chạy `bun run load` một lần trước kỳ thi đầu tiên. Kết quả trên máy phát triển (12 luồng CPU) ghi ở mục "Còn mở" của `KE-HOACH.md`: 200 học sinh không lỗi, bước chậm nhất khoảng 0,8 giây.

Chủ dự án yêu cầu không chạy E2E sau từng thay đổi nhỏ. Chỉ chạy khi được yêu cầu hoặc gom một lần sau cả loạt việc.

## 8. Vận hành máy chủ thi

- Tắt chế độ ngủ của Windows. Đặt giờ hoạt động cho Windows Update để máy không tự khởi động lại trong giờ thi.
- Bật máy và chạy `start.bat` trước giờ thi. Không có tiến trình chạy nền nào khác.
- Bảo học sinh đăng nhập trước giờ mở đề vài phút. Đăng nhập dồn cùng lúc với mở đề là lúc máy chủ nặng nhất.
- Bài làm tự lưu từng câu. Mất điện hoặc mất mạng thì khi máy chủ lên lại, giáo viên dùng nút "Gia hạn" hoặc "Cho thi lại" ở trang kỳ thi.

## 9. Việc chưa xong

- Cloudflare Tunnel: chưa cài, chưa thử (mục 6).
- Chưa có shortcut `start.bat` trên Desktop, chưa tự chạy khi mở máy.
- Chưa có sao lưu tự động.
- Tính năng chưa làm: nhiều mã đề cho một kỳ thi, chế độ xem nguyên PDF kèm phiếu trả lời.
- Nút "Cho thi lại" hiện mở lại bài cũ để làm tiếp, giữ câu đã chọn. Chưa chốt có đổi thành làm lại từ đầu hay không.
- Dữ liệu trên máy phát triển có 46 kỳ thi mẫu tên "Kiểm tra THPT tháng MM/YYYY" và "Thi thử VSAT tháng MM/YYYY" cùng đề "Thi thử VSAT đề 07", thêm ngày 2026-11-11 để xem giao diện. Bài làm mẫu chỉ có điểm, không có câu trả lời. Nếu chép `web/data/` sang máy thi thật thì cần xoá các kỳ thi này trước.
