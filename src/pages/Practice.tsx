// Màn hình làm bài: một câu mỗi lần, phản hồi ngay, gợi ý từng bước. Cũng dùng cho trò chơi.
// Câu hỏi và nút Gợi ý bằng tiếng Việt; mọi lời Buddy sau khi con trả lời bằng tiếng Anh (BuddyFeedback).
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Choices, NumberPad, type Mark } from '../components/AnswerInput';
import { BuddyFeedback, BuddyTip } from '../components/BuddyFeedback';
import { KidError, KidLayout, Loading } from '../components/Kid';
import { Visual } from '../components/Visual';
import * as engine from '../engine';
import { sfx, speak, useSound } from '../speech';
import type { AnswerResponse, AttemptState, BuddyHelp, HintLevel } from '../types';

type Feedback = Exclude<AnswerResponse, { status: 'invalid' }>;
const EMPTY_MARK: Mark = { right: new Set(), wrong: new Set() };
const GAME_SLOT: Record<string, string> = { 'magic-numbers': '⭐', 'math-garden': '🌷', 'shape-hunt': '🏅' };

export default function Practice() {
  const { id } = useParams();
  const nav = useNavigate();
  const [soundOn] = useSound();
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [error, setError] = useState<engine.EngineError | null>(null);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState<string | string[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mark, setMark] = useState<Mark>(EMPTY_MARK);
  const [notice, setNotice] = useState('');
  const [hint, setHint] = useState<{ text: string; index: number; total: number } | null>(null);
  /** Gợi ý tiếng Anh của Buddy sau lần sai gần nhất, dùng khi con thử lại. */
  const [help, setHelp] = useState<{ level: HintLevel } & BuddyHelp>({ level: 0 });
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [wins, setWins] = useState(0);

  const finish = useCallback(() => {
    try {
      engine.finish(Number(id));
      nav(`/ket-qua/${id}`, { replace: true });
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, [id, nav]);

  const load = useCallback(() => {
    setError(null);
    try {
      const a = engine.getAttempt(Number(id));
      if (a.status !== 'in_progress') {
        nav(a.status === 'completed' ? `/ket-qua/${id}` : '/hoc', { replace: true });
        return;
      }
      const next = a.progress.findIndex((p) => !p.done);
      setAttempt(a);
      setWins(a.progress.filter((p) => p.finalCorrect).length);
      if (next === -1) finish();
      else {
        // Mở lại giữa chừng: giữ gợi ý và phương án đã loại của câu đang làm dở.
        const p = a.progress[next];
        setIdx(next);
        setHelp({ level: p.hintLevel, ...p.help });
        setEliminated(new Set(p.eliminated));
      }
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, [id, nav, finish]);
  useEffect(load, [load]);

  const q = attempt?.questions[idx];
  const reset = () => {
    setValue(null);
    setFeedback(null);
    setMark(EMPTY_MARK);
    setNotice('');
  };

  const check = () => {
    if (!q || busy) return;
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      setNotice(q.kind === 'number' ? 'Con hãy bấm chọn một số nhé.' : q.kind === 'multi' ? 'Con hãy chạm chọn các hình nhé.' : 'Con hãy chọn một đáp án nhé.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      // Bộ máy chấm quyết định đúng/sai trước; lời Buddy đi kèm đã được chọn theo đúng kết quả đó.
      const r: AnswerResponse = engine.answer(Number(id), q.id, value);
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
        if (!r.done) {
          setHelp({ level: r.hintLevel, tip: r.tip, steps: r.steps });
          if (q.kind === 'choice') setEliminated((s) => new Set([...s, ...chosen]));
        }
      }
      setFeedback(r);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const askHint = () => {
    if (!q) return;
    try {
      const h = engine.hint(Number(id), q.id);
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
    setHelp({ level: 0 });
    setEliminated(new Set());
    if (idx + 1 >= attempt.questions.length) finish();
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
      else check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error) {
    return (
      <KidLayout>
        <KidError message={error.message} onRetry={error.code === 'no_learner' ? undefined : load}>
          <Link className="btn white" to={error.code === 'no_learner' ? '/' : '/hoc'}>
            {error.code === 'no_learner' ? 'Về trang chủ' : 'Chọn bài khác'}
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
  // Gợi ý bằng hình: theo mức gợi ý hiện tại; khi đã hết lượt thì cùng đếm đầy đủ để con hiểu đáp án.
  const visualHelp: HintLevel = feedback?.status === 'correct' ? 0 : feedback?.done ? 3 : help.level;

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

        {q.visual && <Visual v={q.visual} help={visualHelp} />}

        {!feedback && help.level > 0 && (help.tip || help.steps) && <BuddyTip help={help} hintLevel={help.level} />}

        {q.kind === 'number' ? (
          <NumberPad value={(value as string) ?? ''} onChange={(v) => setValue(v)} locked={locked} state={numberState} />
        ) : (
          <Choices q={q} value={value} onChange={setValue} locked={locked} mark={mark} eliminated={eliminated} />
        )}

        {feedback?.done && feedback.status === 'wrong' && q.kind === 'number' && (
          <p className="hint-box answer-box" lang="en">
            ✓ The answer is <b style={{ fontSize: 26 }}>{String(feedback.correctAnswer)}</b>
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
      {feedback && (
        <BuddyFeedback
          isCorrect={feedback.status === 'correct'}
          attemptCount={feedback.attemptCount}
          hintLevel={feedback.hintLevel}
          englishWord={feedback.englishWord}
          audioEnabled={soundOn}
          message={feedback.buddy}
          tip={feedback.tip}
          steps={feedback.steps}
          reward={feedback.reward}
          done={feedback.done}
          last={idx + 1 >= total}
          onRetry={reset}
          onNext={next}
        />
      )}
    </KidLayout>
  );
}
