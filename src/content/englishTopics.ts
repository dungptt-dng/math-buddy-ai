// Ngân hàng nội dung khu "Làm quen tiếng Anh – English Practice" cho trẻ 6–7 tuổi.
// Mỗi chủ đề chỉ có 2–5 từ mới, gần với Toán lớp 1. Mỗi câu luyện tập được dựng bằng một hàm dựng từ chính từ vựng,
// nên hình, chữ và đáp án luôn khớp nhau. Chấm điểm cố định theo đáp án chuẩn; không có AI sinh câu hỏi.
// LƯU Ý: nội dung do nhóm phát triển soạn, CHƯA được giáo viên tiếng Anh tiểu học rà soát.
import type { Group, ShapeKind } from './types';

/** Hình minh họa cho từ vựng (vẽ từ dữ liệu, không dùng ảnh ngoài). */
export type EnPic =
  | { k: 'num'; n: number }
  | { k: 'text'; t: string }
  | { k: 'objs'; icon: string; n: number; tag?: 'count' | 'ask' }
  | { k: 'shape'; shape: ShapeKind }
  | { k: 'sign'; s: '+' | '−' | '=' }
  | { k: 'expr'; tokens: string[] }
  | { k: 'join'; icon: string; a: number; b: number }
  | { k: 'take'; icon: string; total: number; away: number }
  | { k: 'groups'; left: Group; right: Group; hi: 'left' | 'right' | 'both' }
  | { k: 'nums'; a: number; b: number; hi: 'a' | 'b' }
  | { k: 'pos'; p: 'above' | 'below' | 'inside' | 'outside' }
  | { k: 'bars'; hi: 'long' | 'short' }
  | { k: 'tall' }
  | { k: 'emoji'; e: string };

export type EnWord = { id: string; text: string; vi: string; pic: EnPic };

/** Dạng bài: nghe–chọn từ, nghe–chọn hình, nhìn hình–chọn từ, nối, điền chỗ trống, mẫu câu. */
export type EnExercise = 'listen_word' | 'listen_picture' | 'picture_word' | 'match' | 'missing' | 'sentence';
/** Nhóm kết quả cho Góc giáo viên: nghe, nhận diện từ, mẫu câu. */
export type EnSkill = 'listening' | 'recognition' | 'sentence';
export const EN_SKILL: Record<EnExercise, EnSkill> = {
  listen_word: 'listening',
  listen_picture: 'listening',
  picture_word: 'recognition',
  match: 'recognition',
  missing: 'recognition',
  sentence: 'sentence',
};

/** Câu tiếng Anh ngắn + nghĩa tiếng Việt (hiển thị riêng, không trộn vào lời Buddy). */
export type Line = { en: string; vi: string };
export type EnOption = { id: string; text?: string; vi?: string; pic?: EnPic };

type QBase = {
  id: string;
  type: EnExercise;
  ask: Line;
  /** Câu Buddy đọc to bằng giọng tiếng Anh. */
  say: string;
  /** Bài nghe: chưa hiện chữ của từ cho đến khi con trả lời xong. */
  listen?: boolean;
  pic?: EnPic;
  /** Dòng chữ có chỗ trống, ví dụ "c _ r c l e". */
  text?: string;
  /** Các từ được luyện trong câu (để theo dõi từng từ). */
  words: string[];
  /** Câu đầy đủ đọc lại sau khi xong (câu điền chỗ trống). */
  full?: string;
};
export type EnChoiceQ = QBase & { kind: 'choice'; options: EnOption[]; answer: string };
export type EnMatchQ = QBase & { kind: 'match'; left: EnOption[]; right: EnOption[]; answer: Record<string, string> };
export type EnQuestion = EnChoiceQ | EnMatchQ;

export type EnTopic = {
  id: string;
  title: string;
  vi: string;
  icon: string;
  order: number;
  words: string[];
  questions: EnQuestion[];
};

// ---------- Từ vựng ----------

const NUM_VI = ['', 'Số một', 'Số hai', 'Số ba', 'Số bốn', 'Số năm', 'Số sáu', 'Số bảy', 'Số tám', 'Số chín', 'Số mười'];
const NUM_EN = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const LIST: EnWord[] = [
  ...NUM_EN.slice(1).map((text, i) => ({ id: text, text, vi: NUM_VI[i + 1], pic: { k: 'num', n: i + 1 } as EnPic })),
  { id: 'count', text: 'count', vi: 'Đếm', pic: { k: 'objs', icon: 'apple', n: 3, tag: 'count' } },
  { id: 'how-many', text: 'how many', vi: 'Có bao nhiêu?', pic: { k: 'objs', icon: 'duck', n: 4, tag: 'ask' } },
  { id: 'number', text: 'number', vi: 'Số', pic: { k: 'text', t: '1 2 3' } },
  { id: 'add', text: 'add', vi: 'Cộng thêm, gộp vào', pic: { k: 'join', icon: 'apple', a: 2, b: 1 } },
  { id: 'plus', text: 'plus', vi: 'Dấu cộng (+)', pic: { k: 'sign', s: '+' } },
  { id: 'equals', text: 'equals', vi: 'Dấu bằng (=)', pic: { k: 'sign', s: '=' } },
  { id: 'subtract', text: 'subtract', vi: 'Làm phép trừ', pic: { k: 'expr', tokens: ['5', '−', '2', '=', '3'] } },
  { id: 'minus', text: 'minus', vi: 'Dấu trừ (−)', pic: { k: 'sign', s: '−' } },
  { id: 'take-away', text: 'take away', vi: 'Bớt đi, lấy đi', pic: { k: 'take', icon: 'apple', total: 5, away: 2 } },
  { id: 'more', text: 'more', vi: 'Nhiều hơn', pic: { k: 'groups', left: { icon: 'star', count: 5 }, right: { icon: 'star', count: 2 }, hi: 'left' } },
  { id: 'less', text: 'less', vi: 'Ít hơn', pic: { k: 'groups', left: { icon: 'fish', count: 2 }, right: { icon: 'fish', count: 5 }, hi: 'left' } },
  { id: 'greater', text: 'greater', vi: 'Lớn hơn', pic: { k: 'nums', a: 7, b: 4, hi: 'a' } },
  { id: 'smaller', text: 'smaller', vi: 'Bé hơn', pic: { k: 'nums', a: 3, b: 8, hi: 'a' } },
  { id: 'equal', text: 'equal', vi: 'Bằng nhau', pic: { k: 'groups', left: { icon: 'flower', count: 3 }, right: { icon: 'flower', count: 3 }, hi: 'both' } },
  { id: 'circle', text: 'circle', vi: 'Hình tròn', pic: { k: 'shape', shape: 'circle' } },
  { id: 'square', text: 'square', vi: 'Hình vuông', pic: { k: 'shape', shape: 'square' } },
  { id: 'triangle', text: 'triangle', vi: 'Hình tam giác', pic: { k: 'shape', shape: 'triangle' } },
  { id: 'rectangle', text: 'rectangle', vi: 'Hình chữ nhật', pic: { k: 'shape', shape: 'rectangle' } },
  { id: 'above', text: 'above', vi: 'Ở trên', pic: { k: 'pos', p: 'above' } },
  { id: 'below', text: 'below', vi: 'Ở dưới', pic: { k: 'pos', p: 'below' } },
  { id: 'inside', text: 'inside', vi: 'Ở trong', pic: { k: 'pos', p: 'inside' } },
  { id: 'outside', text: 'outside', vi: 'Ở ngoài', pic: { k: 'pos', p: 'outside' } },
  { id: 'long', text: 'long', vi: 'Dài', pic: { k: 'bars', hi: 'long' } },
  { id: 'short', text: 'short', vi: 'Ngắn', pic: { k: 'bars', hi: 'short' } },
  { id: 'tall', text: 'tall', vi: 'Cao', pic: { k: 'tall' } },
  { id: 'heavy', text: 'heavy', vi: 'Nặng', pic: { k: 'emoji', e: '🐘' } },
  { id: 'light', text: 'light', vi: 'Nhẹ', pic: { k: 'emoji', e: '🎈' } },
];
export const WORDS: Record<string, EnWord> = Object.fromEntries(LIST.map((w) => [w.id, w]));

const w = (id: string) => {
  const x = WORDS[id];
  if (!x) throw new Error(`Chưa có từ "${id}" trong ngân hàng từ vựng`);
  return x;
};
/** "One – Số một" */
export const wordLine = (id: string) => `${cap(w(id).text)} – ${w(id).vi}`;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Hàm dựng câu luyện tập ----------

/** Xếp phương án theo một thứ tự cố định nhưng khác nhau giữa các câu (đáp án không luôn ở vị trí đầu). */
function arrange<T>(items: T[], id: string): T[] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = h % items.length;
  return [...items.slice(r), ...items.slice(0, r)];
}

const wordOpts = (ids: string[], qid: string): EnOption[] => arrange(ids.map((id) => ({ id, text: w(id).text })), qid);
const picOpts = (ids: string[], qid: string): EnOption[] => arrange(ids.map((id) => ({ id, pic: w(id).pic })), qid);

/** Nghe Buddy đọc từ rồi chọn từ đúng. */
function listenWord(id: string, word: string, others: string[]): EnChoiceQ {
  return {
    id,
    kind: 'choice',
    type: 'listen_word',
    ask: { en: 'Listen and choose the word.', vi: 'Nghe Buddy đọc, chọn từ đúng.' },
    say: w(word).text,
    listen: true,
    words: [word],
    options: wordOpts([word, ...others], id),
    answer: word,
  };
}

/** Nghe từ rồi chọn hình tương ứng. */
function listenPicture(id: string, word: string, others: string[]): EnChoiceQ {
  return {
    id,
    kind: 'choice',
    type: 'listen_picture',
    ask: { en: 'Listen and choose the picture.', vi: 'Nghe Buddy đọc, chọn hình đúng.' },
    say: w(word).text,
    listen: true,
    words: [word],
    options: picOpts([word, ...others], id),
    answer: word,
  };
}

/** Nhìn hình, chọn từ tiếng Anh. */
function pictureWord(id: string, word: string, others: string[]): EnChoiceQ {
  return {
    id,
    kind: 'choice',
    type: 'picture_word',
    ask: { en: 'Look and choose the word.', vi: 'Nhìn hình, chọn từ tiếng Anh đúng.' },
    say: 'Look and choose the word.',
    pic: w(word).pic,
    words: [word],
    options: wordOpts([word, ...others], id),
    answer: word,
  };
}

/** Nối 3 từ với hình (to: 'pic') hoặc với nghĩa tiếng Việt (to: 'vi'). */
function match(id: string, words: string[], to: 'pic' | 'vi'): EnMatchQ {
  // Cột phải xếp lệch với cột trái để con phải tìm, không nối thẳng hàng.
  const right = words.map((x) => ({ id: `m-${x}`, ...(to === 'pic' ? { pic: w(x).pic } : { vi: w(x).vi }) }));
  return {
    id,
    kind: 'match',
    type: 'match',
    ask: to === 'pic' ? { en: 'Match the words and pictures.', vi: 'Nối từ tiếng Anh với hình.' } : { en: 'Match the words.', vi: 'Nối từ tiếng Anh với nghĩa tiếng Việt.' },
    say: to === 'pic' ? 'Match the words and pictures.' : 'Match the words.',
    words,
    left: words.map((x) => ({ id: x, text: w(x).text })),
    right: [...right.slice(1), right[0]],
    answer: Object.fromEntries(words.map((x) => [x, `m-${x}`])),
  };
}

/** Chọn chữ cái còn thiếu trong từ (có hình và tiếng đọc để con dựa vào). */
function missingLetter(id: string, word: string, at: number, letters: string[]): EnChoiceQ {
  const t = w(word).text;
  const right = t[at];
  return {
    id,
    kind: 'choice',
    type: 'missing',
    ask: { en: 'Choose the missing letter.', vi: 'Chọn chữ cái còn thiếu.' },
    say: t,
    pic: w(word).pic,
    text: [...t].map((c, i) => (i === at ? '_' : c)).join(' '),
    full: t,
    words: [word],
    options: arrange([right, ...letters.filter((l) => l !== right)].map((l) => ({ id: l, text: l })), id),
    answer: right,
  };
}

/** Chọn từ còn thiếu trong câu ngắn. `text` có "___" ở chỗ trống. */
function missingWord(id: string, b: { text: string; word: string; others: string[]; pic?: EnPic; vi: string }): EnChoiceQ {
  if (!b.text.includes('___')) throw new Error(`${id}: thiếu chỗ trống`);
  return {
    id,
    kind: 'choice',
    type: 'missing',
    ask: { en: 'Choose the missing word.', vi: b.vi },
    say: b.text.replace('___', '…'),
    pic: b.pic,
    text: b.text,
    full: b.text.replace('___', w(b.word).text),
    words: [b.word],
    options: wordOpts([b.word, ...b.others], id),
    answer: b.word,
  };
}

/** Luyện mẫu câu: Buddy hỏi một câu tiếng Anh ngắn, con chọn câu trả lời (chữ hoặc hình). Phương án đầu tiên là đáp án. */
function sentence(id: string, b: { ask: Line; pic?: EnPic; options: ({ text: string } | { pic: EnPic })[]; word: string }): EnChoiceQ {
  const options = b.options.map((o, i) => ({ id: String.fromCharCode(97 + i), ...o }));
  return {
    id,
    kind: 'choice',
    type: 'sentence',
    ask: b.ask,
    say: b.ask.en,
    pic: b.pic,
    words: [b.word],
    options: arrange(options, id),
    answer: 'a',
  };
}

const objs = (icon: string, n: number): EnPic => ({ k: 'objs', icon, n });

// ---------- Chủ đề ----------

export const TOPICS: EnTopic[] = [
  {
    id: 'en-numbers-1-5',
    title: 'Numbers 1–5',
    vi: 'Các số từ 1 đến 5',
    icon: '🔢',
    order: 1,
    words: ['one', 'two', 'three', 'four', 'five'],
    questions: [
      pictureWord('n5-1', 'one', ['three', 'five']),
      listenPicture('n5-2', 'two', ['one', 'four']),
      listenWord('n5-3', 'three', ['two', 'five']),
      match('n5-4', ['one', 'two', 'three'], 'pic'),
      pictureWord('n5-5', 'four', ['five', 'two']),
      listenPicture('n5-6', 'five', ['three', 'four']),
      match('n5-7', ['three', 'four', 'five'], 'pic'),
      sentence('n5-8', { ask: { en: 'How many stars?', vi: 'Có bao nhiêu ngôi sao?' }, pic: objs('star', 4), options: [{ text: 'Four.' }, { text: 'Two.' }, { text: 'Five.' }], word: 'four' }),
    ],
  },
  {
    id: 'en-numbers-6-10',
    title: 'Numbers 6–10',
    vi: 'Các số từ 6 đến 10',
    icon: '🔟',
    order: 2,
    words: ['six', 'seven', 'eight', 'nine', 'ten'],
    questions: [
      pictureWord('n10-1', 'six', ['seven', 'nine']),
      listenPicture('n10-2', 'seven', ['six', 'ten']),
      listenWord('n10-3', 'eight', ['six', 'nine']),
      match('n10-4', ['six', 'seven', 'eight'], 'pic'),
      pictureWord('n10-5', 'nine', ['eight', 'ten']),
      listenPicture('n10-6', 'ten', ['nine', 'seven']),
      match('n10-7', ['eight', 'nine', 'ten'], 'vi'),
      sentence('n10-8', { ask: { en: 'How many fish?', vi: 'Có bao nhiêu con cá?' }, pic: objs('fish', 6), options: [{ text: 'Six.' }, { text: 'Eight.' }, { text: 'Nine.' }], word: 'six' }),
      missingWord('n10-9', { text: 'six, seven, ___, nine, ten', word: 'eight', others: ['three', 'ten'], vi: 'Chọn số còn thiếu khi đếm.' }),
    ],
  },
  {
    id: 'en-counting',
    title: 'Counting',
    vi: 'Đếm số lượng',
    icon: '👆',
    order: 3,
    words: ['count', 'how-many', 'number'],
    questions: [
      pictureWord('cnt-1', 'number', ['count', 'how-many']),
      listenPicture('cnt-2', 'count', ['number', 'how-many']),
      match('cnt-3', ['count', 'how-many', 'number'], 'vi'),
      sentence('cnt-4', { ask: { en: 'How many apples?', vi: 'Có bao nhiêu quả táo?' }, pic: objs('apple', 3), options: [{ text: 'Three.' }, { text: 'Five.' }, { text: 'One.' }], word: 'how-many' }),
      listenWord('cnt-5', 'how-many', ['count', 'number']),
      missingWord('cnt-6', { text: "Let's ___: one, two, three!", word: 'count', others: ['number', 'plus'], pic: WORDS.count.pic, vi: 'Chọn từ còn thiếu trong câu.' }),
      sentence('cnt-7', { ask: { en: 'How many ducks?', vi: 'Có bao nhiêu con vịt?' }, pic: objs('duck', 5), options: [{ text: 'Five.' }, { text: 'Four.' }, { text: 'Two.' }], word: 'how-many' }),
      pictureWord('cnt-8', 'how-many', ['count', 'number']),
    ],
  },
  {
    id: 'en-addition',
    title: 'Addition',
    vi: 'Phép cộng',
    icon: '➕',
    order: 4,
    words: ['add', 'plus', 'equals'],
    questions: [
      pictureWord('add-1', 'plus', ['equals', 'three']),
      listenPicture('add-2', 'equals', ['plus', 'two']),
      pictureWord('add-3', 'add', ['equals', 'number']),
      match('add-4', ['add', 'plus', 'equals'], 'vi'),
      missingWord('add-5', { text: 'Two ___ one equals three.', word: 'plus', others: ['equals'], pic: { k: 'expr', tokens: ['2', '+', '1', '=', '3'] }, vi: 'Chọn từ còn thiếu trong câu.' }),
      missingWord('add-6', { text: 'One plus two ___ three.', word: 'equals', others: ['plus'], pic: { k: 'expr', tokens: ['1', '+', '2', '=', '3'] }, vi: 'Chọn từ còn thiếu trong câu.' }),
      sentence('add-7', { ask: { en: 'What is one plus one?', vi: 'Một cộng một bằng mấy?' }, pic: { k: 'expr', tokens: ['1', '+', '1', '=', '?'] }, options: [{ text: 'Two.' }, { text: 'Three.' }, { text: 'Five.' }], word: 'plus' }),
      listenWord('add-8', 'add', ['plus', 'equals']),
    ],
  },
  {
    id: 'en-subtraction',
    title: 'Subtraction',
    vi: 'Phép trừ',
    icon: '➖',
    order: 5,
    words: ['subtract', 'minus', 'take-away'],
    questions: [
      pictureWord('sub-1', 'minus', ['plus', 'equals']),
      pictureWord('sub-2', 'take-away', ['add', 'equals']),
      listenPicture('sub-3', 'minus', ['plus', 'equals']),
      listenWord('sub-4', 'subtract', ['add', 'count']),
      match('sub-5', ['subtract', 'minus', 'take-away'], 'vi'),
      missingWord('sub-6', { text: 'Five ___ two equals three.', word: 'minus', others: ['plus'], pic: { k: 'expr', tokens: ['5', '−', '2', '=', '3'] }, vi: 'Chọn từ còn thiếu trong câu.' }),
      sentence('sub-7', { ask: { en: 'Take away two. How many are left?', vi: 'Bớt đi 2. Còn lại bao nhiêu?' }, pic: { k: 'take', icon: 'banana', total: 4, away: 2 }, options: [{ text: 'Two.' }, { text: 'Four.' }, { text: 'Six.' }], word: 'take-away' }),
      sentence('sub-8', { ask: { en: 'What is five minus one?', vi: 'Năm trừ một bằng mấy?' }, pic: { k: 'expr', tokens: ['5', '−', '1', '=', '?'] }, options: [{ text: 'Four.' }, { text: 'Six.' }, { text: 'Three.' }], word: 'minus' }),
    ],
  },
  {
    id: 'en-comparison',
    title: 'Comparison',
    vi: 'So sánh',
    icon: '⚖️',
    order: 6,
    words: ['more', 'less', 'greater', 'smaller', 'equal'],
    questions: [
      pictureWord('cmp-1', 'more', ['less', 'equal']),
      listenWord('cmp-2', 'less', ['more', 'equal']),
      listenPicture('cmp-3', 'equal', ['more', 'less']),
      match('cmp-4', ['more', 'less', 'equal'], 'vi'),
      pictureWord('cmp-5', 'greater', ['smaller', 'plus']),
      pictureWord('cmp-6', 'smaller', ['greater', 'minus']),
      match('cmp-7', ['greater', 'smaller', 'equal'], 'vi'),
      sentence('cmp-8', { ask: { en: 'Which group has more?', vi: 'Nhóm nào nhiều hơn?' }, options: [{ pic: objs('apple', 6) }, { pic: objs('apple', 3) }], word: 'more' }),
      missingWord('cmp-9', { text: 'Seven is ___ than four.', word: 'greater', others: ['smaller'], pic: { k: 'nums', a: 7, b: 4, hi: 'a' }, vi: 'Chọn từ còn thiếu trong câu.' }),
    ],
  },
  {
    id: 'en-shapes',
    title: 'Shapes',
    vi: 'Các hình',
    icon: '🔺',
    order: 7,
    words: ['circle', 'square', 'triangle', 'rectangle'],
    questions: [
      pictureWord('shp-1', 'circle', ['square', 'triangle']),
      listenPicture('shp-2', 'triangle', ['circle', 'square']),
      pictureWord('shp-3', 'rectangle', ['square', 'circle']),
      listenWord('shp-4', 'square', ['circle', 'rectangle']),
      match('shp-5', ['circle', 'square', 'triangle'], 'pic'),
      sentence('shp-6', {
        ask: { en: 'What shape is it?', vi: 'Đây là hình gì?' },
        pic: WORDS.rectangle.pic,
        options: [{ text: 'It is a rectangle.' }, { text: 'It is a circle.' }, { text: 'It is a triangle.' }],
        word: 'rectangle',
      }),
      missingLetter('shp-7', 'circle', 1, ['a', 'o']),
      listenPicture('shp-8', 'rectangle', ['square', 'triangle']),
    ],
  },
  {
    id: 'en-position',
    title: 'Position',
    vi: 'Vị trí',
    icon: '📦',
    order: 8,
    words: ['above', 'below', 'inside', 'outside'],
    questions: [
      pictureWord('pos-1', 'above', ['below', 'inside']),
      pictureWord('pos-2', 'inside', ['outside', 'above']),
      listenPicture('pos-3', 'below', ['above', 'inside']),
      listenPicture('pos-4', 'outside', ['inside', 'below']),
      match('pos-5', ['above', 'below', 'inside'], 'pic'),
      sentence('pos-6', {
        ask: { en: 'Where is the ball?', vi: 'Quả bóng ở đâu?' },
        pic: WORDS.outside.pic,
        options: [{ text: 'Outside the box.' }, { text: 'Inside the box.' }, { text: 'Above the box.' }],
        word: 'outside',
      }),
      match('pos-7', ['above', 'below', 'outside'], 'vi'),
      listenWord('pos-8', 'inside', ['outside', 'above']),
    ],
  },
  {
    id: 'en-measurement',
    title: 'Measurement',
    vi: 'Đo lường',
    icon: '📏',
    order: 9,
    words: ['long', 'short', 'tall', 'heavy', 'light'],
    questions: [
      pictureWord('msr-1', 'long', ['short', 'tall']),
      pictureWord('msr-2', 'short', ['long', 'heavy']),
      listenPicture('msr-3', 'tall', ['long', 'heavy']),
      pictureWord('msr-4', 'heavy', ['light', 'tall']),
      listenPicture('msr-5', 'light', ['heavy', 'short']),
      match('msr-6', ['long', 'short', 'tall'], 'vi'),
      match('msr-7', ['heavy', 'light', 'tall'], 'pic'),
      sentence('msr-8', { ask: { en: 'Which one is heavy?', vi: 'Con vật nào nặng?' }, options: [{ pic: { k: 'emoji', e: '🐘' } }, { pic: { k: 'emoji', e: '🐭' } }, { pic: { k: 'emoji', e: '🐤' } }], word: 'heavy' }),
      listenWord('msr-9', 'short', ['long', 'light']),
    ],
  },
];

export type EnGame = { id: string; title: string; englishName: string; howTo: string; size: number; types: EnExercise[] };

/** Trò chơi từ vựng: lấy câu nghe/nhìn trong ngân hàng, chỉ với các từ con đã học. */
export const EN_GAMES: EnGame[] = [
  {
    id: 'word-balloons',
    title: 'Bóng bay từ vựng',
    englishName: 'Word Balloons',
    howTo: 'Nghe và nhìn, chọn đúng từ để thả bóng bay. Dùng các từ con đã học.',
    size: 8,
    types: ['listen_picture', 'picture_word', 'listen_word'],
  },
];
/** Trò chơi mở khi có ít nhất chừng này câu dùng từ con đã học. */
export const MIN_EN_GAME_QUESTIONS = 5;
