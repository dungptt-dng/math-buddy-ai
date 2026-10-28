import { useCallback } from 'react'
import GameScreen, { type LoadedRound } from '../components/GameScreen'
import { bankQuestions, shuffle } from '../utils/generators'
import { validateQuestion } from '../utils/validateQuestion'
import { getApprovedQuestions } from '../services/aiService'
import type { Question } from '../types'
import { STATIC_MODE } from '../config'

const WARMUP = 5
const MIN_PRACTICE = 3
const MAX_PRACTICE = 5

/**
 * Thử thách thông minh: 5 câu khởi động + 3–5 câu luyện thêm.
 * Câu luyện thêm lấy từ câu hỏi giáo viên đã duyệt (theo chủ đề đang bật);
 * nếu không đủ dữ liệu thì dùng bài cơ bản trong NGÂN HÀNG CÓ SẴN.
 */
async function loadChallenge(): Promise<LoadedRound> {
  const warmup = shuffle(bankQuestions('warmup')).slice(0, WARMUP)
  let practice: Question[] = []
  let note: string | undefined

  if (STATIC_MODE) {
    practice = shuffle(bankQuestions('practice')).slice(0, 4)
    note = 'Bản trực tuyến: Buddy dùng bài cơ bản trong NGÂN HÀNG CÓ SẴN. Kết quả lưu trên trình duyệt của máy này.'
    return { questions: [...warmup, ...practice], warmupCount: warmup.length, note }
  }

  try {
    const { questions, enabledLessons } = await getApprovedQuestions()
    // Kiểm chứng lại ở trình duyệt trước khi hiển thị cho học sinh.
    practice = shuffle(
      questions
        .filter((q) => q.status === 'approved')
        .map((q): Question | null => {
          const check = validateQuestion(q)
          return check.ok && check.question ? { ...check.question, id: q.id, source: q.source } : null
        })
        .filter((q): q is Question => q !== null),
    ).slice(0, MAX_PRACTICE)
    if (practice.length < MIN_PRACTICE) {
      const basic = bankQuestions('practice').filter((q) => enabledLessons.includes(q.lessonId))
      const pool = basic.length ? basic : bankQuestions('practice')
      practice = [...practice, ...shuffle(pool)].slice(0, Math.max(MIN_PRACTICE, practice.length + 2))
      note = 'Chưa đủ câu hỏi giáo viên đã duyệt – Buddy dùng thêm bài cơ bản trong NGÂN HÀNG CÓ SẴN.'
    }
  } catch {
    practice = shuffle(bankQuestions('practice')).slice(0, 4)
    note = 'Chưa kết nối được máy chủ – Buddy dùng bài cơ bản trong NGÂN HÀNG CÓ SẴN. Kết quả vẫn được lưu trên máy.'
  }

  return { questions: [...warmup, ...practice], warmupCount: warmup.length, note }
}

export default function BuddyChallengePage() {
  const load = useCallback(loadChallenge, [])
  return (
    <GameScreen
      activity="buddy-challenge"
      title="Thử thách thông minh"
      badge="Huy hiệu Nhà thông thái nhí"
      intro="Mình khởi động với 5 câu nhé! Không bấm giờ đâu, bé cứ từ từ suy nghĩ."
      load={load}
    />
  )
}
