// Khung giao diện chung cho học sinh: bầu trời, Buddy, thanh trên cùng, trạng thái tải / lỗi.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useSound } from '../speech';

export const BUDDY_IMG = 'assets/buddy.webp';

export function KidLayout({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const [soundOn, toggle] = useSound();
  return (
    <div className="kid">
      <div className="cloud" style={{ top: 70, animationDuration: '70s', animationDelay: '-20s' }} />
      <div className="cloud" style={{ top: 190, transform: 'scale(0.7)', animationDuration: '90s', animationDelay: '-60s' }} />
      <div className="cloud" style={{ top: 330, animationDuration: '110s', animationDelay: '-5s', opacity: 0.6 }} />
      <main className="kid-main">
        <header className="topbar">
          <Link to="/" className="brand" aria-label="Về trang chủ Math Buddy AI">
            <img src={BUDDY_IMG} alt="" />
            <span>
              Math Buddy AI
              <small>Bé vui học Toán song ngữ</small>
            </span>
          </Link>
          <div className="spacer" />
          {right}
          <button className="icon-btn" onClick={toggle} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}>
            <span className="emoji">{soundOn ? '🔊' : '🔇'}</span>
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}

export function Loading({ text = 'Buddy đang chuẩn bị' }: { text?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <img src={BUDDY_IMG} alt="" />
      <div>
        {text}
        <span className="dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </div>
    </div>
  );
}

export function KidError({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div className="card error-card" role="alert">
      <img src={BUDDY_IMG} alt="" />
      <h2 style={{ margin: '8px 0', color: 'var(--blue-ink)' }}>Ôi, có chút trục trặc!</h2>
      <p style={{ fontWeight: 700 }}>{message}</p>
      <div className="actions-row">
        {onRetry && (
          <button className="btn" onClick={onRetry}>
            Thử lại
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ['#58B9F7', '#FFE083', '#FFAE8B', '#83DDB4', '#C9B6F5', '#FF8FB1'];
export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${2.2 + ((i * 13) % 20) / 10}s`,
            animationDelay: `${((i * 7) % 15) / 10}s`,
          }}
        />
      ))}
    </div>
  );
}
