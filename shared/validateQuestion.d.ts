import type { Question, QuestionType, ShapeKey, ItemKey } from '../src/types'

export declare const QUESTION_TYPES: QuestionType[]
export declare const SHAPES: ShapeKey[]
export declare const SHAPE_VI: Record<ShapeKey, string>
export declare const ITEMS: ItemKey[]
export declare const ITEM_VI: Record<ItemKey, string>
export declare const ITEM_EN_PLURAL: Record<ItemKey, string>
export declare const NUMBER_EN: string[]
export declare const COMPARE_SIGNS: string[]
export declare const MIN_NUMBER: number
export declare const MAX_NUMBER: number

export declare function computeAnswer(q: Partial<Question>): number | string | null
export declare function englishFor(q: Partial<Question>): string | undefined
export declare function validateQuestion(
  input: unknown,
  knownLessonIds?: string[],
): { ok: boolean; errors: string[]; question: Question | null }
