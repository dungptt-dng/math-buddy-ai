import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter: ứng dụng tĩnh (GitHub Pages) không có máy chủ để trả trang cho mọi đường dẫn, nên đường dẫn nằm sau dấu #.
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles.css';
import Home from './pages/Home';
import Lessons from './pages/Lessons';
import Practice from './pages/Practice';
import Result from './pages/Result';
import Parents from './pages/Parents';
import EnglishTopics from './pages/EnglishTopics';
import EnglishLesson from './pages/EnglishLesson';
import EnglishResult from './pages/EnglishResult';
import Privacy from './pages/Privacy';
import { KidError, KidLayout } from './components/Kid';

function NotFound() {
  return (
    <KidLayout>
      <KidError message="Không tìm thấy trang này.">
        <Link className="btn" to="/">
          Về trang chủ
        </Link>
      </KidError>
    </KidLayout>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Màn chọn tên cũ đã thay bằng ô nhập tên + lớp ở trang đầu; giữ đường dẫn cho liên kết đã lưu. */}
        <Route path="/chon-ban" element={<Navigate to="/" replace />} />
        <Route path="/hoc" element={<Lessons />} />
        <Route path="/lam-bai/:id" element={<Practice />} />
        <Route path="/ket-qua/:id" element={<Result />} />
        {/* Khu 2: Làm quen tiếng Anh – bài học, kết quả và tiến độ riêng. */}
        <Route path="/tieng-anh" element={<EnglishTopics />} />
        <Route path="/tieng-anh/hoc/:id" element={<EnglishLesson />} />
        <Route path="/tieng-anh/ket-qua/:id" element={<EnglishResult />} />
        <Route path="/phu-huynh" element={<Parents />} />
        <Route path="/rieng-tu" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
