// Âm thanh ngắn và đọc to (Web Speech API). Mọi thứ đều tùy chọn: không có thì app vẫn chạy bình thường.
import { useSyncExternalStore } from 'react';

const SOUND_KEY = 'mb.sound';
let soundOn = (() => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
})();
const listeners = new Set<() => void>();

export function useSound(): [boolean, () => void] {
  const on = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => soundOn,
  );
  return [
    on,
    () => {
      soundOn = !soundOn;
      try {
        localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
      } catch {
        /* bỏ qua */
      }
      if (!soundOn) window.speechSynthesis?.cancel();
      listeners.forEach((l) => l());
    },
  ];
}

function pickVoice(lang: string) {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
}

/** Đọc to. `force` dùng khi trẻ chủ động bấm nút loa. */
export function speak(text: string, lang: 'vi-VN' | 'en-US', force = false) {
  if ((!soundOn && !force) || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = lang === 'en-US' ? 0.85 : 0.95;
  u.pitch = 1.1;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

let ctx: AudioContext | null = null;
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

export function sfx(kind: 'correct' | 'wrong' | 'tap' | 'win') {
  if (!soundOn) return;
  try {
    ctx ??= new AudioContext();
    if (kind === 'correct') {
      tone(660, 0, 0.15);
      tone(880, 0.12, 0.25);
    } else if (kind === 'wrong') {
      tone(330, 0, 0.18, 'triangle', 0.08);
      tone(262, 0.15, 0.25, 'triangle', 0.08);
    } else if (kind === 'tap') {
      tone(520, 0, 0.06, 'sine', 0.05);
    } else {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3));
    }
  } catch {
    /* trình duyệt không hỗ trợ âm thanh */
  }
}
