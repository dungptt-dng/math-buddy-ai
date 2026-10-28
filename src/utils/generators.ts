// Sinh câu hỏi cho các trò chơi. Đáp án luôn do validateQuestion tự tính lại,
// câu nào không qua kiểm chứng sẽ bị loại bỏ.
import type { ItemKey, Question, ShapeKey } from '../types'
import { ITEM_VI, ITEMS, SHAPES, validateQuestion } from './validateQuestion'
import bank from '../data/questionBank.json'

export const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 3 phương án số gồm đáp án và 2 số gần đó, trong phạm vi 0–10. */
function numberOptions(answer: number, min = 0): number[] {
  const set = new Set<number>([answer])
  const near = shuffle([answer - 1, answer + 1, answer - 2, answer + 2]).filter((n) => n >= min && n <= 10)
  for (const n of near) {
    if (set.size >= 3) break
    set.add(n)
  }
  return shuffle([...set])
}

function finalize(raw: Partial<Question>, id: string): Question | null {
  const check = validateQuestion({ ...raw, id })
  if (!check.ok || !check.question) {
    console.warn('Bỏ câu hỏi không hợp lệ', raw, check.errors)
    return null
  }
  return { ...check.question, id, source: raw.source ?? 'generated' }
}

function uniqueRound(make: (i: number) => Question | null, total: number, key: (q: Question) => string): Question[] {
  const out: Question[] = []
  const seen = new Set<string>()
  for (let tries = 0; out.length < total && tries < total * 20; tries++) {
    const q = make(out.length)
    if (!q || seen.has(key(q))) continue
    seen.add(key(q))
    out.push(q)
  }
  return out
}

export function makeCountingRound(total = 5): Question[] {
  return uniqueRound(
    (i) => {
      const item = pick(ITEMS) as ItemKey
      const count = randInt(1, 10)
      return finalize(
        {
          lessonId: 'numbers-0-10',
          type: 'count',
          item,
          count,
          prompt: `Có bao nhiêu ${ITEM_VI[item]}?`,
          options: numberOptions(count, 1),
        },
        `count-${Date.now()}-${i}`,
      )
    },
    total,
    (q) => String(q.count),
  )
}

export function makeGardenRound(total = 5): Question[] {
  return uniqueRound(
    (i) => {
      const item = pick(['apple', 'flower', 'fish', 'balloon'] as const)
      if (i % 2 === 0) {
        const a = randInt(1, 7)
        const b = randInt(1, 10 - a)
        return finalize(
          { lessonId: 'addition-10', type: 'add', item, a, b, prompt: `${a} + ${b} = ?`, options: numberOptions(a + b) },
          `add-${Date.now()}-${i}`,
        )
      }
      const a = randInt(2, 10)
      const b = randInt(1, a - 1)
      return finalize(
        { lessonId: 'subtraction-10', type: 'sub', item, a, b, prompt: `${a} - ${b} = ?`, options: numberOptions(a - b) },
        `sub-${Date.now()}-${i}`,
      )
    },
    total,
    (q) => `${q.type}${q.a}${q.b}`,
  )
}

export function makeShapeRound(total = 5): Question[] {
  const targets = shuffle(SHAPES as ShapeKey[])
  return uniqueRound(
    (i) => {
      const shape = targets[i % targets.length]
      const others = shuffle((SHAPES as ShapeKey[]).filter((s) => s !== shape)).slice(0, 2)
      // Đổi kiểu hỏi khi quay lại hình đã hỏi, để 5 câu không trùng nhau.
      const mode = (i + Math.floor(i / targets.length)) % 2 === 0 ? 'name' : 'find'
      return finalize(
        {
          lessonId: 'plane-shapes',
          type: 'shape',
          shape,
          mode,
          prompt: mode === 'name' ? 'Đây là hình gì?' : `Bé hãy chọn ${shapeName(shape)}.`,
          options: shuffle([shape, ...others]),
        },
        `shape-${Date.now()}-${i}`,
      )
    },
    total,
    (q) => `${q.shape}${q.mode}`,
  )
}

function shapeName(s: ShapeKey) {
  return { square: 'hình vuông', circle: 'hình tròn', triangle: 'hình tam giác', rectangle: 'hình chữ nhật' }[s]
}

/** Câu hỏi từ NGÂN HÀNG CÓ SẴN, đã kiểm chứng lại đáp án. */
export function bankQuestions(set: 'warmup' | 'practice'): Question[] {
  return (bank[set] as Partial<Question>[])
    .map((raw) => finalize({ ...raw, source: 'bank' }, raw.id as string))
    .filter((q): q is Question => q !== null)
}
