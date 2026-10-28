import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export type Accent = 'blue' | 'yellow' | 'lavender' | 'mint'

const ACCENTS: Record<Accent, { bg: string; ring: string; btn: string; num: string }> = {
  blue: { bg: 'bg-primary/15', ring: 'hover:ring-primary/60', btn: 'bg-deep text-white', num: 'bg-primary text-white' },
  yellow: { bg: 'bg-sunshine/45', ring: 'hover:ring-sunshine', btn: 'bg-[#F4B400] text-ink', num: 'bg-sunshine text-ink' },
  lavender: { bg: 'bg-lavender/35', ring: 'hover:ring-lavender', btn: 'bg-[#7D5BD6] text-white', num: 'bg-lavender text-ink' },
  mint: { bg: 'bg-mint/35', ring: 'hover:ring-mint', btn: 'bg-[#1F9D68] text-white', num: 'bg-mint text-ink' },
}

interface Props {
  index: number
  to: string
  title: string
  description: string
  accent: Accent
  art: ReactNode
}

export default function GameCard({ index, to, title, description, accent, art }: Props) {
  const a = ACCENTS[accent]
  return (
    <Link
      to={to}
      className={`group card flex flex-col overflow-hidden ring-2 ring-transparent transition hover:-translate-y-1 ${a.ring}`}
    >
      <div className={`relative flex h-32 items-center justify-center ${a.bg}`}>
        <span className={`absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${a.num}`}>
          {index}
        </span>
        <div className="transition group-hover:scale-105">{art}</div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-black leading-tight text-ink">{title}</h3>
        <p className="mt-2 flex-1 text-[15px] font-semibold leading-snug text-ink/70">{description}</p>
        <span className={`btn mt-4 w-full ${a.btn}`}>
          Khám phá
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
