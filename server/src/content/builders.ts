// Các hàm dựng câu hỏi. Đáp án luôn được TÍNH từ tham số (không gõ tay),
// để hình minh họa, phép tính và đáp án chuẩn không thể lệch nhau.
import type { Group, Level, Option, Question, ShapeKind, SkillId, Visual } from './types.js';

export const NOUN: Record<string, string> = {
  apple: 'quả táo',
  star: 'ngôi sao',
  fish: 'con cá',
  flower: 'bông hoa',
  sunflower: 'bông hoa vàng',
  chick: 'chú gà con',
  duck: 'con vịt',
  balloon: 'quả bóng bay',
  banana: 'quả chuối',
  car: 'chiếc ô tô',
  ladybug: 'con bọ rùa',
  strawberry: 'quả dâu tây',
  candy: 'cái kẹo',
  cake: 'chiếc bánh',
  butterfly: 'con bướm',
  carrot: 'củ cà rốt',
};

/** Bỏ lượng từ để dùng sau "bao nhiêu": "quả táo" -> "quả táo" (giữ nguyên) */
const noun = (icon: string) => {
  const n = NOUN[icon];
  if (!n) throw new Error(`Thiếu tên gọi cho biểu tượng ${icon}`);
  return n;
};

const COUNT_HINTS = [
  'Con hãy chỉ tay vào từng hình và đếm: một, hai, ba…',
  'Hình nào đã đếm rồi thì không đếm lại nữa nhé.',
];

function numberOptions(values: number[]): Option[] {
  return values.map((v) => ({ id: String(v), label: String(v) }));
}

function textOptions(labels: string[]): Option[] {
  return labels.map((label, i) => ({ id: String.fromCharCode(97 + i), label }));
}

function idOf(options: Option[], label: string): string {
  const o = options.find((x) => x.label === label);
  if (!o) throw new Error(`Không tìm thấy phương án "${label}"`);
  return o.id;
}

type Base = { id: string; level: Level };

/** Đếm một nhóm đồ vật. Có `choices` -> chọn đáp án, không có -> nhập số. */
export function count(b: Base & { icon: string; n: number; choices?: number[]; skill?: SkillId }): Question {
  const q: Question = {
    id: b.id,
    prompt: `Có bao nhiêu ${noun(b.icon)}?`,
    visual: { type: 'objects', groups: [{ icon: b.icon, count: b.n }] },
    kind: b.choices ? 'choice' : 'number',
    options: b.choices ? numberOptions(b.choices) : undefined,
    answer: b.choices ? String(b.n) : b.n,
    hints: b.n === 0 ? ['Con nhìn thật kỹ xem có hình nào không nhé.', 'Không có đồ vật nào thì ta dùng số 0.'] : COUNT_HINTS,
    explain: b.n === 0 ? `Không có ${noun(b.icon)} nào, nên ta viết số 0.` : `Đếm lần lượt từng hình, ta được ${b.n} ${noun(b.icon)}.`,
    skill: b.skill ?? 'count',
    level: b.level,
    domain: 'math',
    feedbackCorrect: 'Excellent counting!',
    feedbackWrong: 'Count slowly.',
  };
  return q;
}

/** Chọn nhóm có đúng n đồ vật. */
export function pickGroup(b: Base & { icon: string; n: number; choices: number[] }): Question {
  const options: Option[] = b.choices.map((c, i) => ({ id: String.fromCharCode(97 + i), icon: b.icon, count: c }));
  return {
    id: b.id,
    prompt: `Chọn nhóm có ${b.n} ${noun(b.icon)}.`,
    kind: 'choice',
    options,
    answer: options[b.choices.indexOf(b.n)].id,
    hints: ['Con đếm số hình trong từng nhóm.', `Nhóm đúng có đúng ${b.n} hình, không thừa không thiếu.`],
    explain: `Nhóm đúng có ${b.n} ${noun(b.icon)}.`,
    skill: 'read_number',
    level: b.level,
    domain: 'math',
    feedbackWrong: 'Look at the pictures.',
  };
}

/** Điền số còn thiếu trong dãy số. */
export function sequence(b: Base & { items: (number | null)[]; choices?: number[] }): Question {
  const gap = b.items.indexOf(null);
  if (gap < 1 || b.items.filter((x) => x === null).length !== 1) throw new Error(`${b.id}: cần đúng một ô trống, không ở đầu dãy`);
  const known = b.items.findIndex((x, i) => typeof x === 'number' && typeof b.items[i + 1] === 'number');
  const step = (b.items[known + 1] as number) - (b.items[known] as number);
  const prev = b.items[gap - 1] as number;
  const value = prev + step;
  const descending = step < 0;
  return {
    id: b.id,
    prompt: 'Số nào còn thiếu trong ô trống?',
    visual: { type: 'sequence', items: b.items },
    kind: b.choices ? 'choice' : 'number',
    options: b.choices ? numberOptions(b.choices) : undefined,
    answer: b.choices ? String(value) : value,
    hints: descending
      ? ['Các số đang được đếm lùi: mỗi số bé hơn số đứng trước nó 1 đơn vị.', `Đếm lùi từ ${prev}: số tiếp theo là số nào?`]
      : ['Con đọc to các số từ trái sang phải.', `Đếm tiếp sau số ${prev}: số tiếp theo là số nào?`],
    explain: `Số còn thiếu là ${value}.`,
    skill: 'number_order',
    level: b.level,
    domain: 'math',
  };
}

/** So sánh hai nhóm: hỏi nhóm nhiều hơn / ít hơn / bằng nhau. */
export function compareGroups(b: Base & { left: Group; right: Group; ask: 'more' | 'less'; prompt?: string }): Question {
  const [l, r] = [b.left, b.right];
  const leftName = l.label ?? capital(noun(l.icon).split(' ').slice(1).join(' '));
  const rightName = r.label ?? capital(noun(r.icon).split(' ').slice(1).join(' '));
  const options: Option[] = [
    { id: 'left', label: leftName, icon: l.icon },
    { id: 'right', label: rightName, icon: r.icon },
  ];
  if (l.count === r.count) throw new Error(`${b.id}: hai nhóm bằng nhau, dùng compareEqual`);
  const leftWins = b.ask === 'more' ? l.count > r.count : l.count < r.count;
  const word = b.ask === 'more' ? 'nhiều hơn' : 'ít hơn';
  return {
    id: b.id,
    prompt: b.prompt ?? `Nhóm nào có số lượng ${word}?`,
    visual: { type: 'compare', left: l, right: r },
    kind: 'choice',
    options,
    answer: leftWins ? 'left' : 'right',
    hints: ['Con đếm số lượng của từng nhóm.', 'Con có thể nối mỗi hình bên trái với một hình bên phải. Bên nào còn thừa là bên nhiều hơn.'],
    explain: `Bên trái có ${l.count}, bên phải có ${r.count}. Nhóm ${leftWins ? leftName : rightName} có số lượng ${word}.`,
    skill: 'compare',
    level: b.level,
    domain: 'math',
    vocab: [b.ask],
    feedbackCorrect: 'Great comparing!',
    feedbackWrong: 'Look at the pictures.',
  };
}

/** Điền dấu >, <, = giữa hai số. */
export function compareSign(b: Base & { a: number; b: number }): Question {
  const sign = b.a > b.b ? '>' : b.a < b.b ? '<' : '=';
  const word = sign === '>' ? 'lớn hơn' : sign === '<' ? 'bé hơn' : 'bằng';
  return {
    id: b.id,
    prompt: 'Chọn dấu thích hợp điền vào ô trống.',
    speak: `Chọn dấu thích hợp: ${b.a} và ${b.b}`,
    visual: { type: 'expression', tokens: [String(b.a), '?', String(b.b)] },
    kind: 'choice',
    options: [
      { id: '>', label: '>' },
      { id: '<', label: '<' },
      { id: '=', label: '=' },
    ],
    answer: sign,
    hints: [
      'Con so sánh hai số: số nào lớn hơn? Khi đếm, số đứng sau thì lớn hơn.',
      'Dấu > và dấu < luôn “há miệng” về phía số lớn hơn. Hai số giống nhau thì dùng dấu =.',
    ],
    explain: `${b.a} ${sign} ${b.b} vì ${b.a} ${word} ${b.b}.`,
    skill: 'compare',
    level: b.level,
    domain: 'math',
    feedbackCorrect: 'Great comparing!',
  };
}

/** Chọn số lớn nhất / bé nhất. */
export function extreme(b: Base & { values: number[]; ask: 'max' | 'min' }): Question {
  const v = b.ask === 'max' ? Math.max(...b.values) : Math.min(...b.values);
  return {
    id: b.id,
    prompt: b.ask === 'max' ? 'Số nào lớn nhất?' : 'Số nào bé nhất?',
    kind: 'choice',
    options: numberOptions(b.values),
    answer: String(v),
    hints: ['Con nhớ lại thứ tự khi đếm: 0, 1, 2, 3… đến 10.', b.ask === 'max' ? 'Số được đếm sau cùng là số lớn nhất.' : 'Số được đếm đầu tiên là số bé nhất.'],
    explain: `Trong các số ${b.values.join(', ')}, số ${b.ask === 'max' ? 'lớn' : 'bé'} nhất là ${v}.`,
    skill: 'compare',
    level: b.level,
    domain: 'math',
  };
}

/** Phép tính cộng/trừ dạng a ± b = ? ; có thể ẩn một số hạng (missing). */
export function arith(
  b: Base & { a: number; op: '+' | '-'; b: number; choices?: number[]; missing?: 'b' },
): Question {
  const c = b.op === '+' ? b.a + b.b : b.a - b.b;
  if (c < 0 || c > 10 || b.a > 10 || b.b > 10) throw new Error(`${b.id}: ngoài phạm vi 10`);
  const opWord = b.op === '+' ? 'cộng' : 'trừ';
  const shown = b.op === '-' ? '−' : '+';
  const missing = b.missing === 'b';
  const value = missing ? b.b : c;
  let hints: string[];
  if (missing) {
    hints =
      b.op === '+'
        ? [`Con giơ ${b.a} ngón tay, rồi giơ thêm từng ngón cho đến khi đủ ${c}.`, 'Đếm xem con đã giơ thêm mấy ngón tay.']
        : [`Con giơ ${b.a} ngón tay, rồi gập dần từng ngón cho đến khi còn ${c}.`, 'Đếm xem con đã gập mấy ngón tay.'];
  } else if (b.op === '+') {
    hints =
      b.a === 0 || b.b === 0
        ? ['Cộng với 0 thì số đó không thay đổi.', 'Con nhìn xem số còn lại trong phép tính là số mấy.']
        : [`Con giơ ${b.a} ngón tay, rồi giơ thêm ${b.b} ngón nữa.`, 'Bây giờ con đếm tất cả số ngón tay đang giơ.'];
  } else {
    hints =
      b.b === 0
        ? ['Trừ đi 0 nghĩa là không bớt đi gì cả.', 'Vậy số ban đầu có thay đổi không?']
        : b.a === b.b
          ? ['Con có bao nhiêu thì bớt đi đúng bấy nhiêu.', 'Bớt hết thì còn lại mấy?']
          : [`Con giơ ${b.a} ngón tay, rồi gập bớt ${b.b} ngón.`, 'Bây giờ con đếm số ngón tay còn lại.'];
  }
  return {
    id: b.id,
    prompt: missing ? 'Số nào điền vào ô trống?' : 'Tính kết quả.',
    speak: missing ? `${b.a} ${opWord} mấy bằng ${c}?` : `${b.a} ${opWord} ${b.b} bằng mấy?`,
    visual: { type: 'expression', tokens: missing ? [String(b.a), shown, '?', '=', String(c)] : [String(b.a), shown, String(b.b), '=', '?'] },
    kind: b.choices ? 'choice' : 'number',
    options: b.choices ? numberOptions(b.choices) : undefined,
    answer: b.choices ? String(value) : value,
    hints,
    explain: `${b.a} ${shown} ${b.b} = ${c}.`,
    skill: b.op === '+' ? 'add' : 'sub',
    level: b.level,
    domain: 'math',
    vocab: [b.op === '+' ? 'plus' : 'minus'],
    feedbackCorrect: b.op === '+' ? 'Great adding!' : 'Nice subtracting!',
  };
}

/** Phép cộng có hình: hai nhóm đồ vật. */
export function addPictures(b: Base & { left: Group; right: Group; prompt: string; choices?: number[] }): Question {
  const c = b.left.count + b.right.count;
  return {
    id: b.id,
    prompt: b.prompt,
    visual: { type: 'objects', groups: [b.left, b.right], op: '+' },
    kind: b.choices ? 'choice' : 'number',
    options: b.choices ? numberOptions(b.choices) : undefined,
    answer: b.choices ? String(c) : c,
    hints: ['Con đếm số hình ở nhóm thứ nhất.', 'Rồi đếm tiếp sang nhóm thứ hai, không bắt đầu lại từ 1 nhé.'],
    explain: `${b.left.count} + ${b.right.count} = ${c}.`,
    skill: 'add',
    level: b.level,
    domain: 'math',
    feedbackWrong: 'Look at the pictures.',
  };
}

/** Phép trừ có hình: gạch bớt đồ vật. */
export function subPictures(b: Base & { icon: string; total: number; crossed: number; prompt: string; choices?: number[] }): Question {
  const c = b.total - b.crossed;
  return {
    id: b.id,
    prompt: b.prompt,
    visual: { type: 'crossed', icon: b.icon, total: b.total, crossed: b.crossed },
    kind: b.choices ? 'choice' : 'number',
    options: b.choices ? numberOptions(b.choices) : undefined,
    answer: b.choices ? String(c) : c,
    hints: ['Những hình bị gạch chéo là phần đã bớt đi.', 'Con chỉ đếm những hình KHÔNG bị gạch.'],
    explain: `${b.total} − ${b.crossed} = ${c}.`,
    skill: 'sub',
    level: b.level,
    domain: 'math',
    feedbackWrong: 'Look at the pictures.',
  };
}

/** Bài toán có lời văn, đáp án = a op b. */
export function story(b: Base & { text: string; a: number; op: '+' | '-'; b: number; icon: string; choices?: number[] }): Question {
  const c = b.op === '+' ? b.a + b.b : b.a - b.b;
  if (c < 0 || c > 10) throw new Error(`${b.id}: ngoài phạm vi 10`);
  const visual: Visual =
    b.op === '+'
      ? { type: 'objects', groups: [{ icon: b.icon, count: b.a }, { icon: b.icon, count: b.b }], op: '+' }
      : { type: 'crossed', icon: b.icon, total: b.a, crossed: b.b };
  return {
    id: b.id,
    prompt: b.text,
    visual,
    kind: b.choices ? 'choice' : 'number',
    options: b.choices ? numberOptions(b.choices) : undefined,
    answer: b.choices ? String(c) : c,
    hints:
      b.op === '+'
        ? ['Đề bài nói “thêm”, “tất cả” – vậy ta làm phép cộng.', `Con tính ${b.a} + ${b.b}.`]
        : ['Đề bài nói “bớt”, “còn lại” – vậy ta làm phép trừ.', `Con tính ${b.a} − ${b.b}.`],
    explain: `${b.a} ${b.op === '+' ? '+' : '−'} ${b.b} = ${c}.`,
    skill: b.op === '+' ? 'add' : 'sub',
    level: b.level,
    domain: 'math',
  };
}

/** Chọn phép tính có kết quả cho trước. */
export function whichExpression(b: Base & { target: number; exprs: [number, '+' | '-', number][] }): Question {
  const labels = b.exprs.map(([x, op, y]) => `${x} ${op === '-' ? '−' : '+'} ${y}`);
  const options = textOptions(labels);
  const hits = b.exprs.filter(([x, op, y]) => (op === '+' ? x + y : x - y) === b.target);
  if (hits.length !== 1) throw new Error(`${b.id}: phải có đúng một phép tính đúng`);
  const right = labels[b.exprs.indexOf(hits[0])];
  const op = b.exprs[0][1];
  return {
    id: b.id,
    prompt: `Phép tính nào có kết quả bằng ${b.target}?`,
    kind: 'choice',
    options,
    answer: idOf(options, right),
    hints: ['Con tính kết quả của từng phép tính một.', `Phép tính nào ra đúng ${b.target} thì chọn phép tính đó.`],
    explain: `${right} = ${b.target}.`,
    skill: op === '+' ? 'add' : 'sub',
    level: b.level,
    domain: 'math',
  };
}

const SHAPE_NAME: Record<ShapeKind, string> = {
  circle: 'Hình tròn',
  triangle: 'Hình tam giác',
  square: 'Hình vuông',
  rectangle: 'Hình chữ nhật',
};
export const SHAPE_EN: Record<ShapeKind, string> = { circle: 'circle', triangle: 'triangle', square: 'square', rectangle: 'rectangle' };
const SHAPE_HINT: Record<ShapeKind, string> = {
  circle: 'Hình tròn tròn đều như mặt trăng rằm, không có góc nào.',
  triangle: 'Hình tam giác có 3 góc nhọn, giống miếng bánh sandwich cắt chéo.',
  square: 'Hình vuông có 4 góc và 4 cạnh dài bằng nhau.',
  rectangle: 'Hình chữ nhật có 4 góc, có 2 cạnh dài và 2 cạnh ngắn, giống cái bảng lớp học.',
};
const COLORS = ['#FF8A65', '#58B9F7', '#83DDB4', '#FFC94D', '#B39DDB', '#F48FB1'];

/** Nhìn hình, gọi tên hình. */
export function nameShape(b: Base & { kind: ShapeKind; choices: ShapeKind[]; color?: string }): Question {
  const options: Option[] = b.choices.map((k) => ({ id: k, label: SHAPE_NAME[k] }));
  return {
    id: b.id,
    prompt: 'Đây là hình gì?',
    visual: { type: 'shapes', shapes: [{ kind: b.kind, color: b.color ?? COLORS[0] }] },
    kind: 'choice',
    options,
    answer: b.kind,
    hints: ['Con nhìn xem hình có mấy góc, hay không có góc nào.', SHAPE_HINT[b.kind]],
    explain: `Đây là ${SHAPE_NAME[b.kind].toLowerCase()}.`,
    skill: 'shapes',
    level: b.level,
    domain: 'math',
    vocab: [SHAPE_EN[b.kind]],
    feedbackCorrect: 'Super shape spotting!',
    feedbackWrong: 'Look at the shapes.',
  };
}

/** Chọn đúng hình theo tên. */
export function pickShape(b: Base & { kind: ShapeKind; choices: ShapeKind[] }): Question {
  const options: Option[] = b.choices.map((k, i) => ({ id: k, shape: k, color: COLORS[i % COLORS.length] }));
  return {
    id: b.id,
    prompt: `Chọn ${SHAPE_NAME[b.kind].toLowerCase()}.`,
    kind: 'choice',
    options,
    answer: b.kind,
    hints: [SHAPE_HINT[b.kind], 'Con nhìn kỹ từng hình một rồi mới chọn nhé.'],
    explain: `Hình đúng là ${SHAPE_NAME[b.kind].toLowerCase()}. ${SHAPE_HINT[b.kind]}`,
    skill: 'shapes',
    level: b.level,
    domain: 'math',
    feedbackCorrect: 'Super shape spotting!',
    feedbackWrong: 'Look at the shapes.',
  };
}

/** Chạm vào TẤT CẢ các hình cùng loại (Shape Hunt). */
export function huntShapes(b: Base & { kind: ShapeKind; shapes: ShapeKind[] }): Question {
  const options: Option[] = b.shapes.map((k, i) => ({ id: `s${i + 1}`, shape: k, color: COLORS[(i * 2 + 1) % COLORS.length] }));
  const answer = options.filter((o) => o.shape === b.kind).map((o) => o.id);
  return {
    id: b.id,
    prompt: `Chạm vào tất cả các ${SHAPE_NAME[b.kind].toLowerCase()}, rồi bấm Kiểm tra.`,
    kind: 'multi',
    options,
    answer,
    hints: [SHAPE_HINT[b.kind], `Có tất cả ${answer.length} ${SHAPE_NAME[b.kind].toLowerCase()}. Con tìm đủ chưa?`],
    explain: `Có ${answer.length} ${SHAPE_NAME[b.kind].toLowerCase()}.`,
    skill: 'shapes',
    level: b.level,
    domain: 'math',
    feedbackCorrect: 'Super shape spotting!',
    feedbackWrong: 'Look at the shapes.',
  };
}

/** Đếm số hình cùng loại trong một hàng hình. */
export function countShapes(b: Base & { kind: ShapeKind; shapes: ShapeKind[] }): Question {
  const n = b.shapes.filter((s) => s === b.kind).length;
  return {
    id: b.id,
    prompt: `Có bao nhiêu ${SHAPE_NAME[b.kind].toLowerCase()}?`,
    visual: { type: 'shapes', shapes: b.shapes.map((k, i) => ({ kind: k, color: COLORS[i % COLORS.length] })) },
    kind: 'number',
    answer: n,
    hints: [SHAPE_HINT[b.kind], `Con chỉ đếm ${SHAPE_NAME[b.kind].toLowerCase()}, bỏ qua các hình khác.`],
    explain: `Có ${n} ${SHAPE_NAME[b.kind].toLowerCase()}.`,
    skill: 'shapes',
    level: b.level,
    domain: 'math',
    feedbackCorrect: 'Excellent counting!',
    feedbackWrong: 'Look at the shapes.',
  };
}

/** Chọn hình khác loại với các hình còn lại. */
export function oddShape(b: Base & { shapes: ShapeKind[] }): Question {
  const odd = b.shapes.filter((s) => b.shapes.filter((t) => t === s).length === 1);
  if (odd.length !== 1) throw new Error(`${b.id}: cần đúng một hình khác loại`);
  const options: Option[] = b.shapes.map((k, i) => ({ id: `s${i + 1}`, shape: k, color: COLORS[2] }));
  const answer = options.find((o) => o.shape === odd[0])!.id;
  return {
    id: b.id,
    prompt: 'Chọn hình không giống các hình còn lại.',
    kind: 'choice',
    options,
    answer,
    hints: ['Con gọi tên từng hình một.', 'Có một hình có tên khác với tất cả các hình kia.'],
    explain: `${SHAPE_NAME[odd[0]]} khác với các hình còn lại.`,
    skill: 'shapes',
    level: b.level,
    domain: 'math',
    feedbackWrong: 'Look at the shapes.',
  };
}

const BAR_COLORS = ['#FF8A65', '#58B9F7', '#83DDB4'];

/** So sánh độ dài các băng giấy / bút chì. */
export function lengths(
  b: Base & { lengths: number[]; ask: 'longer' | 'shorter' | 'longest' | 'shortest'; thing?: string; units?: boolean },
): Question {
  const labels = b.lengths.map((_, i) => String.fromCharCode(65 + i));
  const thing = b.thing ?? 'Bút chì';
  const options: Option[] = labels.map((l) => ({ id: l, label: `${thing} ${l}` }));
  const pick = b.ask === 'longer' || b.ask === 'longest' ? Math.max(...b.lengths) : Math.min(...b.lengths);
  if (b.lengths.filter((x) => x === pick).length !== 1) throw new Error(`${b.id}: đáp án không duy nhất`);
  const word = { longer: 'dài hơn', shorter: 'ngắn hơn', longest: 'dài nhất', shortest: 'ngắn nhất' }[b.ask];
  const answer = labels[b.lengths.indexOf(pick)];
  return {
    id: b.id,
    prompt: `${thing} nào ${word}?`,
    visual: { type: 'bars', bars: b.lengths.map((len, i) => ({ label: labels[i], length: len, color: BAR_COLORS[i] })), units: b.units },
    kind: 'choice',
    options,
    answer,
    hints: ['Các đồ vật được đặt thẳng hàng ở đầu bên trái.', `Con nhìn xem đầu bên phải của cái nào ${b.ask.startsWith('long') ? 'vươn ra xa nhất' : 'gần nhất'}.`],
    explain: `${thing} ${answer} ${word}.`,
    skill: 'length',
    level: b.level,
    domain: 'math',
    feedbackWrong: 'Look carefully.',
  };
}

/** Câu chọn đáp án tự do (dữ liệu nhập tay, đáp án là nhãn đúng). */
export function choice(
  b: Base & {
    prompt: string;
    labels: string[];
    correct: string;
    hints: string[];
    explain: string;
    skill: SkillId;
    visual?: Question['visual'];
    speak?: string;
    vocab?: string[];
  },
): Question {
  const options = textOptions(b.labels);
  return {
    id: b.id,
    prompt: b.prompt,
    speak: b.speak,
    visual: b.visual,
    kind: 'choice',
    options,
    answer: idOf(options, b.correct),
    hints: b.hints,
    explain: b.explain,
    skill: b.skill,
    level: b.level,
    domain: 'math',
    vocab: b.vocab,
  };
}

/** Câu từ vựng tiếng Anh – tính vào điểm từ vựng, KHÔNG tính vào điểm Toán. */
export function vocab(
  b: Base & { word: string; prompt: string; labels?: string[]; shapes?: ShapeKind[]; correct: string; hint: string; explain: string },
): Question {
  let options: Option[];
  let answer: string;
  if (b.shapes) {
    options = b.shapes.map((k, i) => ({ id: k, shape: k, color: COLORS[i % COLORS.length] }));
    answer = b.correct;
  } else {
    options = textOptions(b.labels!);
    answer = idOf(options, b.correct);
  }
  return {
    id: b.id,
    prompt: b.prompt,
    visual: { type: 'word', text: b.word },
    kind: 'choice',
    options,
    answer,
    hints: [b.hint, 'Con bấm vào nút loa để nghe Buddy đọc từ này nhé.'],
    explain: b.explain,
    skill: 'vocab',
    level: 1,
    domain: 'english',
    vocab: [b.word],
    feedbackCorrect: 'Great English!',
    feedbackWrong: 'Listen again.',
  };
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
