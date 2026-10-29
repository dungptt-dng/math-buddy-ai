import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles.css';
import Home from './pages/Home';
import JoinClass from './pages/JoinClass';
import Lessons from './pages/Lessons';
import Practice from './pages/Practice';
import Result from './pages/Result';
import Privacy from './pages/Privacy';
import TeacherLayout from './pages/teacher/TeacherLayout';
import TeacherLogin from './pages/teacher/Login';
import Classes from './pages/teacher/Classes';
import ClassDetail from './pages/teacher/ClassDetail';
import StudentDetail from './pages/teacher/StudentDetail';
import LessonBank from './pages/teacher/LessonBank';
import { KidError, KidLayout } from './components/Kid';
import { Link } from 'react-router';

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vao-lop" element={<JoinClass />} />
        <Route path="/hoc" element={<Lessons />} />
        <Route path="/lam-bai/:id" element={<Practice />} />
        <Route path="/ket-qua/:id" element={<Result />} />
        <Route path="/rieng-tu" element={<Privacy />} />
        <Route path="/giao-vien/dang-nhap" element={<TeacherLogin />} />
        <Route path="/giao-vien" element={<TeacherLayout />}>
          <Route index element={<Classes />} />
          <Route path="lop/:id" element={<ClassDetail />} />
          <Route path="hoc-sinh/:id" element={<StudentDetail />} />
          <Route path="ngan-hang" element={<LessonBank />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
