// Màn hình quan trọng nhất của học sinh: chọn bài để ôn luyện.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../api';
import { KidError, KidLayout, Loading } from '../components/Kid';
import { LessonArt } from '../components/LessonArt';
import type { GameCard, LessonCard } from '../types';

const STATUS_TEXT = { new: 'Chưa luyện', in_progress: 'Đang luyện', completed: 'Đã hoàn thành' } as const;
const STATUS_ICON = { new: '○', in_progress: '◐', completed: '✓' } as const;
const GAME_DECO: Record<string, string> = { 'magic-numbers': '✨', 'math-garden': '🌻', 'shape-hunt': '🔍' };

type Me = { mode: 'class' | 'trial'; nickname?: string; className?: string; notice?: string };

export default function Lessons() {
  const nav = useNavigate();
  const [data, setData] = useState<{ me: Me; lessons: LessonCard[]; games: GameCard[] } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api<Me>('/learner/me', { as: 'learner' }),
      api<{ lessons: LessonCard[] }>('/learner/lessons', { as: 'learner' }),
      api<{ games: GameCard[] }>('/learner/games', { as: 'learner' }),
    ])
      .then(([me, l, g]) => setData({ me, lessons: l.lessons, games: g.games }))
      .catch((e) => setError(e));
  }, []);
  useEffect(load, [load]);

  const start = async (body: { lessonId: string } | { gameId: string }, key: string) => {
    setStarting(key);
    try {
      const a = await api<{ id: number }>('/learner/attempts', { body, as: 'learner' });
      nav(`/lam-bai/${a.id}`);
    } catch (e) {
      setError(e as ApiError);
      setStarting(null);
    }
  };

  if (error?.status === 401) {
    return (
      <KidLayout>
        <KidError message="Con chưa vào lớp. Hãy vào lớp hoặc chọn Học thử nhé.">
          <Link className="btn" to="/">
            Về trang chủ
          </Link>
        </KidError>
      </KidLayout>
    );
  }

  const math = data?.lessons.filter((l) => l.domain === 'math') ?? [];
  const english = data?.lessons.filter((l) => l.domain === 'english') ?? [];
  const chip = data ? (
    data.me.mode === 'trial' ? <span className="chip trial">⭐ Học thử</span> : <span className="chip">🧒 {data.me.nickname}</span>
  ) : undefined;

  return (
    <KidLayout right={chip}>
      {error && <KidError message={error.message} onRetry={load} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          {data.me.mode === 'trial' && data.me.notice && (
            <div className="notice trial" style={{ marginBottom: 8 }}>
              <span className="emoji">ℹ️</span>
              <span>{data.me.notice}</span>
            </div>
          )}
          <h1 className="section-title" style={{ marginTop: 6 }}>
            <span className="emoji">📚</span> Con muốn ôn bài nào?
          </h1>
          {math.length === 0 && (
            <div className="card">
              <p style={{ fontWeight: 800, margin: 0 }}>Thầy cô chưa giao bài nào. Con quay lại sau nhé!</p>
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

          {english.length > 0 && (
            <>
              <h2 className="section-title">
                <span className="emoji">🔤</span> Làm quen tiếng Anh
              </h2>
              <div className="lesson-grid">
                {english.map((l) => (
                  <LessonButton key={l.id} l={l} busy={starting === l.id} onStart={() => (l.inProgressAttemptId ? nav(`/lam-bai/${l.inProgressAttemptId}`) : start({ lessonId: l.id }, l.id))} />
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
  const score = l.last ? (l.domain === 'english' ? `${l.last.vocabCorrect}/${l.last.vocabTotal}` : `${l.last.mathCorrect}/${l.last.mathTotal}`) : null;
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
