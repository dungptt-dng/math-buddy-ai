// Đọc to bằng giọng nói của trình duyệt (Web Speech API), nếu được hỗ trợ.
import { isMuted } from './sound'

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** queue = true: đọc nối tiếp sau câu đang đọc thay vì ngắt ngang. */
export function speak(text: string, lang: 'vi-VN' | 'en-US' = 'vi-VN', queue = false): boolean {
  if (!speechSupported() || isMuted()) return false
  const synth = window.speechSynthesis
  if (!queue) synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = lang === 'en-US' ? 0.85 : 0.95
  u.pitch = 1.1
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
  if (voice) u.voice = voice
  synth.speak(u)
  return true
}
