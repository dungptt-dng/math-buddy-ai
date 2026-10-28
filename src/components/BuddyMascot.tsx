import { useState } from 'react'
import type { BuddyMood } from '../types'
import { speak, speechSupported } from '../services/speech'
import { asset } from '../config'

/** Ảnh nhân vật Buddy AI chính thức – dùng chung cho toàn bộ ứng dụng. */
export const BUDDY_SRC = asset('images/buddy-ai.png')
const BUDDY_RATIO = 1283 / 1226 // rộng / cao của ảnh gốc

const SIZES = { xs: 48, sm: 88, md: 140, lg: 200, xl: 280 } as const
export type BuddySize = keyof typeof SIZES | number

const MOOD_ANIM: Record<BuddyMood, string> = {
  idle: 'anim-float',
  happy: 'anim-bounce',
  cheer: 'anim-cheer',
  think: 'anim-think',
  encourage: 'anim-nod',
}

interface Props {
  size?: BuddySize
  mood?: BuddyMood
  message?: string
  /** Hiện nút loa đọc lời thoại (nếu trình duyệt hỗ trợ). */
  speakable?: boolean
  bubble?: 'top' | 'right' | 'left'
  className?: string
}

export default function BuddyMascot({ size = 'md', mood = 'idle', message, speakable, bubble = 'top', className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const width = typeof size === 'number' ? size : SIZES[size]
  const height = Math.round(width / BUDDY_RATIO)

  const image = failed ? (
    <div
      role="img"
      aria-label="Thiếu ảnh Buddy AI"
      style={{ width, minHeight: height }}
      className="flex items-center justify-center rounded-2xl border-2 border-dashed border-orange bg-orange/10 p-2 text-center text-xs font-bold text-ink/70"
    >
      Thiếu file ảnh: public/images/buddy-ai.png
    </div>
  ) : (
    <img
      // key theo mood để chạy lại hiệu ứng mỗi khi Buddy đổi biểu cảm
      key={mood}
      src={BUDDY_SRC}
      alt="Buddy AI – người bạn robot của bé"
      width={width}
      height={height}
      onError={() => setFailed(true)}
      draggable={false}
      style={{ width, height: 'auto' }}
      className={`select-none object-contain drop-shadow-[0_12px_14px_rgba(40,127,193,0.22)] ${MOOD_ANIM[mood]}`}
    />
  )

  if (!message) return <div className={`relative inline-block ${className}`}>{image}</div>

  const bubbleEl = (
    <div
      key={message}
      className={`anim-pop relative max-w-xs rounded-3xl border-2 border-primary/25 bg-white px-4 py-3 text-base font-bold leading-snug text-ink shadow-card ${
        bubble === 'top' ? 'mb-2' : ''
      }`}
      aria-live="polite"
    >
      <span>{message}</span>
      {speakable && speechSupported() && (
        <button
          type="button"
          onClick={() => speak(message)}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 align-middle text-deep hover:bg-primary/25"
          aria-label="Nghe Buddy nói"
          title="Nghe Buddy nói"
        >
          <SpeakerIcon />
        </button>
      )}
    </div>
  )

  if (bubble === 'top') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        {bubbleEl}
        {image}
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-3 ${bubble === 'left' ? 'flex-row-reverse' : ''} ${className}`}>
      {image}
      {bubbleEl}
    </div>
  )
}

export function SpeakerIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}
