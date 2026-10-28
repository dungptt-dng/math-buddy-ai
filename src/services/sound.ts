// Âm thanh vui nhộn được tổng hợp trực tiếp bằng Web Audio API – không cần file nhạc,
// chạy được cả khi offline và trên GitHub Pages. Trình duyệt chỉ cho phát âm thanh
// sau khi người dùng chạm/bấm lần đầu, nên mọi hàm phát đều được gọi từ một thao tác.

const MUTE_KEY = 'mathBuddy.muted'

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* bỏ qua */
  }
  if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  window.dispatchEvent(new Event('mathbuddy:sound'))
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (isMuted()) return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface Note {
  /** Tần số (Hz) */
  f: number
  /** Thời điểm bắt đầu (giây, tính từ lúc phát) */
  t: number
  /** Độ dài (giây) */
  d: number
  type?: OscillatorType
  vol?: number
  /** Trượt tần số tới giá trị này (hiệu ứng "bụp") */
  slideTo?: number
}

function play(notes: Note[]) {
  const ac = audio()
  if (!ac) return
  const master = ac.createGain()
  master.gain.value = 0.22
  master.connect(ac.destination)
  const now = ac.currentTime + 0.02
  for (const n of notes) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = n.type ?? 'triangle'
    osc.frequency.setValueAtTime(n.f, now + n.t)
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.t + n.d)
    const v = n.vol ?? 0.9
    gain.gain.setValueAtTime(0.0001, now + n.t)
    gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    osc.connect(gain).connect(master)
    osc.start(now + n.t)
    osc.stop(now + n.t + n.d + 0.05)
  }
}

// Tần số các nốt nhạc
const N = { C4: 261.6, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 }

/** Nhạc chào mừng khoảng 2 giây cho màn hình mở đầu. */
export function playJingle() {
  const melody: [number, number, number][] = [
    [N.C5, 0, 0.18], [N.E5, 0.18, 0.18], [N.G5, 0.36, 0.18], [N.C6, 0.54, 0.32],
    [N.A5, 0.9, 0.16], [N.C6, 1.06, 0.16], [N.E6, 1.22, 0.6],
  ]
  play([
    ...melody.map(([f, t, d]) => ({ f, t, d: d + 0.1, type: 'triangle' as const })),
    ...melody.map(([f, t, d]) => ({ f: f * 2, t, d, type: 'sine' as const, vol: 0.18 })),
    { f: N.C4, t: 0, d: 0.5, type: 'sine', vol: 0.5 },
    { f: N.G4, t: 0.54, d: 0.4, type: 'sine', vol: 0.45 },
    { f: N.C4, t: 1.22, d: 0.7, type: 'sine', vol: 0.5 },
  ])
}

/** Tiếng "bụp" khi chạm bong bóng / nút. */
export function playPop() {
  play([{ f: 520, t: 0, d: 0.12, type: 'sine', slideTo: 1300, vol: 0.8 }])
}

/** Tiếng chuông lấp lánh. */
export function playSparkle() {
  play([N.E6, N.G6, N.C6 * 2].map((f, i) => ({ f, t: i * 0.07, d: 0.25, type: 'sine' as const, vol: 0.35 })))
}

/** Trả lời đúng. */
export function playCorrect() {
  play([
    { f: N.C5, t: 0, d: 0.14 },
    { f: N.E5, t: 0.1, d: 0.14 },
    { f: N.G5, t: 0.2, d: 0.14 },
    { f: N.C6, t: 0.3, d: 0.35 },
    { f: N.C6 * 2, t: 0.3, d: 0.3, type: 'sine', vol: 0.2 },
  ])
}

/** Chưa đúng – âm nhẹ nhàng, không gây sợ. */
export function playTryAgain() {
  play([
    { f: N.G4, t: 0, d: 0.18, type: 'sine', vol: 0.6 },
    { f: N.E4, t: 0.16, d: 0.28, type: 'sine', vol: 0.55 },
  ])
}

/** Hoàn thành lượt chơi. */
export function playCelebrate() {
  const seq = [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6]
  play([
    ...seq.map((f, i) => ({ f, t: i * 0.12, d: 0.2 })),
    { f: N.C6, t: 0.9, d: 0.7 },
    { f: N.E6, t: 0.9, d: 0.7, type: 'sine', vol: 0.4 },
    { f: N.G6, t: 0.9, d: 0.7, type: 'sine', vol: 0.3 },
  ])
}

/** Nốt nhạc theo số 1–9 (dùng khi bé chạm vào con số bay). */
export function playNumberNote(n: number) {
  const scale = [N.C5, N.D5, N.E5, N.F5, N.G5, N.A5, N.C6 * 0.9439, N.C6, N.D5 * 2]
  play([{ f: scale[(n - 1) % scale.length], t: 0, d: 0.3, type: 'triangle' }])
}
