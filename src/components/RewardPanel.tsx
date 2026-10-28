import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import BuddyMascot from './BuddyMascot'
import { speak } from '../services/speech'

interface Props {
  stars: number
  badge: string
  correctFirstTry: number
  total: number
  englishWords: string[]
  onPlayAgain: () => void
}

export function starsFor(correctFirstTry: number, total: number): number {
  if (!total) return 1
  const ratio = correctFirstTry / total
  return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1
}

const PRAISE = ['Bé giỏi quá!', 'Tuyệt vời!', 'Bé đã cố gắng rất nhiều!']

export default function RewardPanel({ stars, badge, correctFirstTry, total, englishWords, onPlayAgain }: Props) {
  const praise = PRAISE[3 - stars] ?? PRAISE[0]
  const message = `${praise} Bé nhận được ${stars} ngôi sao và ${badge}!`

  useEffect(() => {
    speak(message)
  }, [message])

  return (
    <section className="card relative overflow-hidden p-6 text-center sm:p-10">
      {[12, 30, 70, 88].map((left, i) => (
        <span key={left} className="sparkle absolute text-2xl text-[#F4B400]" style={{ left: `${left}%`, top: `${10 + (i % 2) * 12}%`, animationDelay: `${i * 0.3}s` }} aria-hidden>
          ✦
        </span>
      ))}
      <div className="flex flex-col items-center">
        <BuddyMascot size="lg" mood="cheer" message={message} speakable />
        <div className="mt-4 flex gap-2" aria-label={`${stars} trên 3 sao`}>
          {[1, 2, 3].map((n) => (
            <svg key={n} viewBox="0 0 24 24" className={`h-14 w-14 ${n <= stars ? 'anim-pop' : ''}`} style={{ animationDelay: `${n * 0.15}s` }} aria-hidden>
              <path
                d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.6 5.9 20.8 7.1 14 2 9.2l7-.9z"
                fill={n <= stars ? '#FFD34D' : '#E6EEF8'}
                stroke={n <= stars ? '#F4B400' : '#C9D6E6'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ))}
        </div>
        <div className="anim-pop mt-4 inline-flex items-center gap-3 rounded-3xl bg-lavender/30 px-5 py-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sunshine to-orange text-2xl shadow-card" aria-hidden>
            🏅
          </span>
          <span className="text-left">
            <span className="block text-xs font-extrabold uppercase tracking-wide text-ink/60">Huy hiệu mới</span>
            <span className="block text-lg font-black text-ink">{badge}</span>
          </span>
        </div>
        <p className="mt-4 text-lg font-bold text-ink/80">
          Bé trả lời đúng ngay lần đầu <b className="text-deep">{correctFirstTry}</b>/{total} câu.
        </p>
        {englishWords.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="text-sm font-bold text-ink/60">Từ tiếng Anh hôm nay:</span>
            {englishWords.map((w) => (
              <button key={w} type="button" onClick={() => speak(w, 'en-US')} className="chip bg-mint/40 text-ink hover:bg-mint/60">
                🔊 {w}
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onPlayAgain} className="btn-primary flex-1">
            ▶ Chơi tiếp
          </button>
          <Link to="/" className="btn-sun flex-1">
            Về trang chủ
          </Link>
        </div>
        <Link to="/tien-do" className="btn-ghost mt-2">
          Xem tiến độ học tập
        </Link>
      </div>
    </section>
  )
}
