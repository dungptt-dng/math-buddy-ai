// Kiểu dữ liệu của ngân hàng nội dung. Đáp án (answer), gợi ý (hints), lời giải (explain) và lời Buddy (en) chỉ được
// bộ máy chấm (src/engine) dùng; màn hình làm bài chỉ nhận PublicQuestion.

export type Domain = 'math' | 'english';
/** 1 = Nhận biết, 2 = Thông hiểu, 3 = Vận dụng (chỉ dùng nội bộ). */
export type Level = 1 | 2 | 3;
export type ReviewStatus = 'draft' | 'review' | 'approved';
export type ShapeKind = 'circle' | 'triangle' | 'square' | 'rectangle';

export type SkillId =
  | 'count'
  | 'read_number'
  | 'number_order'
  | 'compare'
  | 'add'
  | 'sub'
  | 'shapes'
  | 'length'
  | 'vocab';

export type Group = { icon: string; count: number; label?: string };

export type Visual =
  | { type: 'objects'; groups: Group[]; op?: '+' }
  | { type: 'crossed'; icon: string; total: number; crossed: number }
  | { type: 'compare'; left: Group; right: Group }
  | { type: 'expression'; tokens: string[] }
  | { type: 'shapes'; shapes: { kind: ShapeKind; color: string }[]; target?: ShapeKind }
  | { type: 'sequence'; items: (number | null)[] }
  | { type: 'bars'; bars: { label: string; length: number; color: string }[]; units?: boolean }
  | { type: 'word'; text: string };

export type Option = {
  id: string;
  label?: string;
  shape?: ShapeKind;
  color?: string;
  icon?: string;
  count?: number;
};

/** Lời Buddy cho riêng một câu: CHỈ tiếng Anh đơn giản. */
export type EnglishLines = {
  /** Lời khen theo kỹ năng, ví dụ "Wonderful counting!". */
  praise: string;
  /** Lời khen nhắc lại kết quả, ví dụ "Yes! Three plus two equals five!". */
  say?: string;
  /** Từ tiếng Anh Buddy có thể giới thiệu sau khi con làm đúng. */
  word?: string;
  /** Gợi ý khi sai lần 1 (nhẹ) và lần 2 (cùng đếm, có hình được làm nổi bật). */
  tips: [string, string];
  /** Sai lần 3: chia thành các bước nhỏ. Bước cuối là câu hỏi, không nói thẳng đáp án. */
  steps: string[];
};

export type Question = {
  id: string;
  prompt: string;
  /** Câu đọc to bằng giọng tiếng Việt (nếu khác prompt). */
  speak?: string;
  visual?: Visual;
  kind: 'choice' | 'number' | 'multi';
  options?: Option[];
  /** choice: id phương án; number: số; multi: danh sách id. */
  answer: string | number | string[];
  hints: string[];
  explain: string;
  skill: SkillId;
  level: Level;
  domain: Domain;
  vocab?: string[];
  en: EnglishLines;
};

export type Lesson = {
  id: string;
  title: string;
  topic: string;
  icon: string;
  order: number;
  domain: Domain;
  status: ReviewStatus;
  /** Ghi chú nguồn tham khảo / tình trạng đối chiếu sách – chỉ dành cho giáo viên, quản trị. */
  sourceNote: string;
  verification: 'pending' | 'verified';
  questions: Question[];
};

export type PublicQuestion = Pick<Question, 'id' | 'prompt' | 'speak' | 'visual' | 'kind' | 'options' | 'domain' | 'vocab'> & {
  hintCount: number;
};

export const SKILL_NAMES: Record<SkillId, string> = {
  count: 'Đếm số lượng',
  read_number: 'Nhận biết số',
  number_order: 'Thứ tự các số',
  compare: 'So sánh số',
  add: 'Phép cộng trong phạm vi 10',
  sub: 'Phép trừ trong phạm vi 10',
  shapes: 'Nhận biết hình',
  length: 'So sánh độ dài',
  vocab: 'Từ vựng Toán tiếng Anh',
};

export function toPublic(q: Question): PublicQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    speak: q.speak,
    visual: q.visual,
    kind: q.kind,
    options: q.options,
    domain: q.domain,
    vocab: q.vocab,
    hintCount: q.hints.length,
  };
}
