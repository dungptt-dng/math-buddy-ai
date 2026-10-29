// Khung Góc giáo viên – tách biệt hoàn toàn với giao diện trẻ em.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { api, session } from '../../api';
import { BUDDY_IMG } from '../../components/Kid';

export type TeacherUser = { id: number; name: string; email: string; role: 'teacher' | 'admin' };
type Ctx = { user: TeacherUser; aiSummaryEnabled: boolean };
const TeacherCtx = createContext<Ctx | null>(null);
export const useTeacher = () => useContext(TeacherCtx)!;

export default function TeacherLayout() {
  const nav = useNavigate();
  const [ctx, setCtx] = useState<Ctx | null>(null);

  useEffect(() => {
    if (!session.get('teacher')) {
      nav('/giao-vien/dang-nhap', { replace: true });
      return;
    }
    api<Ctx>('/teacher/me', { as: 'teacher' })
      .then(setCtx)
      .catch(() => nav('/giao-vien/dang-nhap', { replace: true }));
  }, [nav]);

  const logout = async () => {
    await api('/teacher/logout', { method: 'POST', as: 'teacher' }).catch(() => undefined);
    session.clear('teacher');
    nav('/giao-vien/dang-nhap');
  };

  if (!ctx) return <TeacherShell>{<p className="t-sub">Đang tải…</p>}</TeacherShell>;
  return (
    <TeacherCtx.Provider value={ctx}>
      <TeacherShell
        nav={
          <>
            <nav className="t-nav" aria-label="Góc giáo viên">
              <NavLink to="/giao-vien" end>
                Lớp học
              </NavLink>
              <NavLink to="/giao-vien/ngan-hang">Ngân hàng bài</NavLink>
            </nav>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              {ctx.user.name}
              {ctx.user.role === 'admin' && ' · Quản trị nội dung'}
            </span>
            <button className="t-btn secondary small" onClick={logout}>
              Đăng xuất
            </button>
          </>
        }
      >
        <Outlet />
      </TeacherShell>
    </TeacherCtx.Provider>
  );
}

export function TeacherShell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="teacher">
      <header className="t-header">
        <div className="t-header-inner">
          <Link to="/giao-vien" className="brand">
            <img src={BUDDY_IMG} alt="" />
            <span>
              Math Buddy AI
              <small>Góc giáo viên</small>
            </span>
          </Link>
          {nav}
        </div>
      </header>
      <main className="t-main">{children}</main>
    </div>
  );
}

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
export const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};
export const LABEL_TEXT = {
  mastered: 'Đã vững',
  developing: 'Đang tiến bộ',
  needs_practice: 'Cần ôn thêm',
  insufficient: 'Chưa đủ dữ liệu',
} as const;
export const STATUS_TEXT = { draft: 'Bản nháp', review: 'Cần kiểm tra', approved: 'Đã duyệt' } as const;
