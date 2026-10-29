import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, session } from '../../api';
import { TeacherShell } from './TeacherLayout';

export default function TeacherLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string }>('/teacher/login', { body: { email, password } });
      session.set('teacher', r.token);
      nav('/giao-vien');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TeacherShell>
      <form className="t-card t-login" onSubmit={submit}>
        <h1 className="t-title">Đăng nhập Góc giáo viên</h1>
        <p className="t-sub">Dành cho giáo viên và người quản lý nội dung.</p>
        <label className="t-label" htmlFor="email">
          Email
        </label>
        <input id="email" className="t-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="t-label" htmlFor="pw">
          Mật khẩu
        </label>
        <input id="pw" className="t-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && (
          <div className="t-error" role="alert">
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="t-btn" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
          <Link className="t-btn secondary" to="/">
            Về trang học sinh
          </Link>
        </div>
        <p className="t-note" style={{ marginTop: 16 }}>
          Phiên đăng nhập chỉ lưu trong tab trình duyệt này và tự hết hạn sau 12 giờ.
        </p>
      </form>
    </TeacherShell>
  );
}
