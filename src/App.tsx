import { Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BuddyMascot from './components/BuddyMascot'
import HomePage from './pages/HomePage'
import MagicNumbersPage from './pages/MagicNumbersPage'
import MathGardenPage from './pages/MathGardenPage'
import ShapeHuntPage from './pages/ShapeHuntPage'
import BuddyChallengePage from './pages/BuddyChallengePage'
import ProgressPage from './pages/ProgressPage'
import TeacherDashboard from './pages/TeacherDashboard'

function NotFound() {
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <BuddyMascot size="md" mood="think" message="Ôi, Buddy không tìm thấy trang này!" />
      <Link to="/" className="btn-primary">
        Về trang chủ
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="be-dem" element={<MagicNumbersPage />} />
        <Route path="khu-vuon" element={<MathGardenPage />} />
        <Route path="tho-san-hinh" element={<ShapeHuntPage />} />
        <Route path="thu-thach" element={<BuddyChallengePage />} />
        <Route path="tien-do" element={<ProgressPage />} />
        <Route path="giao-vien" element={<TeacherDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
