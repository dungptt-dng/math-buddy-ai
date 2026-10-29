import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../api';
import { fmtDate } from './TeacherLayout';

type ClassRow = { id: number; name: string; class_code: string; created_at: string; student_count: number; lesson_count: number };

export default function Classes() {
  const nav = useNavigate();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<{ classes: ClassRow[] }>('/teacher/classes', { as: 'teacher' })
      .then((r) => setClasses(r.classes))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api<{ id: number }>('/teacher/classes', { body: { name }, as: 'teacher' });
      nav(`/giao-vien/lop/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <h1 className="t-title">Lớp học của tôi</h1>
      <p className="t-sub">Tạo lớp, cấp mã cho học sinh và theo dõi kết quả ôn luyện.</p>
      {error && <div className="t-error">{error}</div>}
      <form className="t-card" onSubmit={create}>
        <h2>Tạo lớp mới</h2>
        <div className="t-row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="t-label" htmlFor="cname">
              Tên lớp
            </label>
            <input id="cname" className="t-input" placeholder="VD: Lớp 1B" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </div>
          <button className="t-btn">+ Tạo lớp</button>
        </div>
        <p className="t-note">Mã lớp được tạo tự động. Lớp mới được giao sẵn các bài đã duyệt; thầy/cô có thể bỏ bớt trong mục “Bài được giao”.</p>
      </form>
      {!classes ? (
        <p>Đang tải…</p>
      ) : classes.length === 0 ? (
        <p className="t-sub">Chưa có lớp nào.</p>
      ) : (
        <div className="t-grid">
          {classes.map((c) => (
            <Link key={c.id} to={`/giao-vien/lop/${c.id}`} className="t-card t-class">
              <h3>{c.name}</h3>
              <div>
                Mã lớp: <span className="code-badge">{c.class_code}</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
                {c.student_count} học sinh · {c.lesson_count} bài được giao · tạo {fmtDate(c.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
