// Dùng chung một bộ kiểm chứng với máy chủ (shared/validateQuestion.js)
// để đáp án ở trình duyệt và máy chủ luôn được tính theo cùng một cách.
export {
  validateQuestion,
  computeAnswer,
  englishFor,
  SHAPES,
  SHAPE_VI,
  ITEMS,
  ITEM_VI,
  ITEM_EN_PLURAL,
  NUMBER_EN,
  COMPARE_SIGNS,
} from '../../shared/validateQuestion.js'

import { computeAnswer } from '../../shared/validateQuestion.js'
import type { Question } from '../types'

/** Kiểm tra đáp án học sinh chọn so với đáp án do chương trình tự tính. */
export function checkAnswer(q: Question, choice: number | string): boolean {
  const truth = computeAnswer(q)
  return truth !== null && String(truth) === String(choice)
}
