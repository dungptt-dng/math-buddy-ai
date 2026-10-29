// Lời Buddy sau mỗi lần con trả lời – CHỈ tiếng Anh đơn giản, dùng chung cho mọi bài và mọi trò chơi.
// Đúng/sai do bộ máy chấm quyết định trước; component này chỉ hiển thị và đọc to lời đã chọn theo kết quả đó.
import { useEffect } from 'react';
import { SFX_GAP_MS, speak, stopSpeaking } from '../speech';
import type { BuddyHelp, HintLevel } from '../types';
import { BUDDY_IMG } from './Kid';

type Props = {
  isCorrect: boolean;
  /** Lần trả lời thứ mấy của câu này. */
  attemptCount: number;
  /** 0–3: mức gợi ý sau lần sai này. */
  hintLevel: HintLevel;
  /** Từ tiếng Anh mới (không phải câu nào cũng có). */
  englishWord?: string;
  audioEnabled: boolean;
  message: string;
  tip?: string;
  steps?: string[];
  reward?: string;
  done: boolean;
  last: boolean;
  onRetry: () => void;
  onNext: () => void;
};

/** Ghép các câu thành một lần đọc, để giọng đọc không bị chồng hay ngắt quãng. */
function spoken(p: Pick<Props, 'message' | 'tip' | 'steps' | 'englishWord' | 'reward'>) {
  return [p.message, p.reward, p.englishWord && `${p.englishWord}!`, p.tip, ...(p.steps ?? [])].filter(Boolean).join(' ');
}

export function BuddyFeedback(p: Props) {
  const text = spoken(p);
  useEffect(() => {
    if (!p.audioEnabled) return;
    const t = setTimeout(() => speak(text, 'en-US'), SFX_GAP_MS);
    // Rời khỏi lời này (Thử lại / Tiếp tục / thoát) thì dừng đọc ngay.
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [text, p.audioEnabled]);

  const good = p.isCorrect;
  return (
    <div
      className={`feedback ${good ? 'correct' : 'wrong'}`}
      role="status"
      data-attempt={p.attemptCount}
      data-hint-level={p.hintLevel}
    >
      <div className="feedback-inner">
        <img className="buddy-mini" src={BUDDY_IMG} alt="Buddy" />
        <div className="msg" lang="en">
          <div className="bubble">
            <span aria-hidden>{good ? '🎉' : '💪'}</span>
            {p.message}
            <span className="lang" aria-hidden>
              EN
            </span>
          </div>
          {p.reward && <div className="en-line reward">{p.reward}</div>}
          {p.englishWord && <NewWord word={p.englishWord} />}
          {p.tip && (
            <div className="en-line">
              <span aria-hidden>💡</span> {p.tip}
            </div>
          )}
          {p.steps && <Steps steps={p.steps} />}
        </div>
        {p.done ? (
          <button className={`btn big ${good ? 'green' : ''}`} onClick={p.onNext} autoFocus>
            {p.last ? 'Xem kết quả 🏁' : 'Tiếp tục ▶'}
          </button>
        ) : (
          <button className="btn big orange" onClick={p.onRetry} autoFocus>
            Thử lại ↺
          </button>
        )}
      </div>
    </div>
  );
}

function NewWord({ word }: { word: string }) {
  return (
    <div className="new-word">
      <span className="tag">New word</span>
      <b>{word}</b>
      <button className="speak-btn small" onClick={() => speak(word, 'en-US', true)} aria-label={`Nghe đọc từ ${word}`}>
        <span className="emoji">🔊</span>
      </button>
    </div>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="en-steps">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  );
}

/** Gợi ý của Buddy vẫn hiện trên câu hỏi khi con thử lại (tiếng Anh, bấm loa để nghe lại). */
export function BuddyTip({ help, hintLevel }: { help: BuddyHelp; hintLevel: HintLevel }) {
  const text = [help.tip, ...(help.steps ?? [])].filter(Boolean).join(' ');
  return (
    <div className="buddy-tip" lang="en" data-hint-level={hintLevel}>
      <img src={BUDDY_IMG} alt="" />
      <div className="buddy-tip-body">
        {help.tip && <div>{help.tip}</div>}
        {help.steps && <Steps steps={help.steps} />}
      </div>
      <button className="speak-btn small" onClick={() => speak(text, 'en-US', true)} aria-label="Nghe Buddy đọc gợi ý">
        <span className="emoji">🔊</span>
      </button>
    </div>
  );
}
