// Trang đầu: ảnh banner Math Buddy AI phủ toàn màn hình, nút Vào học / Học thử đặt nổi phía dưới.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as engine from '../engine';
import { speak, useSound } from '../speech';
import { startMusic, stopMusic } from '../music';

const BANNER = 'assets/home-banner.webp';

export default function Home() {
  const nav = useNavigate();
  const [soundOn, toggleSound] = useSound();
  const [me, setMe] = useState(engine.me);
  const [lessons] = useState(() => (me?.mode === 'profile' ? engine.listLessons() : null));
  const [error, setError] = useState('');

  // Nhạc nền vui tươi chỉ ở trang đầu: tắt theo nút loa, nhỏ dần khi bé rời trang.
  useEffect(() => {
    if (!soundOn) return;
    startMusic();
    return stopMusic;
  }, [soundOn]);

  const startTrial = () => {
    setError('');
    try {
      engine.startTrial();
      nav('/hoc');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const switchLearner = () => {
    engine.signOut();
    setMe(null);
    nav('/chon-ban');
  };

  const current = lessons?.find((l) => l.status === 'in_progress') ?? lessons?.find((l) => l.status === 'new' && l.domain === 'math');
  const greeting = me?.mode === 'profile' ? `Chào ${me.profile.nickname}!` : 'Xin chào! Mình là Buddy.';

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
            {me?.mode === 'profile' && (
              <small className="emoji" aria-hidden>
                {me.profile.avatar}
              </small>
            )}
          </button>
        </h1>

        {me?.mode === 'profile' ? (
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
              <button className="btn white" onClick={switchLearner}>
                👋 Đổi bạn khác
              </button>
            </div>
          </>
        ) : (
          <div className="splash-buttons">
            <Link className="btn big" to="/chon-ban">
              <span>
                <span className="emoji">🎒</span> Vào học
              </span>
              <small>Chọn tên của con</small>
            </Link>
            <button className="btn big yellow" onClick={startTrial}>
              <span>
                <span className="emoji">⭐</span> Học thử
              </span>
              <small>Không lưu kết quả</small>
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
          <Link to="/phu-huynh">👨‍👩‍👧 Góc phụ huynh & thầy cô</Link>
          <Link to="/rieng-tu">🔒 Quyền riêng tư</Link>
        </nav>
      </main>
    </div>
  );
}
