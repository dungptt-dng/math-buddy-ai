// Chấm điểm XÁC ĐỊNH theo đáp án chuẩn đã lưu. Không dùng AI để quyết định đúng/sai.
import type { Option } from './content/types.js';

export type GradeStatus = 'correct' | 'wrong' | 'invalid';

export type GradableQuestion = {
  kind: 'choice' | 'number' | 'multi';
  options?: Option[] | null;
  answer: string | number | string[];
};

/** Chuẩn hóa số trẻ nhập: bỏ khoảng trắng, chấp nhận chữ số toàn chiều rộng (từ bàn phím tiếng Việt/IME). */
export function parseNumberInput(input: unknown): number | null {
  if (typeof input === 'number') return Number.isInteger(input) && input >= 0 && input <= 999 ? input : null;
  if (typeof input !== 'string') return null;
  const s = input
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xff10 + 48))
    .replace(/\s+/g, '');
  if (!/^\d{1,3}$/.test(s)) return null;
  return Number(s);
}

export function grade(q: GradableQuestion, input: unknown): GradeStatus {
  const ids = new Set((q.options ?? []).map((o) => o.id));
  switch (q.kind) {
    case 'number': {
      const n = parseNumberInput(input);
      if (n === null) return 'invalid';
      return n === q.answer ? 'correct' : 'wrong';
    }
    case 'choice': {
      if (typeof input !== 'string' || !ids.has(input)) return 'invalid';
      return input === q.answer ? 'correct' : 'wrong';
    }
    case 'multi': {
      if (!Array.isArray(input) || input.length === 0) return 'invalid';
      if (!input.every((x) => typeof x === 'string' && ids.has(x))) return 'invalid';
      const picked = new Set(input as string[]);
      if (picked.size !== input.length) return 'invalid';
      const expected = new Set(q.answer as string[]);
      return picked.size === expected.size && [...picked].every((x) => expected.has(x)) ? 'correct' : 'wrong';
    }
  }
}

// Lời thoại của Buddy: CHỈ tiếng Anh đơn giản, không trộn tiếng Việt.
export const BUDDY_CORRECT = ['Great job!', 'Well done!', 'You got it!', 'Excellent!', 'Super!', "Let's try the next one!"];
export const BUDDY_TRY_AGAIN = ['Good try!', "Let's try again.", 'You can do it!'];
export const BUDDY_REVEAL = "Good try! Let's learn it together.";

export function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

/** Số lần trả lời tối đa cho mỗi câu trước khi Buddy hướng dẫn đáp án. */
export const MAX_TRIES = 2;
