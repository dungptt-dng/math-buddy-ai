import { Link } from 'react-router';
import { KidLayout } from '../components/Kid';

export default function Privacy() {
  return (
    <KidLayout>
      <article className="card prose" style={{ fontSize: 17 }}>
        <h1>Thông tin cho phụ huynh và nhà trường</h1>
        <p>
          Math Buddy AI giúp học sinh lớp 1 ôn luyện Toán và làm quen một số từ vựng Toán bằng tiếng Anh. Ứng dụng là một trang web tĩnh, chạy hoàn
          toàn trong trình duyệt: <b>không có máy chủ, không có tài khoản, không gửi dữ liệu học tập lên mạng</b>.
        </p>
        <h2>Dữ liệu được lưu</h2>
        <ul>
          <li>
            <b>Tên gọi, tên lớp và con vật đại diện</b> mà trẻ nhập ở trang đầu. Nên dùng tên gọi hoặc biệt danh, không cần họ tên đầy đủ. Ứng dụng
            không hỏi email, số điện thoại, mật khẩu, ảnh hay giọng nói.
          </li>
          <li>
            Tên và lớp chỉ để Buddy chào và tách riêng kết quả từng bạn, <b>không phải mật khẩu</b>. Muốn xem lại kết quả đã lưu, trẻ phải chạm đúng
            con vật đã chọn lần đầu – đây là cách nhận ra nhẹ nhàng cho trẻ nhỏ, không phải bảo mật thật sự.
          </li>
          <li>
            Bấm <b>Kết thúc phiên học</b> khi học xong để bạn sau dùng chung máy không thấy tên của con. Máy chỉ nhớ tên lớp để điền sẵn.
          </li>
          <li>
            <b>Kết quả luyện tập:</b> câu đúng/sai, số lần thử, số gợi ý đã xem và thời điểm làm bài – để trẻ và người lớn xem lại tiến bộ.
          </li>
          <li>
            Tất cả nằm trong bộ nhớ của trình duyệt trên <b>thiết bị này</b>. Thiết bị khác không xem được, và người có quyền dùng thiết bị này đều mở
            được Góc phụ huynh & thầy cô.
          </li>
        </ul>
        <h2>Chế độ học thử</h2>
        <p>Kết quả học thử không gắn với bạn nào, không hiện trong Góc phụ huynh & thầy cô và tự xóa khi bắt đầu lượt học thử mới hoặc sau 7 ngày.</p>
        <h2>Về trí tuệ nhân tạo (AI)</h2>
        <ul>
          <li>Ứng dụng không có chatbot trò chuyện tự do với trẻ và không gọi dịch vụ AI nào.</li>
          <li>Đáp án được chấm bằng đáp án chuẩn đã soạn sẵn, không do AI quyết định.</li>
          <li>Phần nhận xét kỹ năng được tính từ kết quả làm bài thực tế, và chỉ đưa ra khi có đủ dữ liệu.</li>
        </ul>
        <h2>Xóa dữ liệu</h2>
        <ul>
          <li>Trong Góc phụ huynh & thầy cô có nút xóa từng bạn hoặc xóa toàn bộ dữ liệu trên thiết bị.</li>
          <li>Xóa dữ liệu duyệt web của trình duyệt cũng xóa toàn bộ kết quả. Hãy tải tệp CSV trước nếu muốn giữ lại.</li>
        </ul>
        <p className="notice info">
          Đây là bản thử nghiệm. Việc tuân thủ đầy đủ các quy định hiện hành về bảo vệ dữ liệu cá nhân và dữ liệu trẻ em tại Việt Nam cần được nhà
          trường đánh giá trước khi sử dụng chính thức.
        </p>
        <Link className="btn" to="/">
          ◀ Về trang chủ
        </Link>
      </article>
    </KidLayout>
  );
}
