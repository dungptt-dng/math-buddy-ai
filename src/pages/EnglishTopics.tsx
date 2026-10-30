// Khu 2 – Làm quen tiếng Anh (English Practice): danh sách chủ đề, tiến độ tiếng Anh riêng của con, trò chơi từ vựng.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AreaTabs } from '../components/AreaTabs';
import { BUDDY_IMG, KidError, KidLayout, LearnerChip, Loading } from '../components/Kid';
import * as engine from '../engine';
import { speak } from '../speech';
import type { EnGameCard, EnSummary, EnTopicCard, Me } from '../types';

const STATUS_TEXT = { new: 'Chưa học', in_progress: 'Đang học', completed: 'Đã hoàn thành' } as const;
const STATUS_ICON = { new: '○', in_progress: '◐', completed: '✓' } as const;
const TOPIC_BG = ['#58B9F7,#287FC1', '#83DDB4,#2FAE78', '#FFAE8B,#F07A4F', '#C9B6F5,#8D6EE0', '#FFE083,#F5B82E', '#FF8FB1,#F06292'];
const HELLO = { en: "Hello! Let's learn English!", vi: 'Xin chào! Cùng Buddy học tiếng Anh nhé!' };

export default function EnglishTopics() {
  const nav = useNavigate();
  const [data, setData] = useState<{ me: Me; topics: EnTopicCard[]; games: EnGameCard[]; summary: EnSummary } | null>(null);
  const [error, setError] = useState<engine.EngineError | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    try {
      const me = engine.me();
      if (!me) throw new engine.EngineError('no_learner', 'Con chưa vào học.');
      setData({ me, topics: engine.listEnglishTopics(), games: engine.listEnglishGames(), summary: engine.englishSummary() });
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, []);
  useEffect(load, [load]);

  const start = (target: { topicId: string } | { gameId: string }, key: string) => {
    setStarting(key);
    try {
      const a = engine.startEnglish(target);
      nav(`/tieng-anh/hoc/${a.id}`);
    } catch (e) {
      setError(e as engine.EngineError);
      setStarting(null);
    }
  };
  const open = (t: EnTopicCard) => (t.inProgressAttemptId ? nav(`/tieng-anh/hoc/${t.inProgressAttemptId}`) : start({ topicId: t.id }, t.id));

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

  const s = data?.summary;
  return (
    <KidLayout right={data && <LearnerChip me={data.me} />}>
      <AreaTabs active="english" />
      {error && <KidError message={error.message} onRetry={load} />}
      {!data && !error && <Loading />}
      {data && s && (
        <>
          <section className="hello-card en-hello">
            <img src={BUDDY_IMG} alt="" />
            <div className="hello-text">
              <p className="hello-title" lang="en">
                {HELLO.en}
                <button className="speak-btn small" onClick={() => speak(HELLO.en, 'en-US', true)} aria-label="Nghe Buddy chào">
                  <span className="emoji">🔊</span>
                </button>
              </p>
              <p className="vi-line">{HELLO.vi}</p>
            </div>
            <div className="en-progress" aria-label="Tiến độ tiếng Anh của con">
              <div>
                <b>
                  {s.topicsDone}/{s.topicsTotal}
                </b>
                chủ đề đã học
              </div>
              <div>
                <b>
                  {s.wordsFamiliar}/{s.wordsTotal}
                </b>
                từ đã làm quen
              </div>
            </div>
          </section>

          {s.suggestion && (
            <div className="next-card en-suggest">
              <span className="emoji">💡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>Buddy gợi ý: {s.suggestion.reason}</div>
                <div style={{ fontWeight: 900, fontSize: 20 }}>
                  <span lang="en">{s.suggestion.title}</span> · {s.suggestion.vi}
                </div>
              </div>
              <button className="btn purple" onClick={() => open(data.topics.find((t) => t.id === s.suggestion!.topicId)!)} disabled={starting !== null}>
                Học ngay ▶
              </button>
            </div>
          )}

          <h1 className="section-title">
            <span className="emoji">🔤</span> Con muốn học chủ đề nào?
          </h1>
          <div className="lesson-grid">
            {data.topics.map((t, i) => (
              <button key={t.id} className="lesson-card en-topic" onClick={() => open(t)} disabled={starting === t.id}>
                <div className="lesson-art" style={{ background: `linear-gradient(135deg,${TOPIC_BG[i % TOPIC_BG.length]})` }} aria-hidden>
                  <span className="big emoji">{t.icon}</span>
                </div>
                <h3 lang="en">{starting === t.id ? 'Đang mở…' : t.title}</h3>
                <p className="en-topic-vi">{t.vi}</p>
                <p className="en-topic-words" lang="en">
                  {t.words.join(' · ')}
                </p>
                <div className="lesson-meta">
                  <span className={`status ${t.status}`}>
                    <span aria-hidden>{STATUS_ICON[t.status]}</span>
                    {STATUS_TEXT[t.status]}
                  </span>
                  {t.last && t.status !== 'in_progress' && (
                    <span className="last-score">
                      Lần gần nhất: {t.last.correct}/{t.last.total} câu đúng
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <h2 className="section-title">
            <span className="emoji">🎈</span> Trò chơi từ vựng
          </h2>
          <div className="lesson-grid">
            {data.games.map((g) => (
              <button key={g.id} className="game-card theme-word-balloons" disabled={!g.available || starting === g.id} onClick={() => start({ gameId: g.id }, g.id)}>
                <span className="deco emoji" aria-hidden>
                  🎈
                </span>
                <span className="en" lang="en">
                  {g.englishName}
                </span>
                <h3>{starting === g.id ? 'Đang mở…' : g.title}</h3>
                <p>{g.available ? g.howTo : 'Con hãy học ít nhất một chủ đề để mở trò chơi này nhé.'}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </KidLayout>
  );
}
