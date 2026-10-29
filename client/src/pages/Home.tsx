// Trang đầu: ảnh banner Math Buddy AI phủ toàn màn hình, nút Vào lớp học / Học thử đặt nổi phía dưới.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, session } from '../api';
import { speak, useSound } from '../speech';
import type { LessonCard } from '../types';

type Me = { mode: 'class' | 'trial'; nickname?: string; className?: string };
const BANNER = '/assets/home-banner.webp';

export default function Home() {
  const nav = useNavigate();
  const [soundOn, toggleSound] = useSound();
  const [me, setMe] = useState<Me | null>(null);
  const [lessons, setLessons] = useState<LessonCard[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session.get('learner')) return;
    api<Me>('/learner/me', { as: 'learner' })
      .then(async (m) => {
        setMe(m);
        if (m.mode === 'class') setLessons((await api<{ lessons: LessonCard[] }>('/learner/lessons', { as: 'learner' })).lessons);
      })
      .catch(() => setMe(null));
  }, []);

  const startTrial = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string }>('/trial/start', { method: 'POST' });
      session.set('learner', r.token);
      nav('/hoc');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api('/learner/logout', { method: 'POST', as: 'learner' }).catch(() => undefined);
    session.clear('learner');
    setMe(null);
    setLessons(null);
  };

  const current = lessons?.find((l) => l.status === 'in_progress') ?? lessons?.find((l) => l.status === 'new' && l.domain === 'math');
  const greeting = me?.mode === 'class' ? `Chào ${me.nickname}!` : 'Xin chào! Mình là Buddy.';

  return (
    <div className="splash">
      <img className="splash-blur" src={BANNER} alt="" aria-hidden />
      <img
        className="splash-img"
        src={BANNER}
        alt="Math Buddy AI – Bé vui học Toán song ngữ. Mỗi ngày một khám phá: học Toán bằng tiếng Việt, làm quen tiếng Anh, vui học mỗi ngày. Cùng Buddy khám phá thế giới Toán học!"
        width={1774}
        height={887}
        fetchPriority="high"
      />

      <div className="splash-top">
        <button className="icon-btn" onClick={toggleSound} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}>
          <span className="emoji">{soundOn ? '🔊' : '🔇'}</span>
        </button>
      </div>

      <main className="splash-panel">
        <h1 className="splash-greet" style={{ margin: 0 }}>
          <button className="splash-hello" onClick={() => speak(`${greeting} Cùng học Toán vui nhé!`, 'vi-VN', true)} title="Nghe Buddy chào">
            <span className="emoji" aria-hidden>
              👋
            </span>
            {greeting}
            {me?.mode === 'class' && <small>🏫 {me.className}</small>}
          </button>
        </h1>

        {me?.mode === 'class' ? (
          <>
            <p className="splash-continue">
              {current?.status === 'in_progress' ? 'Con đang học dở bài: ' : 'Bài tiếp theo: '}
              <b>{current?.title ?? 'Xem các bài của con'}</b>
            </p>
            <div className="splash-buttons three">
              <Link className="btn big green wide" to={current?.inProgressAttemptId ? `/lam-bai/${current.inProgressAttemptId}` : '/hoc'}>
                <span>{current?.status === 'in_progress' ? 'Học tiếp ▶' : 'Vào học ▶'}</span>
              </Link>
              <Link className="btn white" to="/hoc">
                📚 Tất cả bài
              </Link>
              <button className="btn white" onClick={logout}>
                👋 Đổi bạn khác
              </button>
            </div>
          </>
        ) : (
          <div className="splash-buttons">
            <Link className="btn big" to="/vao-lop">
              <span>
                <span className="emoji">🏫</span> Vào lớp học
              </span>
              <small>Nhập mã thầy cô đưa</small>
            </Link>
            <button className="btn big yellow" onClick={startTrial} disabled={busy}>
              <span>
                <span className="emoji">⭐</span> {busy ? 'Đang mở…' : 'Học thử'}
              </span>
              <small>Chưa có lớp vẫn học được</small>
            </button>
            {me?.mode === 'trial' && (
              <Link className="btn white wide" to="/hoc">
                Tiếp tục học thử ▶
              </Link>
            )}
          </div>
        )}

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <nav className="splash-links" aria-label="Liên kết khác">
          <Link to="/giao-vien">👩‍🏫 Góc giáo viên</Link>
          <Link to="/rieng-tu">🔒 Dành cho phụ huynh & nhà trường</Link>
        </nav>
      </main>
    </div>
  );
}
