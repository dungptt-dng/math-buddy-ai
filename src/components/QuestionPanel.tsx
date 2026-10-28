import { useEffect, useState, type ReactNode } from 'react'
import type { ItemKey, Question } from '../types'
import { ItemIcon, ShapeIcon } from './Illustrations'
import { SpeakerIcon } from './BuddyMascot'
import { speak, speechSupported } from '../services/speech'

/** Đọc câu hỏi thành lời tự nhiên cho học sinh (ví dụ "2 + 3 = ?" → "2 cộng 3 bằng mấy?"). */
export function promptToSpeech(q: Question): string {
  if (q.type === 'add') return `${q.a} cộng ${q.b} bằng mấy?`
  if (q.type === 'sub') return `${q.a} trừ ${q.b} bằng mấy?`
  if (q.type === 'compare') return `So sánh ${q.a} và ${q.b}. Bé chọn dấu lớn hơn, bé hơn hay bằng nhau?`
  return q.prompt
}

function CountGroup({ item, n, crossFrom, tappable }: { item: ItemKey; n: number; crossFrom?: number; tappable?: boolean }) {
  // Học sinh có thể chạm vào từng đồ vật để đánh số khi đếm lại.
  const [marks, setMarks] = useState<number[]>([])
  useEffect(() => setMarks([]), [item, n, crossFrom])
  const size = n > 7 ? 44 : 54
  return (
    <div className="flex max-w-[360px] flex-wrap items-center justify-center gap-1.5">
      {Array.from({ length: n }, (_, i) => {
        const crossed = crossFrom !== undefined && i >= crossFrom
        const order = marks.indexOf(i)
        return (
          <button
            type="button"
            key={i}
            disabled={!tappable}
            onClick={() => setMarks((m) => (m.includes(i) ? m : [...m, i]))}
            className={`relative rounded-2xl p-0.5 transition ${tappable ? 'hover:bg-primary/10 active:scale-95' : 'cursor-default'}`}
            aria-label={tappable ? `Đồ vật thứ ${i + 1}` : undefined}
            tabIndex={tappable ? 0 : -1}
          >
            <ItemIcon item={item} size={size} crossed={crossed} />
            {order >= 0 && (
              <span className="anim-pop absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-deep text-xs font-black text-white">
                {order + 1}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function QuestionVisual({ q, countingHelp }: { q: Question; countingHelp?: boolean }) {
  const item = q.item ?? 'apple'
  if (q.type === 'count') return <CountGroup item={item} n={q.count ?? 0} tappable />
  if (q.type === 'add')
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="rounded-3xl bg-primary/10 p-3">
          <CountGroup item={item} n={q.a ?? 0} tappable={countingHelp} />
        </div>
        <span className="text-5xl font-black text-deep">+</span>
        <div className="rounded-3xl bg-mint/25 p-3">
          <CountGroup item={item} n={q.b ?? 0} tappable={countingHelp} />
        </div>
      </div>
    )
  if (q.type === 'sub')
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-3xl bg-lavender/25 p-3">
          <CountGroup item={item} n={q.a ?? 0} crossFrom={(q.a ?? 0) - (q.b ?? 0)} tappable={countingHelp} />
        </div>
        <p className="text-sm font-bold text-ink/60">
          Có {q.a}, bớt đi {q.b} (đồ vật bị gạch chéo)
        </p>
      </div>
    )
  if (q.type === 'compare')
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-primary/10 p-3">
          <CountGroup item={item} n={q.a ?? 0} tappable={countingHelp} />
          <span className="text-4xl font-black text-deep">{q.a}</span>
        </div>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-dashed border-deep/40 text-3xl font-black text-deep/50">
          ?
        </span>
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-mint/25 p-3">
          <CountGroup item={item} n={q.b ?? 0} tappable={countingHelp} />
          <span className="text-4xl font-black text-[#1F9D68]">{q.b}</span>
        </div>
      </div>
    )
  if (q.type === 'shape' && q.mode !== 'find' && q.shape)
    return (
      <div className="rounded-3xl bg-sunshine/25 p-4">
        <ShapeIcon shape={q.shape} size={160} />
      </div>
    )
  return null
}

interface PanelProps {
  title: string
  sourceBadge?: ReactNode
  question: Question
  questionNumber: number
  total: number
  visual: ReactNode
  answers: ReactNode
  buddy: ReactNode
  footer?: ReactNode
  progress: ReactNode
}

export default function QuestionPanel({ title, sourceBadge, question, questionNumber, total, visual, answers, buddy, footer, progress }: PanelProps) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 bg-bg px-5 py-3">
        <h1 className="text-lg font-black text-deep sm:text-xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {sourceBadge}
          <span className="chip bg-white text-ink/70">
            Câu {questionNumber}/{total}
          </span>
        </div>
      </div>
      <div className="px-5 pt-4">{progress}</div>
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_260px]">
        <div className="flex min-w-0 flex-col items-center gap-5">
          <div className="flex items-center gap-3">
            <p className="text-center text-3xl font-black leading-tight text-ink sm:text-4xl">{question.prompt}</p>
            {speechSupported() && (
              <button
                type="button"
                onClick={() => speak(promptToSpeech(question))}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-deep hover:bg-primary/25"
                aria-label="Nghe câu hỏi"
                title="Nghe câu hỏi"
              >
                <SpeakerIcon className="h-6 w-6" />
              </button>
            )}
          </div>
          {visual}
          <div className="flex w-full max-w-xl flex-wrap justify-center gap-3">{answers}</div>
          {footer}
        </div>
        <div className="flex items-start justify-center lg:pt-4">{buddy}</div>
      </div>
    </section>
  )
}
