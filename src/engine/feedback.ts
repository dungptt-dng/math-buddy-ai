// Ngân hàng lời Buddy: CHỈ tiếng Anh đơn giản cho học sinh 6–7 tuổi mới làm quen tiếng Anh.
// Ứng dụng không gọi AI: mọi lời đều được chọn từ ngân hàng này SAU KHI bộ chấm đã quyết định đúng/sai,
// nên lời Buddy không bao giờ trái với kết quả chấm và vẫn có khi không có mạng.
import type { EnglishLines } from '../content/types';

export const PRAISE = ['Correct! Great job!', 'Excellent! You got it!', 'Well done!', 'Yes! That is right!', 'Super! You did it!'];
/** Đúng sau khi đã thử lại: khen sự cố gắng. */
export const PRAISE_AFTER_RETRY = ['You did it! Great trying!', 'Yes! You kept trying!', 'Hooray! You got it!'];
export const NEW_WORD = "Well done! Let's learn a new word!";
/** Lời động viên theo số lần sai: 1 = gợi ý nhẹ, 2 = cùng đếm, 3 = từng bước nhỏ. */
export const ENCOURAGE: Record<1 | 2 | 3, string[]> = {
  1: ["Good try! Let's try again.", 'Almost! Try again.', 'Nice try! You can do it!'],
  2: ["Almost! Let's count together.", 'Take your time. You can do it!'],
  3: ["Let's go step by step.", "Take your time. Let's do it together."],
};
export const REVEAL = "Good try! Let's learn it together.";
/** Phần thưởng trong trò chơi khi trả lời đúng. */
export const GAME_REWARD: Record<string, string> = {
  'magic-numbers': 'You lit a star!',
  'math-garden': 'A new flower grew!',
  'shape-hunt': 'You got a badge!',
};

export type HintLevel = 0 | 1 | 2 | 3;
export type BuddyLines = { buddy: string; tip?: string; steps?: string[] };

export function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

/** Mức gợi ý sau `wrongCount` lần sai (tối đa 3). */
export const hintLevelFor = (wrongCount: number): HintLevel => Math.min(Math.max(wrongCount, 0), 3) as HintLevel;

/**
 * Chọn lời Buddy. Gọi SAU khi đã chấm: `isCorrect` là kết quả chấm, không phải ý kiến của Buddy.
 * - Đúng: lời khen (có thể nhắc lại kết quả); nếu có từ mới thì giới thiệu từ đó.
 * - Sai, còn lượt: động viên + gợi ý theo mức (1 nhẹ, 2 cùng đếm, 3 từng bước nhỏ). Không nói đáp án.
 * - Sai, hết lượt: cùng xem đáp án.
 */
export function buddyLines(o: {
  isCorrect: boolean;
  attemptCount: number;
  done: boolean;
  en: EnglishLines;
  englishWord?: string;
  answerText: string;
  seed: number;
}): BuddyLines {
  if (o.isCorrect) {
    if (o.englishWord) return { buddy: NEW_WORD };
    if (o.attemptCount > 1) return { buddy: pick(PRAISE_AFTER_RETRY, o.seed) };
    const pool = o.en.say ? [...PRAISE, o.en.praise, o.en.say, o.en.say] : [...PRAISE, o.en.praise];
    return { buddy: pick(pool, o.seed) };
  }
  if (o.done) return { buddy: REVEAL, tip: o.answerText };
  const level = hintLevelFor(o.attemptCount) as 1 | 2 | 3;
  const buddy = pick(ENCOURAGE[level], o.seed);
  return level < 3 ? { buddy, tip: o.en.tips[level - 1] } : { buddy, steps: o.en.steps };
}
