# Math Buddy AI – Bé vui học Toán song ngữ

Web app học Toán song ngữ (Việt – Anh) cho học sinh lớp 1, kèm Góc giáo viên.
React + Vite + TypeScript + Tailwind CSS, máy chủ API Node.js gắn sẵn vào Vite.

## Chạy ứng dụng

Cần Node.js 18 trở lên (đã cài Node.js 24 LTS trên máy này).

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:5173. Lệnh `npm run dev` chạy **cả giao diện lẫn API** (`/api/*`).

Bản chạy thật cho lớp học:

```bash
npm run build
```

```bash
npm run start
```

→ http://localhost:8787 (đổi cổng bằng `PORT` trong `.env`).

## Bản trực tuyến (GitHub Pages)

Mỗi lần push lên nhánh `main`, GitHub Actions (`.github/workflows/pages.yml`) tự build và đưa app lên
GitHub Pages ở **chế độ tĩnh** (`VITE_STATIC=true`), vì Pages không chạy được máy chủ:

- 4 trò chơi, phần thưởng, đọc to, trang Tiến độ: hoạt động đầy đủ.
- Kết quả lưu trên trình duyệt của từng máy, không gửi đi đâu.
- Thử thách thông minh dùng NGÂN HÀNG CÓ SẴN.
- Góc giáo viên hiện hướng dẫn chạy bản đầy đủ (gói zip hoặc `npm run dev`).

Build thử bản Pages trên máy: `BASE_PATH=/math-buddy-ai/ VITE_STATIC=true npm run build:pages`.

## Cấu hình (.env)

Sao chép `.env.example` thành `.env`:

| Biến | Ý nghĩa |
| --- | --- |
| `TEACHER_PASSWORD` | Mật khẩu Góc giáo viên, kiểm tra **ở máy chủ**. Nếu chưa đặt, máy chủ dùng mật khẩu mặc định `doi-mat-khau-nay` và Góc giáo viên hiện cảnh báo. |
| `ANTHROPIC_API_KEY` | Khóa API Claude để giáo viên sinh câu hỏi nháp. Để trống ⇒ chế độ **NGÂN HÀNG CÓ SẴN**. |
| `AI_MODEL` | Mô hình AI, mặc định `claude-opus-5-5`. |

API key chỉ nằm ở máy chủ (`server/api.mjs`), không bao giờ gửi xuống trình duyệt.
Khởi động lại `npm run dev` sau khi sửa `.env`.

## Hình ảnh

| File | Nguồn |
| --- | --- |
| `public/images/math-buddy-banner.jpg` | Banner chính thức (ảnh gốc 1774×887, giữ nguyên, không cắt, không phủ chữ). |
| `public/images/buddy-ai.png` | Nhân vật Buddy AI chính thức – ảnh gốc được tách nền trắng thành nền trong suốt, giữ nguyên 100% hình nhân vật. |

Mọi nơi hiển thị Buddy đều đi qua `src/components/BuddyMascot.tsx` (một ảnh duy nhất, chỉ đổi kích thước
và hiệu ứng CSS theo biểu cảm). Nếu thiếu file ảnh, giao diện hiện thông báo rõ tên file và thư mục cần bổ sung.

## Cấu trúc

```
public/images/            banner + Buddy
server/api.mjs            API: kết quả học tập, câu hỏi, đăng nhập giáo viên, gọi AI, xuất CSV
server/index.mjs          máy chủ chạy bản build (npm run start)
server/data/db.json       dữ liệu lớp học (tự tạo khi chạy)
shared/validateQuestion.js  bộ kiểm chứng dùng chung trình duyệt + máy chủ
src/components/           BuddyMascot, HeroBanner, GameCard, QuestionPanel, AnswerButton,
                          ProgressPath, RewardPanel, GameScreen, QuestionEditor, …
src/pages/                HomePage, MagicNumbersPage, MathGardenPage, ShapeHuntPage,
                          BuddyChallengePage, ProgressPage, TeacherDashboard
src/data/                 lessons.json, questionBank.json
src/services/             storage.ts (lưu + đồng bộ), aiService.ts (gọi API), speech.ts (đọc to)
src/utils/                validateQuestion.ts, generators.ts
```

## Chức năng đã triển khai

**Học sinh**
- **Màn hình mở đầu** (`src/components/IntroScreen.tsx`): chính là banner chính thức, hiển thị nguyên ảnh, đúng tỷ lệ, không cắt,
  trên nền là bản phóng mờ của banner. Các vùng chạm trong suốt nằm đúng trên từng hình (Buddy, mặt trời, ngôi sao, số 1–2–3,
  hình khối, quả táo, sách, 3 thẻ tính năng, bảng gỗ, trường học): chạm để nghe âm thanh và giọng đọc Việt – Anh.
  Bấm “Bắt đầu” phát nhạc chào, pháo giấy và Buddy nói lời chào. Hiện một lần mỗi phiên khi mở trang chủ,
  xem lại bằng link “Màn hình chào” ở chân trang.
- Âm thanh (`src/services/sound.ts`) được tổng hợp bằng Web Audio API, không cần file nhạc: nhạc chào, tiếng đúng/sai nhẹ nhàng,
  nhạc nhận thưởng. Nút **Âm thanh** trên thanh đầu trang bật/tắt toàn bộ âm thanh và giọng đọc.
- Trang chủ theo banner: thanh đầu trang, banner gốc, khu chào đón 2 cột (mã học sinh `HS-012`, Bắt đầu học, Xem tiến độ, Hướng dẫn chơi), thẻ Buddy có nút nghe lời chào, 4 thẻ hoạt động, chân trang.
- **Bé đếm cùng Buddy** – đếm 1–10 đồ vật, 3 phương án; sai thì Buddy hướng dẫn chạm vào từng đồ vật để đếm lại; đúng thì Buddy khen và dạy số đếm tiếng Anh.
- **Khu vườn phép tính** – cộng/trừ trong phạm vi 10 có minh họa đồ vật, đáp án do chương trình tính.
- **Thợ săn hình học** – hình vuông, tròn, tam giác, chữ nhật (xem hình chọn tên / đọc tên chọn hình) + từ tiếng Anh.
- **Thử thách thông minh** – 5 câu khởi động + 3–5 câu luyện thêm từ câu hỏi giáo viên đã duyệt theo chủ đề đang bật; không đủ thì dùng bài cơ bản trong ngân hàng. Không bấm giờ, không bảng xếp hạng.
- Phần thưởng: Buddy khen, 1–3 sao, huy hiệu, nút “Chơi tiếp” / “Về trang chủ”.
- Đọc to câu hỏi và lời Buddy (Web Speech API, nếu trình duyệt hỗ trợ).
- Trang **Tiến độ học tập**: số câu, sao, huy hiệu, từ tiếng Anh đã làm quen.
- Kết quả lưu ở trình duyệt và tự đồng bộ lên máy chủ (gửi lại khi có mạng).

**Giáo viên** (`/giao-vien`, đăng nhập bằng mật khẩu kiểm tra ở máy chủ, phiên 8 giờ, khóa 5 phút sau 5 lần sai)
- Tổng quan lượt học, độ chính xác, số lần cần gợi ý, trạng thái AI.
- Quản lý bài học: bật/tắt chủ đề dùng cho Thử thách thông minh.
- Tạo câu hỏi bằng AI (bản nháp), tự soạn câu hỏi, duyệt / sửa / từ chối / xóa.
- Theo dõi riêng **năng lực Toán** (đúng ngay lần đầu) và **mức làm quen tiếng Anh** (số từ, số lần nghe lại) cho từng mã học sinh.
- Xuất CSV (mở bằng Excel), tạo/xóa dữ liệu demo, xóa dữ liệu theo học sinh hoặc toàn bộ.

## AI và kiểm chứng

- Nhãn rõ ràng: `AI THẬT`, `NGÂN HÀNG CÓ SẴN`, `DỮ LIỆU THẬT`, `DỮ LIỆU DEMO`.
- AI chỉ nhận tên chủ đề – không nhận tên, ảnh hay giọng nói học sinh.
- Câu hỏi AI tạo: kiểm tra schema, phạm vi 0–10, tổng ≤ 10, hiệu ≥ 0, phương án hợp lệ; **đáp án luôn do chương trình tự tính**,
  câu nào AI đề xuất đáp án sai bị loại và báo lý do. Câu hợp lệ lưu ở trạng thái nháp.
- Chỉ câu đã được giáo viên duyệt mới đến tay học sinh; trình duyệt kiểm chứng lại lần nữa trước khi hiển thị.
- Sửa câu đã duyệt sẽ đưa câu về trạng thái nháp để duyệt lại.
- Gọi AI dùng `@anthropic-ai/sdk`, mô hình `claude-opus-5-5`, có bật cơ chế dự phòng phía máy chủ
  (`fallbacks: "default"`) để nếu mô hình chính từ chối thì mô hình khác xử lý tiếp.

## Trạng thái và giới hạn

| Hạng mục | Trạng thái |
| --- | --- |
| Giao diện, 4 trò chơi, phần thưởng, tiến độ | Hoạt động thật |
| Lưu và đồng bộ kết quả | Hoạt động thật (file JSON trên máy chủ) |
| Góc giáo viên, duyệt câu hỏi, CSV | Hoạt động thật |
| Kết nối AI | **Chưa cấu hình** – cần `ANTHROPIC_API_KEY`; khi chưa có, app dùng NGÂN HÀNG CÓ SẴN |
| Đăng nhập giáo viên | Một mật khẩu chung cho cả lớp; chưa có tài khoản riêng từng giáo viên |
| Lưu trữ | File JSON, phù hợp một lớp/một máy chủ; quy mô lớn nên chuyển sang cơ sở dữ liệu |
| Giọng đọc | Phụ thuộc giọng tiếng Việt/tiếng Anh có sẵn trên trình duyệt/hệ điều hành |
| Tên chủ đề | Mô tả theo định hướng SGK Toán 1 – Kết nối tri thức, không phải tên/số bài chính thức |
