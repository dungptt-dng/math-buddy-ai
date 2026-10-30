// Kết quả một bài tiếng Anh: số câu đúng, từ đã nhận biết tốt, từ cần ôn lại, kết quả nghe / nhận diện / mẫu câu.
// Kết quả này tính riêng, không cộng vào điểm Toán.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EnPicture } from '../components/EnPicture';
import { BUDDY_IMG, Confetti, KidError, KidLayout, Loading } from '../components/Kid';
import * as engine from '../engine';
import { sfx, speak, stopSpeaking, useSound } from '../speech';
import type { EnResult, EnSkill, EnWordInfo } from '../types';

const SKILL_TEXT: Record<EnSkill, string> = { listening: 'Nghe', recognition: 'Nhận diện từ', sentence: 'Mẫu câu' };
const AFTER_WIN_MS = 800;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function EnglishResult() {
  const { id } = useParams();
  const nav = useNavigate();
  const [soundOn] = useSound();
  const [r, setR] = useState<EnResult | null>(null);
  const [error, setError] = useState<engine.EngineError | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    try {
      setR(engine.englishResult(Number(id)));
      sfx('win');
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, [id]);
  useEffect(load, [load]);

  const cheer = r ? `${r.buddy.en} ${r.praise.en}` : '';
  useEffect(() => {
    if (!cheer || !soundOn) return;
    const t = setTimeout(() => speak(cheer, 'en-US'), AFTER_WIN_MS);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [cheer, soundOn]);

  const again = (target: { topicId: string } | { gameId: string }) => {
    setBusy(true);
    try {
      const a = engine.startEnglish(target);
      nav(`/tieng-anh/hoc/${a.id}`);
    } catch (e) {
      setError(e as engine.EngineError);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <KidLayout>
        <KidError message={error.message} onRetry={load}>
          <Link className="btn white" to="/tieng-anh">
            Chọn chủ đề khác
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

  const ratio = r.total ? r.correct / r.total : 0;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
  const skills = (Object.keys(SKILL_TEXT) as EnSkill[]).filter((k) => r.skills[k].total > 0);

  return (
    <KidLayout>
      {stars === 3 && <Confetti />}
      <div className="result">
        <img className="buddy-big" src={BUDDY_IMG} alt="Buddy chúc mừng con" />
        <div className="card">
          <p className="learn-topic" style={{ textAlign: 'center' }}>
            <span lang="en">{r.title}</span> · {r.vi}
          </p>
          <div className="bubble" lang="en" style={{ margin: '0 auto 4px', justifySelf: 'center' }}>
            {r.buddy.en}
            <span className="lang" aria-hidden>
              EN
            </span>
          </div>
          <p className="vi-line" style={{ textAlign: 'center' }}>
            {r.buddy.vi}
          </p>
          <div className="stars" aria-label={`${stars} trên 3 ngôi sao`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`emoji${i < stars ? '' : ' off'}`} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
                ⭐
              </span>
            ))}
          </div>
          <div className="score-big">
            {r.correct}/{r.total}
          </div>
          <div className="score-sub">câu tiếng Anh đúng ngay lần đầu</div>
          {r.correctAfterRetry > 0 && <div className="score-sub">+ {r.correctAfterRetry} câu đúng khi thử lại</div>}
          <p lang="en" style={{ fontSize: 21, fontWeight: 800, margin: '12px 0 0' }}>
            {r.praise.en}
          </p>
          <p className="vi-line" style={{ textAlign: 'center' }}>
            {r.praise.vi}
          </p>

          {skills.length > 0 && (
            <div className="score-pills">
              {skills.map((k) => (
                <div className="pill eng" key={k}>
                  <b>
                    {r.skills[k].correct}/{r.skills[k].total}
                  </b>
                  {SKILL_TEXT[k]}
                </div>
              ))}
            </div>
          )}

          {r.good.length > 0 && <WordList title="🌟 Con đã nhận biết tốt" words={r.good} kind="good" />}
          {r.review.length > 0 && <WordList title="🔁 Từ cần ôn lại" words={r.review} kind="review" />}

          {r.next && (
            <div className="next-card">
              <span className="emoji">🚀</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{r.next.reason}</div>
                <div style={{ fontWeight: 900, fontSize: 20 }}>
                  <span lang="en">{r.next.title}</span> · {r.next.vi}
                </div>
              </div>
              {r.next.topicId !== r.topicId && (
                <button className="btn purple" onClick={() => again({ topicId: r.next!.topicId })} disabled={busy}>
                  Học chủ đề này
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
            <button className="btn big orange" disabled={busy} onClick={() => again(r.topicId ? { topicId: r.topicId } : { gameId: r.gameId! })}>
              ↺ {r.gameId ? 'Chơi lại' : 'Học lại'}
            </button>
            <Link className="btn big purple" to="/tieng-anh">
              🔤 Chọn chủ đề khác
            </Link>
          </div>
        </div>
      </div>
    </KidLayout>
  );
}

function WordList({ title, words, kind }: { title: string; words: EnWordInfo[]; kind: 'good' | 'review' }) {
  return (
    <>
      <div style={{ fontWeight: 900, marginTop: 14 }}>{title}</div>
      <div className="word-chips">
        {words.map((w) => (
          <button key={w.id} className={`word-chip ${kind}`} onClick={() => speak(w.text, 'en-US', true, { rate: 0.75 })} title="Nghe đọc">
            <EnPicture pic={w.pic} small />
            <span>
              <b lang="en">{cap(w.text)}</b>
              <small>{w.vi}</small>
            </span>
            <span className="emoji" aria-hidden>
              🔊
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
