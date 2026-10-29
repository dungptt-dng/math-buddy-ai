import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BUDDY_IMG, Confetti, KidError, KidLayout, Loading } from '../components/Kid';
import * as engine from '../engine';
import { sfx, speak, stopSpeaking, useSound } from '../speech';
import type { Result as R } from '../types';

// Phần thưởng trò chơi – lời Buddy nên bằng tiếng Anh.
const s = (n: number) => (n === 1 ? '' : 's');
const GAME_WORD: Record<string, { icon: string; text: (n: number) => string }> = {
  'magic-numbers': { icon: '⭐', text: (n) => `You lit ${n} star${s(n)}!` },
  'math-garden': { icon: '🌷', text: (n) => `You grew ${n} flower${s(n)}!` },
  'shape-hunt': { icon: '🏅', text: (n) => `You won ${n} badge${s(n)}!` },
};
/** Chờ tiếng nhạc chúc mừng (khoảng 0,7 giây) kết thúc rồi Buddy mới nói. */
const AFTER_WIN_MS = 800;

export default function Result() {
  const { id } = useParams();
  const nav = useNavigate();
  const [soundOn] = useSound();
  const [r, setR] = useState<R | null>(null);
  const [error, setError] = useState<engine.EngineError | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    try {
      setR(engine.result(Number(id)));
      sfx('win');
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, [id]);
  useEffect(load, [load]);

  const gameLine = r?.gameId ? GAME_WORD[r.gameId]?.text(r.mathCorrect) : undefined;
  const cheer = r ? [r.buddy, gameLine, r.praise].filter(Boolean).join(' ') : '';
  useEffect(() => {
    if (!cheer || !soundOn) return;
    const t = setTimeout(() => speak(cheer, 'en-US'), AFTER_WIN_MS);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [cheer, soundOn]);

  const again = (target: { lessonId: string } | { gameId: string }) => {
    setBusy(true);
    try {
      const a = engine.startAttempt(target);
      nav(`/lam-bai/${a.id}`);
    } catch (e) {
      setError(e as engine.EngineError);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <KidLayout>
        <KidError message={error.message} onRetry={load}>
          <Link className="btn white" to="/hoc">
            Chọn bài khác
          </Link>
        </KidError>
      </KidLayout>
    );
  }
  if (!r) {
    return (
      <KidLayout>
        <Loading text="Buddy đang tổng kết" />
      </KidLayout>
    );
  }

  const english = r.mathTotal === 0;
  const correct = english ? r.vocabCorrect : r.mathCorrect;
  const total = english ? r.vocabTotal : r.mathTotal;
  const ratio = total ? correct / total : 0;
  // Sao để khích lệ, luôn có ít nhất 1 sao vì con đã hoàn thành bài.
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
  const game = r.gameId ? GAME_WORD[r.gameId] : null;

  return (
    <KidLayout>
      {stars === 3 && <Confetti />}
      <div className="result">
        <img className="buddy-big" src={BUDDY_IMG} alt="Buddy chúc mừng con" />
        <div className="card">
          <div className="bubble" lang="en" style={{ margin: '0 auto 8px', justifySelf: 'center' }}>
            {r.buddy}
            <span className="lang" aria-hidden>
              EN
            </span>
          </div>
          <div className="stars" aria-label={`${stars} trên 3 ngôi sao`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`emoji${i < stars ? '' : ' off'}`} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
                ⭐
              </span>
            ))}
          </div>
          {game ? (
            <div className="score-big" lang="en">
              <span className="emoji">{game.icon}</span> {game.text(correct)}
            </div>
          ) : (
            <div className="score-big">
              {correct}/{total}
            </div>
          )}
          <div className="score-sub">{english ? 'câu từ vựng đúng ngay lần đầu' : 'câu Toán đúng ngay lần đầu'}</div>
          <p lang="en" style={{ fontSize: 21, fontWeight: 800, margin: '12px 0 0' }}>
            {r.praise}
          </p>

          <div className="score-pills">
            {!english && (
              <div className="pill math">
                <b>
                  {r.mathCorrect}/{r.mathTotal}
                </b>
                Toán
                {r.correctAfterRetry > 0 && <div style={{ fontSize: 14 }}>+ {r.correctAfterRetry} câu đúng khi thử lại</div>}
              </div>
            )}
            {r.vocabTotal > 0 && (
              <div className="pill eng">
                <b>
                  {r.vocabCorrect}/{r.vocabTotal}
                </b>
                Từ vựng tiếng Anh
              </div>
            )}
          </div>

          {r.goodSkills.length > 0 && (
            <>
              <div style={{ fontWeight: 900, marginTop: 8 }}>🌟 Con đã làm tốt:</div>
              <div className="skill-tags">
                {r.goodSkills.map((s) => (
                  <span className="skill-tag" key={s}>
                    ✓ {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {r.next && (
            <div className="next-card">
              <span className="emoji">🚀</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{r.next.reason}</div>
                <div style={{ fontWeight: 900, fontSize: 20 }}>{r.next.title}</div>
              </div>
              {r.next.lessonId !== r.lessonId && (
                <button className="btn" onClick={() => again({ lessonId: r.next!.lessonId })} disabled={busy}>
                  Học bài này
                </button>
              )}
            </div>
          )}

          {r.trialNotice && (
            <div className="notice trial" style={{ marginTop: 14 }}>
              <span className="emoji">ℹ️</span>
              <span>{r.trialNotice}</span>
            </div>
          )}

          <div className="actions-row">
            <button
              className="btn big orange"
              disabled={busy}
              onClick={() => again(r.lessonId ? { lessonId: r.lessonId } : { gameId: r.gameId! })}
            >
              ↺ {r.kind === 'game' ? 'Chơi lại' : 'Luyện lại'}
            </button>
            <Link className="btn big" to="/hoc">
              📚 Chọn bài khác
            </Link>
          </div>
        </div>
      </div>
    </KidLayout>
  );
}
