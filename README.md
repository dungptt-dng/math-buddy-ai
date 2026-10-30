# Math Buddy AI – Bé vui học Toán song ngữ

Ứng dụng web cho học sinh lớp 1 với **hai khu học song song**:

- **Ôn luyện Toán – Math Practice**: bài Toán lớp 1 bằng tiếng Việt, Buddy hướng dẫn và giải thích Toán bằng tiếng Việt.
- **Làm quen tiếng Anh – English Practice**: 9 chủ đề từ vựng gắn với Toán lớp 1 (số đếm, cộng, trừ, so sánh, hình, đếm, vị trí, đo lường), có thẻ từ, nghe phát âm, 6 dạng bài luyện tập, trò chơi từ vựng, kết quả và tiến độ **riêng**.

Sau mỗi câu trả lời, bạn robot **Buddy** phản hồi bằng tiếng Anh đơn giản; nghĩa tiếng Việt hiện riêng bên dưới.

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
| `#/` | **Trang đầu**: ảnh banner phủ toàn màn hình. Chưa vào học: ô **Tên của con**, **Tên lớp**, nút **Bắt đầu học** (rồi chạm con vật của con) và nút phụ **Học thử**. Đang học: lời chào, hai nút khu học **Ôn luyện Toán** và **Làm quen tiếng Anh** (kèm bài Toán tiếp theo / chủ đề tiếng Anh gợi ý), **Đổi thông tin**, **Kết thúc phiên học**. |
| `#/hoc` | **Khu 1 – Ôn luyện Toán**: thanh chuyển khu (Toán / tiếng Anh), lời chào, “Đã hoàn thành x/6 bài”, thẻ bài với trạng thái *Chưa luyện / Đang luyện / Đã hoàn thành*, kết quả gần nhất; 3 trò chơi Toán |
| `#/tieng-anh` | **Khu 2 – Làm quen tiếng Anh**: thanh chuyển khu, tiến độ tiếng Anh của con (số chủ đề đã học, số từ đã làm quen), Buddy gợi ý chủ đề nên học/ôn, 9 thẻ chủ đề (tên tiếng Anh + tiếng Việt + các từ), trò chơi **Bóng bay từ vựng** |
| `#/tieng-anh/hoc/:id` | **Bài tiếng Anh**: (1) *làm quen từ*: mỗi từ một thẻ gồm hình, chữ tiếng Anh, nghĩa tiếng Việt, Buddy đọc to, nút **Nghe lại**; (2) *luyện tập* 8–9 câu, mỗi câu tối đa 3 lần trả lời |
| `#/tieng-anh/ket-qua/:id` | **Kết quả tiếng Anh**: số câu đúng ngay lần đầu, kết quả Nghe / Nhận diện từ / Mẫu câu, **từ đã nhận biết tốt** và **từ cần ôn lại** (bấm để nghe), gợi ý chủ đề tiếp theo |

| `#/lam-bai/:id` | **Làm bài**: một câu mỗi lần, “Câu x/y”, nút Gợi ý, nút nghe đọc câu hỏi. Buddy không che câu hỏi. |
| `#/ket-qua/:id` | **Kết quả**: số câu đúng, lời khen, kỹ năng làm tốt, gợi ý bài tiếp theo, nút **Luyện lại** / **Chọn bài khác**. Không xếp hạng, không chê. |
| `#/phu-huynh` | **Góc phụ huynh & thầy cô**: hai thẻ **Báo cáo Toán** và **Báo cáo tiếng Anh** cho từng bạn trên thiết bị này, CSV riêng cho mỗi môn, xóa dữ liệu, danh sách nội dung |
| `#/rieng-tu` | Thông tin quyền riêng tư |

**Tên và lớp không phải mật khẩu.** Bạn mới chọn một con vật; lần sau nhập lại đúng tên + lớp và chạm đúng con vật đó mới xem tiếp được kết quả cũ (chạm sai 3 lần thì quay lại, nhờ thầy cô). Đây chỉ là cách nhận ra nhẹ nhàng cho trẻ 6–7 tuổi trên máy dùng chung, không phải bảo mật. **Kết thúc phiên học** xóa tên khỏi màn hình; máy chỉ nhớ tên lớp để điền sẵn. Dữ liệu học thử vẫn tách riêng. Đường dẫn cũ `#/chon-ban` tự chuyển về trang đầu.

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
src/content/   Ngân hàng câu Toán (6 bài đã duyệt), ngân hàng tiếng Anh (englishTopics.ts: 37 từ, 9 chủ đề, 75 câu), bộ dựng câu hỏi, trò chơi
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
- Toán và tiếng Anh được lưu ở **hai danh sách riêng** và không bao giờ cộng thành một điểm chung: sai tiếng Anh không làm giảm điểm Toán.
- Bài Toán chỉ còn câu Toán. Các câu từ vựng trước đây nằm lẫn trong bài Toán đã chuyển sang khu tiếng Anh (bài làm cũ trên máy vẫn mở và xem được).
- Khi con hết lượt ở một câu Toán, ngoài lời Buddy tiếng Anh còn có ô **“Cùng hiểu bài”** giải thích bằng tiếng Việt, hiển thị riêng.
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
- Từ Buddy giới thiệu trong bài Toán được ghi lại riêng và hiện trong Báo cáo tiếng Anh.

**Làm quen tiếng Anh**
- **9 chủ đề, 37 từ**, mỗi chủ đề 3–5 từ mới: *Numbers 1–5, Numbers 6–10, Counting, Addition, Subtraction, Comparison, Shapes, Position, Measurement*.
- Mỗi bài: làm quen từ (thẻ từ + nghe đọc) → 8–9 câu luyện tập → kết quả.
- **Dạng bài** (ưu tiên nghe, nhìn, nhận diện, lựa chọn; không bắt trẻ viết):
  | Dạng | Ví dụ |
  |---|---|
  | Nghe và chọn từ | Buddy đọc “three” → chọn *three* trong 3 từ |
  | Nghe và chọn hình | Buddy đọc “triangle” → chạm hình tam giác |
  | Nhìn hình chọn từ | Hình số 4 → chọn *four* |
  | Ghép từ | Nối 3 từ với hình, hoặc với nghĩa tiếng Việt; chấm từng cặp, cặp đúng được giữ khi thử lại |
  | Chọn chữ / từ còn thiếu | *c _ r c l e*; “Two ___ one equals three.” |
  | Mẫu câu | “How many apples?” → *Three.*; “What shape is it?” → *It is a rectangle.* |
  | Trò chơi **Bóng bay từ vựng** | 8 câu nghe/nhìn lấy từ ngân hàng, chỉ với các từ con đã học; mỗi câu đúng thả một quả bóng |
- **Phát âm**: dùng giọng đọc có sẵn của trình duyệt (Text-to-Speech), luôn là giọng **English (US)**, ưu tiên cùng một giọng trong cả phiên (ví dụ Microsoft Zira / Google US English / Samantha), đọc chậm (0,75) để trẻ nghe rõ. Thẻ từ và chữ trong câu điền chỗ trống nhấp nháy trong lúc Buddy đọc. Ở **bài nghe**, chữ của từ được ẩn cho đến khi con trả lời xong (để thực sự là bài nghe), sau đó hiện cùng nghĩa tiếng Việt và nút nghe lại.
- **Không có** nhận diện giọng nói, không ghi âm, không chấm phát âm. “Listen and repeat!” chỉ là lời mời con tự nói theo.
- **Quy tắc ngôn ngữ**: lời Buddy sau mỗi câu trả lời chỉ bằng tiếng Anh (ví dụ “Very good!”, “Try again!”); nghĩa tiếng Việt (“Giỏi lắm!”, “Con thử lại nhé!”) hiện ở ô **Nghĩa** riêng, không đọc chung. Lời hướng dẫn (“Listen and choose the word.”) có dòng tiếng Việt bên dưới.
- **Chấm**: cố định theo đáp án chuẩn. Tối đa 3 lần trả lời; lần sai được gạch đi; hết lượt thì Buddy cùng con xem đáp án. Điểm chính = đúng ngay lần đầu.
- **Theo dõi từng từ** (cùng quy tắc ở trang kết quả và Góc giáo viên), dựa trên 3 lần gặp gần nhất trong câu luyện tập:
  - *Nhận biết tốt*: đã gặp ít nhất 2 lần, lần gần nhất đúng, sai không quá 1 lần;
  - *Cần ôn lại*: lần gần nhất chưa đúng, hoặc sai từ 2 lần;
  - *Đang làm quen*: mới gặp 1 lần, hoặc mới xem thẻ từ.
- **Gợi ý ôn tập** tính theo quy tắc từ kết quả thật: chủ đề có nhiều từ cần ôn nhất → chủ đề đang học dở → chủ đề chưa học. Chỉ chọn chủ đề có sẵn trong ngân hàng; **không dùng AI và không tự tạo câu hỏi mới**.

**Báo cáo trong Góc phụ huynh & thầy cô** (hai thẻ riêng)
- *Báo cáo Toán*: số bài đã hoàn thành / tổng số bài, tỷ lệ hoàn thành, số câu đã làm, số câu đúng và sai ở lần đầu, số lần bấm Gợi ý, kỹ năng Toán (và kỹ năng cần ôn), các lần làm bài. CSV Toán.
- *Báo cáo tiếng Anh*: số chủ đề đã hoàn thành, số từ đã làm quen, kết quả **Nghe**, **Nhận diện từ**, **Mẫu câu**, danh sách từ *nhận biết tốt / cần luyện thêm / đang làm quen*, bảng chủ đề (trạng thái, số lần hoàn thành, kết quả tốt nhất), gợi ý ôn tập, các lần học. CSV tiếng Anh theo bạn học và CSV từng từ.

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
- **Chưa làm:** dạng câu nối/ghép cặp trong bài **Toán** (đã có trong khu tiếng Anh), trò chơi “Buddy Challenge”.
- **Tiếng Anh – phát âm:** dùng giọng có sẵn của thiết bị. Nếu máy không có giọng tiếng Anh, Buddy không đọc được; ứng dụng báo rõ và hiện chữ của từ để con đọc cùng thầy cô. Chưa có tệp âm thanh ghi sẵn. **Không có** chức năng chấm phát âm.
- **Tiếng Anh – nội dung:** 37 từ, 75 câu do nhóm phát triển soạn, **chưa được giáo viên tiếng Anh tiểu học rà soát**, chưa đối chiếu chương trình tiếng Anh lớp 1. Hình minh họa vẽ bằng biểu tượng/SVG; một số từ trừu tượng (*subtract*, *take away*, *greater*) khó vẽ thành hình riêng, nên chỉ được ghép với nghĩa tiếng Việt và không đặt cạnh từ gần nghĩa trong câu chọn theo hình.
- **Tiếng Anh – mức nhận biết từ** là quy tắc đơn giản trên vài lần gặp, chỉ để định hướng ôn tập, không phải đánh giá năng lực tiếng Anh.
- **Đọc to** dùng giọng có sẵn của trình duyệt. Chất lượng giọng tiếng Việt và tiếng Anh tùy thiết bị, một số máy có thể không có giọng tiếng Việt.
- **Lời Buddy tiếng Anh** và nghĩa tiếng Việt đi kèm do nhóm phát triển soạn, chưa được giáo viên tiếng Anh tiểu học rà soát.
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

`npm test`: 66 bài kiểm thử, gồm:
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
- **Tiếng Anh – nội dung** (`test/english.test.ts`):
  - đủ các nhóm từ yêu cầu, mỗi chủ đề 3–5 từ, 8–10 câu, ít nhất 4 dạng bài và có bài nghe; mỗi từ được luyện ít nhất 2 lần;
  - đáp án nằm trong phương án, hình khớp từ, câu ghép đúng 1–1 và không xếp thẳng hàng;
  - không đặt hai từ gần nghĩa (add/plus, minus/subtract/take away, more/greater…) làm phương án của nhau ở câu theo hình;
  - phần tiếng Anh không lẫn tiếng Việt, luôn có nghĩa tiếng Việt riêng; lời Buddy ngắn (≤ 8 từ);
  - bài Toán không còn câu tiếng Anh xen vào.
- **Tiếng Anh – học và chấm:**
  - làm quen từ → luyện tập → kết quả; mở lại giữa chừng vẫn nhớ từ đã xem, phương án đã gạch, cặp đã nối đúng;
  - câu không hợp lệ không tính lượt; tối đa 3 lần; lời Buddy không trái kết quả chấm ở mọi câu của mọi chủ đề;
  - câu ghép chấm từng cặp và ghi từng từ;
  - mức nhận biết từ (nhận biết tốt / cần ôn / đang làm quen) giống nhau ở trang kết quả và Góc giáo viên;
  - **kết quả Toán và tiếng Anh lưu riêng: làm sai hết một chủ đề tiếng Anh không đổi điểm Toán**;
  - Góc giáo viên: tiến độ, từ tốt / cần luyện, nghe – nhận diện – mẫu câu, gợi ý chỉ chọn chủ đề có sẵn, CSV riêng;
  - trò chơi từ vựng chỉ mở khi đã học từ và chỉ dùng từ đã học;
  - học thử không vào báo cáo; xóa bạn thì xóa cả kết quả tiếng Anh; dữ liệu bản cũ vẫn mở được.

**Đã chạy thử trên trình duyệt** (Chromium trong ứng dụng Claude, Windows, giọng Microsoft Zira – English US), ở khổ máy tính, máy tính bảng (768×1024) và điện thoại (375×812): vào học, chuyển hai khu, học thẻ từ và nghe đọc, các dạng câu (chọn theo hình, nghe – chọn hình, nghe – chọn từ, ghép từ có chấm từng cặp), sai rồi thử lại, mở lại giữa chừng, trang kết quả, Báo cáo tiếng Anh, và một bài Toán đến lần sai thứ 4 (có ô “Cùng hiểu bài”). Không có lỗi trong console. Chưa thử trên điện thoại / máy tính bảng thật.
