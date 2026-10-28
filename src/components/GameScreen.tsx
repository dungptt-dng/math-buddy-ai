import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityId, BuddyMood, Question } from '../types'
import BuddyMascot from './BuddyMascot'
import QuestionPanel, { QuestionVisual } from './QuestionPanel'
import AnswerButton, { type AnswerState } from './AnswerButton'
import ProgressPath from './ProgressPath'
import RewardPanel, { starsFor } from './RewardPanel'
import StudentGate from './StudentGate'
import { ShapeIcon } from './Illustrations'
import { checkAnswer, ITEM_EN_PLURAL, ITEM_VI, NUMBER_EN, SHAPE_VI } from '../utils/validateQuestion'
import { getStudentCode, recordAnswer, recordListen, saveRound } from '../services/storage'
import { speak } from '../services/speech'
import { useStudentCode } from '../hooks/useStudentCode'

export interface LoadedRound {
  questions: Question[]
  /** Ghi chú nguồn dữ liệu hiển thị cho học sinh/giáo viên (ví dụ dùng bài cơ bản). */
  note?: string
  /** Số câu đầu tiên là phần khởi động (Thử thách thông minh). */
  warmupCount?: number
}

interface Props {
  activity: ActivityId
  title: string
  badge: string
  intro: string
  load: () => LoadedRound | Promise<LoadedRound>
}

const PRAISES = ['Đúng rồi!', 'Giỏi quá!', 'Chính xác!', 'Tuyệt vời!', 'Bé làm tốt lắm!']
const pickPraise = () => PRAISES[Math.floor(Math.random() * PRAISES.length)]
const en = (n?: number) => (n === undefined ? '' : NUMBER_EN[n])

function correctFeedback(q: Question): { vi: string; en?: string } {
  const item = q.item ?? 'apple'
  switch (q.type) {
    case 'count': {
      const n = q.count ?? 0
      const noun = n === 1 ? item : ITEM_EN_PLURAL[item]
      return { vi: `${pickPraise()} Có ${n} ${ITEM_VI[item]}. Tiếng Anh nói là: ${en(n)} ${noun}.`, en: `${en(n)} ${noun}` }
    }
    case 'add':
      return { vi: `${pickPraise()} ${q.a} + ${q.b} = ${q.answer}. Tiếng Anh: ${en(q.a)} plus ${en(q.b)} is ${en(q.answer as number)}.`, en: `${en(q.a)} plus ${en(q.b)} is ${en(q.answer as number)}` }
    case 'sub':
      return { vi: `${pickPraise()} ${q.a} - ${q.b} = ${q.answer}. Tiếng Anh: ${en(q.a)} minus ${en(q.b)} is ${en(q.answer as number)}.`, en: `${en(q.a)} minus ${en(q.b)} is ${en(q.answer as number)}` }
    case 'shape':
      return { vi: `${pickPraise()} Đây là ${SHAPE_VI[q.shape!]}. Tiếng Anh là "${q.shape}".`, en: q.shape }
    case 'compare': {
      const phrase = q.answer === '>' ? 'is greater than' : q.answer === '<' ? 'is less than' : 'is equal to'
      return { vi: `${pickPraise()} ${q.a} ${q.answer} ${q.b}. Tiếng Anh: ${en(q.a)} ${phrase} ${en(q.b)}.`, en: `${en(q.a)} ${phrase} ${en(q.b)}` }
    }
  }
}

function hintFor(q: Question): string {
  const item = ITEM_VI[q.item ?? 'apple']
  switch (q.type) {
    case 'count':
      return `Mình cùng đếm lại nhé! Bé chạm vào từng ${item}, Buddy sẽ đánh số 1, 2, 3… giúp bé.`
    case 'add':
      return `Không sao đâu! Bé gộp hai nhóm lại rồi đếm tất cả ${item} nhé. Chạm vào từng ${item} để đếm.`
    case 'sub':
      return `Bé thử lại nhé! Bé đếm những ${item} KHÔNG bị gạch chéo – đó là số còn lại.`
    case 'compare':
      return 'Bé đếm xem nhóm nào nhiều hơn nhé. Dấu > là "lớn hơn", dấu < là "bé hơn", dấu = là "bằng nhau".'
    case 'shape':
      return {
        circle: 'Hình tròn tròn như cái bánh xe, không có góc nào.',
        triangle: 'Hình tam giác có 3 cạnh và 3 góc.',
        square: 'Hình vuông có 4 cạnh dài bằng nhau.',
        rectangle: 'Hình chữ nhật có 2 cạnh dài và 2 cạnh ngắn.',
      }[q.shape!]
  }
}

function sourceBadge(q: Question) {
  switch (q.source) {
    case 'ai':
      return <span className="chip bg-lavender/40 text-ink">AI THẬT · giáo viên đã duyệt</span>
    case 'teacher':
      return <span className="chip bg-lavender/40 text-ink">Giáo viên soạn · đã duyệt</span>
    case 'bank':
      return <span className="chip bg-sunshine/60 text-ink">NGÂN HÀNG CÓ SẴN</span>
    default:
      return <span className="chip bg-primary/15 text-deep">Đáp án do chương trình tự tính</span>
  }
}

function OptionContent({ q, option }: { q: Question; option: number | string }) {
  if (q.type === 'shape') {
    if (q.mode === 'find') return <ShapeIcon shape={option as never} size={72} />
    return <span className="text-xl font-black sm:text-2xl">{SHAPE_VI[option as keyof typeof SHAPE_VI]}</span>
  }
  return <>{option}</>
}

function optionLabel(q: Question, option: number | string) {
  if (q.type === 'shape') return SHAPE_VI[option as keyof typeof SHAPE_VI]
  if (q.type === 'compare') return option === '>' ? 'lớn hơn' : option === '<' ? 'bé hơn' : 'bằng'
  return String(option)
}

export default function GameScreen({ activity, title, badge, intro, load }: Props) {
  const studentCode = useStudentCode()
  const [round, setRound] = useState<LoadedRound | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [wrong, setWrong] = useState<(number | string)[]>([])
  const [solved, setSolved] = useState(false)
  const [hints, setHints] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [words, setWords] = useState<string[]>([])
  const [buddy, setBuddy] = useState<{ mood: BuddyMood; text: string }>({ mood: 'idle', text: intro })
  const [finished, setFinished] = useState(false)

  const start = useCallback(async () => {
    setRound(null)
    setLoadError(null)
    setIndex(0)
    setWrong([])
    setSolved(false)
    setHints(0)
    setResults([])
    setWords([])
    setFinished(false)
    setBuddy({ mood: 'idle', text: intro })
    try {
      const r = await load()
      if (!r.questions.length) throw new Error('Chưa có câu hỏi hợp lệ cho trò chơi này.')
      setRound(r)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Không tải được câu hỏi')
    }
  }, [load, intro])

  useEffect(() => {
    void start()
  }, [start])

  const q = round?.questions[index]
  const total = round?.questions.length ?? 0
  const inWarmup = round?.warmupCount !== undefined && index < round.warmupCount

  const choose = (option: number | string) => {
    if (!q || solved || wrong.includes(option)) return
    if (checkAnswer(q, option)) {
      const attempts = wrong.length + 1
      const fb = correctFeedback(q)
      setSolved(true)
      setResults((r) => [...r, attempts === 1])
      if (q.englishWord) setWords((w) => (w.includes(q.englishWord!) ? w : [...w, q.englishWord!]))
      setBuddy({ mood: 'happy', text: fb.vi })
      speak(fb.vi.split('Tiếng Anh')[0])
      if (fb.en) speak(fb.en, 'en-US', true)
      recordAnswer({
        studentCode: getStudentCode() ?? 'HS-000',
        activity,
        lessonId: q.lessonId,
        questionId: q.id,
        correctFirstTry: attempts === 1,
        attempts,
        hintsUsed: hints + wrong.length,
        englishWord: q.englishWord,
      })
    } else {
      setWrong((w) => [...w, option])
      const text = hintFor(q)
      setBuddy({ mood: 'encourage', text })
      speak(text)
    }
  }

  const askHint = () => {
    if (!q) return
    setHints((h) => h + 1)
    const text = hintFor(q)
    setBuddy({ mood: 'think', text })
    speak(text)
  }

  const next = () => {
    if (!round) return
    if (index + 1 >= total) {
      const correct = results.filter(Boolean).length
      saveRound({ studentCode: getStudentCode() ?? 'HS-000', activity, total, correctFirstTry: correct, stars: starsFor(correct, total), badge })
      setFinished(true)
      return
    }
    const nextIndex = index + 1
    setIndex(nextIndex)
    setWrong([])
    setSolved(false)
    setHints(0)
    const warmupJustEnded = round.warmupCount !== undefined && nextIndex === round.warmupCount
    setBuddy({
      mood: 'idle',
      text: warmupJustEnded ? 'Khởi động xong rồi! Giờ mình luyện thêm vài câu nhé.' : 'Câu tiếp theo nào! Bé đọc kỹ câu hỏi nhé.',
    })
  }

  const listenEnglish = () => {
    if (!q?.englishWord) return
    speak(correctFeedback(q).en ?? q.englishWord, 'en-US')
    recordListen(getStudentCode(), q.englishWord)
  }

  const correctCount = useMemo(() => results.filter(Boolean).length, [results])

  if (!studentCode) return <StudentGate title={title} />

  if (loadError)
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <BuddyMascot size="md" mood="think" message={loadError} />
        <div className="flex gap-3">
          <button type="button" className="btn-primary" onClick={() => void start()}>
            Thử lại
          </button>
          <Link to="/" className="btn-soft">
            Về trang chủ
          </Link>
        </div>
      </div>
    )

  if (!round || !q)
    return (
      <div className="card flex flex-col items-center gap-3 p-10">
        <BuddyMascot size="md" mood="think" message="Buddy đang chuẩn bị câu hỏi…" />
      </div>
    )

  if (finished)
    return (
      <RewardPanel
        stars={starsFor(correctCount, total)}
        badge={badge}
        correctFirstTry={correctCount}
        total={total}
        englishWords={words}
        onPlayAgain={() => void start()}
      />
    )

  const optionState = (o: number | string): AnswerState => (wrong.includes(o) ? 'wrong' : solved && checkAnswer(q, o) ? 'correct' : 'idle')

  return (
    <div className="flex flex-col gap-4">
      {round.note && (
        <p className="rounded-2xl bg-sunshine/40 px-4 py-2 text-sm font-bold text-ink">{round.note}</p>
      )}
      <QuestionPanel
        title={round.warmupCount !== undefined ? `${title} · ${inWarmup ? 'Khởi động' : 'Luyện thêm'}` : title}
        sourceBadge={sourceBadge(q)}
        question={q}
        questionNumber={index + 1}
        total={total}
        progress={<ProgressPath total={total} current={index} results={results} />}
        visual={<QuestionVisual key={q.id} q={q} countingHelp={wrong.length > 0 || hints > 0} />}
        answers={q.options.map((o) => (
          <AnswerButton key={String(o)} state={optionState(o)} disabled={solved || wrong.includes(o)} onClick={() => choose(o)} label={optionLabel(q, o)}>
            <OptionContent q={q} option={o} />
          </AnswerButton>
        ))}
        footer={
          <div className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {!solved && (
              <button type="button" className="btn-soft w-full sm:w-auto" onClick={askHint}>
                💡 Gợi ý của Buddy
              </button>
            )}
            {solved && q.englishWord && (
              <button type="button" className="btn-soft w-full sm:w-auto" onClick={listenEnglish}>
                🔊 Nghe tiếng Anh: <span className="text-[#1F9D68]">{q.englishWord}</span>
              </button>
            )}
            {solved && (
              <button type="button" className="btn-primary w-full sm:w-auto" onClick={next}>
                {index + 1 >= total ? 'Xem phần thưởng ★' : 'Câu tiếp theo ▶'}
              </button>
            )}
          </div>
        }
        buddy={<BuddyMascot size="md" mood={buddy.mood} message={buddy.text} speakable />}
      />
    </div>
  )
}
