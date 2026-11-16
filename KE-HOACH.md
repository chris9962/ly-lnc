# Kế hoạch: Website thi trắc nghiệm (máy chủ local, domain public)

> Trạng thái: các quyết định chính đã chốt (xem mục 10), đang dựng hệ thống theo lộ trình ở mục 9.

## 1. Mục tiêu

Website thi trắc nghiệm cho khối 10, 11, 12, chạy trên một máy tính local nhưng truy cập được từ internet qua một domain cố định. Tài khoản do admin và giáo viên cấp, không có đăng ký tự do.

Nguyên tắc về đề thi: **giáo viên chỉ up hai file, một file PDF đề và một file đáp án.** Hệ thống không đọc hiểu nội dung đề, chỉ tìm vị trí chữ "Câu 1", "Câu 2"... để cắt đề thành ảnh từng câu (mục 3.5). Học sinh làm lần lượt từng câu, mỗi câu là một ảnh cắt nguyên từ PDF. Nếu cắt không được thì hiển thị nguyên đề PDF kèm phiếu trả lời.

Yêu cầu vận hành:

- Bật máy chủ bằng một icon trên desktop, tắt là dừng.
- Domain tự kết nối lại mỗi lần bật, không phải cấu hình lại.
- Ba quyền: admin, giáo viên, học sinh.

## 2. Kiến trúc tổng thể

```
Học sinh / Giáo viên (trình duyệt)
        │  HTTPS  thi.tenmien.vn
        ▼
   Cloudflare (DNS + HTTPS)
        │  Cloudflare Tunnel (kết nối đi ra từ máy local)
        ▼
   Máy local (Windows)
   ├── cloudflared        ← giữ tunnel
   ├── Web app (1 tiến trình, cổng 3000)
   ├── SQLite (1 file .db)
   └── Thư mục uploads/   ← PDF đề, file đáp án gốc
```

### 2.1 Public domain: Cloudflare Tunnel

- Không cần mở port modem, không cần IP tĩnh, có HTTPS sẵn, miễn phí.
- Cần một domain riêng trỏ nameserver về Cloudflare. Hiện chưa có domain, cần mua trước khi đưa ra internet (bước cuối của lộ trình).
- Cấu hình tunnel một lần, lưu trong file config. Mỗi lần chạy `cloudflared` là domain hoạt động lại.

### 2.2 Khởi động bằng một icon

- File `start.bat` (hoặc launcher nhỏ) chạy web app và `cloudflared`, có shortcut trên desktop.
- Cửa sổ launcher hiển thị trạng thái: web đang chạy, tunnel đã kết nối, địa chỉ truy cập.
- Đóng cửa sổ là dừng cả hai.
- Tuỳ chọn về sau: icon ở khay hệ thống, tự chạy khi mở máy.

### 2.3 Stack đề xuất

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Web app | Next.js (TypeScript) | Một tiến trình cho cả giao diện và API, dễ khởi động |
| Database | SQLite qua Drizzle ORM (driver `better-sqlite3`) | Một file, không cài DB server, sao lưu bằng cách copy thư mục `web/data`. Cấu trúc bảng khai báo ở `web/src/server/db/schema.ts`, thay đổi cấu trúc sinh bằng `bun run db:generate` |
| Giao diện | Tailwind, token màu sáng và tối trong `web/src/app/globals.css`, component dùng chung ở `web/src/components/ui` | Theo quy tắc dự án trong `CLAUDE.md` |
| Công cụ | bun để cài gói và chạy lệnh, vitest cho test unit và test database, Playwright cho E2E | Theo quy tắc dự án |
| Cắt câu, đọc bảng đáp án | MuPDF (`mupdf` bản WASM cho Node) | Đã thử trên đề mẫu, lấy được toạ độ chữ và cắt ảnh chính xác |
| Hiển thị PDF | PDF.js | Chỉ dùng cho chế độ nguyên PDF và màn hình chỉnh đường cắt |
| Đọc file đáp án | SheetJS (Excel/CSV) | Đọc bảng đáp án giáo viên up |
| Đăng nhập | Session cookie, mật khẩu băm bằng argon2/bcrypt | Đơn giản, đủ an toàn |

Không dùng AI, không tốn phí theo đề. Quy mô đã chốt: khoảng 200 học sinh thi cùng lúc. SQLite (bật chế độ WAL) dự kiến đáp ứng được; sẽ chạy thử tải giả lập 200 học sinh trước khi thi thật.

## 3. Đề thi và đáp án

### 3.1 File đề (PDF)

- Giáo viên up một file PDF, hệ thống lưu nguyên bản.
- Học sinh xem đúng bản đó trong trang làm bài. Công thức và hình vẽ chính xác tuyệt đối vì không qua chuyển đổi.
- **Đã chốt:** đề là PDF chuẩn, có lớp chữ kèm hình ảnh (không phải bản scan). Đây là điều kiện để cắt câu tự động ở mục 3.5.

### 3.2 File đáp án

File đáp án cho biết đề có bao nhiêu câu và đáp án từng câu. Hệ thống dựng phiếu trả lời từ file này, giáo viên không phải khai báo gì thêm.

Theo đề mẫu, có hai nguồn đáp án:

- **Bảng đáp án nằm ngay trong PDF, sau dòng "HẾT"** (thấy ở 2 đề dạng 3 phần). Hệ thống đọc bảng này tự động, và luôn cắt bỏ mọi thứ sau "HẾT" khi hiển thị cho học sinh để không lộ đáp án.
- **File đáp án riêng** cho các đề không kèm bảng (cả 3 đề VSAT mẫu đều không có đáp án). Với các đề này giáo viên nhập đáp án bằng cách bấm vào từng câu (mục 3.7), không cần file riêng.

Khi chưa có mẫu, định dạng file đáp án riêng mặc định là Excel hoặc CSV hai cột:

| Câu | Đáp án |
|---|---|
| 1 | A |
| 2 | C |
| 13 | ĐSĐS |
| 19 | 2,5 |

Loại câu được suy ra từ đáp án:

| Đáp án ghi | Loại câu | Phiếu trả lời hiển thị | Cách chấm |
|---|---|---|---|
| `A` / `B` / `C` / `D` | 4 lựa chọn | 4 nút A B C D | Đúng thì được điểm |
| 4 ký tự `Đ`/`S`, ví dụ `ĐSĐS` | Đúng/sai 4 ý | 4 dòng a b c d, mỗi dòng chọn Đúng hoặc Sai | Theo số ý đúng trong câu |
| Số hoặc chuỗi khác | Trả lời ngắn | Ô nhập | So khớp với đáp án, chấp nhận cả dấu phẩy và dấu chấm thập phân |
| Dạng `1-C 2-A 3-F 4-B` | Ghép nối (đề VSAT, câu 16 đến 20): 4 ý cột trái ghép với các ý A đến F cột phải | 4 dòng, mỗi dòng chọn một chữ A đến F | Theo số ý ghép đúng |

Loại câu thực tế không cần suy từ đáp án: đề mẫu luôn có dòng tiêu đề nêu rõ ("PHẦN II. Câu trắc nghiệm đúng sai", "Từ câu hỏi 16 đến 20, thí sinh ghép..."), hệ thống đọc dòng đó để biết loại của từng nhóm câu. Bảng trên dùng để kiểm tra chéo.

#### Thang điểm đề VSAT (đã chốt)

Mỗi câu tối đa 6 điểm. Đề 25 câu có tổng điểm tối đa 150.

| Loại câu | Cách tính điểm một câu |
|---|---|
| Đúng/Sai (4 tiểu mục) | Đúng 1 tiểu mục: 1 điểm. Đúng 2: 2 điểm. Đúng 3: 3 điểm. Đúng cả 4: 6 điểm |
| Ghép hợp (4 tiểu mục) | Mỗi tiểu mục ghép đúng 1,5 điểm. Đúng cả 4: 6 điểm |
| Trắc nghiệm 4 lựa chọn | Đúng: 6 điểm |
| Trả lời ngắn | Đúng: 6 điểm |

#### Thang điểm đề 3 phần (đã chốt)

Tổng 28 câu, 10 điểm.

| Phần | Cách tính điểm một câu | Điểm tối đa |
|---|---|---|
| I. 4 lựa chọn (18 câu) | Đúng: 0,25 điểm | 4,5 |
| II. Đúng/Sai (4 câu, mỗi câu 4 ý a, b, c, d) | Đúng 1 ý: 0,1 điểm. Đúng 2: 0,25. Đúng 3: 0,5. Đúng cả 4: 1,0 điểm | 4,0 |
| III. Trả lời ngắn (6 câu) | Đúng: 0,25 điểm | 1,5 |

Thang điểm được lưu theo từng đề (chọn mẫu "VSAT" hoặc "3 phần" khi up đề, sửa được từng con số), không viết cứng trong chương trình, để sau này thêm dạng đề khác không phải sửa mã.

Sau khi up, hệ thống hiện bảng đáp án đã đọc để giáo viên kiểm tra và sửa trước khi lưu. Dòng nào không đọc được sẽ được đánh dấu.

Hỗ trợ thêm:

- Dán nhanh dạng văn bản: `1A 2C 3B 4D ...`
- Thêm cột "Điểm" nếu các câu có điểm khác nhau; không có thì chia đều.

### 3.3 Đề chưa có đáp án

- Up riêng file PDF vẫn lưu được vào ngân hàng, đánh dấu "chưa có đáp án".
- Đề này chưa dùng được để tạo kỳ thi. Giáo viên bổ sung file đáp án sau là dùng được.

### 3.4 Nhiều mã đề

**Đã chốt:** hiện tại mỗi kỳ thi một mã đề, nhưng dữ liệu được thiết kế sẵn cho nhiều mã đề. Kỳ thi không gắn thẳng với một đề mà qua bảng `exam_papers` (mỗi dòng là một mã đề của kỳ thi), và mỗi lượt làm bài ghi rõ học sinh làm mã đề nào. Hiện mỗi kỳ thi chỉ có một dòng trong bảng này. Sau này thêm nhiều mã đề chỉ cần cho giáo viên chọn nhiều đề và thêm bước chia mã cho học sinh, không phải đổi cấu trúc dữ liệu hay phần chấm điểm.

### 3.5 Cắt đề thành ảnh từng câu

Ý tưởng: mỗi câu luôn bắt đầu bằng "Câu N". Tìm toạ độ các chữ đó trên trang, vùng từ "Câu N" tới ngay trước "Câu N+1" là một câu, cắt vùng đó thành ảnh. Vì là ảnh cắt từ bản gốc nên công thức và hình vẽ vẫn đúng tuyệt đối.

Các bước:

1. Đọc lớp chữ của PDF bằng PDF.js, lấy toạ độ từng dòng chữ.
2. Tìm các mốc "Câu N" hợp lệ: nằm ở đầu dòng, sát lề trái của cột, số tăng dần. Điều kiện này loại các chữ "câu 1" xuất hiện giữa đoạn văn.
3. Xác định vùng mỗi câu từ mốc của nó tới mốc kế tiếp. Bỏ phần đầu trang, chân trang, số trang.
4. Render trang ở độ phân giải cao (gấp 2 đến 3 lần) rồi cắt thành ảnh.
5. Đối chiếu số câu cắt được với số câu trong file đáp án. Lệch thì báo cho giáo viên.
6. Giáo viên xem lại: các đường cắt vẽ đè lên trang PDF, kéo để chỉnh, rồi bấm lưu.

Các trường hợp phải xử lý:

| Trường hợp | Cách xử lý |
|---|---|
| Câu kéo dài sang trang sau | Cắt hai phần rồi ghép dọc thành một ảnh |
| Đề dàn hai cột | Nhận biết cột theo toạ độ ngang của các mốc, cắt theo từng cột |
| Tiêu đề phần ("PHẦN II...") nằm giữa hai câu | Nhận diện dòng bắt đầu bằng "PHẦN", tách ra khỏi câu phía trên |
| Đoạn dẫn chung cho nhiều câu ("Dùng thông tin sau cho câu 5 và 6") | Mặc định dính vào cuối câu phía trên; giáo viên kéo đường cắt để gắn lại cho đúng |
| Số câu đánh lại từ 1 ở mỗi phần | Ghép theo thứ tự xuất hiện, kết hợp tiêu đề phần để khớp với file đáp án |
| PDF scan, không có lớp chữ | Ngoài phạm vi (đề luôn là PDF có chữ). Nếu lỡ up bản scan, hệ thống báo không tìm thấy mốc và chuyển sang chế độ nguyên đề PDF |

Chế độ dự phòng: bất kỳ lúc nào việc cắt không ổn, giáo viên chọn "dùng nguyên PDF" và đề vẫn thi được bình thường với phiếu trả lời bên cạnh.

### 3.6 Kết quả thử trên 6 đề mẫu (thư mục `template/`)

Đã chạy bản thử cắt câu trên cả 6 đề Vật lí trong `template/`.

Đặc điểm chung của đề: một cột, khổ A4, mọi mốc "Câu N" đều in đậm và nằm sát lề trái (x ≈ 57pt). Có hai dạng đề:

| Dạng | Cấu trúc | Đánh số |
|---|---|---|
| 3 phần (THPT) | 18 câu 4 lựa chọn + 4 câu đúng/sai + 6 câu trả lời ngắn = 28 câu | Đánh lại từ 1 ở mỗi phần |
| VSAT | 9 câu đúng/sai + 6 câu 4 lựa chọn + 5 câu ghép nối + 5 câu trả lời ngắn = 25 câu | Liên tục 1 đến 25 |

Kết quả:

| Đề | Số câu cắt được | Loại câu nhận ra | Đoạn dẫn chung |
|---|---|---|---|
| 2025. GK1_VAT LI 12_132 | 28 / 28 | 18 + 4 + 6 | 0 |
| 2026. de 7 (DE) | 28 / 28 | 18 + 4 + 6 | 5 |
| 2026. on tap chuong 1 (DAP AN) | 28 / 28 | 18 + 4 + 6 | 0 |
| 2027. DE VSAT (DE 0207) | 25 / 25 | 9 + 6 + 5 + 5 | 2 |
| 2027. DE VSAT (DE 05) | 25 / 25 | 9 + 6 + 5 + 5 | 1 |
| Đề 4 (1) | 25 / 25 | 9 + 6 + 5 + 5 | 2 |

Đã kiểm tra bằng mắt một số ảnh cắt (câu có đồ thị, câu có bảng Đúng/Sai vắt qua hai trang, đoạn dẫn chung): nội dung đầy đủ, ghép trang đúng. Chưa xem hết toàn bộ 159 ảnh.

Những điều rút ra, đã đưa vào thiết kế:

- **Không tin số ghi trên đề.** Đề "DE 05" ghi "Câu 16" hai lần (thiếu câu 15), "Đề 4" ghi "Câu 13" ở vị trí câu 15. Hệ thống đánh số theo thứ tự xuất hiện và cảnh báo cho giáo viên chỗ đánh số lạ.
- **Đoạn dẫn chung là một ảnh riêng.** Các dòng "Sử dụng các thông tin sau cho Câu 5, Câu 6" và "Đọc nội dung sau và trả lời các câu hỏi từ 10 đến 12" được cắt thành ảnh riêng và hiển thị phía trên từng câu trong nhóm.
- **Dừng ở dòng "HẾT".** Hai đề có bảng đáp án ngay sau đó.
- **Bỏ chân trang** ("Trang 1/4 - Mã đề thi 132", "GV: ... Trang 1").
- **Còn phải cải thiện:** nhiều câu có hình hoặc bảng bắt đầu cao hơn dòng "Câu N" vài điểm, nên đường cắt chạm vào mép hình (bản thử cảnh báo ở 35 trên 159 câu; các câu đã xem thì chỉ lệch vài điểm). Cần dời đường cắt lên để ôm trọn hình, và đây là lý do bước giáo viên xem lại vẫn cần.
- **Đọc bảng đáp án trong PDF:** các ô bị gộp khi đọc theo bảng, phải đọc theo toạ độ từng chữ. Chưa làm thử phần này.

Công cụ dùng cho bản thử là MuPDF (qua Python). Bản chính thức dùng cùng engine đó trong Node (`mupdf` bản WASM), chạy ở server.

### 3.7 Nhập đáp án và hiển thị cho học sinh

**Nhập (giáo viên):** theo bản thử ở `prototype/chinh-toa-do/`. Sau khi up PDF, hệ thống vẽ khung từng câu đè lên trang đề. Giáo viên kéo chỉnh khung nếu lệch, bấm vào khung để nhập đáp án theo đúng loại câu (4 lựa chọn, đúng/sai, ghép nối, trả lời ngắn), thêm bớt số lựa chọn được. Cách này dùng chung cho mọi dạng đề, không cần file đáp án riêng. Với đề có bảng đáp án sau dòng "HẾT", hệ thống đọc bảng và điền sẵn để giáo viên kiểm tra.

**Hiển thị (học sinh): cắt sẵn thành ảnh ở server, không render PDF trên máy học sinh.**

- Khi giáo viên bấm lưu, server dùng MuPDF cắt mỗi khung thành một ảnh (khoảng 200 dpi, định dạng WebP hoặc PNG), câu nhiều khung thì ghép dọc thành một ảnh.
- Học sinh chỉ nhận ảnh của từng câu, không bao giờ nhận file PDF.
- Nguồn gốc vẫn là file PDF và toạ độ khung lưu trong database. Ảnh chỉ là kết quả sinh ra, sửa khung thì cắt lại riêng câu đó.

Bản thử giao diện học sinh nằm ở `prototype/hoc-sinh/` (2 đề: một đề 3 phần có đáp án, một đề VSAT chưa có đáp án). Luồng: màn hình thông tin kỳ thi, bấm bắt đầu, mỗi màn hình một câu với ảnh câu hỏi ở trên và phần trả lời theo loại câu ở dưới, bảng số câu để nhảy và đánh dấu xem lại, đồng hồ đếm ngược, tự lưu sau mỗi lần chọn, nộp bài, màn hình kết quả. Việc còn lại rút ra từ bản thử:

- Hình đặt lệch sang phải và kéo dài qua hai câu (ví dụ hình của đoạn dẫn câu 10 đến 12 đề VSAT 0207) bị cắt đôi theo đường ngang. Tự động không xử lý được, giáo viên phải kéo khung cho hai khung chồng lên nhau.
- Trên điện thoại, chữ trong ảnh nhỏ vì trang A4 bị thu về bề ngang màn hình. Cần thêm bấm để phóng to ảnh.

Lý do không render PDF theo toạ độ trên trình duyệt:

| Tiêu chí | Cắt ảnh sẵn | Render PDF theo toạ độ |
|---|---|---|
| Lộ đề, lộ đáp án | Học sinh chỉ có ảnh các câu được phép xem | Cả file PDF phải tải về máy học sinh, gồm cả bảng đáp án sau "HẾT" |
| Tốc độ trên điện thoại | Tải ảnh, hiện ngay | Phải tải thư viện PDF.js và dựng trang, chậm trên máy yếu |
| Hiển thị giống nhau | Mọi máy thấy cùng một ảnh | Phụ thuộc trình duyệt và font, công thức có thể lệch |
| Tải cho máy chủ local | Cắt một lần lúc lưu, sau đó chỉ phát file tĩnh | Mỗi học sinh tải cả file PDF |
| Độ nét khi phóng to | Giới hạn theo độ phân giải ảnh, 200 dpi là đủ cho điện thoại và máy tính | Nét ở mọi mức phóng |

## 4. Chức năng theo vai trò

### 4.1 Admin

- Tạo, khoá, đặt lại mật khẩu tài khoản giáo viên.
- Quản lý khối (10, 11, 12). Không quản lý lớp: học sinh chỉ thuộc một khối.
- Xem toàn bộ đề, kỳ thi, kết quả.
- Sao lưu và khôi phục dữ liệu.

### 4.2 Giáo viên

- **Học sinh:** tạo tài khoản hàng loạt bằng cách dán danh sách chép từ Excel, mỗi dòng gồm họ tên và số điện thoại. Tên đăng nhập của học sinh là số điện thoại (10 chữ số, hệ thống tự đưa về một dạng: bỏ khoảng trắng, đổi +84 thành 0, thêm lại số 0 đầu mà Excel đã bỏ). Số đã có tài khoản thì cả danh sách bị từ chối. Giáo viên và admin vẫn dùng tên đăng nhập sinh từ họ tên. Chọn khối, chuyển khối, đặt lại mật khẩu.
- **Ngân hàng đề:**
  - Cây thư mục nhiều cấp (ví dụ: Khối 10 / Học kỳ 1 / Chương 2).
  - Mỗi đề gắn khối.
  - Lọc theo khối, thư mục, trạng thái đáp án (có / chưa có), tìm theo tên.
  - Up đề, bổ sung hoặc sửa đáp án, di chuyển giữa các thư mục.
  - **Thi thử:** chỉ dành cho giáo viên và admin, học sinh không thi thử. Mở một đề đã có đáp án thì có nút "Thi thử", làm bài và xem kết quả ngay, không cần tạo kỳ thi. Đề chưa có đáp án thì không có nút này. Kết quả thi thử không tính vào bảng điểm kỳ thi.
- **Kỳ thi:**
  1. Đặt tên, chọn khối.
  2. Up PDF + file đáp án mới (tự lưu vào ngân hàng) hoặc chọn đề có sẵn.
  3. Chọn thi ngay hoặc hẹn giờ.
  4. Đặt giờ bắt đầu, giờ kết thúc, thời lượng làm bài.
- **Trong lúc thi:** xem ai đang làm, ai đã nộp; gia hạn hoặc mở lại bài cho học sinh gặp sự cố.
- **Sau khi thi:** bảng điểm theo khối, xem bài làm từng học sinh, xuất Excel.

### 4.3 Học sinh

- Danh sách kỳ thi của khối mình, chia ba nhóm: sắp diễn ra, đang diễn ra, đã kết thúc.
- Vào làm bài khi kỳ thi đang diễn ra.
- Xem điểm các kỳ thi đã tham gia.
- Đổi mật khẩu.

## 5. Luồng làm bài thi

Giao diện với đề đã cắt câu: mỗi màn hình một câu (ảnh câu hỏi ở trên, phần chọn đáp án ở dưới), nút câu trước và câu sau, bảng số câu để nhảy tới câu bất kỳ và thấy câu nào chưa làm. Thứ tự câu giữ đúng như trong PDF, không trộn. Đồng hồ đếm ngược luôn hiển thị.

Giao diện với đề dùng nguyên PDF: đề chiếm phần lớn màn hình, phiếu trả lời nằm bên phải (trên điện thoại là thanh kéo lên từ dưới).

- Trạng thái kỳ thi tính từ giờ server: trước giờ bắt đầu là "sắp diễn ra", trong khoảng là "đang diễn ra", sau giờ kết thúc là "đã kết thúc".
- Khi học sinh bấm vào thi, server tạo một lượt làm bài và ghi giờ bắt đầu. Hạn nộp là giá trị nhỏ hơn giữa (giờ bắt đầu + thời lượng) và giờ kết thúc kỳ thi.
- Mỗi lần chọn đáp án được gửi lên và lưu ngay. Rớt mạng hoặc tắt tab thì vào lại làm tiếp, thời gian vẫn trôi.
- Hết hạn thì server tự chốt bài, kể cả khi học sinh không bấm nộp.
- Mỗi học sinh một lượt làm cho mỗi kỳ thi, trừ khi giáo viên mở lại.
- Đáp án đúng không bao giờ gửi xuống trình duyệt trong lúc thi. Chấm điểm thực hiện ở server.
- Học sinh thấy điểm ngay sau khi nộp. Đáp án từng câu chỉ hiện sau khi kỳ thi kết thúc.

## 6. Mô hình dữ liệu

| Bảng | Trường chính | Ghi chú |
|---|---|---|
| `users` | id, username, password_hash, họ tên, role, grade_id, trạng thái | role: admin / teacher / student; grade_id chỉ dùng cho học sinh |
| `grades` | id, tên | 10, 11, 12 |
| `folders` | id, tên, parent_id, owner_id | Cây thư mục ngân hàng đề |
| `papers` | id, tên, grade_id, folder_id, file PDF, file đáp án gốc, has_answer_key, kiểu hiển thị, người tạo | Một đề thi; kiểu hiển thị: từng câu / nguyên PDF |
| `question_crops` | id, paper_id, số câu, phần, file ảnh, trang và toạ độ vùng cắt | Ảnh từng câu; lưu toạ độ để chỉnh lại được |
| `answer_keys` | id, paper_id, số câu, loại câu, đáp án đúng, điểm | Một dòng cho mỗi câu, đọc từ file đáp án |
| `exams` | id, tên, grade_id, giờ bắt đầu, giờ kết thúc, thời lượng, người tạo | Một kỳ thi |
| `exam_papers` | id, exam_id, paper_id, mã đề | Các mã đề của kỳ thi. Hiện mỗi kỳ thi một dòng |
| `attempts` | id, exam_id (trống nếu là thi thử), paper_id (mã đề được làm), user_id, giờ bắt đầu, hạn nộp, giờ nộp, điểm, trạng thái | Một lượt làm bài, gồm cả thi thử |
| `attempt_answers` | attempt_id, số câu, câu trả lời, thời điểm lưu | Lưu từng câu |

## 7. Bảo mật

- Mật khẩu băm, không lưu dạng thường. Bắt đổi mật khẩu ở lần đăng nhập đầu.
- Giới hạn số lần đăng nhập sai theo tài khoản và theo IP.
- Kiểm tra quyền ở server cho mọi API: học sinh chỉ thấy kỳ thi của khối mình và bài làm của mình; mọi giáo viên có quyền như nhau trên toàn bộ đề, kỳ thi và học sinh (không chia riêng theo từng giáo viên).
- File PDF đề không truy cập được bằng đường dẫn trực tiếp, chỉ tải qua API có kiểm tra quyền và thời gian thi.
- Web app chỉ lắng nghe trên `localhost`, mọi truy cập bên ngoài đi qua tunnel.

## 8. Vận hành và rủi ro

| Rủi ro | Cách xử lý |
|---|---|
| Mất điện hoặc mất mạng giữa giờ thi | Bài đã tự lưu; giáo viên gia hạn hoặc mở lại sau khi máy chủ lên lại. Nên có UPS cho máy và modem |
| Hỏng ổ cứng, mất dữ liệu | Tự sao lưu file DB và thư mục uploads hằng ngày ra ổ khác hoặc cloud |
| Máy tự ngủ, Windows tự cập nhật khởi động lại | Tắt chế độ ngủ, đặt giờ hoạt động cho Windows Update |
| Quên bật máy chủ trước giờ thi hẹn sẵn | Launcher hiển thị các kỳ thi sắp tới; cân nhắc tự chạy khi mở máy |
| Cắt câu sai (thiếu hình, dính câu khác) | Bước xem lại đường cắt là bắt buộc; đối chiếu số câu với file đáp án; luôn có chế độ nguyên PDF |
| File đáp án sai định dạng hoặc lệch số câu | Bước xem lại bảng đáp án trước khi lưu; có file mẫu để tải về |

## 9. Lộ trình

### Giai đoạn 1: Nền tảng (đã xong phần mã, chưa có icon khởi động và domain)

- Khung dự án, database, đăng nhập, ba quyền.
- Quản lý khối, giáo viên, học sinh (kèm nhập Excel).
- `start.bat` + Cloudflare Tunnel, truy cập được qua domain. Phần này dời xuống cuối lộ trình, làm khi đã có domain.

Đã làm trong `web/` (viết lại ngày 2026-11-11 theo quy tắc trong `CLAUDE.md`): đăng nhập bằng tài khoản được cấp, bắt đổi mật khẩu tạm ở lần đầu, ba quyền, admin quản lý giáo viên, giáo viên và admin quản lý học sinh theo khối (tạo hàng loạt bằng cách dán danh sách họ tên, tìm không phân biệt dấu, lọc theo khối, phân trang 15 dòng, đặt lại mật khẩu, khoá, chuyển khối, xoá), trang kỳ thi của học sinh. Mọi thao tác ghi đều có bản ghi trong `audit_log`. Thay cho nhập file Excel là dán danh sách họ tên chép từ Excel.

### Giai đoạn 2: Ngân hàng đề

- Up PDF + file đáp án, màn hình xem lại đáp án.
- Thư mục, bộ lọc theo khối và trạng thái đáp án.
- Cắt đề thành ảnh từng câu theo mốc "Câu N", màn hình chỉnh đường cắt. Làm thử trên vài đề thật trước để biết tỉ lệ cắt đúng.

### Giai đoạn 3: Kỳ thi

- Tạo kỳ thi, chọn khối, thi ngay hoặc hẹn giờ.
- Nút thi thử trên đề đã có đáp án.
- Trang làm bài: từng câu (hoặc nguyên PDF + phiếu trả lời), tự lưu, tự nộp, chấm điểm.
- Trang học sinh: lịch thi và điểm. Trang giáo viên: bảng điểm, xuất Excel.

Hết giai đoạn 3 là hệ thống dùng được cho kỳ thi thật.

Giai đoạn 2 và 3 đã làm xong ngày 2026-11-11:

- Up PDF. Máy chủ dùng MuPDF đọc mốc "Câu N" in đậm, cắt mỗi câu thành ảnh WebP 200 dpi, nhận loại câu theo tiêu đề phần, nhận đoạn dẫn chung.
- Bảng đáp án in sau dòng HẾT được đọc tự động. Không có bảng thì giáo viên nhập trong trình chỉnh.
- Trình chỉnh: kéo và đổi cỡ khung trên ảnh trang, thêm và xoá câu, đoạn dẫn, đổi loại câu, nhập đáp án bằng phím tắt. Lưu xong thì cắt lại ảnh và chấm lại các bài đã nộp.
- Đề đã có bài thi thật thì khoá cấu trúc, chỉ sửa được khung và đáp án.
- Thư mục nhiều cấp, lọc theo khối và trạng thái đáp án, tìm ngay khi gõ.
- Kỳ thi: thi ngay hoặc hẹn giờ, giao cho một khối, mỗi học sinh làm một lần. Giáo viên mở lại hoặc gia hạn được từng bài.
- Trang làm bài: từng câu, bảng câu theo phần, đánh dấu xem lại, tự lưu từng câu, đồng hồ theo giờ máy chủ, hết giờ tự nộp.
- Điểm hiện ngay khi nộp. Đáp án mở sau giờ kết thúc kỳ thi. Thi thử của giáo viên thấy đáp án ngay. Từ ngày 2026-11-16 giáo viên chọn theo từng kỳ thi: đáp án mở sau khi nộp bài hoặc sau khi kỳ thi kết thúc.
- Trang kỳ thi của giáo viên: số bài đã nộp, điểm trung bình, danh sách học sinh, tải bảng điểm Excel.
- Chưa làm: chế độ nguyên PDF và phiếu trả lời, nhiều mã đề.

### Giai đoạn 4: Hoàn thiện

- Thống kê theo câu, theo khối.
- Sao lưu tự động, launcher có icon khay hệ thống.
- Nhiều mã đề, giám sát lúc thi (đếm số lần rời tab) nếu cần.

## 10. Các quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Stack | Next.js + SQLite |
| Môn và dạng đề | Chỉ Vật lí, hai dạng: đề 3 phần và đề VSAT |
| Đề | PDF có lớp chữ. Cắt thành ảnh từng câu theo mốc "Câu N", giáo viên chỉnh khung và nhập đáp án bằng cách bấm vào từng câu |
| Hiển thị cho học sinh | Ảnh cắt sẵn ở server, không gửi PDF |
| Thang điểm | Đề 3 phần tổng 10 điểm, đề VSAT mỗi câu tối đa 6 điểm (mục 3.2) |
| Tổ chức | Chỉ quản lý tới khối (10, 11, 12), không có lớp. Kỳ thi giao theo khối |
| Giáo viên | Mọi giáo viên có quyền như nhau, ngân hàng đề dùng chung, không chia riêng |
| Thi thử | Chỉ giáo viên và admin, trên đề đã có đáp án |
| Số lần làm bài | Một lần mỗi kỳ thi. Giáo viên mở lại được cho học sinh gặp sự cố |
| Xem kết quả | Điểm hiện ngay sau khi nộp. Đáp án hiện sau khi nộp bài hoặc sau khi kỳ thi kết thúc, giáo viên chọn theo từng kỳ thi, mặc định là sau khi kết thúc |
| Mật khẩu tạm | Chốt ngày 2026-11-16: mọi học sinh dùng chung mật khẩu tạm `12345678` khi tạo tài khoản và khi đặt lại mật khẩu, lần đăng nhập đầu vẫn bắt đổi. Giáo viên và admin vẫn nhận mật khẩu tạm ngẫu nhiên |
| Trang chủ học sinh | Chốt ngày 2026-11-16: học sinh đăng nhập xong vào `/home`, cùng giao diện với trang chi tiết học sinh của giáo viên. Trang chủ có luôn kỳ thi đang diễn ra và sắp diễn ra, không còn trang kỳ thi riêng, `/my-exams` chuyển về `/home` |
| Mã đề | Hiện một mã đề mỗi kỳ thi, dữ liệu thiết kế sẵn cho nhiều mã đề (mục 3.4) |
| Quy mô | Khoảng 200 học sinh thi cùng lúc |

Còn mở:

1. Domain: `ly-lncom.xyz`, đã trỏ nameserver về Cloudflare ngày 2026-11-15. Tunnel thử `lnc-dev` chạy đạt ngày 2026-11-15 trên máy phát triển. Chưa tạo tunnel `lnc` trên máy thi. Các bước còn lại nằm ở `SETUP.md` mục 6 và mục 10.
2. Thử tải giả lập đã chạy ngày 2026-11-11 trên máy phát triển (12 luồng CPU), lệnh `bun run load`. Kịch bản: học sinh đăng nhập rải trong 20 giây, sau đó tất cả cùng vào thi trong 2 giây, mỗi người mở 28 câu, lưu 28 đáp án cách nhau 0,5 đến 2,5 giây rồi nộp.
   - 200 học sinh: 12.601 yêu cầu, 0 lỗi. Bước chậm nhất là mở trang kỳ thi và trang làm bài lúc cùng vào, khoảng 0,8 giây. Lưu đáp án p95 là 15 ms.
   - 400 học sinh: 25.201 yêu cầu, 0 lỗi. Bước chậm nhất khoảng 2,4 giây. Lưu đáp án p95 là 54 ms.
   - Chưa thử tải qua Cloudflare Tunnel và chưa thử trên máy sẽ dùng thật. Cần chạy lại `bun run load` trên máy đó trước kỳ thi đầu tiên.
