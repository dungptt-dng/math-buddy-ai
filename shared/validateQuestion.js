// Bộ kiểm chứng câu hỏi dùng chung cho trình duyệt (src/utils/validateQuestion.ts)
// và máy chủ (server/api.mjs). Đáp án chính thức LUÔN do chương trình tự tính ở đây,
// không bao giờ lấy nguyên đáp án do AI đề xuất.

export const QUESTION_TYPES = ['count', 'add', 'sub', 'shape', 'compare']
export const SHAPES = ['square', 'circle', 'triangle', 'rectangle']
export const SHAPE_VI = {
  square: 'hình vuông',
  circle: 'hình tròn',
  triangle: 'hình tam giác',
  rectangle: 'hình chữ nhật',
}
export const ITEMS = ['apple', 'star', 'fish', 'flower', 'balloon']
export const ITEM_VI = {
  apple: 'quả táo',
  star: 'ngôi sao',
  fish: 'con cá',
  flower: 'bông hoa',
  balloon: 'quả bóng bay',
}
export const ITEM_EN_PLURAL = {
  apple: 'apples',
  star: 'stars',
  fish: 'fish',
  flower: 'flowers',
  balloon: 'balloons',
}
export const NUMBER_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
export const COMPARE_SIGNS = ['<', '>', '=']
export const MIN_NUMBER = 0
export const MAX_NUMBER = 10

const isInt = (v) => typeof v === 'number' && Number.isInteger(v)
const inRange = (v) => isInt(v) && v >= MIN_NUMBER && v <= MAX_NUMBER

/** Tự tính đáp án đúng từ dữ liệu câu hỏi. Trả về null nếu không tính được. */
export function computeAnswer(q) {
  if (!q || typeof q !== 'object') return null
  switch (q.type) {
    case 'count':
      return inRange(q.count) ? q.count : null
    case 'add':
      return inRange(q.a) && inRange(q.b) ? q.a + q.b : null
    case 'sub':
      return inRange(q.a) && inRange(q.b) ? q.a - q.b : null
    case 'shape':
      return SHAPES.includes(q.shape) ? q.shape : null
    case 'compare':
      if (!inRange(q.a) || !inRange(q.b)) return null
      return q.a > q.b ? '>' : q.a < q.b ? '<' : '='
    default:
      return null
  }
}

/** Từ tiếng Anh gắn với đáp án (do chương trình sinh, không lấy từ AI). */
export function englishFor(q) {
  const ans = computeAnswer(q)
  if (ans === null) return undefined
  if (q.type === 'shape') return ans
  if (q.type === 'compare') {
    return ans === '>' ? 'greater than' : ans === '<' ? 'less than' : 'equal'
  }
  return NUMBER_EN[ans]
}

/**
 * Kiểm tra schema, phạm vi số, phép tính và phương án trả lời.
 * @returns {{ ok: boolean, errors: string[], question: object | null }}
 */
export function validateQuestion(input, knownLessonIds) {
  const errors = []
  const q = input && typeof input === 'object' ? input : {}

  if (!QUESTION_TYPES.includes(q.type)) errors.push(`Loại câu hỏi không hợp lệ: ${String(q.type)}`)
  if (typeof q.lessonId !== 'string' || !q.lessonId) errors.push('Thiếu mã chủ đề bài học (lessonId)')
  else if (knownLessonIds && !knownLessonIds.includes(q.lessonId)) errors.push(`Chủ đề không tồn tại: ${q.lessonId}`)
  if (typeof q.prompt !== 'string' || q.prompt.trim().length < 3) errors.push('Câu hỏi quá ngắn hoặc trống')
  else if (q.prompt.length > 160) errors.push('Câu hỏi quá dài (tối đa 160 ký tự) với học sinh lớp 1')

  if (q.type === 'count') {
    if (!inRange(q.count) || q.count < 1) errors.push('Số lượng cần đếm phải từ 1 đến 10')
    if (!ITEMS.includes(q.item)) errors.push(`Đồ vật không hỗ trợ: ${String(q.item)}`)
  }
  if (q.type === 'add' || q.type === 'sub' || q.type === 'compare') {
    if (!inRange(q.a) || !inRange(q.b)) errors.push('Các số phải là số nguyên từ 0 đến 10')
    if (q.item !== undefined && !ITEMS.includes(q.item)) errors.push(`Đồ vật không hỗ trợ: ${String(q.item)}`)
  }
  if (q.type === 'add' && inRange(q.a) && inRange(q.b) && q.a + q.b > MAX_NUMBER) {
    errors.push(`Tổng ${q.a} + ${q.b} vượt quá phạm vi 10`)
  }
  if (q.type === 'sub' && inRange(q.a) && inRange(q.b) && q.a - q.b < 0) {
    errors.push(`Hiệu ${q.a} - ${q.b} bị âm`)
  }
  if (q.type === 'shape') {
    if (!SHAPES.includes(q.shape)) errors.push(`Hình không hỗ trợ: ${String(q.shape)}`)
    if (q.mode !== undefined && q.mode !== 'name' && q.mode !== 'find') errors.push('Kiểu câu hỏi hình phải là name hoặc find')
  }

  const answer = computeAnswer(q)
  if (answer === null && errors.length === 0) errors.push('Không tự tính được đáp án')

  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 3) {
    errors.push('Cần 2–3 phương án trả lời')
  } else {
    const keys = q.options.map((o) => String(o))
    if (new Set(keys).size !== keys.length) errors.push('Các phương án bị trùng nhau')
    if (q.type === 'shape' && !q.options.every((o) => SHAPES.includes(o))) errors.push('Phương án hình không hợp lệ')
    if (q.type === 'compare' && !q.options.every((o) => COMPARE_SIGNS.includes(o))) errors.push('Phương án so sánh chỉ gồm <, >, =')
    if (['count', 'add', 'sub'].includes(q.type) && !q.options.every(inRange)) errors.push('Phương án số phải từ 0 đến 10')
    if (answer !== null && !keys.includes(String(answer))) errors.push(`Không có đáp án đúng (${answer}) trong các phương án`)
  }

  if (q.answer !== undefined && answer !== null && String(q.answer) !== String(answer)) {
    errors.push(`Đáp án đề xuất (${q.answer}) sai, đáp án đúng do chương trình tính là ${answer}`)
  }

  if (errors.length) return { ok: false, errors, question: null }

  const question = {
    id: typeof q.id === 'string' && q.id ? q.id : undefined,
    lessonId: q.lessonId,
    type: q.type,
    prompt: q.prompt.trim(),
    options: q.options.slice(),
    answer,
    englishWord: englishFor(q),
  }
  for (const k of ['a', 'b', 'count', 'item', 'shape', 'mode']) if (q[k] !== undefined) question[k] = q[k]
  return { ok: true, errors: [], question }
}
