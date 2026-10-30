// Nhạc nền trang đầu: một bài nhạc thiếu nhi vui tươi, nhẹ nhàng, do trình duyệt tự chơi bằng Web Audio
// (đàn gỗ marimba, chuông, đàn ukulele, bè trầm, trống lắc). Không cần tệp nhạc, không tải gì từ mạng.

const BPM = 112;
const STEP = 60 / BPM / 2; // một móc đơn
const VOLUME = 0.65;

// Hợp âm từng ô nhịp (16 ô, lặp lại): đoạn A vui, đoạn B lên cao rồi về chủ âm.
const CHORDS: Record<string, { notes: number[]; root: number }> = {
  C: { notes: [60, 64, 67], root: 48 },
  G: { notes: [59, 62, 67], root: 43 },
  Am: { notes: [60, 64, 69], root: 45 },
  F: { notes: [60, 65, 69], root: 41 },
  Em: { notes: [59, 64, 67], root: 40 },
};
const PROGRESSION = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];

// Giai điệu: mỗi ô nhịp 8 móc đơn. "-" ngân tiếp nốt trước, "." nghỉ.
const MELODY = [
  'G4 . C5 E5 G5 - E5 .',
  'D5 . G5 - F5 E5 D5 .',
  'C5 . E5 A5 G5 - E5 .',
  'F5 - E5 D5 C5 - - .',
  'G4 . C5 E5 G5 - C6 .',
  'B5 . A5 G5 D5 - G5 .',
  'A5 . G5 F5 E5 . F5 .',
  'D5 - - E5 D5 - B4 .',
  'A5 . A5 C6 A5 . F5 .',
  'G5 . G5 B5 G5 . D5 .',
  'E5 G5 B5 G5 E5 . G5 .',
  'A5 - G5 - E5 - C5 .',
  'F5 A5 C6 A5 F5 . A5 .',
  'G5 B5 D6 B5 G5 . F5 .',
  'E5 . G5 . C6 - - .',
  '. . G5 E5 C5 - - .',
].map((bar) => bar.split(' '));

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (name: string) => 12 * (Number(name.slice(-1)) + 1) + SEMITONE[name[0]];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ---------- Nhạc cụ ----------

function env(a: BaseAudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

function osc(a: BaseAudioContext, dest: AudioNode, type: OscillatorType, freq: number, t: number, dur: number) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(a: BaseAudioContext) {
  let b = noiseBuffers.get(a);
  if (!b) {
    b = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(a, b);
  }
  return b;
}

function noiseHit(a: BaseAudioContext, out: AudioNode, t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  src.connect(f).connect(env(a, out, t, peak, 0.003, decay));
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.05);
}

/** Đàn gỗ marimba: tiếng tròn, gõ nhẹ. */
function marimba(a: BaseAudioContext, out: AudioNode, t: number, f: number, len: number) {
  const decay = Math.min(1.2, 0.35 + len * 0.6);
  osc(a, env(a, out, t, 0.2, 0.004, decay), 'sine', f, t, decay);
  osc(a, env(a, out, t, 0.05, 0.002, 0.12), 'sine', f * 3.93, t, 0.12);
  osc(a, env(a, out, t, 0.03, 0.004, decay * 0.5), 'triangle', f * 2, t, decay * 0.5);
}

/** Chuông nhỏ lấp lánh (glockenspiel). */
function bell(a: BaseAudioContext, out: AudioNode, t: number, f: number) {
  osc(a, env(a, out, t, 0.045, 0.002, 1), 'sine', f, t, 1);
  osc(a, env(a, out, t, 0.012, 0.002, 0.3), 'sine', f * 2.76, t, 0.3);
}

/** Đàn ukulele gảy hợp âm, các dây lệch nhau một chút như tay gảy thật. */
function strum(a: BaseAudioContext, out: AudioNode, t: number, notes: number[]) {
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.connect(out);
  notes.forEach((m, i) => {
    const ti = t + i * 0.014;
    osc(a, env(a, lp, ti, 0.045, 0.003, 0.28), 'triangle', hz(m), ti, 0.28);
  });
}

/** Bè trầm nảy nhẹ. */
function bass(a: BaseAudioContext, out: AudioNode, t: number, m: number) {
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  lp.connect(out);
  osc(a, env(a, lp, t, 0.17, 0.006, 0.32), 'triangle', hz(m), t, 0.32);
  osc(a, env(a, out, t, 0.08, 0.006, 0.3), 'sine', hz(m), t, 0.3);
}

/** Nền hợp âm êm, ngân cả ô nhịp. */
function pad(a: BaseAudioContext, out: AudioNode, t: number, notes: number[], dur: number) {
  notes.forEach((m) => {
    const g = a.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.35);
    g.gain.setValueAtTime(0.018, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(out);
    osc(a, g, 'sine', hz(m), t, dur);
    osc(a, g, 'sine', hz(m) * 1.004, t, dur); // lệch nhẹ cho tiếng dày, ấm
  });
}

function kick(a: BaseAudioContext, out: AudioNode, t: number) {
  const o = osc(a, env(a, out, t, 0.22, 0.003, 0.2), 'sine', 130, t, 0.2);
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
}

/** Chơi một móc đơn thứ `step` của bài (đếm từ 0, bài tự lặp) tại thời điểm `t`. */
export function playStep(a: BaseAudioContext, out: AudioNode, t: number, step: number) {
  const bar = Math.floor(step / 8) % MELODY.length;
  const s = step % 8;
  const chord = CHORDS[PROGRESSION[bar]];
  const lastBar = bar === MELODY.length - 1;

  const tok = MELODY[bar][s];
  if (tok !== '-' && tok !== '.') {
    let len = 1;
    while (MELODY[bar][s + len] === '-') len++;
    const f = hz(midi(tok));
    marimba(a, out, t, f, len * STEP);
    if (bar >= 8) bell(a, out, t + 0.005, f * 2); // đoạn B thêm chuông cho rộn ràng
  }

  if (s === 0) pad(a, out, t, chord.notes, 8 * STEP);
  if (s === 0 || (s === 4 && !lastBar)) bass(a, out, t, chord.root);
  if ((s === 3 || s === 6) && !lastBar) bass(a, out, t, chord.root + 7);
  if (s === 2 || s === 6) strum(a, out, t, chord.notes);

  if (s === 0 || (s === 4 && !lastBar)) kick(a, out, t);
  if (s === 2 || s === 6) noiseHit(a, out, t, 'bandpass', 1800, 0.05, 0.09); // tiếng búng tay
  noiseHit(a, out, t, 'highpass', 7000, s % 2 ? 0.035 : 0.018, 0.045); // trống lắc
}

// ---------- Phát / dừng ----------

let ctx: AudioContext | null = null;
let session: { master: GainNode; duck: GainNode; timer: number; cleanup: () => void } | null = null;

function reverb(a: BaseAudioContext) {
  const len = Math.floor(a.sampleRate * 1.8);
  const b = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const r = a.createConvolver();
  r.buffer = b;
  return r;
}

/** Nối các nhạc cụ tới loa: có thêm chút tiếng vang cho mềm mại. Trả về nút để các nhạc cụ nối vào. */
export function makeMixer(a: BaseAudioContext, dest: AudioNode) {
  const mix = a.createGain();
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const wet = a.createGain();
  wet.gain.value = 0.22;
  mix.connect(comp);
  mix.connect(reverb(a)).connect(wet).connect(comp);
  comp.connect(dest);
  return mix;
}

/** Bắt đầu phát nhạc nền (lặp liên tục, to dần). Trình duyệt chỉ cho phát sau lần chạm/bấm đầu tiên của bé. */
export function startMusic() {
  if (session) return;
  try {
    ctx ??= new AudioContext();
  } catch {
    return; // trình duyệt không hỗ trợ âm thanh
  }
  const a = ctx;
  const duck = a.createGain();
  const master = a.createGain();
  master.gain.setValueAtTime(0, a.currentTime);
  master.gain.linearRampToValueAtTime(VOLUME, a.currentTime + 2);
  duck.connect(master).connect(a.destination);
  const mix = makeMixer(a, duck);

  let step = 0;
  let next = a.currentTime + 0.15;
  const timer = window.setInterval(() => {
    while (next < a.currentTime + 0.2) {
      playStep(a, mix, next, step++);
      next += STEP;
    }
  }, 50);

  const unlock = () => {
    if (a.state === 'suspended' && !document.hidden) void a.resume();
  };
  const onVisibility = () => (document.hidden ? void a.suspend() : unlock());
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  events.forEach((e) => window.addEventListener(e, unlock, true));
  document.addEventListener('visibilitychange', onVisibility);
  unlock();

  session = {
    master,
    duck,
    timer,
    cleanup: () => {
      events.forEach((e) => window.removeEventListener(e, unlock, true));
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

/** Nhỏ dần rồi dừng nhạc nền. */
export function stopMusic() {
  if (!ctx || !session) return;
  const { master, timer, cleanup } = session;
  session = null;
  cleanup();
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 0.6);
  window.setTimeout(() => {
    window.clearInterval(timer);
    master.disconnect();
  }, 700);
}

/** Vặn nhỏ nhạc khi Buddy đang nói để bé nghe rõ lời. */
export function duckMusic(on: boolean) {
  if (!ctx || !session) return;
  session.duck.gain.setTargetAtTime(on ? 0.25 : 1, ctx.currentTime, 0.15);
}
