import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import BuddyMascot from '../components/BuddyMascot'
import StudentCodeForm from '../components/StudentCodeForm'
import { useStudentCode } from '../hooks/useStudentCode'
import { ACTIVITY_LABELS, clearStudentCode, getRecords, getRounds } from '../services/storage'
import { speak } from '../services/speech'
import type { ActivityId, AnswerRecord } from '../types'

const ACTIVITY_ROUTES: Record<ActivityId, string> = {
  'magic-numbers': '/be-dem',
  'math-garden': '/khu-vuon',
  'shape-hunt': '/tho-san-hinh',
  'buddy-challenge': '/thu-thach',
}

export default function ProgressPage() {
  const code = useStudentCode()

  const data = useMemo(() => {
    if (!code) return null
    const records = getRecords(code)
    const answers = records.filter((r): r is AnswerRecord => r.kind === 'answer')
    const rounds = getRounds(code)
    const words = [...new Set(records.map((r) => r.englishWord).filter((w): w is string => !!w))].sort()
    const byActivity = (Object.keys(ACTIVITY_LABELS) as ActivityId[]).map((a) => {
      const ans = answers.filter((r) => r.activity === a)
      const rs = rounds.filter((r) => r.activity === a)
      return {
        id: a,
        answered: ans.length,
        correct: ans.filter((r) => r.correctFirstTry).length,
        bestStars: rs.reduce((m, r) => Math.max(m, r.stars), 0),
        rounds: rs.length,
      }
    })
    const badges = [...new Set(rounds.map((r) => r.badge))]
    return {
      answered: answers.length,
      correct: answers.filter((r) => r.correctFirstTry).length,
      stars: rounds.reduce((n, r) => n + r.stars, 0),
      words,
      byActivity,
      badges,
    }
  }, [code])

  if (!code || !data)
    return (
      <section className="card grid items-center gap-6 p-6 sm:p-10 md:grid-cols-2">
        <div className="flex justify-center">
          <BuddyMascot size="lg" message="Bé nhập mã học sinh để xem tiến độ nhé!" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-black text-deep">Tiến độ học tập</h1>
          <StudentCodeForm onSaved={() => undefined} submitLabel="Xem tiến độ" />
        </div>
      </section>
    )

  const message =
    data.answered === 0
      ? 'Bé chưa chơi trò nào. Mình bắt đầu thôi!'
      : `Bé đã trả lời ${data.answered} câu và nhận ${data.stars} ngôi sao. Giỏi lắm!`

  return (
    <div className="flex flex-col gap-6">
      <section className="card grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
        <BuddyMascot size="md" mood="happy" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-deep sm:text-3xl">Tiến độ của {code}</h1>
            <span className="chip bg-mint/40 text-ink">DỮ LIỆU THẬT trên thiết bị này</span>
          </div>
          <p className="mt-2 text-lg font-bold text-ink/80">{message}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Câu đã làm" value={data.answered} color="bg-primary/15" />
            <Stat label="Đúng ngay lần đầu" value={data.correct} color="bg-mint/35" />
            <Stat label="Ngôi sao" value={data.stars} color="bg-sunshine/50" />
          </div>
          <button
            type="button"
            onClick={clearStudentCode}
            className="btn-ghost mt-3 px-0 text-sm"
          >
            Không phải {code}? Đổi mã học sinh
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {data.byActivity.map((a) => (
          <div key={a.id} className="card flex items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-lg font-black text-ink">{ACTIVITY_LABELS[a.id]}</h2>
              <p className="text-sm font-bold text-ink/60">
                {a.rounds} lượt · đúng ngay {a.correct}/{a.answered} câu
              </p>
              <p className="mt-1 text-xl tracking-widest text-[#F4B400]" aria-label={`Tốt nhất ${a.bestStars} sao`}>
                {'★'.repeat(a.bestStars)}
                <span className="text-primary/25">{'★'.repeat(3 - a.bestStars)}</span>
              </p>
            </div>
            <Link to={ACTIVITY_ROUTES[a.id]} className="btn-soft shrink-0">
              Chơi
            </Link>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-black text-ink">Huy hiệu của bé</h2>
          {data.badges.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.badges.map((b) => (
                <li key={b} className="chip bg-lavender/40 py-2 text-sm text-ink">
                  🏅 {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 font-semibold text-ink/60">Hoàn thành một lượt chơi để nhận huy hiệu đầu tiên!</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-black text-ink">Từ tiếng Anh bé đã làm quen</h2>
          {data.words.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.words.map((w) => (
                <li key={w}>
                  <button type="button" onClick={() => speak(w, 'en-US')} className="chip bg-mint/40 py-2 text-sm text-ink hover:bg-mint/60">
                    🔊 {w}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 font-semibold text-ink/60">Trả lời đúng để Buddy dạy bé từ tiếng Anh mới nhé.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${color}`}>
      <div className="text-3xl font-black text-ink">{value}</div>
      <div className="text-xs font-extrabold text-ink/60">{label}</div>
    </div>
  )
}
