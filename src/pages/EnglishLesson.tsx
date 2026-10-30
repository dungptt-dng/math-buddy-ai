// Một bài tiếng Anh: (1) làm quen từ mới bằng thẻ từ + nghe đọc, (2) luyện tập từng câu, rồi sang trang kết quả.
// Cũng dùng cho trò chơi từ vựng (không có phần làm quen).
// Lời Buddy sau mỗi câu trả lời CHỈ là tiếng Anh; nghĩa tiếng Việt hiện riêng ở dòng bên dưới.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EnPicture } from '../components/EnPicture';
import { BUDDY_IMG, KidError, KidLayout, Loading } from '../components/Kid';
import * as engine from '../engine';
import { EN_LEARN } from '../engine/enFeedback';
import { hasEnglishVoice, SFX_GAP_MS, sfx, speak, stopSpeaking, useSound } from '../speech';
import type { EnAnswer, EnAttemptState, EnPublicQuestion, EnWordInfo, Line } from '../types';

type Feedback = Exclude<EnAnswer, { status: 'invalid' }>;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Tốc độ đọc từ cho trẻ mới làm quen: chậm, rõ. */
const WORD_RATE = 0.75;

/** Nút loa đọc tiếng Anh; báo cho cha biết lúc đang đọc để làm nổi bật chữ. */
function useSay() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const say = useCallback((text: string, force = true, rate?: number) => {
    speak(text, 'en-US', force, { rate, start: () => setSpeaking(text), end: () => setSpeaking((s) => (s === text ? null : s)) });
  }, []);
  useEffect(() => () => stopSpeaking(), []);
  return { speaking, say };
}

export default function EnglishLesson() {
  const { id } = useParams();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<EnAttemptState | null>(null);
  const [error, setError] = useState<engine.EngineError | null>(null);

  const finish = useCallback(() => {
    try {
      engine.finishEnglish(Number(id));
      nav(`/tieng-anh/ket-qua/${id}`, { replace: true });
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, [id, nav]);

  const load = useCallback(() => {
    setError(null);
    try {
      const a = engine.getEnglishAttempt(Number(id));
      if (a.status !== 'in_progress') {
        nav(a.status === 'completed' ? `/tieng-anh/ket-qua/${id}` : '/tieng-anh', { replace: true });
        return;
      }
      if (a.phase === 'practice' && a.progress.every((p) => p.done)) finish();
      else setAttempt(a);
    } catch (e) {
      setError(e as engine.EngineError);
    }
  }, [id, nav, finish]);
  useEffect(load, [load]);

  if (error) {
    return (
      <KidLayout>
        <KidError message={error.message} onRetry={error.code === 'no_learner' ? undefined : load}>
          <Link className="btn white" to={error.code === 'no_learner' ? '/' : '/tieng-anh'}>
            {error.code === 'no_learner' ? 'Về trang chủ' : 'Chọn chủ đề khác'}
          </Link>
        </KidError>
      </KidLayout>
    );
  }
  if (!attempt) {
    return (
      <KidLayout>
        <Loading />
      </KidLayout>
    );
  }
  return attempt.phase === 'learn' ? (
    <Learn attempt={attempt} onReady={() => setAttempt(engine.startEnglishPractice(attempt.id))} />
  ) : (
    <PracticeEn attempt={attempt} onFinish={finish} />
  );
}

function TopBar({ title, current, total, label }: { title: string; current: number; total: number; label: string }) {
  return (
    <div className="practice-top">
      <Link className="icon-btn" to="/tieng-anh" aria-label="Thoát (bài học được lưu lại)" title="Thoát – bài học được lưu lại">
        ✕
      </Link>
      <div className="progress en" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
        <div style={{ width: `${Math.max((current / total) * 100, 3)}%` }} />
      </div>
      <span className="qcount">{label}</span>
    </div>
  );
}

function NoVoice({ word }: { word?: string }) {
  if (hasEnglishVoice()) return null;
  return (
    <div className="notice info" role="note" style={{ marginTop: 12 }}>
      <span className="emoji">🔇</span>
      <span>
        Thiết bị này chưa có giọng đọc tiếng Anh, nên Buddy chưa đọc to được.
        {word && (
          <>
            {' '}
            Con đọc từ này cùng thầy cô nhé: <b lang="en">{word}</b>
          </>
        )}
      </span>
    </div>
  );
}

function BuddySays({ line }: { line: Line }) {
  return (
    <div className="en-say">
      <img src={BUDDY_IMG} alt="Buddy" />
      <div>
        <div className="bubble" lang="en">
          {line.en}
          <span className="lang" aria-hidden>
            EN
          </span>
        </div>
        <p className="vi-line">{line.vi}</p>
      </div>
    </div>
  );
}

// ---------- Phần 1: làm quen từ mới ----------

function Learn({ attempt, onReady }: { attempt: EnAttemptState; onReady: () => void }) {
  const [soundOn] = useSound();
  const { speaking, say } = useSay();
  const firstUnseen = attempt.words.findIndex((w) => !attempt.seen.includes(w.id));
  const [i, setI] = useState(firstUnseen === -1 ? 0 : firstUnseen);
  const w = attempt.words[i];
  const last = i + 1 >= attempt.words.length;

  useEffect(() => {
    try {
      engine.seeWord(attempt.id, w.id);
    } catch {
      /* không ảnh hưởng việc học */
    }
    if (!soundOn) return;
    const t = setTimeout(() => say(w.text, false, WORD_RATE), 350);
    return () => clearTimeout(t);
  }, [attempt.id, w, soundOn, say]);

  return (
    <KidLayout>
      <TopBar title={attempt.title} current={i + 1} total={attempt.words.length} label={`Từ ${i + 1}/${attempt.words.length}`} />
      <section className="question-card learn-card" key={w.id} aria-live="polite">
        <p className="learn-topic">
          <span lang="en">{attempt.title}</span> · {attempt.vi}
        </p>
        <BuddySays line={i === 0 ? EN_LEARN.first : EN_LEARN.next} />
        <div className="learn-pic">
          <EnPicture pic={w.pic} />
        </div>
        <button className={`learn-word${speaking ? ' speaking' : ''}`} lang="en" onClick={() => say(w.text, true, WORD_RATE)} title="Nghe lại">
          {cap(w.text)}
        </button>
        <p className="learn-vi">{w.vi}</p>
        <NoVoice />
        <div className="actions-row">
          <button className="btn yellow" onClick={() => say(w.text, true, WORD_RATE)}>
            <span className="emoji">🔊</span> Nghe lại
          </button>
          {i > 0 && (
            <button className="btn white" onClick={() => setI(i - 1)}>
              ◀ Từ trước
            </button>
          )}
          {last ? (
            <button className="btn big purple" onClick={onReady}>
              Luyện tập ▶
            </button>
          ) : (
            <button className="btn big green" onClick={() => setI(i + 1)}>
              Từ tiếp theo ▶
            </button>
          )}
        </div>
        {attempt.learnedBefore && !last && (
          <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
            <button className="link-btn" onClick={onReady}>
              Con đã học chủ đề này rồi – vào luyện tập luôn ▶
            </button>
          </p>
        )}
        <p className="learn-note">Con nghe Buddy đọc rồi nói theo nhé. Buddy không ghi âm và không chấm phát âm.</p>
      </section>
    </KidLayout>
  );
}

// ---------- Phần 2: luyện tập ----------

const PAIR_COLORS = ['pair-0', 'pair-1', 'pair-2', 'pair-3'];

function PracticeEn({ attempt, onFinish }: { attempt: EnAttemptState; onFinish: () => void }) {
  const [soundOn] = useSound();
  const { speaking, say } = useSay();
  const start = attempt.progress.findIndex((p) => !p.done);
  const [idx, setIdx] = useState(start === -1 ? 0 : start);
  const q = attempt.questions[idx];
  const p0 = attempt.progress[idx];
  const [value, setValue] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>(p0.lockedPairs);
  const [locked, setLocked] = useState<Record<string, string>>(p0.lockedPairs);
  const [pickLeft, setPickLeft] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set(p0.eliminated));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [wins, setWins] = useState(attempt.progress.filter((p) => p.finalCorrect).length);
  const spokenFor = useRef('');

  // Mỗi câu mới: Buddy đọc từ cần nghe (bài nghe) hoặc đọc lời hướng dẫn.
  useEffect(() => {
    if (!soundOn || spokenFor.current === q.id) return;
    spokenFor.current = q.id;
    const t = setTimeout(() => (q.listen ? say(q.say, false, WORD_RATE) : say(q.say, false)), 400);
    return () => clearTimeout(t);
  }, [q, soundOn, say]);

  const total = attempt.questions.length;
  const isMatch = q.kind === 'match';
  const ready = isMatch ? Object.keys(pairs).length === (q.left?.length ?? 0) : value !== null;

  const check = () => {
    if (busy || feedback) return;
    if (!ready) {
      setNotice(isMatch ? 'Con hãy nối hết các từ nhé.' : 'Con hãy chọn một đáp án nhé.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const r = engine.answerEnglish(attempt.id, q.id, isMatch ? pairs : value);
      if (r.status === 'invalid') {
        setNotice(r.guide);
        return;
      }
      sfx(r.status === 'correct' ? 'correct' : 'wrong');
      if (r.status === 'correct') setWins((x) => x + 1);
      if (!isMatch && r.status === 'wrong' && !r.done) setEliminated((s) => new Set([...s, value!]));
      setFeedback(r);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    if (isMatch && feedback?.pairs) {
      const keep = Object.fromEntries(Object.entries(pairs).filter(([l]) => feedback.pairs![l]));
      setLocked(keep);
      setPairs(keep);
    }
    setValue(null);
    setPickLeft(null);
    setFeedback(null);
    setNotice('');
  };

  const next = () => {
    if (idx + 1 >= total) return onFinish();
    const np = attempt.progress[idx + 1];
    setIdx(idx + 1);
    setValue(null);
    setPairs(np.lockedPairs);
    setLocked(np.lockedPairs);
    setPickLeft(null);
    setEliminated(new Set(np.eliminated));
    setFeedback(null);
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (feedback?.done) next();
      else if (feedback) retry();
      else check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const doneCount = idx + (feedback?.done ? 1 : 0);
  const listenText = q.listen && !feedback?.done ? null : q.say;

  return (
    <KidLayout>
      <TopBar title={attempt.title} current={doneCount} total={total} label={`Câu ${idx + 1}/${total}`} />
      {attempt.gameId && (
        <div className="game-strip theme-word-balloons">
          <span lang="en">{attempt.title}</span>
          <div className="slots" aria-label={`Đã đúng ${wins} câu`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`slot emoji${i < wins ? ' on' : ''}`}>
                🎈
              </span>
            ))}
          </div>
        </div>
      )}
      <section className="question-card" key={q.id} aria-live="polite">
        <div className="prompt-row">
          <div style={{ flex: 1 }}>
            <h1 className="prompt" lang="en">
              {q.ask.en}
            </h1>
            <p className="vi-line">{q.ask.vi}</p>
          </div>
          {!q.listen && (
            <button className="speak-btn" onClick={() => say(q.say)} aria-label="Nghe Buddy đọc" title="Nghe Buddy đọc">
              <span className="emoji">🔊</span>
            </button>
          )}
        </div>

        {q.listen && (
          <div className="listen-box">
            <button className={`listen-big${speaking ? ' speaking' : ''}`} onClick={() => say(q.say, true, WORD_RATE)} aria-label="Nghe Buddy đọc từ">
              <span className="emoji">🔊</span>
            </button>
            <span className="listen-label">{listenText ? <b lang="en">{cap(listenText)}</b> : 'Bấm loa để nghe lại'}</span>
          </div>
        )}
        {q.listen && <NoVoice word={q.say} />}

        {q.pic && (
          <div className="en-visual">
            <EnPicture pic={q.pic} />
          </div>
        )}
        {q.text && (
          <p className={`en-text${speaking ? ' speaking' : ''}`} lang="en">
            {q.text}
          </p>
        )}

        {isMatch ? (
          <MatchBoard
            q={q}
            pairs={pairs}
            locked={locked}
            pickLeft={pickLeft}
            feedback={feedback}
            onPickLeft={(l) => {
              sfx('tap');
              say(q.left!.find((o) => o.id === l)!.text!, true, WORD_RATE);
              if (pairs[l] && !locked[l]) {
                const np = { ...pairs };
                delete np[l];
                setPairs(np);
              }
              setPickLeft(l);
            }}
            onPickRight={(r) => {
              if (!pickLeft) return setNotice('Con chạm vào một từ tiếng Anh trước nhé.');
              sfx('tap');
              const np = Object.fromEntries(Object.entries(pairs).filter(([, v]) => v !== r));
              np[pickLeft] = r;
              setPairs(np);
              setPickLeft(null);
              setNotice('');
            }}
          />
        ) : (
          <div className="options" role="radiogroup" aria-label="Các phương án">
            {q.options!.map((o) => {
              const right = feedback && (feedback.status === 'correct' ? o.id === value : feedback.done && o.id === feedback.correctAnswer);
              const wrong = feedback && feedback.status === 'wrong' && o.id === value;
              const out = eliminated.has(o.id) && !wrong;
              const state = right ? 'right' : wrong ? 'wrong' : out ? 'out' : value === o.id ? 'selected' : '';
              return (
                <button
                  key={o.id}
                  className={`opt ${state}${o.text && o.text.length > 8 ? ' text-sm' : ''}${o.pic ? ' pic' : ''}`}
                  role="radio"
                  aria-checked={value === o.id}
                  disabled={!!feedback || busy || out}
                  onClick={() => {
                    sfx('tap');
                    setValue(o.id);
                  }}
                  lang={o.text ? 'en' : undefined}
                >
                  {o.pic ? <EnPicture pic={o.pic} small /> : o.text}
                  {state === 'right' && (
                    <span className="mark" aria-label="Đúng">
                      ✓
                    </span>
                  )}
                  {(state === 'wrong' || state === 'out') && (
                    <span className="mark" aria-label="Chưa đúng">
                      ✗
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {feedback?.done && feedback.reveal && <Reveal words={feedback.reveal.words} full={feedback.reveal.full} say={say} />}

        {notice && (
          <div className="notice info" role="alert" style={{ marginTop: 14 }}>
            <span className="emoji">👆</span>
            <span>{notice}</span>
          </div>
        )}
        {!feedback && (
          <div className="actions-row">
            <button className="btn green big" onClick={check} disabled={busy}>
              {busy ? 'Đang chấm…' : 'Kiểm tra ✓'}
            </button>
          </div>
        )}
        <p className="saved-note">
          {attempt.mode === 'trial' ? 'Học thử' : 'Bài học được lưu tự động'} · kết quả tiếng Anh tính riêng, không ảnh hưởng điểm Toán
        </p>
      </section>
      {feedback && <EnFeedbackBar f={feedback} last={idx + 1 >= total} onRetry={retry} onNext={next} soundOn={soundOn} />}
    </KidLayout>
  );
}

function MatchBoard({
  q,
  pairs,
  locked,
  pickLeft,
  feedback,
  onPickLeft,
  onPickRight,
}: {
  q: EnPublicQuestion;
  pairs: Record<string, string>;
  locked: Record<string, string>;
  pickLeft: string | null;
  feedback: Feedback | null;
  onPickLeft: (id: string) => void;
  onPickRight: (id: string) => void;
}) {
  const lefts = q.left!;
  // Khi đã hết lượt: hiện các cặp đúng.
  const shown = feedback?.done && feedback.status === 'wrong' ? (feedback.correctAnswer as Record<string, string>) : pairs;
  const colorOf = (l: string) => PAIR_COLORS[lefts.findIndex((x) => x.id === l)];
  const leftOfRight = (r: string) => Object.entries(shown).find(([, v]) => v === r)?.[0];
  const stateOf = (l: string) => {
    if (!feedback) return locked[l] ? 'right' : '';
    if (feedback.done && feedback.status === 'wrong') return 'right';
    return feedback.pairs?.[l] ? 'right' : 'wrong';
  };
  return (
    <div className="match-board">
      <div className="match-col" role="group" aria-label="Từ tiếng Anh">
        {lefts.map((o) => {
          const st = stateOf(o.id);
          return (
            <button
              key={o.id}
              lang="en"
              className={`opt match-item ${shown[o.id] ? `paired ${colorOf(o.id)}` : ''} ${pickLeft === o.id ? 'selected' : ''} ${st}`}
              disabled={!!feedback || !!locked[o.id]}
              onClick={() => onPickLeft(o.id)}
            >
              {o.text}
              {shown[o.id] && <span className="pair-dot" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="match-col" role="group" aria-label="Hình hoặc nghĩa">
        {q.right!.map((o) => {
          const l = leftOfRight(o.id);
          const st = l ? stateOf(l) : '';
          return (
            <button
              key={o.id}
              className={`opt match-item ${l ? `paired ${colorOf(l)}` : ''} ${st}${o.pic ? ' pic' : ' text-sm'}`}
              disabled={!!feedback || (!!l && !!locked[l])}
              onClick={() => onPickRight(o.id)}
            >
              {o.pic ? <EnPicture pic={o.pic} small /> : o.vi}
              {l && <span className="pair-dot" aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="match-help">Chạm một từ tiếng Anh, rồi chạm hình hoặc nghĩa của từ đó. Cặp đã nối có cùng màu.</p>
    </div>
  );
}

function Reveal({ words, full, say }: { words: EnWordInfo[]; full?: string; say: (t: string, force?: boolean, rate?: number) => void }) {
  return (
    <div className="reveal-box">
      {full && (
        <div className="reveal-full" lang="en">
          {full}
          <button className="speak-btn small" onClick={() => say(full)} aria-label="Nghe cả câu">
            <span className="emoji">🔊</span>
          </button>
        </div>
      )}
      {words.map((w) => (
        <div key={w.id} className="reveal-word">
          <EnPicture pic={w.pic} small />
          <b lang="en">{cap(w.text)}</b>
          <span>– {w.vi}</span>
          <button className="speak-btn small" onClick={() => say(w.text, true, WORD_RATE)} aria-label={`Nghe đọc từ ${w.text}`}>
            <span className="emoji">🔊</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/** Thanh phản hồi: lời Buddy tiếng Anh (đọc to) + nghĩa tiếng Việt ở dòng riêng (không đọc). */
function EnFeedbackBar({ f, last, onRetry, onNext, soundOn }: { f: Feedback; last: boolean; onRetry: () => void; onNext: () => void; soundOn: boolean }) {
  const words = f.done ? (f.reveal?.words ?? []).map((w) => `${cap(w.text)}!`) : [];
  const text = [f.buddy.en, f.reward?.en, f.tip?.en, ...words].filter(Boolean).join(' ');
  useEffect(() => {
    if (!soundOn) return;
    const t = setTimeout(() => speak(text, 'en-US'), SFX_GAP_MS);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [text, soundOn]);
  const good = f.status === 'correct';
  return (
    <div className={`feedback ${good ? 'correct' : 'wrong'}`} role="status" data-attempt={f.attemptCount}>
      <div className="feedback-inner">
        <img className="buddy-mini" src={BUDDY_IMG} alt="Buddy" />
        <div className="msg">
          <div className="bubble" lang="en">
            <span aria-hidden>{good ? '🎉' : '💪'}</span>
            {f.buddy.en}
            <span className="lang" aria-hidden>
              EN
            </span>
          </div>
          {f.reward && (
            <div className="en-line reward" lang="en">
              {f.reward.en}
            </div>
          )}
          {f.tip && (
            <div className="en-line" lang="en">
              <span aria-hidden>💡</span> {f.tip.en}
            </div>
          )}
          <div className="vi-meaning">
            <span className="tag">Nghĩa</span>
            {[f.buddy.vi, f.reward?.vi, f.tip?.vi].filter(Boolean).join(' ')}
          </div>
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
