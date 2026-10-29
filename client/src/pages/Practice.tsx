// Màn hình làm bài: một câu mỗi lần, phản hồi ngay, gợi ý từng bước. Cũng dùng cho trò chơi.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../api';
import { Choices, NumberPad, type Mark } from '../components/AnswerInput';
import { BUDDY_IMG, KidError, KidLayout, Loading } from '../components/Kid';
import { Visual } from '../components/Visual';
import { sfx, speak } from '../speech';
import type { AnswerResponse, AttemptState } from '../types';

type Feedback = Exclude<AnswerResponse, { status: 'invalid' }>;
const EMPTY_MARK: Mark = { right: new Set(), wrong: new Set() };
const GAME_SLOT: Record<string, string> = { 'magic-numbers': '⭐', 'math-garden': '🌷', 'shape-hunt': '🏅' };

export default function Practice() {
  const { id } = useParams();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState<string | string[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mark, setMark] = useState<Mark>(EMPTY_MARK);
  const [notice, setNotice] = useState('');
  const [hint, setHint] = useState<{ text: string; index: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [wins, setWins] = useState(0);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      await api(`/learner/attempts/${id}/finish`, { method: 'POST', as: 'learner' });
      nav(`/ket-qua/${id}`, { replace: true });
    } catch (e) {
      setError(e as ApiError);
      setBusy(false);
    }
  }, [id, nav]);

  const load = useCallback(() => {
    setError(null);
    api<AttemptState>(`/learner/attempts/${id}`, { as: 'learner' })
      .then((a) => {
        if (a.status === 'completed') return nav(`/ket-qua/${id}`, { replace: true });
        if (a.status === 'abandoned') return nav('/hoc', { replace: true });
        const next = a.progress.findIndex((p) => !p.done);
        setAttempt(a);
        setWins(a.progress.filter((p) => p.finalCorrect).length);
        if (next === -1) void finish();
        else setIdx(next);
      })
      .catch((e) => setError(e));
  }, [id, nav, finish]);
  useEffect(load, [load]);

  const q = attempt?.questions[idx];
  const reset = () => {
    setValue(null);
    setFeedback(null);
    setMark(EMPTY_MARK);
    setNotice('');
  };

  const check = async () => {
    if (!q || busy) return;
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      setNotice(q.kind === 'number' ? 'Con hãy bấm chọn một số nhé.' : q.kind === 'multi' ? 'Con hãy chạm chọn các hình nhé.' : 'Con hãy chọn một đáp án nhé.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const r = await api<AnswerResponse>(`/learner/attempts/${id}/answer`, { body: { questionId: q.id, answer: value }, as: 'learner' });
      if (r.status === 'invalid') {
        setNotice(r.guide);
        return;
      }
      const chosen = Array.isArray(value) ? value : [value as string];
      if (r.status === 'correct') {
        sfx('correct');
        setWins((w) => w + 1);
        setMark({ right: new Set(chosen), wrong: new Set() });
      } else {
        sfx('wrong');
        const right = r.done && r.correctAnswer !== undefined ? new Set((Array.isArray(r.correctAnswer) ? r.correctAnswer : [r.correctAnswer]).map(String)) : new Set<string>();
        setMark({ right, wrong: new Set(chosen.filter((c) => !right.has(c))) });
        if (!r.done && r.guide) setHint((h) => ({ text: r.guide!, index: (h?.index ?? 0) + 1, total: q.hintCount }));
      }
      setFeedback(r);
      setTimeout(() => speak(r.buddy, 'en-US'), 150);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const askHint = async () => {
    if (!q) return;
    try {
      const h = await api<{ hint: string; index: number; total: number }>(`/learner/attempts/${id}/hint`, { body: { questionId: q.id }, as: 'learner' });
      setHint({ text: h.hint, index: h.index, total: h.total });
      speak(h.hint, 'vi-VN');
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  const next = () => {
    if (!attempt) return;
    reset();
    setHint(null);
    if (idx + 1 >= attempt.questions.length) void finish();
    else {
      setIdx(idx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Phím Enter: kiểm tra / tiếp tục.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (feedback?.done) next();
      else if (feedback) reset();
      else void check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error) {
    return (
      <KidLayout>
        <KidError message={error.message} onRetry={error.status === 401 ? undefined : load}>
          <Link className="btn white" to={error.status === 401 ? '/' : '/hoc'}>
            {error.status === 401 ? 'Về trang chủ' : 'Chọn bài khác'}
          </Link>
        </KidError>
      </KidLayout>
    );
  }
  if (!attempt || !q) {
    return (
      <KidLayout>
        <Loading text={busy ? 'Buddy đang chấm bài' : 'Buddy đang chuẩn bị'} />
      </KidLayout>
    );
  }

  const total = attempt.questions.length;
  const doneCount = idx + (feedback?.done ? 1 : 0);
  const progressPct = ((idx + (feedback?.done ? 1 : 0)) / total) * 100;
  const locked = !!feedback || busy;
  const numberState = feedback ? (feedback.status === 'correct' ? 'right' : 'wrong') : undefined;

  return (
    <KidLayout>
      <div className="practice-top">
        <Link className="icon-btn" to="/hoc" aria-label="Thoát (bài làm được lưu lại)" title="Thoát – bài làm được lưu lại">
          ✕
        </Link>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={idx}>
          <div style={{ width: `${Math.max(progressPct, 3)}%` }} />
        </div>
        <span className="qcount">
          Câu {idx + 1}/{total}
        </span>
      </div>

      {attempt.kind === 'game' && attempt.gameId && (
        <div className={`game-strip theme-${attempt.gameId}`}>
          <span>{attempt.title}</span>
          <div className="slots" aria-label={`Đã đúng ${wins} câu`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`slot emoji${i < wins ? ' on' : ''}`}>
                {GAME_SLOT[attempt.gameId!]}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="question-card" aria-live="polite" key={q.id}>
        <div className="prompt-row">
          <h1 className="prompt">{q.prompt}</h1>
          <button className="speak-btn" onClick={() => speak(q.speak ?? q.prompt, 'vi-VN', true)} aria-label="Nghe đọc câu hỏi" title="Nghe đọc câu hỏi">
            <span className="emoji">🔊</span>
          </button>
        </div>

        {q.visual && <Visual v={q.visual} />}

        {q.kind === 'number' ? (
          <NumberPad value={(value as string) ?? ''} onChange={(v) => setValue(v)} locked={locked} state={numberState} />
        ) : (
          <Choices q={q} value={value} onChange={setValue} locked={locked} mark={mark} />
        )}

        {feedback?.done && feedback.status === 'wrong' && q.kind === 'number' && (
          <p className="hint-box" style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}>
            ✓ Đáp án đúng là <b style={{ fontSize: 26 }}>{String(feedback.correctAnswer)}</b>
          </p>
        )}

        {hint && !feedback && (
          <div className="hint-box" role="note">
            <span className="emoji" aria-hidden>
              💡
            </span>
            <span>
              <b>Gợi ý:</b> {hint.text}
            </span>
          </div>
        )}
        {notice && (
          <div className="notice info" role="alert" style={{ marginTop: 14 }}>
            <span className="emoji">👆</span>
            <span>{notice}</span>
          </div>
        )}

        {!feedback && (
          <div className="actions-row">
            {q.hintCount > 0 && (
              <button className="btn yellow" onClick={askHint} disabled={busy || (hint?.index ?? 0) >= q.hintCount}>
                <span className="emoji">💡</span> Gợi ý
              </button>
            )}
            <button className="btn green big" onClick={check} disabled={busy}>
              {busy ? 'Đang chấm…' : 'Kiểm tra ✓'}
            </button>
          </div>
        )}
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 700, fontSize: 14, margin: '16px 0 0' }}>
          {attempt.mode === 'trial' ? 'Học thử' : 'Bài làm được lưu tự động'} · đã xong {doneCount}/{total} câu
        </p>
      </section>
      {feedback && <FeedbackBar f={feedback} onRetry={reset} onNext={next} last={idx + 1 >= total} />}
    </KidLayout>
  );
}

function FeedbackBar({ f, onRetry, onNext, last }: { f: Feedback; onRetry: () => void; onNext: () => void; last: boolean }) {
  const good = f.status === 'correct';
  return (
    <div className={`feedback ${good ? 'correct' : 'wrong'}`} role="status">
      <div className="feedback-inner">
        <img className="buddy-mini" src={BUDDY_IMG} alt="Buddy" />
        <div className="msg">
          {/* Lời thoại của Buddy: chỉ tiếng Anh */}
          <div className="bubble" lang="en">
            <span aria-hidden>{good ? '🎉' : '💪'}</span>
            {f.buddy}
            <span className="lang" aria-hidden>
              EN
            </span>
          </div>
          {/* Hướng dẫn Toán: tiếng Việt, ở khu vực riêng */}
          {!good && f.guide && (
            <div className="guide">
              <b>{f.done ? '📘 Cùng xem nhé:' : '🧭 Hướng dẫn:'}</b>
              <span>{f.guide}</span>
            </div>
          )}
          {good && <div className="guide">✅ Chính xác!</div>}
        </div>
        {f.done ? (
          <button className={`btn big ${good ? 'green' : ''}`} onClick={onNext} autoFocus>
            {last ? 'Xem kết quả 🏁' : 'Tiếp tục ▶'}
          </button>
        ) : (
          <button className="btn big orange" onClick={onRetry} autoFocus>
            Thử lại ↺
          </button>
        )}
      </div>
    </div>
  );
}
