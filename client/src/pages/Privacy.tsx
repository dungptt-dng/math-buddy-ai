import { Link } from 'react-router';
import { KidLayout } from '../components/Kid';

export default function Privacy() {
  return (
    <KidLayout>
      <article className="card prose" style={{ fontSize: 17 }}>
        <h1>Thông tin cho phụ huynh và nhà trường</h1>
        <p>
          Math Buddy AI giúp học sinh lớp 1 ôn luyện Toán và làm quen một số từ vựng Toán bằng tiếng Anh. Trang này mô tả dữ liệu ứng dụng thu thập và
          cách bảo vệ dữ liệu của trẻ.
        </p>
        <h2>Dữ liệu được thu thập</h2>
        <ul>
          <li>
            <b>Học sinh:</b> chỉ có <b>tên gọi do giáo viên đặt</b> (có thể là biệt danh), mã lớp và mã học sinh. Ứng dụng không yêu cầu email, số
            điện thoại, ảnh, giọng nói hay họ tên đầy đủ.
          </li>
          <li>
            <b>Kết quả học tập:</b> câu trả lời, số lần thử, số gợi ý đã xem và thời điểm làm bài – để giáo viên theo dõi tiến bộ.
          </li>
          <li>
            <b>Giáo viên:</b> họ tên, email và mật khẩu (được lưu dưới dạng mã hóa một chiều).
          </li>
        </ul>
        <h2>Ai được xem dữ liệu</h2>
        <ul>
          <li>Học sinh chỉ xem được kết quả của chính mình.</li>
          <li>Giáo viên chỉ xem được học sinh thuộc lớp mình quản lý. Quyền truy cập được kiểm tra trên máy chủ ở mỗi yêu cầu.</li>
          <li>Danh sách học sinh và kết quả học tập không được công khai.</li>
        </ul>
        <h2>Chế độ học thử</h2>
        <p>Kết quả học thử không gắn với lớp nào, không vào báo cáo của giáo viên và tự động bị xóa sau 7 ngày.</p>
        <h2>Về trí tuệ nhân tạo (AI)</h2>
        <ul>
          <li>Ứng dụng không có chatbot trò chuyện tự do với trẻ.</li>
          <li>Đáp án được chấm bằng đáp án chuẩn đã lưu sẵn, không do AI quyết định.</li>
          <li>
            Phần phân tích cho giáo viên được tính từ kết quả làm bài thực tế. Nếu nhà trường bật tính năng tóm tắt bằng AI của bên thứ ba, chỉ các số
            liệu tổng hợp được gửi đi; học sinh được thay bằng “Học sinh 1, 2…”, không gửi tên gọi, mã truy cập hay câu trả lời gốc.
          </li>
        </ul>
        <h2>Mất mã và xóa dữ liệu</h2>
        <ul>
          <li>Nếu con quên mã học sinh, giáo viên có thể cấp mã mới; mã cũ lập tức hết hiệu lực.</li>
          <li>Phụ huynh có thể đề nghị giáo viên/nhà trường xóa dữ liệu của con. Khi giáo viên xóa học sinh, toàn bộ kết quả học tập của học sinh đó bị xóa.</li>
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
