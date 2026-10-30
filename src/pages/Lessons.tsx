// Khu 1 – Ôn luyện Toán (Math Practice): chọn bài Toán lớp 1 để ôn luyện bằng tiếng Việt, và trò chơi Toán.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AreaTabs } from '../components/AreaTabs';
import { BUDDY_IMG, KidError, KidLayout, LearnerChip, Loading } from '../components/Kid';
import { LessonArt } from '../components/LessonArt';
import * as engine from '../engine';
import type { GameCard, LessonCard, Me } from '../types';

const STATUS_TEXT = { new: 'Chưa luyện', in_progress: 'Đang luyện', completed: 'Đã hoàn thành' } as const;
const STATUS_ICON = { new: '○', in_progress: '◐', completed: '✓' } as const;
const GAME_DECO: Record<string, string> = { 'magic-numbers': '✨', 'math-garden': '🌻', 'shape-hunt': '🔍' };

export default function Lessons() {
  const nav = useNavigate();
  const [data, setData] = useState<{ me: Me; lessons: LessonCard[]; games: GameCard[] } | null>(null);
  const [error, setError] = useState<engine.EngineError | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    try {
      const me = engine.me();
      if (!me) throw new engine.EngineError('no_learner', 'Con chưa vào học.');
      setData({ me, lessons: engine.listLessons(), games: engine.listGames() });
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, []);
  useEffect(load, [load]);

  const start = (target: { lessonId: string } | { gameId: string }, key: string) => {
    setStarting(key);
    try {
      const a = engine.startAttempt(target);
      nav(`/lam-bai/${a.id}`);
    } catch (e) {
      setError(e as engine.EngineError);
      setStarting(null);
    }
  };

  if (error?.code === 'no_learner') {
    return (
      <KidLayout>
        <KidError message="Con chưa vào học. Hãy nhập tên và lớp ở trang đầu, hoặc bấm “Học thử” nhé.">
          <Link className="btn" to="/">
            Về trang chủ
          </Link>
        </KidError>
      </KidLayout>
    );
  }

  const math = data?.lessons.filter((l) => l.domain === 'math') ?? [];
  const mathDone = math.filter((l) => l.status === 'completed').length;

  // Kết thúc phiên học: bạn sau dùng chung máy không thấy tên, bài của bạn trước.
  const endSession = () => {
    engine.signOut();
    nav('/');
  };

  return (
    <KidLayout right={data && <LearnerChip me={data.me} />}>
      <AreaTabs active="math" />
      {error && <KidError message={error.message} onRetry={load} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <section className="hello-card">
            <img src={BUDDY_IMG} alt="" />
            <div className="hello-text">
              {data.me.mode === 'profile' ? (
                <>
                  <p className="hello-title">Chào {data.me.profile.nickname}! Cùng Buddy học nhé!</p>
                  {data.me.profile.className && <p className="hello-sub">Lớp {data.me.profile.className}</p>}
                </>
              ) : (
                <p className="hello-title">Chào con! Cùng Buddy học thử nhé!</p>
              )}
            </div>
            <div className="hello-actions">
              {data.me.mode === 'profile' && (
                <Link className="btn white" to="/" state={{ edit: true }}>
                  ✏️ Đổi thông tin
                </Link>
              )}
              <button className="btn white" onClick={endSession}>
                👋 {data.me.mode === 'profile' ? 'Kết thúc phiên học' : 'Kết thúc học thử'}
              </button>
            </div>
          </section>
          {data.me.mode === 'trial' && data.me.notice && (
            <div className="notice trial" style={{ marginBottom: 8 }}>
              <span className="emoji">ℹ️</span>
              <span>{data.me.notice}</span>
            </div>
          )}
          <h1 className="section-title" style={{ marginTop: 6 }}>
            <span className="emoji">📚</span> Con muốn ôn bài Toán nào?
            {math.length > 0 && (
              <span className="section-progress">
                Đã hoàn thành {mathDone}/{math.length} bài
              </span>
            )}
          </h1>
          {math.length === 0 && (
            <div className="card">
              <p style={{ fontWeight: 800, margin: 0 }}>Chưa có bài nào. Con quay lại sau nhé!</p>
            </div>
          )}
          <div className="lesson-grid">
            {math.map((l) => (
              <LessonButton key={l.id} l={l} busy={starting === l.id} onStart={() => (l.inProgressAttemptId ? nav(`/lam-bai/${l.inProgressAttemptId}`) : start({ lessonId: l.id }, l.id))} />
            ))}
          </div>

          {data.games.length > 0 && (
            <>
              <h2 className="section-title">
                <span className="emoji">🎮</span> Trò chơi Toán
              </h2>
              <div className="lesson-grid">
                {data.games.map((g) => (
                  <button
                    key={g.id}
                    className={`game-card theme-${g.id}`}
                    disabled={!g.available || starting === g.id}
                    onClick={() => start({ gameId: g.id }, g.id)}
                  >
                    <span className="deco emoji" aria-hidden>
                      {GAME_DECO[g.id]}
                    </span>
                    <span className="en" lang="en">
                      {g.englishName}
                    </span>
                    <h3>{starting === g.id ? 'Đang mở…' : g.title}</h3>
                    <p>{g.available ? g.howTo : 'Con hãy luyện thêm bài học để mở trò chơi này nhé.'}</p>
                  </button>
                ))}
              </div>
            </>
          )}

        </>
      )}
    </KidLayout>
  );
}

function LessonButton({ l, onStart, busy }: { l: LessonCard; onStart: () => void; busy: boolean }) {
  const score = l.last ? `${l.last.mathCorrect}/${l.last.mathTotal}` : null;
  return (
    <button className="lesson-card" onClick={onStart} disabled={busy}>
      <LessonArt icon={l.icon} />
      <h3>{busy ? 'Đang mở…' : l.title}</h3>
      <div className="lesson-meta">
        <span className={`status ${l.status}`}>
          <span aria-hidden>{STATUS_ICON[l.status]}</span>
          {STATUS_TEXT[l.status]}
          {l.status === 'in_progress' && ` · ${l.answeredInProgress}/${l.questionCount}`}
        </span>
        {score && l.status !== 'in_progress' && <span className="last-score">Lần gần nhất: {score} câu đúng</span>}
      </div>
    </button>
  );
}
