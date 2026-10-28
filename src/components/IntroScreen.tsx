import { useEffect, useMemo, useRef, useState } from 'react'
import { SpeakerIcon } from './BuddyMascot'
import { BANNER_SRC } from './HeroBanner'
import { useMuted } from '../hooks/useMuted'
import { playJingle, playNumberNote, playPop, playSparkle } from '../services/sound'
import { speak } from '../services/speech'

const GREETING = 'Xin chào bé! Mình là Buddy, người bạn robot của bé. Chúng mình cùng học Toán và tiếng Anh thật vui nhé!'

type Sound = 'pop' | 'sparkle' | 'jingle' | { note: number }
interface Hotspot {
  id: string
  label: string
  /** Vị trí theo % của ảnh banner gốc (1774×887) */
  left: number
  top: number
  w: number
  h: number
  round?: boolean
  sound: Sound
  vi: string
  en?: string
}

// Các vùng chạm trùng đúng với hình vẽ trong banner – trong suốt, không che nội dung ảnh.
const HOTSPOTS: Hotspot[] = [
  { id: 'buddy', label: 'Buddy', left: 54, top: 25, w: 28, h: 68, sound: 'sparkle', vi: GREETING, en: "Hello! I'm Buddy." },
  { id: 'title', label: 'Math Buddy AI', left: 13, top: 9, w: 41.7, h: 54, sound: 'sparkle', vi: 'Math Buddy AI. Bé vui học Toán song ngữ. Mỗi ngày một khám phá!' },
  { id: 'sun', label: 'Mặt trời', left: 2.5, top: 4, w: 9.5, h: 19, round: true, sound: 'pop', vi: 'Ông mặt trời', en: 'sun' },
  { id: 'star', label: 'Ngôi sao', left: 80.3, top: 17, w: 6.8, h: 13, round: true, sound: 'sparkle', vi: 'Ngôi sao', en: 'star' },
  { id: 'plus', label: 'Dấu cộng', left: 58.6, top: 18, w: 4.8, h: 9, round: true, sound: 'pop', vi: 'Dấu cộng', en: 'plus' },
  { id: 'n1', label: 'Số 1', left: 45.5, top: 80, w: 4.2, h: 11.5, sound: { note: 1 }, vi: 'Một', en: 'one' },
  { id: 'n2', label: 'Số 2', left: 51, top: 79.5, w: 4.9, h: 11.5, sound: { note: 2 }, vi: 'Hai', en: 'two' },
  { id: 'n3', label: 'Số 3', left: 82.3, top: 59.7, w: 4.4, h: 9.8, sound: { note: 3 }, vi: 'Ba', en: 'three' },
  { id: 'cube', label: 'Hình khối vuông', left: 3.9, top: 76, w: 8, h: 20, sound: 'pop', vi: 'Hình vuông', en: 'square' },
  { id: 'tri', label: 'Hình tam giác', left: 11.8, top: 79, w: 7.6, h: 13, sound: 'pop', vi: 'Hình tam giác', en: 'triangle' },
  { id: 'circle', label: 'Hình tròn', left: 20, top: 80.5, w: 6.8, h: 13.6, round: true, sound: 'pop', vi: 'Hình tròn', en: 'circle' },
  { id: 'apple', label: 'Quả táo', left: 72.7, top: 80.6, w: 7.3, h: 16.9, round: true, sound: 'pop', vi: 'Quả táo', en: 'apple' },
  { id: 'books', label: 'Sách Toán 1 song ngữ', left: 78, top: 71.6, w: 17.2, h: 17.5, sound: 'pop', vi: 'Sách Toán 1 song ngữ', en: 'book' },
  { id: 'f1', label: 'Học Toán bằng tiếng Việt', left: 15.1, top: 66, w: 13.4, h: 10.1, sound: 'pop', vi: 'Học Toán bằng tiếng Việt' },
  { id: 'f2', label: 'Làm quen tiếng Anh', left: 29.2, top: 66, w: 13.1, h: 10.1, sound: 'pop', vi: 'Làm quen tiếng Anh', en: 'Hello, English!' },
  { id: 'f3', label: 'Vui học mỗi ngày', left: 42.6, top: 66, w: 12.4, h: 10.1, sound: 'pop', vi: 'Vui học mỗi ngày' },
  { id: 'sign', label: 'Bảng gỗ', left: 84.3, top: 35.5, w: 14.9, h: 21.4, sound: 'pop', vi: 'Cùng Buddy khám phá thế giới Toán học!' },
  { id: 'school', label: 'Trường học', left: 0, top: 30.5, w: 13, h: 30.5, sound: 'pop', vi: 'Trường học của bé', en: 'school' },
]

// Ánh lấp lánh nhỏ đặt ở vùng trời trống, không đè lên chữ hay nhân vật.
const TWINKLES = [
  { left: 15, top: 6, size: 18, delay: 0 },
  { left: 55, top: 5, size: 14, delay: 0.7 },
  { left: 67, top: 30, size: 16, delay: 1.3 },
  { left: 92, top: 8, size: 20, delay: 0.4 },
  { left: 74, top: 6, size: 12, delay: 1.8 },
  { left: 33, top: 52, size: 12, delay: 1.1 },
]

const CONFETTI_COLORS = ['#FFD34D', '#58B9F7', '#F49AC1', '#83DDB4', '#C9B6F5', '#FFAE8B']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 8 + Math.random() * 8,
        round: i % 3 === 0,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.w * 1.6,
            background: p.color,
            borderRadius: p.round ? '50%' : 3,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

function playSound(s: Sound) {
  if (s === 'pop') playPop()
  else if (s === 'sparkle') playSparkle()
  else if (s === 'jingle') playJingle()
  else playNumberNote(s.note)
}

interface Props {
  onDone: () => void
}

/**
 * Màn hình mở đầu chính là banner chính thức của app (hiển thị nguyên vẹn, đúng tỷ lệ).
 * Các vùng chạm trong suốt nằm đúng trên từng hình trong banner: chạm Buddy, con số,
 * hình khối… để nghe âm thanh và giọng đọc Việt – Anh.
 */
export default function IntroScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'ready' | 'greet' | 'leaving'>('ready')
  const [active, setActive] = useState<{ id: string; n: number } | null>(null)
  const [muted, toggleMute] = useMuted()
  const timers = useRef<number[]>([])
  const startRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    startRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = timers.current
    return () => {
      t.forEach((id) => window.clearTimeout(id))
      document.body.style.overflow = prevOverflow
    }
  }, [])

  const start = () => {
    playJingle()
    setPhase('greet')
    setActive({ id: 'buddy', n: Date.now() })
    timers.current.push(
      window.setTimeout(() => {
        speak(GREETING)
        speak("Hello! Let's learn math together!", 'en-US', true)
      }, 1700),
    )
  }

  const leave = () => {
    playPop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setPhase('leaving')
    timers.current.push(window.setTimeout(onDone, 550))
  }

  const tap = (h: Hotspot) => {
    playSound(h.sound)
    setActive({ id: h.id, n: Date.now() })
    speak(h.vi)
    if (h.en) speak(h.en, 'en-US', true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Màn hình chào mừng Math Buddy AI"
      className={`fixed inset-0 z-[60] overflow-hidden bg-[#bfe5ff] ${phase === 'leaving' ? 'intro-out' : ''}`}
    >
      {/* Nền: chính ảnh banner phóng to và làm mờ, để cả màn hình mang cùng không khí với banner */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
        style={{ backgroundImage: `url("${BANNER_SRC}")` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/25 to-white/40" aria-hidden />

      {phase !== 'ready' && <Confetti />}

      {/* Nút điều khiển góc trên */}
      <div className="absolute right-3 top-3 z-30 flex gap-2 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-deep shadow-card hover:bg-white"
          aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {muted ? <MutedIcon /> : <SpeakerIcon className="h-6 w-6" />}
        </button>
        <button type="button" onClick={leave} className="h-12 rounded-full bg-white/90 px-4 text-sm font-extrabold text-deep shadow-card hover:bg-white">
          Bỏ qua ›
        </button>
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-3 py-16 sm:gap-6 sm:px-6">
        {/* Banner chính thức – nguyên ảnh, đúng tỷ lệ 2:1, không phủ chữ */}
        <div
          className="banner-in relative w-full shrink-0 overflow-hidden rounded-[22px] shadow-[0_24px_60px_-20px_rgba(20,70,130,0.55)] ring-4 ring-white/80 sm:rounded-[32px]"
          style={{ maxWidth: 'min(1400px, calc((100dvh - 270px) * 2))' }}
        >
          <img
            src={BANNER_SRC}
            alt="Math Buddy AI – Bé vui học Toán song ngữ. Mỗi ngày một khám phá. Buddy cùng bé khám phá thế giới Toán học."
            width={1774}
            height={887}
            draggable={false}
            className="banner-breathe block h-auto w-full select-none"
          />

          {TWINKLES.map((t, i) => (
            <span
              key={i}
              className="sparkle pointer-events-none absolute text-white drop-shadow-[0_0_6px_rgba(255,236,150,0.95)]"
              style={{ left: `${t.left}%`, top: `${t.top}%`, fontSize: t.size, animationDelay: `${t.delay}s` }}
              aria-hidden
            >
              ✦
            </span>
          ))}

          {HOTSPOTS.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => tap(h)}
              aria-label={`Chạm để nghe: ${h.label}`}
              title={h.label}
              className={`hotspot absolute ${h.round ? 'rounded-full' : 'rounded-2xl'}`}
              style={{ left: `${h.left}%`, top: `${h.top}%`, width: `${h.w}%`, height: `${h.h}%` }}
            >
              {active?.id === h.id && <span key={active.n} className={`hotspot-ring ${h.round ? 'rounded-full' : 'rounded-2xl'}`} aria-hidden />}
            </button>
          ))}
        </div>

        <div className="flex min-h-[104px] flex-col items-center gap-3">
          {phase === 'ready' ? (
            <>
              <button
                ref={startRef}
                type="button"
                onClick={start}
                className="pulse-ring rise-in rounded-full bg-gradient-to-b from-[#FFE27A] to-[#FFC93C] px-10 py-4 text-2xl font-black tracking-wide text-ink transition hover:brightness-105 active:translate-y-1 sm:px-14 sm:text-3xl"
                style={{ animationDelay: '0.6s, 0.6s' }}
              >
                ▶ BẮT ĐẦU
              </button>
              <p className="rise-in rounded-full bg-white/90 px-4 py-1.5 text-center text-sm font-extrabold text-deep shadow-card sm:text-base" style={{ animationDelay: '0.9s' }}>
                Chạm vào Buddy, con số, hình khối trong tranh để nghe nhé!
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={leave}
                className="rise-in rounded-full bg-deep px-10 py-4 text-2xl font-black text-white shadow-[0_10px_0_#1d5f92] transition hover:brightness-110 active:translate-y-1 sm:text-3xl"
                style={{ animationDelay: '0.6s' }}
              >
                Vào lớp học ▶
              </button>
              <p className="rise-in rounded-full bg-white/90 px-4 py-1.5 text-center text-sm font-extrabold text-deep shadow-card sm:text-base" style={{ animationDelay: '0.3s' }}>
                Xin chào bé! Mình là Buddy. Cùng học thật vui nhé!
              </p>
            </>
          )}
        </div>
      </div>

      {/* Gợi ý xoay ngang khi điện thoại đang dựng đứng */}
      <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-xs font-bold text-deep/70 sm:hidden [@media(orientation:landscape)]:hidden">
        ⟳ Xoay ngang điện thoại để xem tranh to hơn
      </p>
    </div>
  )
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  )
}
