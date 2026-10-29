# Math Buddy AI – Bé vui học Toán song ngữ

Ứng dụng web giúp học sinh lớp 1 ôn luyện Toán, có bạn robot **Buddy** động viên bằng tiếng Anh đơn giản, và **Góc giáo viên** để quản lý lớp, xem kết quả và phân tích dữ liệu học tập.

> **Lưu ý:** Đây là bản chạy được trên máy tính (môi trường thử nghiệm). Trước khi dùng thật với học sinh, cần đối chiếu nội dung với bộ sách nhà trường, đổi mật khẩu mẫu và triển khai lên máy chủ có HTTPS (xem mục 8).

---

## 1. Cài đặt và chạy

Yêu cầu: **Node.js 22.13 trở lên** (đã thử với Node 24). Không cần cài thêm cơ sở dữ liệu: ứng dụng dùng SQLite có sẵn trong Node (`node:sqlite`).

```bash
npm install
```

**Chạy để phát triển** (giao diện ở http://localhost:5173, API ở cổng 4000):

```bash
npm run dev
```

**Chạy bản hoàn chỉnh** (một máy chủ phục vụ cả giao diện lẫn API ở http://localhost:4000):

```bash
npm run build
```

```bash
npm start
```

**Cấu hình (không bắt buộc):** sao chép `.env.example` thành `.env` rồi sửa giá trị. Không có `.env` thì ứng dụng dùng giá trị mặc định.

**Kiểm thử:**

```bash
npm test
```

```bash
npm run typecheck
```

## 2. Tài khoản và mã dùng thử

Lần chạy đầu tiên (khi CSDL còn trống), máy chủ tự tạo:

| Vai trò | Đăng nhập | Ghi chú |
|---|---|---|
| Giáo viên | `giaovien@mathbuddy.local` / `Buddy@2026` | Quản lý lớp, xem kết quả, phân tích |
| Quản trị | `quantri@mathbuddy.local` / `Admin@2026` | Như giáo viên, thêm quyền đổi trạng thái kiểm duyệt bài |
| Lớp mẫu | Mã lớp **DEMO1A** | Học sinh: Bé Mèo **MEO234**, Bé Thỏ **THO234**, Bé Gấu **GAU234** |

- Có thể đổi các giá trị này bằng biến `SEED_*` trong `.env` **trước lần chạy đầu**. Đặt `SEED_DEMO_CLASS=false` để không tạo lớp mẫu.
- Lớp mẫu **không có kết quả giả**: mọi số liệu trong Góc giáo viên đều đến từ các lần làm bài thật.
- Muốn làm lại từ đầu, dừng máy chủ rồi xóa thư mục `server/data/`.

## 3. Các màn hình

**Học sinh**

| Đường dẫn | Màn hình |
|---|---|
| `/` | Trang đầu: ảnh Buddy và banner, lời chào, nút chính **Vào lớp học**, nút phụ **Học thử** |
| `/vao-lop` | Vào lớp bằng **mã lớp + mã học sinh** (không email, không số điện thoại, không mật khẩu) |
| `/hoc` | Danh sách bài: tên, hình, trạng thái *Chưa luyện / Đang luyện / Đã hoàn thành*, kết quả gần nhất; 3 trò chơi; khu từ vựng tiếng Anh |
| `/lam-bai/:id` | Làm bài: một câu mỗi lần, “Câu x/y”, nút **Gợi ý**, nút nghe đọc câu hỏi, Buddy không che câu hỏi |
| `/ket-qua/:id` | Kết quả: số câu đúng/tổng, lời khen, kỹ năng làm tốt, gợi ý luyện tiếp, nút **Luyện lại** / **Chọn bài khác** |
| `/rieng-tu` | Thông báo quyền riêng tư bằng ngôn ngữ dễ hiểu |

**Giáo viên** (`/giao-vien`): danh sách lớp → chi tiết lớp gồm 4 thẻ *Học sinh & mã*, *Bài được giao*, *Kết quả*, *Phân tích AI*; trang từng học sinh; *Ngân hàng bài*.

## 4. Kiến trúc

```
client/   React 19 + Vite + React Router — giao diện học sinh và giáo viên
server/   Node + Express 5 + Zod + SQLite (node:sqlite)
  src/content/   Ngân hàng câu hỏi (mã nguồn), bộ dựng câu hỏi, cấu hình trò chơi
  src/routes/    API học sinh/học thử (learner.ts) và giáo viên (teacher.ts)
  src/grading.ts Chấm điểm cố định
  src/reports.ts Thống kê theo học sinh, lớp, kỹ năng
  src/analysis.ts Phân tích hỗ trợ giáo viên (+ tóm tắt AI tùy chọn)
  test/          44 bài kiểm thử tự động
```

**Vì sao dùng SQLite thay vì PostgreSQL?** Bản yêu cầu gợi ý PostgreSQL. Bản này dùng SQLite có sẵn trong Node để thầy cô có thể chạy ngay trên một máy mà không phải cài máy chủ CSDL. Toàn bộ truy vấn nằm ở máy chủ, dùng câu lệnh tham số hóa, nên có thể chuyển sang PostgreSQL khi cần nhiều máy chủ hoặc nhiều trường dùng chung. Việc chuyển đổi này **chưa làm**.

**Nội dung và chấm điểm**
- Mỗi câu hỏi được tạo bằng một hàm dựng tính đáp án từ chính các con số của câu. Vì vậy đáp án, hình minh họa và phép tính luôn khớp nhau, và có kiểm thử riêng để bảo đảm điều này.
- Hình minh họa được vẽ từ dữ liệu (biểu tượng, SVG), nên số đồ vật trên hình luôn đúng với đề.
- Đáp án chuẩn **chỉ nằm ở máy chủ**, không gửi xuống trình duyệt khi học sinh làm bài.
- Chấm điểm cố định (`grade()`): cùng một câu trả lời luôn cho cùng kết quả. AI không tham gia chấm.
- Mỗi câu được thử tối đa 2 lần. **Điểm chính thức = đúng ngay lần đầu.** Đúng sau khi thử lại được ghi riêng. Câu trả lời không hợp lệ (ví dụ để trống) không bị tính là một lần thử.
- Toán và từ vựng tiếng Anh được tính **tách riêng**: sai từ vựng không làm giảm điểm Toán.

## 5. Tính năng đã hoàn thành

**Học sinh**
- [x] Trang đầu theo ảnh mẫu: Buddy, banner, lời chào, 2 nút Vào lớp học / Học thử.
- [x] Vào lớp bằng mã lớp + mã học sinh, có thông báo lỗi thân thiện và giới hạn số lần thử.
- [x] **Học thử** tách biệt: không tính vào báo cáo lớp. Trẻ được cho biết dữ liệu chỉ lưu tạm 7 ngày rồi tự xóa.
- [x] Danh sách bài có trạng thái và kết quả gần nhất. Làm dở thì có thể tiếp tục.
- [x] Làm bài từng câu, thanh tiến độ, gợi ý từng bước, nghe đọc câu hỏi (tiếng Việt), phím Enter.
- [x] Buddy nói **chỉ tiếng Anh** đơn giản (có nhãn EN và đọc bằng giọng tiếng Anh). Hướng dẫn Toán bằng **tiếng Việt** ở khu vực riêng.
- [x] Đúng/sai không chỉ thể hiện bằng màu: luôn có dấu ✓/✗ và chữ.
- [x] Màn hình kết quả: không xếp hạng, không chê. Luôn có ít nhất 1 sao. Gợi ý bài tiếp theo dựa trên kỹ năng còn sai.
- [x] **3 trò chơi** lấy câu hỏi từ bài đã duyệt: *Magic Numbers* (số và đếm), *Math Garden* (cộng, trừ, so sánh), *Shape Hunt* (hình học).
- [x] Âm thanh, hiệu ứng, có nút tắt/bật âm thanh.
- [x] Dùng được trên điện thoại, máy tính bảng, máy tính. Font Nunito, vùng chạm ≥ 48px, tiếng Việt có dấu đầy đủ.

**Giáo viên**
- [x] Đăng nhập bảo mật (mật khẩu băm scrypt, phiên 12 giờ, giới hạn số lần thử).
- [x] Tạo/đổi tên/xóa lớp. Mã lớp được tạo tự động và bỏ các ký tự dễ nhầm (0/O, 1/I/L).
- [x] Thêm học sinh bằng biệt danh, in phiếu mã. Khi học sinh quên hoặc lộ mã thì **cấp mã mới** (mã cũ và phiên cũ hết hiệu lực). Có thể tạm khóa hoặc xóa học sinh.
- [x] Chọn bài giao cho lớp (chỉ bài đã duyệt).
- [x] Kết quả theo học sinh và theo lớp: số câu, tỷ lệ đúng lần đầu, kỹ năng cần ôn, tiến độ từng bài, từ vựng tách riêng.
- [x] **Xuất CSV** (UTF-8 có BOM, mở bằng Excel không lỗi dấu). Có 2 loại: theo học sinh và từng lần làm bài. Thời gian theo giờ Việt Nam. **Không xuất mã truy cập**.
- [x] **Phân tích AI** chỉ dựa trên dữ liệu thật (xem mục 6).
- [x] Ngân hàng bài: tìm kiếm, xem trước câu hỏi và đáp án. Quản trị viên đổi trạng thái *Bản nháp / Đang xem xét / Đã duyệt*.
- [x] **Không có** chức năng AI tạo câu hỏi ở bất kỳ đâu (có kiểm thử khẳng định điều này).
- [x] Mọi thao tác ghi đều được lưu nhật ký (`audit_log`).

## 6. Phân tích AI hoạt động thế nào

1. **Phân tích theo quy tắc (luôn chạy):**
   - Tính từ kết quả chấm thật, mỗi nhận định đều có dòng **“Căn cứ”** ghi số liệu cụ thể.
   - Một kỹ năng chỉ được nhận xét khi học sinh đã làm **ít nhất 5 câu** của kỹ năng đó; nhận xét cho cả lớp cần ít nhất 10 câu.
   - Ít dữ liệu hơn thì ghi rõ **“Chưa đủ dữ liệu”**. Có dữ liệu nhưng không có gì nổi bật thì ghi **“Theo dõi thêm”** kèm số liệu.
2. **Tóm tắt bằng mô hình ngôn ngữ (tùy chọn):**
   - Chỉ chạy khi đặt `ANTHROPIC_API_KEY` trong `.env` ở máy chủ. Mô hình mặc định là `claude-opus-5-5`, đổi được bằng `ANTHROPIC_MODEL`.
   - Dữ liệu gửi đi đã tối thiểu hóa: chỉ các nhận định và số liệu ở bước 1. Học sinh được đổi thành “Học sinh 1, 2…”. **Không gửi** biệt danh, mã truy cập hay câu trả lời gốc. Biệt danh chỉ được gắn lại ở máy chủ.
   - Mô hình được dặn không thêm số liệu, không chẩn đoán trẻ, và phải nói rõ khi dữ liệu chưa đủ.
   - Có bật **dự phòng phía máy chủ Anthropic**: nếu mô hình chính từ chối yêu cầu, máy chủ Anthropic tự chuyển sang một mô hình dự phòng. Nếu vẫn bị từ chối thì ứng dụng bỏ qua phần tóm tắt, phân tích theo quy tắc vẫn hiển thị.
   - Phần này **chưa được chạy thử với khóa API thật** trong quá trình xây dựng (xem mục 9).
3. Phân tích **chỉ đọc**: không sửa đáp án, không sửa điểm, không tạo câu hỏi (có kiểm thử so sánh dữ liệu trước và sau khi phân tích).

## 7. Tình trạng đối chiếu nội dung

| Bài | Số câu | Kiểm duyệt | Đối chiếu SGK |
|---|---|---|---|
| Các số từ 0 đến 10 | 14 (12 Toán + 2 từ vựng) | Đã duyệt | **Chờ đối chiếu** |
| So sánh các số | 14 (12 + 2) | Đã duyệt | **Chờ đối chiếu** |
| Phép cộng trong phạm vi 10 | 15 (13 + 2) | Đã duyệt | **Chờ đối chiếu** |
| Phép trừ trong phạm vi 10 | 15 (13 + 2) | Đã duyệt | **Chờ đối chiếu** |
| Các hình quen thuộc | 14 (11 + 3) | Đã duyệt | **Chờ đối chiếu** |
| Dài hơn, ngắn hơn | 10 | Đã duyệt | **Chờ đối chiếu** |
| Làm quen từ vựng Toán tiếng Anh | 12 | Đã duyệt | **Chờ đối chiếu** |
| Các số đến 20 | 2 | Bản nháp (ẩn với học sinh) | **Chờ đối chiếu** |

- Tên bài là tên mô tả chủ đề, **không phải tên bài chính thức** trong sách giáo khoa. Tất cả đang **chờ đối chiếu** với bộ sách nhà trường chọn.
- “Đã duyệt” ở đây nghĩa là đáp án và cách chấm đã được kiểm tra (kể cả bằng kiểm thử tự động). Nó **không** có nghĩa nội dung đã được xác minh theo chương trình chính thức.
- Câu hỏi có 3 mức độ (dùng nội bộ, không hiển thị cho trẻ).
- Muốn sửa hoặc thêm câu hỏi: sửa `server/src/content/lessons.ts`, chạy `npm test` để kiểm tra đáp án, rồi khởi động lại máy chủ.

## 8. Bảo mật và quyền riêng tư

- **Kiểm tra quyền ở máy chủ** cho mọi yêu cầu cần đăng nhập:
  - Giáo viên chỉ thấy lớp của mình.
  - Học sinh chỉ thấy bài làm của mình. Truy cập bài của người khác nhận lỗi 404.
  - Có kiểm thử cho các trường hợp này.
- **Phiên đăng nhập:**
  - Mã phiên ngẫu nhiên. CSDL chỉ lưu bản băm SHA-256 của mã phiên.
  - Phiên giáo viên lưu trong `sessionStorage` (đóng trình duyệt là hết). Phiên học sinh hết hạn sau 7 ngày.
- **Giới hạn số lần đăng nhập** theo địa chỉ IP: giáo viên 10 lần, học sinh 20 lần mỗi 15 phút.
- **Khóa API chỉ ở máy chủ**, không bao giờ gửi xuống trình duyệt và không ghi vào nhật ký.
- Có header bảo mật cơ bản, giới hạn kích thước yêu cầu, và không lưu đệm phản hồi API.
- **Dữ liệu tối thiểu:**
  - Học sinh chỉ có biệt danh do giáo viên đặt (khuyên không dùng họ tên đầy đủ). Không có email, số điện thoại, ngày sinh hay ảnh.
- **Xóa dữ liệu:**
  - Xóa học sinh sẽ xóa luôn toàn bộ bài làm của học sinh đó. Xóa lớp sẽ xóa học sinh và kết quả của lớp.
  - Dữ liệu học thử và phiên hết hạn tự xóa sau 7 ngày.
- **Mất hoặc quên mã:** giáo viên bấm *Cấp mã mới*, mã cũ lập tức hết hiệu lực.
- Ứng dụng có trang thông báo quyền riêng tư (`/rieng-tu`). **Ứng dụng không tự khẳng định tuân thủ bất kỳ quy định pháp luật nào.** Nhà trường cần tự rà soát theo quy định hiện hành về bảo vệ dữ liệu cá nhân trẻ em trước khi dùng thật.
- **Trước khi dùng thật:**
  - Đổi mật khẩu mẫu: đặt `SEED_*` trước lần chạy đầu, hoặc xóa `server/data/` rồi chạy lại với giá trị mới.
  - Chạy sau HTTPS.
  - Sao lưu định kỳ file `server/data/math-buddy.db`.

## 9. Chưa làm / còn hạn chế (báo cáo trung thực)

- **Dạng câu hỏi nối/ghép cặp** chưa có. Hiện có: chọn một đáp án, chọn nhiều hình, nhập số bằng bàn phím số.
- **Trò chơi “Buddy Challenge”** chưa làm. Đã có 3 trò: Magic Numbers, Math Garden, Shape Hunt.
- **PostgreSQL** chưa làm (đang dùng SQLite, xem mục 4).
- **Triển khai lên máy chủ thật** (tên miền, HTTPS, sao lưu, nhiều máy chủ) chưa làm. Hiện chạy trên một máy.
- **Quản lý tài khoản giáo viên** chưa có giao diện: chưa tạo thêm giáo viên, đổi mật khẩu hay khôi phục mật khẩu. Tài khoản được tạo từ `.env` ở lần chạy đầu.
- **Soạn câu hỏi trên giao diện** chưa có: nội dung được sửa trong mã nguồn rồi kiểm thử. Quản trị viên chỉ đổi được trạng thái duyệt.
- **Tóm tắt AI bằng mô hình ngôn ngữ** đã viết mã nhưng **chưa chạy với khóa API thật**. Không có khóa thì phần này tắt và giao diện ghi rõ điều đó.
- **Đọc to** dùng giọng có sẵn của trình duyệt/thiết bị. Chất lượng giọng tiếng Việt tùy máy, và một số máy có thể không có giọng tiếng Việt.
- **Ngân hàng câu hỏi** còn nhỏ (94 câu ở 7 bài đã duyệt). Bài “Các số đến 20” mới là bản nháp.

## 10. Kết quả kiểm thử

Chạy ngày 29/10/2026 trên Windows 11, Node 24:

- `npm test`: **44/44 đạt**, gồm:
  - **Nội dung:** đáp án khớp hình và phép tính, phạm vi 10, mỗi bài có 10–15 câu, Buddy chỉ nói tiếng Anh, gợi ý không lộ đáp án.
  - **Chấm điểm:** chấm cố định, kể cả các trường hợp nhập liệu đặc biệt.
  - **Luồng học sinh và học thử:** học thử không vào báo cáo lớp.
  - **Phân quyền:** giáo viên khác lớp và học sinh khác nhận 404.
  - **CSV:** có BOM, không chứa mã truy cập, chặn ô công thức, giờ địa phương.
  - **Phân tích AI:** không sửa đáp án/điểm, mọi học sinh đều có nhận định kèm căn cứ.
  - **Không có AI tạo câu hỏi.**
- `npm run typecheck` và `npm run build`: không lỗi. Bản build chạy bằng `npm start` phục vụ được cả giao diện và API.
- **Kiểm tra thủ công trên trình duyệt** (máy tính và khung điện thoại 375px):
  - Trang đầu, vào lớp (mã sai và mã đúng), danh sách bài.
  - Làm bài: trả lời sai rồi đúng, gợi ý, bàn phím số.
  - Màn hình kết quả, trò chơi Shape Hunt (chọn nhiều hình).
  - Đăng nhập giáo viên, kết quả lớp, phân tích, ngân hàng bài.
- **Chưa kiểm tra:**
  - Trên điện thoại/máy tính bảng thật.
  - Với trình đọc màn hình.
  - Với nhiều học sinh dùng cùng lúc.
  - Phần tóm tắt AI với khóa thật.
