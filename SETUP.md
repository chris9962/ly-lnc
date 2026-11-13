# Cài đặt LNC trên một máy mới

File này dành cho người hoặc agent dựng lại hệ thống trên máy khác. Quy tắc viết mã: `CLAUDE.md`. Thiết kế và lộ trình: `KE-HOACH.md`. Chi tiết lệnh và cấu trúc mã: `web/README.md`.

Trạng thái ghi ngày 2026-11-15.

Khi chủ dự án yêu cầu "setup máy prod" trên một máy, agent làm theo mục 10 từ đầu tới cuối. Các mục 2 đến 8 là phần chi tiết mà mục 10 dẫn tới.

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

Lần khởi động đầu tiên, máy chủ nạp bộ đề có sẵn từ `web/seed/papers/`: 12 đề VSAT kèm đáp án vào thư mục "Đề VSAT" và 20 đề ôn thi TN THPT 2026 chưa có đáp án vào thư mục "Đề ôn thi TN THPT 2026". Máy chủ nạp trong nền khoảng một phút, trong lúc đó vẫn dùng được. Mỗi đề chỉ nạp một lần, đề đã xoá không tự quay lại. Đặt `SEED_PAPERS=0` nếu không muốn nạp.

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

### 6.1 Trạng thái ngày 2026-11-15

| Mục | Giá trị |
|---|---|
| Tên miền | `ly-lncom.xyz`, hết hạn 2029-11-11 |
| Nhà đăng ký | P.A Việt Nam, trang quản lý https://access.pavietnam.vn |
| Cloudflare | Tên miền nằm trong tài khoản Cloudflare của chủ dự án, gói Free |
| Nameserver | `iris.ns.cloudflare.com`, `ken.ns.cloudflare.com`, đổi ngày 2026-11-15 |
| DNSSEC | Tắt |
| Bản ghi DNS | CNAME `dev.ly-lncom.xyz` trỏ tới tunnel `lnc-dev`. Chưa có bản ghi cho `ly-lncom.xyz` |
| Tunnel `lnc-dev` | Đã tạo ngày 2026-11-15 trên máy phát triển (macOS), chạy thử đạt |
| Tunnel `lnc` | Chưa tạo. Tạo trên máy thi theo mục 6.4 |
| Always Use HTTPS | Tắt. Ngày 2026-11-15, `http://dev.ly-lncom.xyz/login` trả 200, không chuyển sang HTTPS. Phải bật theo mục 6.7 |

Việc đưa tên miền về Cloudflare đã xong, không làm lại. Mục 6.5 đã chạy thử đạt ngày 2026-11-15 với `cloudflared` 2026.9.0. Mục 6.4 dùng cùng các lệnh `cloudflared` nhưng chưa chạy thử trên Windows. Bước nào chạy xong thì sửa lại bảng này.

### 6.2 Cách hoạt động

1. Trên máy chủ, `cloudflared` mở kết nối đi ra tới Cloudflare và giữ kết nối đó.
2. Bản ghi DNS của tên miền là một CNAME trỏ tới `<MÃ-TUNNEL>.cfargotunnel.com`.
3. Trình duyệt của học sinh kết nối tới Cloudflare bằng HTTPS.
4. Cloudflare gửi yêu cầu qua kết nối ở bước 1 xuống `cloudflared`.
5. `cloudflared` chuyển yêu cầu tới `http://127.0.0.1:3000`.

Không mở cổng modem, không cần IP tĩnh, không cần chứng chỉ HTTPS riêng.

### 6.3 Phân chia tunnel và các file khoá

Mỗi máy dùng một tunnel riêng và một địa chỉ riêng:

| Máy | Tên tunnel | Địa chỉ |
|---|---|---|
| Máy thi (prod) | `lnc` | `ly-lncom.xyz` |
| Máy phát triển | `lnc-dev` | `dev.ly-lncom.xyz` |

Một địa chỉ chỉ trỏ tới một tunnel. Tại một thời điểm, một tunnel chỉ chạy trên một máy. Hai máy chạy cùng một tunnel thì Cloudflare chia yêu cầu giữa hai máy. Mỗi máy có database riêng, nên học sinh thấy dữ liệu khác nhau giữa các lần tải trang.

Thư mục `%USERPROFILE%\.cloudflared\` có ba file:

| File | Lệnh tạo ra | Tác dụng |
|---|---|---|
| `cert.pem` | `cloudflared tunnel login` | Quyền quản lý. Lệnh tạo tunnel, xoá tunnel và tạo bản ghi DNS cần file này |
| `<MÃ-TUNNEL>.json` | `cloudflared tunnel create` | Khoá để chạy một tunnel. Lệnh `cloudflared tunnel run` cần file này |
| `config.yml` | Tự viết | Mã tunnel, đường dẫn file khoá, địa chỉ và cổng của web app |

Người có `cert.pem` sửa được DNS của tên miền. Người có file `.json` chạy được tunnel dưới tên miền. Không đưa thư mục `.cloudflared` vào git, không gửi cho người khác, không in nội dung hai file này ra log hay khung chat.

### 6.4 Dựng tunnel `lnc` trên máy thi (Windows)

Mọi bước chỉ làm một lần trên mỗi máy. Sau đó chỉ cần bấm `start.bat`.

1. Cài `cloudflared`, rồi mở lại cửa sổ lệnh:
   ```
   winget install --id Cloudflare.cloudflared
   cloudflared --version
   ```
2. Đăng nhập. Lệnh mở trình duyệt. Chủ tài khoản Cloudflare phải tự đăng nhập, chọn `ly-lncom.xyz` và bấm Authorize. Lệnh ghi `cert.pem` vào `%USERPROFILE%\.cloudflared\`:
   ```
   cloudflared tunnel login
   ```
3. Xem tunnel `lnc` đã có chưa:
   ```
   cloudflared tunnel list
   ```
4. Nếu chưa có tunnel `lnc`, tạo mới. Lệnh in ra mã tunnel và ghi file `<MÃ-TUNNEL>.json`:
   ```
   cloudflared tunnel create lnc
   ```
5. Nếu tunnel `lnc` đã có từ một máy thi cũ, không tạo lại. Tắt tunnel trên máy cũ trước, rồi lấy file khoá về máy này. Thay `<MÃ-TUNNEL>` bằng mã ở bước 3:
   ```
   cloudflared tunnel token --cred-file "%USERPROFILE%\.cloudflared\<MÃ-TUNNEL>.json" lnc
   ```
6. Tạo file `%USERPROFILE%\.cloudflared\config.yml`. Thay mã tunnel và tên user của Windows:
   ```yaml
   tunnel: <MÃ-TUNNEL>
   credentials-file: C:\Users\<TÊN-USER>\.cloudflared\<MÃ-TUNNEL>.json
   ingress:
     - hostname: ly-lncom.xyz
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```
7. Kiểm tra file cấu hình. Lệnh phải in `OK`:
   ```
   cloudflared tunnel ingress validate
   ```
8. Tạo bản ghi DNS trỏ tên miền về tunnel. Cloudflare cho phép CNAME ở tên miền gốc:
   ```
   cloudflared tunnel route dns lnc ly-lncom.xyz
   ```
   Nếu lệnh báo bản ghi đã tồn tại và bản ghi đó trỏ tới tunnel khác, hỏi chủ dự án trước khi thêm `--overwrite-dns`.
9. Chạy `start.bat`. Cửa sổ phải hiện "Tunnel: dang chay". Nhật ký tunnel nằm ở `web/data/cloudflared.log`.
10. Kiểm tra theo mục 6.6.

Địa chỉ `www.ly-lncom.xyz` không tự hoạt động. Nếu cần, thêm một dòng `- hostname: www.ly-lncom.xyz` cùng `service` vào `config.yml`, rồi chạy `cloudflared tunnel route dns lnc www.ly-lncom.xyz`.

### 6.5 Dựng tunnel `lnc-dev` trên máy phát triển (macOS)

Dùng để thử tunnel mà không chiếm địa chỉ của máy thi. Thư mục cấu hình là `~/.cloudflared/`. Tunnel `lnc-dev`, file `config.yml` và bản ghi DNS đã có trên máy phát triển từ ngày 2026-11-15. Trên máy đó chỉ cần chạy hai lệnh cuối. Các lệnh tạo dưới đây dành cho máy phát triển khác.

```
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create lnc-dev
```

File `~/.cloudflared/config.yml`:

```yaml
tunnel: <MÃ-TUNNEL>
credentials-file: /Users/<TÊN-USER>/.cloudflared/<MÃ-TUNNEL>.json
ingress:
  - hostname: dev.ly-lncom.xyz
    service: http://127.0.0.1:3000
  - service: http_status:404
```

```
cloudflared tunnel route dns lnc-dev dev.ly-lncom.xyz
```

`start.bat` không chạy trên macOS, nên chạy web app và tunnel ở hai cửa sổ lệnh:

```
cd web && bun run build && DATA_DIR="$(mktemp -d)" SEED_PAPERS=0 bunx next start -p 3000 -H 127.0.0.1
cloudflared tunnel run
```

`DATA_DIR` tạm làm máy chủ bắt đầu với database trống và một tài khoản admin mới. Dữ liệu trong `web/data/` của máy phát triển không bị đưa ra internet. Dừng cả hai tiến trình sau khi thử xong. Khi tunnel dừng, tên miền trả lỗi 530.

### 6.6 Kiểm tra tunnel

| Việc | Cách kiểm tra | Kết quả đạt |
|---|---|---|
| Web app chạy trên máy | `curl -sI http://127.0.0.1:3000/login` | Dòng đầu có `200` |
| Tunnel đã kết nối | `cloudflared tunnel info lnc` | Có ít nhất một dòng connector |
| Tên miền vào được | `curl -sI https://ly-lncom.xyz/login` | Dòng đầu có `200`, có header `server: cloudflare` |
| Vào được từ ngoài mạng | Mở tên miền trên điện thoại dùng 4G | Hiện trang đăng nhập |
| Cookie đăng nhập | Đăng nhập qua tên miền, mở DevTools, mục Application, Cookies | Cookie `lnc_session` có đánh dấu Secure và HttpOnly |
| Thao tác ghi | Đổi mật khẩu hoặc tạo một học sinh qua tên miền | Không gặp lỗi "Yêu cầu không hợp lệ" |

Lỗi thường gặp:

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Lỗi 1033 hoặc 530 | `cloudflared` không chạy hoặc máy mất mạng | Xem `web/data/cloudflared.log`, chạy lại `start.bat` |
| Lỗi 502 | Tunnel chạy nhưng web app không chạy ở cổng 3000 | Xem cửa sổ `start.bat` |
| Tên miền không phân giải | Chưa chạy lệnh `route dns` | Làm bước 8 của mục 6.4 |
| Cửa sổ ghi "Tunnel: khong chay" | Thiếu `cloudflared` hoặc thiếu `config.yml` | Làm lại mục 6.4 |

### 6.7 Cấu hình trên trang Cloudflare

Làm một lần cho tên miền, tại https://dash.cloudflare.com, chọn `ly-lncom.xyz`:

- SSL/TLS, Edge Certificates: bật "Always Use HTTPS". Nếu tắt, người vào bằng `http://` nhận cookie không có Secure.
- Security, Settings, "AI Crawler and Agent access policies": đặt Agents là Block. Website thi không có lý do để agent truy cập thay học sinh. Cloudflare chỉ chặn được agent tự khai danh tính.
- "Enable Bot Preference Sync": để bật. Cloudflare ghi các lựa chọn Block vào `robots.txt`.
- Không bật DNSSEC khi chưa cần. Không làm mục "Only allow Cloudflare IP addresses at your origin", vì web app chỉ lắng nghe `127.0.0.1`.

Gói Free giới hạn mỗi yêu cầu tải lên 100 MB. File PDF đề nhỏ hơn mức này.

### 6.8 Mã nguồn đã sẵn cho việc chạy sau tunnel

Không cần sửa mã:

- Cookie đăng nhập tự bật `secure` khi yêu cầu tới qua HTTPS (`x-forwarded-proto`).
- Giới hạn đăng nhập sai lấy địa chỉ người dùng từ header `cf-connecting-ip`.
- Kiểm tra `origin` so với `x-forwarded-host`.

Ba điểm này đã được kiểm chứng qua tunnel `lnc-dev` ngày 2026-11-15:

| Điểm | Cách thử | Kết quả |
|---|---|---|
| Cookie | Đăng nhập qua `https://dev.ly-lncom.xyz` | `Set-Cookie` có `Secure; HttpOnly; SameSite=lax` |
| Kiểm tra `origin` | Gọi API đổi mật khẩu với `origin` đúng tên miền, rồi với `origin` lạ | `origin` đúng không bị chặn. `origin` lạ nhận 403 "Yêu cầu không hợp lệ" |
| Giới hạn đăng nhập sai | 9 lần đăng nhập sai qua tên miền, mỗi lần giả một `x-forwarded-for` khác | 8 lần nhận 401, lần thứ 9 nhận 429. Máy chủ dùng `cf-connecting-ip`, header giả không có tác dụng |

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
- Bài làm tự lưu từng câu. Mất điện hoặc mất mạng thì khi máy chủ lên lại, giáo viên gia hạn kỳ thi bằng cách sửa giờ kết thúc ở trang kỳ thi. Bài đang làm tự nhận hạn nộp mới. Học sinh đã nộp thì dùng nút "Cho thi lại" khi kỳ thi còn mở.

## 9. Việc chưa xong

- Cloudflare Tunnel: tunnel `lnc-dev` chạy thử đạt ngày 2026-11-15. Chưa tạo tunnel `lnc` trên máy thi. Chưa bật "Always Use HTTPS" (mục 6.1).
- Chưa có shortcut `start.bat` trên Desktop, chưa tự chạy khi mở máy.
- Chưa có sao lưu tự động.
- Tính năng chưa làm: nhiều mã đề cho một kỳ thi, chế độ xem nguyên PDF kèm phiếu trả lời.
- Dữ liệu trên máy phát triển có 46 kỳ thi mẫu tên "Kiểm tra THPT tháng MM/YYYY" và "Thi thử VSAT tháng MM/YYYY" cùng đề "Thi thử VSAT đề 07", thêm ngày 2026-11-11 để xem giao diện. Bài làm mẫu chỉ có điểm, không có câu trả lời. Nếu chép `web/data/` sang máy thi thật thì cần xoá các kỳ thi này trước.

## 10. Quy trình setup máy prod

Agent làm theo mục này khi chủ dự án yêu cầu "setup máy prod" trên một máy Windows. Làm đúng thứ tự. Bước nào không đạt thì dừng, báo nguyên văn thông báo lỗi, không tự bỏ qua.

### 10.1 Quy tắc

- Không in mật khẩu, nội dung `cert.pem`, nội dung file `.json` của tunnel hay nội dung `admin-account.txt` ra khung chat.
- Không đưa `.cloudflared` hay `web/data/` vào git. Không commit, không push khi chưa được yêu cầu.
- Không chạy tunnel `lnc` trên máy này khi một máy khác còn chạy tunnel `lnc`.
- Không chép `web/data/` của máy phát triển sang máy prod. Thư mục đó có 46 kỳ thi mẫu.
- Việc cần người làm thì nêu rõ và chờ: đăng nhập GitHub, bấm Authorize của Cloudflare, bấm đúp `start.bat`, đổi mật khẩu admin.

### 10.2 Câu hỏi cho chủ dự án trước khi bắt đầu

1. Máy này là máy thi đầu tiên, hay thay cho một máy thi cũ?
2. Nếu thay máy cũ: máy cũ đã tắt `start.bat` chưa, và có cần chuyển dữ liệu `web/data/` sang không?
3. Có dùng thêm địa chỉ `www.ly-lncom.xyz` không?

### 10.3 Các bước

| Bước | Việc | Ai làm | Chi tiết |
|---|---|---|---|
| 1 | Kiểm tra máy là Windows 11 và có mạng | Agent | |
| 2 | Kiểm tra và cài phần mềm thiếu | Agent | Bảng dưới, mục 2 |
| 3 | Lấy mã nguồn nhánh `dev` | Agent, chủ dự án đăng nhập GitHub nếu được hỏi | Mục 3 |
| 4 | Cài thư viện và build | Agent | `cd web`, `bun install`, `bun run build` |
| 5 | Chạy kiểm tra mã | Agent | `bunx tsc --noEmit`, `bun run lint`, `bun run test`, `bun test:db` |
| 6 | Chuẩn bị dữ liệu | Agent | Máy đầu tiên: để `web/data/` trống. Thay máy cũ: mục 5 |
| 7 | Dựng tunnel `lnc` | Agent, chủ dự án bấm Authorize | Mục 6.4 |
| 8 | Cấu hình trang Cloudflare | Chủ dự án | Mục 6.7 |
| 9 | Chạy máy chủ | Chủ dự án bấm đúp `start.bat` | Mục 3 |
| 10 | Kiểm tra tunnel | Agent và chủ dự án | Mục 6.6 |
| 11 | Đổi mật khẩu admin, xoá `admin-account.txt` | Chủ dự án | Mục 4 |
| 12 | Cấu hình Windows cho máy thi | Agent, chủ dự án | Bảng dưới, mục 8 |
| 13 | Thử tải | Agent | `cd web`, `bun run load`. Mục 7 |
| 14 | Tạo shortcut `start.bat` trên Desktop | Agent | |
| 15 | Cập nhật tài liệu và báo cáo | Agent | Mục 10.4 |

Agent không tự chạy `start.bat` trong phiên làm việc của mình. Máy chủ dừng khi phiên đó đóng. Chủ dự án bấm đúp `start.bat` để máy chủ chạy trong cửa sổ riêng.

Lệnh cho bước 2. Chạy lệnh kiểm tra trước, chỉ cài phần mềm còn thiếu, rồi mở lại cửa sổ lệnh:

| Phần mềm | Lệnh kiểm tra | Lệnh cài |
|---|---|---|
| Git for Windows | `git --version` | `winget install --id Git.Git` |
| bun | `bun --version` | `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| Node.js 22 trở lên | `node --version` | `winget install --id OpenJS.NodeJS.LTS` |
| cloudflared | `cloudflared --version` | `winget install --id Cloudflare.cloudflared` |

Lệnh cho bước 3:

```
git clone https://github.com/chris9962/ly-lnc.git
cd ly-lnc
git checkout dev
```

Nếu thư mục `ly-lnc` đã có, chạy `git status` trước. Thư mục sạch thì `git pull` trên nhánh `dev`, rồi `bun install` và `bun run build` lại. Thư mục có thay đổi chưa commit thì hỏi chủ dự án.

Lệnh cho bước 12. Tắt chế độ ngủ và ngủ đông khi cắm điện:

```
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```

Chủ dự án tự đặt giờ hoạt động của Windows Update trong Settings, Windows Update, Advanced options, Active hours, để máy không khởi động lại trong giờ thi.

Bước 13 chạy máy chủ riêng ở cổng 3212 với thư mục dữ liệu tạm, không ảnh hưởng máy chủ đang chạy ở cổng 3000. Bước này cần các file PDF mẫu trong `template/`. Kết quả đạt: 200 học sinh, 0 lỗi.

### 10.4 Điều kiện hoàn thành và báo cáo

Máy prod sẵn sàng khi đủ các điều sau:

- Bốn lệnh ở bước 5 đều đạt.
- Mọi dòng trong bảng kiểm tra ở mục 6.6 đều đạt.
- Mật khẩu admin đã đổi, file `admin-account.txt` đã xoá.
- `bun run load` chạy xong không có lỗi.
- Chế độ ngủ đã tắt.

Sau khi xong, agent sửa bảng trạng thái ở mục 6.1 và mục 9 theo kết quả thật, ghi ngày dạng YYYY-MM-DD. Agent báo cáo cho chủ dự án: bước nào đạt, bước nào không đạt kèm thông báo lỗi, bước nào chưa làm. Việc còn lại sau quy trình này là sao lưu tự động, xem mục 9.
