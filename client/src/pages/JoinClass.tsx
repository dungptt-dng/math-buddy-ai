import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, session } from '../api';
import { BUDDY_IMG, KidLayout } from '../components/Kid';

export default function JoinClass() {
  const nav = useNavigate();
  const [classCode, setClassCode] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!classCode.trim() || !studentCode.trim()) {
      setError('Con hãy nhập đủ Mã lớp và Mã học sinh nhé.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string }>('/student/login', { body: { classCode, studentCode } });
      session.set('learner', r.token);
      nav('/hoc');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KidLayout>
      <div className="join">
        <img className="buddy-head" src={BUDDY_IMG} alt="" />
        <form className="card" onSubmit={submit} noValidate>
          <h1>Vào lớp học</h1>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--muted)' }}>Nhập hai mã thầy cô đã đưa cho con nhé.</p>
          <div className="field">
            <label htmlFor="classCode">🏫 Mã lớp</label>
            <input
              id="classCode"
              className="code-input"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              placeholder="VD: DEMO1A"
            />
          </div>
          <div className="field">
            <label htmlFor="studentCode">🧒 Mã học sinh</label>
            <input
              id="studentCode"
              className="code-input"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              placeholder="VD: MEO234"
            />
            <div className="help">Không cần email, số điện thoại hay mật khẩu.</div>
          </div>
          {error && (
            <div className="notice error" role="alert">
              <span className="emoji">🤔</span>
              <span>{error}</span>
            </div>
          )}
          <button className="btn big green block" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? 'Buddy đang kiểm tra…' : 'Vào lớp ▶'}
          </button>
          <p style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 700, marginBottom: 0 }}>
            Quên mã? Con hãy hỏi thầy cô để được cấp lại nhé.
          </p>
        </form>
        <p style={{ marginTop: 18 }}>
          <Link className="btn white" to="/">
            ◀ Quay lại
          </Link>
        </p>
      </div>
    </KidLayout>
  );
}
