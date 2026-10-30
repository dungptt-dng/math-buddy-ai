// Lưu trữ chung của bộ máy học: localStorage của thiết bị này, không gửi đi đâu.
// Kết quả Toán (attempts) và kết quả tiếng Anh (english) được lưu ở HAI danh sách riêng, không bao giờ cộng gộp.
import type { EnSkill } from '../content/englishTopics';
import type { SkillId } from '../content/types';
import type { Profile } from '../types';

export class EngineError extends Error {
  constructor(
    public code: 'no_learner' | 'not_found' | 'conflict' | 'invalid' | 'denied',
    message: string,
  ) {
    super(message);
  }
}

export const TRIAL_TTL_MS = 7 * 24 * 3600_000;
const STORAGE_KEY = 'mathbuddy.v1';

export type QResult = {
  skill: SkillId;
  domain: 'math' | 'english';
  tries: number;
  /** Số lần con tự bấm nút Gợi ý. */
  hintsUsed: number;
  firstTryCorrect: boolean | null;
  finalCorrect: boolean | null;
  done: boolean;
  /** Các câu trả lời hợp lệ con đã gửi, theo thứ tự (dữ liệu cũ có thể không có). */
  answers?: unknown[];
};
export type Attempt = {
  id: number;
  /** "p:<id>" cho bạn học trên máy, "trial" cho học thử. */
  owner: string;
  kind: 'lesson' | 'game';
  lessonId: string | null;
  gameId: string | null;
  questionIds: string[];
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  finishedAt: string | null;
  results: Record<string, QResult>;
  /** Từ tiếng Anh Buddy đã giới thiệu trong lần làm bài này (theo dõi riêng với điểm Toán). */
  words?: { questionId: string; word: string }[];
};

/** Kết quả một câu tiếng Anh. */
export type EnQResult = {
  skill: EnSkill;
  tries: number;
  firstTryCorrect: boolean | null;
  finalCorrect: boolean | null;
  done: boolean;
  answers: unknown[];
  /** Từng từ trong câu có đúng ngay lần đầu không (câu nối có nhiều từ). */
  words: Record<string, boolean>;
};
/** Một lần học một chủ đề tiếng Anh (hoặc chơi trò chơi từ vựng). */
export type EnAttempt = {
  id: number;
  owner: string;
  topicId: string | null;
  gameId: string | null;
  /** learn = đang làm quen từ (thẻ từ), practice = đang làm câu luyện tập. */
  phase: 'learn' | 'practice';
  /** Các từ con đã xem ở phần làm quen. */
  seen: string[];
  questionIds: string[];
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  finishedAt: string | null;
  results: Record<string, EnQResult>;
};

export type Data = {
  v: 1;
  profiles: Profile[];
  current: { kind: 'profile'; id: string } | { kind: 'trial'; since: string } | null;
  attempts: Attempt[];
  /** Kết quả tiếng Anh (dữ liệu từ bản cũ chưa có). */
  english?: EnAttempt[];
  nextId: number;
  /** Lớp của lượt học gần nhất – điền sẵn ô "Tên lớp" (không giữ tên học sinh sau khi kết thúc phiên). */
  lastClass?: string;
};

type KV = Pick<Storage, 'getItem' | 'setItem'>;
let memory: KV | null = null;
function backend(): KV {
  if (memory) return memory;
  try {
    const ls = globalThis.localStorage;
    ls.setItem('mathbuddy.check', '1');
    ls.removeItem('mathbuddy.check');
    return ls;
  } catch {
    // Chế độ riêng tư / bị chặn lưu trữ: vẫn học được, nhưng chỉ giữ trong lần mở này.
    const m = new Map<string, string>();
    memory = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
    return memory;
  }
}

/** Dùng cho kiểm thử: thay nơi lưu trữ. */
export function useStorage(kv: KV) {
  memory = kv;
}

export const empty = (): Data => ({ v: 1, profiles: [], current: null, attempts: [], english: [], nextId: 1 });

export function load(): Data {
  let d: Data;
  try {
    const raw = backend().getItem(STORAGE_KEY);
    d = raw ? (JSON.parse(raw) as Data) : empty();
    if (d?.v !== 1 || !Array.isArray(d.attempts) || !Array.isArray(d.profiles)) d = empty();
  } catch {
    d = empty();
  }
  if (!Array.isArray(d.english)) d.english = [];
  // Dữ liệu học thử tự xóa sau 7 ngày.
  const now = Date.now();
  const oldTrial = (iso: string) => now - new Date(iso).getTime() > TRIAL_TTL_MS;
  d.attempts = d.attempts.filter((a) => a.owner !== 'trial' || !oldTrial(a.startedAt));
  d.english = d.english.filter((a) => a.owner !== 'trial' || !oldTrial(a.startedAt));
  if (d.current?.kind === 'trial' && oldTrial(d.current.since)) d.current = null;
  if (d.current?.kind === 'profile' && !d.profiles.some((p) => p.id === (d.current as { id: string }).id)) d.current = null;
  return d;
}

export function save(d: Data) {
  try {
    backend().setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    throw new EngineError('conflict', 'Thiết bị đã hết chỗ lưu. Hãy nhờ người lớn xóa bớt dữ liệu cũ trong Góc phụ huynh nhé.');
  }
}

/** Đọc – sửa – ghi trong một bước. */
export function mutate<T>(fn: (d: Data) => T): T {
  const d = load();
  const out = fn(d);
  save(d);
  return out;
}

export function ownerOf(d: Data): string {
  if (!d.current) throw new EngineError('no_learner', 'Con chưa vào học. Hãy nhập tên và lớp ở trang đầu, hoặc bấm “Học thử” nhé.');
  return d.current.kind === 'profile' ? `p:${d.current.id}` : 'trial';
}
