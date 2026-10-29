# Math Buddy AI – Bé vui học Toán song ngữ

Ứng dụng web giúp học sinh lớp 1 ôn luyện Toán. Bạn robot **Buddy** động viên con bằng tiếng Anh đơn giản, còn phần hướng dẫn Toán bằng tiếng Việt.

**Bản trực tuyến:** https://dungptt-dng.github.io/math-buddy-ai/

Ứng dụng là **trang web tĩnh**, chạy hoàn toàn trong trình duyệt:
- không cần máy chủ, không có tài khoản hay mật khẩu;
- không gửi dữ liệu học tập lên mạng;
- kết quả lưu trong trình duyệt của thiết bị đang dùng.

---

## 1. Chạy trên máy

Yêu cầu: Node.js 20.19 trở lên (đã thử với Node 24).

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:5173.

| Lệnh | Việc làm |
|---|---|
| `npm test` | Chạy kiểm thử tự động |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run build` | Tạo bản tĩnh trong thư mục `dist/`. Đưa lên bất kỳ dịch vụ trang tĩnh nào, ở thư mục gốc hay thư mục con, đều chạy được. |

## 2. Đưa lên GitHub Pages

Mỗi lần push lên nhánh `main`, GitHub Actions (`.github/workflows/pages.yml`) tự động:
1. chạy kiểm thử;
2. build bản tĩnh;
3. đưa lên GitHub Pages.

Nếu kiểm thử lỗi, trang trực tuyến giữ nguyên bản cũ.

## 3. Các màn hình

| Đường dẫn | Màn hình |
|---|---|
| `#/` | **Trang đầu**: ảnh banner phủ toàn màn hình, lời chào của Buddy, nút chính **Vào học** và nút phụ **Học thử** |
| `#/chon-ban` | **Vào học**: con chọn tên của mình, hoặc thêm bạn mới (biệt danh + một con vật). Nhiều bạn dùng chung một máy vẫn được tách riêng kết quả. |
| `#/hoc` | **Danh sách bài**: tên, hình, trạng thái *Chưa luyện / Đang luyện / Đã hoàn thành*, kết quả gần nhất; 3 trò chơi; khu từ vựng tiếng Anh |
| `#/lam-bai/:id` | **Làm bài**: một câu mỗi lần, “Câu x/y”, nút Gợi ý, nút nghe đọc câu hỏi. Buddy không che câu hỏi. |
| `#/ket-qua/:id` | **Kết quả**: số câu đúng, lời khen, kỹ năng làm tốt, gợi ý bài tiếp theo, nút **Luyện lại** / **Chọn bài khác**. Không xếp hạng, không chê. |
| `#/phu-huynh` | **Góc phụ huynh & thầy cô**: kết quả từng bạn trên thiết bị này, kỹ năng, tải CSV, xóa dữ liệu, tình trạng đối chiếu nội dung |
| `#/rieng-tu` | Thông tin quyền riêng tư |

Đường dẫn dùng dấu `#` để GitHub Pages (không có máy chủ) vẫn mở đúng trang khi tải lại hoặc mở liên kết trực tiếp.

## 4. Đã bỏ những gì so với bản có máy chủ

Theo yêu cầu “chạy hoàn toàn trên trang tĩnh”, các tính năng cần máy chủ đã được **gỡ bỏ**.

| Bỏ | Thay bằng |
|---|---|
| Đăng nhập học sinh bằng mã lớp + mã học sinh | Chọn tên trên thiết bị |
| Góc giáo viên có đăng nhập, quản lý lớp, cấp mã, giao bài | Góc phụ huynh & thầy cô, chỉ xem dữ liệu trên thiết bị đó |
| Báo cáo gộp cả lớp từ nhiều máy | Mỗi máy tải CSV riêng, thầy cô tự gộp |
| Tóm tắt bằng mô hình AI (cần khóa API ở máy chủ) | Không có. Nhận xét kỹ năng tính theo quy tắc từ dữ liệu thật vẫn còn. |
| Cơ sở dữ liệu SQLite, máy chủ Express | localStorage của trình duyệt |

Bản có máy chủ vẫn còn trong lịch sử Git (commit `73cc087`) nếu sau này nhà trường muốn triển khai có máy chủ.

## 5. Cách hoạt động

```
src/content/   Ngân hàng câu hỏi (94 câu ở 7 bài đã duyệt), bộ dựng câu hỏi, cấu hình trò chơi
src/engine/    Bộ máy học: chọn bài, chấm điểm, gợi ý, kết quả, báo cáo, CSV, lưu localStorage
src/pages/     Các màn hình
test/          Kiểm thử tự động
```

**Câu hỏi**
- Mỗi câu được tạo bằng một hàm dựng, hàm này tính đáp án từ chính các con số của câu. Nhờ vậy đáp án, hình minh họa và phép tính luôn khớp nhau, và có kiểm thử riêng để bảo đảm điều đó.
- Hình minh họa được vẽ từ dữ liệu bằng biểu tượng và SVG, nên số đồ vật trên hình luôn đúng với đề.

**Chấm điểm**
- Chấm **cố định** theo đáp án chuẩn; AI không tham gia chấm.
- Mỗi câu được trả lời tối đa 4 lần (xem phần Buddy bên dưới).
- **Điểm chính = đúng ngay lần đầu.** Câu đúng sau khi thử lại được ghi riêng.
- Câu trả lời không hợp lệ (ví dụ để trống) không bị tính là một lần thử.
- Toán và từ vựng tiếng Anh được tính **tách riêng**: sai từ vựng không làm giảm điểm Toán.
- Lưu lại câu trả lời thật của con, số lần trả lời và số lần bấm Gợi ý.

**Buddy luôn phản hồi bằng tiếng Anh**
- Câu hỏi Toán và nút **Gợi ý** (con tự bấm trước khi trả lời) bằng tiếng Việt.
- **Sau khi con trả lời**, mọi lời Buddy đều bằng tiếng Anh đơn giản, giống nhau ở mọi bài và mọi trò chơi: khen, động viên, gợi ý, thử lại, xem đáp án, phần thưởng trò chơi, chúc mừng khi xong bài. Có đọc to bằng giọng tiếng Anh nếu đang bật âm thanh.
- Thứ tự luôn là: chấm trước → lưu kết quả → rồi mới chọn lời Buddy theo kết quả đó, nên lời Buddy không bao giờ trái với kết quả chấm.
- Khi con trả lời sai, Buddy không chê và không nói ngay đáp án:

  | Lần sai | Buddy nói (ví dụ) | Gợi ý bằng hình |
  |---|---|---|
  | 1 | “Good try! Let's try again.” + gợi ý nhẹ | Phương án đã chọn sai bị gạch đi |
  | 2 | “Almost! Let's count together.” + gợi ý rõ hơn | Đồ vật sáng lần lượt để con đếm theo; phép tính có thêm chấm tròn |
  | 3 | “Let's go step by step.” + 3 bước nhỏ, bước cuối là câu hỏi | Hiện thêm số đếm trên từng đồ vật |
  | 4 | “Good try! Let's learn it together.” + đáp án | Đáp án được đánh dấu ✓ |

- Âm báo khi sai là tiếng nhẹ, không phải tiếng báo lỗi. Không giới hạn thời gian.
- Khi làm đúng, thỉnh thoảng Buddy giới thiệu một **từ tiếng Anh mới** (ví dụ *five*, *plus*, *circle*): chỉ ở câu Toán, mỗi từ một lần trong một bài, không ở hai câu liền nhau.
- Con **không cần** đọc, viết hay nói tiếng Anh để làm xong bài: các gợi ý bằng hình và con số đủ để làm theo.
- Ứng dụng không gọi AI. Mọi lời Buddy lấy từ ngân hàng câu có sẵn (`src/engine/feedback.ts` và lời riêng của từng câu trong `src/content`), nên vẫn hoạt động khi không có mạng.
- Góc phụ huynh theo dõi **riêng** mức làm quen tiếng Anh (câu từ vựng, các từ con đã gặp), không trộn vào điểm Toán.

**Học thử**
- Không tính vào tiến độ của bạn nào và không hiện trong Góc phụ huynh.
- Tự xóa khi bắt đầu lượt học thử mới hoặc sau 7 ngày.

**Nhận xét kỹ năng**
- Chỉ đưa ra khi đã có ít nhất 5 câu của kỹ năng đó; nếu chưa đủ thì ghi “Chưa đủ dữ liệu”.

## 6. Giới hạn cần biết (báo cáo trung thực)

- **Đáp án nằm trong mã của trang.** Một trang tĩnh phải tự chấm, nên đáp án được tải về trình duyệt cùng ứng dụng. Ai rành kỹ thuật có thể xem được. Điều này chấp nhận được cho luyện tập, nhưng **không dùng kết quả này làm điểm kiểm tra chính thức**.
- **Dữ liệu chỉ ở một thiết bị.**
  - Đổi máy, đổi trình duyệt, dùng tab ẩn danh hoặc xóa dữ liệu duyệt web thì mất kết quả. Hãy tải CSV để lưu lại.
  - Ai dùng được máy đó đều mở được Góc phụ huynh & thầy cô: không có mật khẩu, vì không có máy chủ để kiểm tra.
- **Không có báo cáo cả lớp tự động** từ nhiều máy.
- **Chưa làm:** dạng câu hỏi nối/ghép cặp, trò chơi “Buddy Challenge”.
- **Đọc to** dùng giọng có sẵn của trình duyệt. Chất lượng giọng tiếng Việt và tiếng Anh tùy thiết bị, một số máy có thể không có giọng tiếng Việt.
- **Lời Buddy tiếng Anh** do nhóm phát triển soạn, chưa được giáo viên tiếng Anh tiểu học rà soát.
- **Nội dung chờ đối chiếu SGK:**
  - Tất cả tên bài là tên mô tả chủ đề, **chưa đối chiếu** với bộ sách nhà trường chọn.
  - “Đã duyệt” nghĩa là đáp án và cách chấm đã được kiểm tra (kể cả bằng kiểm thử tự động), không phải bài chính thức trong SGK.
  - Bài “Các số đến 20” là bản nháp và bị ẩn với học sinh.
- **Chưa thử** trên điện thoại hoặc máy tính bảng thật, cũng chưa thử với trình đọc màn hình. Mới thử bằng trình duyệt với kích thước giả lập.

## 7. Quyền riêng tư

- Chỉ lưu **biệt danh** do trẻ chọn và kết quả luyện tập, trong trình duyệt của thiết bị.
- Không có email, số điện thoại, ảnh, giọng nói, và không gửi dữ liệu học tập đi đâu.
- Có nút xóa từng bạn hoặc xóa toàn bộ trong Góc phụ huynh & thầy cô.
- Ứng dụng **không tự khẳng định tuân thủ** quy định pháp luật nào. Nhà trường cần tự rà soát trước khi dùng chính thức.

## 8. Kết quả kiểm thử

`npm test`: 40 bài kiểm thử, gồm:
- **Ngân hàng câu hỏi:** đáp án khớp hình và phép tính, phạm vi 10, mỗi bài có 10–15 câu, gợi ý không lộ đáp án.
- **Lời Buddy:**
  - mọi lời đều là tiếng Anh, câu ngắn;
  - mỗi câu hỏi có đủ lời khen, 2 mức gợi ý, và các bước nhỏ kết thúc bằng câu hỏi;
  - đủ 5 tiêu chí nghiệm thu: trả lời đúng, sai lần đầu, sai nhiều lần, hoàn thành bài, không có mạng;
  - lời Buddy không bao giờ trái với kết quả chấm, kiểm ở mọi câu của mọi bài;
  - trò chơi có phần thưởng bằng tiếng Anh;
  - từ mới không lặp lại và không xuất hiện ở hai câu liền nhau.
- **Chấm điểm.**
- **Bộ máy học:**
  - tối đa 4 lần trả lời, câu không hợp lệ không tính lượt;
  - lưu câu trả lời thật, số lần trả lời, số gợi ý; mở lại bài giữa chừng vẫn giữ mức gợi ý;
  - điểm chính tính theo lần đầu, Toán và từ vựng tách riêng;
  - không mở được bài của bạn khác;
  - học thử không vào báo cáo và hết hạn sau 7 ngày;
  - trò chơi chỉ lấy câu từ bài đã duyệt;
  - CSV có BOM và chặn ô công thức;
  - xóa một bạn thì xóa luôn kết quả của bạn đó.
