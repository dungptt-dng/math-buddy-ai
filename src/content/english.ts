// Từ ngữ tiếng Anh đơn giản để dựng lời Buddy cho từng câu hỏi (học sinh lớp 1 mới làm quen tiếng Anh).
import type { EnglishLines, ShapeKind, SkillId } from './types';

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

/** 3 -> "three" */
export function word(n: number): string {
  const w = NUMBER_WORDS[n];
  if (!w) throw new Error(`Chưa có từ tiếng Anh cho số ${n}`);
  return w;
}

/** Viết hoa chữ đầu câu. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const NOUN_EN: Record<string, [string, string]> = {
  apple: ['apple', 'apples'],
  star: ['star', 'stars'],
  fish: ['fish', 'fish'],
  flower: ['flower', 'flowers'],
  sunflower: ['flower', 'flowers'],
  chick: ['chick', 'chicks'],
  duck: ['duck', 'ducks'],
  balloon: ['balloon', 'balloons'],
  banana: ['banana', 'bananas'],
  car: ['car', 'cars'],
  ladybug: ['ladybug', 'ladybugs'],
  strawberry: ['strawberry', 'strawberries'],
  candy: ['candy', 'candies'],
  cake: ['cupcake', 'cupcakes'],
  butterfly: ['butterfly', 'butterflies'],
  carrot: ['carrot', 'carrots'],
};

/** Tên tiếng Anh của đồ vật, số ít hoặc số nhiều theo n. */
export function thing(icon: string, n = 2): string {
  const w = NOUN_EN[icon];
  if (!w) throw new Error(`Thiếu tên tiếng Anh cho biểu tượng ${icon}`);
  return n === 1 ? w[0] : w[1];
}

export const SHAPE_TIP: Record<ShapeKind, string> = {
  circle: 'A circle is round. It has no corners.',
  triangle: 'A triangle has 3 corners.',
  square: 'A square has 4 sides. They are all the same.',
  rectangle: 'A rectangle has 2 long sides and 2 short sides.',
};

/** Lời khen theo kỹ năng. */
export const SKILL_PRAISE: Record<SkillId, string> = {
  count: 'Wonderful counting!',
  read_number: 'Wonderful counting!',
  number_order: 'Super number work!',
  compare: 'Great comparing!',
  add: 'Great adding!',
  sub: 'Nice subtracting!',
  shapes: 'Amazing! You found the correct shape!',
  length: 'Great looking!',
  vocab: 'Great English!',
};

const SKILL_TIPS: Record<SkillId, [string, string]> = {
  count: ['Try counting one by one!', "Let's count together. Point to each one."],
  read_number: ['Count each group.', 'Point and count. One, two, three…'],
  number_order: ['Count out loud from the start.', 'What comes next when you count?'],
  compare: ['Count each group.', 'Which number is bigger?'],
  add: ['Use your fingers!', 'Count them all together.'],
  sub: ['Use your fingers!', 'Take some away. Count what is left.'],
  shapes: ['Look at the corners.', 'Look at each one carefully.'],
  length: ['Look at the right ends.', 'Which one goes farther?'],
  vocab: ['Listen to the word.', 'Tap the speaker. Listen again.'],
};

const GENERIC_STEPS = ['Read the question again.', 'Look at each answer.', 'Which one fits best?'];

/** Lời Buddy mặc định theo kỹ năng, dùng khi câu hỏi không có lời riêng. */
export function defaultLines(skill: SkillId, extra: Partial<EnglishLines> = {}): EnglishLines {
  return { praise: SKILL_PRAISE[skill], tips: SKILL_TIPS[skill], steps: GENERIC_STEPS, ...extra };
}

/** "1, 2, 3" – dùng chữ số để trẻ chưa đọc được tiếng Anh vẫn theo kịp. */
export const countUp = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i).join(', ');
