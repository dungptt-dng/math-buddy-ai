// Bộ máy học chạy hoàn toàn trong trình duyệt (ứng dụng tĩnh, không có máy chủ).
// Dữ liệu (bạn học, lần làm bài, kết quả từng câu) lưu ở localStorage của thiết bị này và không gửi đi đâu.
// Chấm điểm vẫn XÁC ĐỊNH theo đáp án chuẩn trong ngân hàng câu hỏi; không dùng AI để chấm.
import { GAMES, MIN_GAME_QUESTIONS } from '../content/games';
import { LESSONS } from '../content/lessons';
import { SKILL_NAMES, toPublic, type Lesson, type Question, type SkillId } from '../content/types';
import type { AnswerResponse, AttemptState, AttemptSummary, GameCard, LessonCard, Me, Profile, ProfileReport, Result, SkillLabel, SkillStat } from '../types';
import { csvTime, toCsv } from './csv';
import { buddyLines, GAME_REWARD, hintLevelFor } from './feedback';
import { grade, MAX_TRIES } from './grading';

export class EngineError extends Error {
  constructor(
    public code: 'no_learner' | 'not_found' | 'conflict' | 'invalid' | 'denied',
    message: string,
  ) {
    super(message);
  }
}

export const TRIAL_NOTICE = 'Con đang học thử. Kết quả chỉ để con tự xem, không lưu vào tiến độ của bạn nào và sẽ tự xóa sau 7 ngày.';
export const AVATARS = ['🐱', '🐰', '🐻', '🐶', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐧'];
/** Một kỹ năng chỉ được nhận xét khi đã có ít nhất chừng này câu. */
export const MIN_EVIDENCE = 5;
const TRIAL_TTL_MS = 7 * 24 * 3600_000;
const STORAGE_KEY = 'mathbuddy.v1';

type QResult = {
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
type Attempt = {
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
type Data = {
  v: 1;
  profiles: Profile[];
  current: { kind: 'profile'; id: string } | { kind: 'trial'; since: string } | null;
  attempts: Attempt[];
  nextId: number;
  /** Lớp của lượt học gần nhất – điền sẵn ô "Tên lớp" (không giữ tên học sinh sau khi kết thúc phiên). */
  lastClass?: string;
};

// ---------- Lưu trữ ----------

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

const empty = (): Data => ({ v: 1, profiles: [], current: null, attempts: [], nextId: 1 });

function load(): Data {
  let d: Data;
  try {
    const raw = backend().getItem(STORAGE_KEY);
    d = raw ? (JSON.parse(raw) as Data) : empty();
    if (d?.v !== 1 || !Array.isArray(d.attempts) || !Array.isArray(d.profiles)) d = empty();
  } catch {
    d = empty();
  }
  // Dữ liệu học thử tự xóa sau 7 ngày.
  const now = Date.now();
  const oldTrial = (iso: string) => now - new Date(iso).getTime() > TRIAL_TTL_MS;
  d.attempts = d.attempts.filter((a) => a.owner !== 'trial' || !oldTrial(a.startedAt));
  if (d.current?.kind === 'trial' && oldTrial(d.current.since)) d.current = null;
  if (d.current?.kind === 'profile' && !d.profiles.some((p) => p.id === (d.current as { id: string }).id)) d.current = null;
  return d;
}

function save(d: Data) {
  try {
    backend().setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    throw new EngineError('conflict', 'Thiết bị đã hết chỗ lưu. Hãy nhờ người lớn xóa bớt dữ liệu cũ trong Góc phụ huynh nhé.');
  }
}

/** Đọc – sửa – ghi trong một bước. */
function mutate<T>(fn: (d: Data) => T): T {
  const d = load();
  const out = fn(d);
  save(d);
  return out;
}

// ---------- Ngân hàng nội dung ----------

const QUESTIONS = new Map<string, { q: Question; lesson: Lesson; position: number }>();
for (const lesson of LESSONS) lesson.questions.forEach((q, position) => QUESTIONS.set(q.id, { q, lesson, position }));
/** Học sinh chỉ thấy bài đã duyệt. */
const APPROVED = LESSONS.filter((l) => l.status === 'approved').sort((a, b) => a.order - b.order);
const question = (id: string) => QUESTIONS.get(id)!.q;
const lessonTitle = (a: Attempt) =>
  a.lessonId ? (LESSONS.find((l) => l.id === a.lessonId)?.title ?? '') : (GAMES.find((g) => g.id === a.gameId)?.title ?? '');

/** Bài đã duyệt có nhiều câu nhất cho một kỹ năng. */
function lessonForSkill(skill: SkillId) {
  const best = APPROVED.map((l) => ({ l, n: l.questions.filter((q) => q.skill === skill).length }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n || x.l.order - y.l.order)[0];
  return best ? { id: best.l.id, title: best.l.title } : null;
}

function gamePool(skills: SkillId[]): Question[] {
  return APPROVED.flatMap((l) => l.questions).filter((q) => q.domain === 'math' && skills.includes(q.skill));
}

// ---------- Người học ----------

function ownerOf(d: Data): string {
  if (!d.current) throw new EngineError('no_learner', 'Con chưa vào học. Hãy nhập tên và lớp ở trang đầu, hoặc bấm “Học thử” nhé.');
  return d.current.kind === 'profile' ? `p:${d.current.id}` : 'trial';
}

export function me(): Me | null {
  const d = load();
  if (!d.current) return null;
  if (d.current.kind === 'trial') return { mode: 'trial', notice: TRIAL_NOTICE };
  const id = d.current.id;
  return { mode: 'profile', profile: d.profiles.find((p) => p.id === id)! };
}

export function listProfiles(): Profile[] {
  return load().profiles;
}

export const MAX_NAME = 20;
export const MAX_CLASS = 10;
/** Gộp khoảng trắng, bỏ khoảng trắng đầu/cuối, chuẩn hóa dấu tiếng Việt (bàn phím có thể gõ dấu tách rời). */
const tidy = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const lower = (s: string) => s.toLocaleLowerCase('vi');

/** Tên của con: chữ cái (có dấu), số, khoảng trắng và . ' - ; phải có ít nhất một chữ cái. */
export function cleanName(raw: string): string {
  const name = tidy(raw);
  if (!name) throw new EngineError('invalid', 'Con hãy nhập tên của con nhé.');
  if (name.length > MAX_NAME) throw new EngineError('invalid', `Tên dài quá rồi. Con viết ngắn hơn, tối đa ${MAX_NAME} chữ nhé.`);
  if (!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(name) || !/\p{L}/u.test(name)) throw new EngineError('invalid', 'Tên chỉ gồm chữ cái và số thôi con nhé.');
  return name;
}

/** Tên lớp: "lớp 1a" → "1A". */
export function cleanClassName(raw: string): string {
  const cls = tidy(raw)
    .replace(/^lớp\s*/iu, '')
    .toLocaleUpperCase('vi');
  if (!cls) throw new EngineError('invalid', 'Con hãy nhập tên lớp nhé.');
  if (cls.length > MAX_CLASS || !/^[\p{L}\p{M}\p{N} .\/-]+$/u.test(cls) || !/[\p{L}\p{N}]/u.test(cls)) {
    throw new EngineError('invalid', 'Tên lớp viết ngắn gọn như 1A, 1B con nhé.');
  }
  return cls;
}

const sameLearner = (p: Profile, name: string, cls: string) => lower(p.nickname) === lower(name) && lower(p.className ?? '') === lower(cls);
const DUPLICATE = 'Trên máy đã có bạn cùng tên ở lớp này. Con thêm một chữ để khác đi nhé (VD: Minh Anh, Minh 2).';

export function createProfile(nickname: string, avatar: string, className = ''): Profile {
  const name = cleanName(nickname);
  const cls = className ? cleanClassName(className) : '';
  if (!AVATARS.includes(avatar)) throw new EngineError('invalid', 'Con hãy chọn một con vật nhé.');
  return mutate((d) => {
    if (d.profiles.some((p) => sameLearner(p, name, cls))) throw new EngineError('conflict', DUPLICATE);
    const p: Profile = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nickname: name, avatar, createdAt: new Date().toISOString() };
    if (cls) p.className = d.lastClass = cls;
    d.profiles.push(p);
    d.current = { kind: 'profile', id: p.id };
    return p;
  });
}

/**
 * "Bắt đầu học" ở trang đầu: tên + lớp + con vật.
 * Tên và lớp không phải mật khẩu: muốn vào lại kết quả đã lưu của một bạn, phải chạm đúng con vật bạn đó đã chọn lần đầu.
 * Bạn mới thì con vật vừa chạm trở thành con vật của bạn ấy.
 */
export function enterLearner(nickname: string, className: string, avatar: string): Profile {
  const name = cleanName(nickname);
  const cls = cleanClassName(className);
  if (!AVATARS.includes(avatar)) throw new EngineError('invalid', 'Con hãy chọn một con vật nhé.');
  const d = load();
  const known =
    d.profiles.find((p) => sameLearner(p, name, cls)) ??
    // Bạn tạo từ bản cũ (chưa có lớp): nhận lại nếu đúng tên và đúng con vật, rồi ghi thêm lớp.
    d.profiles.find((p) => !p.className && lower(p.nickname) === lower(name) && p.avatar === avatar);
  if (!known) return createProfile(name, avatar, cls);
  if (known.avatar !== avatar) throw new EngineError('denied', 'Chưa đúng con vật của con rồi. Con nhớ lại và chạm lại nhé!');
  return mutate((d) => {
    const p = d.profiles.find((x) => x.id === known.id)!;
    p.className = d.lastClass = cls;
    d.current = { kind: 'profile', id: p.id };
    return p;
  });
}

/** "Đổi thông tin": sửa tên hoặc lớp của bạn đang học (kết quả cũ giữ nguyên). */
export function updateLearner(nickname: string, className: string): Profile {
  const name = cleanName(nickname);
  const cls = cleanClassName(className);
  return mutate((d) => {
    const cur = d.current;
    if (cur?.kind !== 'profile') throw new EngineError('no_learner', 'Con chưa vào học. Hãy nhập tên và lớp ở trang đầu nhé.');
    if (d.profiles.some((p) => p.id !== cur.id && sameLearner(p, name, cls))) throw new EngineError('conflict', DUPLICATE);
    const p = d.profiles.find((x) => x.id === cur.id)!;
    p.nickname = name;
    p.className = d.lastClass = cls;
    return p;
  });
}

/** Lớp của lượt học gần nhất trên máy này (để điền sẵn), hoặc "". */
export function lastClassName(): string {
  return load().lastClass ?? '';
}

/** Mỗi lần bấm Học thử là một phiên mới: dữ liệu học thử cũ được xóa. */
export function startTrial() {
  mutate((d) => {
    d.attempts = d.attempts.filter((a) => a.owner !== 'trial');
    d.current = { kind: 'trial', since: new Date().toISOString() };
  });
}

/** "Kết thúc phiên học": bạn sau dùng máy không thấy tên bạn trước (chỉ giữ lại tên lớp để điền sẵn). */
export function signOut() {
  mutate((d) => {
    if (d.current?.kind === 'trial') d.attempts = d.attempts.filter((a) => a.owner !== 'trial');
    d.current = null;
  });
}

export function deleteProfile(id: string) {
  mutate((d) => {
    d.profiles = d.profiles.filter((p) => p.id !== id);
    d.attempts = d.attempts.filter((a) => a.owner !== `p:${id}`);
    if (d.current?.kind === 'profile' && d.current.id === id) d.current = null;
  });
}

export function deleteAllData() {
  save(empty());
}

// ---------- Danh sách bài & trò chơi ----------

function summary(a: Attempt) {
  const rs = Object.values(a.results);
  const math = rs.filter((x) => x.domain === 'math');
  const eng = rs.filter((x) => x.domain === 'english');
  return {
    mathCorrect: math.filter((x) => x.firstTryCorrect).length,
    mathTotal: math.length,
    vocabCorrect: eng.filter((x) => x.firstTryCorrect).length,
    vocabTotal: eng.length,
  };
}

/** Số lần trả lời và số lần bấm Gợi ý (cả Toán và từ vựng). */
function effort(a: Attempt) {
  const rs = Object.values(a.results);
  return { tries: rs.reduce((s, x) => s + x.tries, 0), hintsUsed: rs.reduce((s, x) => s + x.hintsUsed, 0) };
}

/** Từ tiếng Anh con đã gặp: từ Buddy giới thiệu và từ ở các câu từ vựng đã làm. */
function wordsMet(attempts: Attempt[]): string[] {
  const set = new Set<string>();
  for (const a of attempts) {
    for (const w of a.words ?? []) set.add(w.word);
    for (const [id, r] of Object.entries(a.results)) if (r.done && r.domain === 'english') question(id).vocab?.forEach((w) => set.add(w));
  }
  return [...set];
}

export function listLessons(): LessonCard[] {
  const d = load();
  const owner = ownerOf(d);
  const mine = d.attempts.filter((a) => a.owner === owner);
  return APPROVED.map((l) => {
    const inProgress = mine.filter((a) => a.lessonId === l.id && a.status === 'in_progress').at(-1);
    const last = mine.filter((a) => a.lessonId === l.id && a.status === 'completed').at(-1);
    return {
      id: l.id,
      title: l.title,
      topic: l.topic,
      icon: l.icon,
      domain: l.domain,
      questionCount: l.questions.length,
      status: inProgress ? 'in_progress' : last ? 'completed' : 'new',
      inProgressAttemptId: inProgress?.id ?? null,
      answeredInProgress: inProgress ? Object.values(inProgress.results).filter((x) => x.done).length : 0,
      last: last ? summary(last) : null,
    };
  });
}

export function listGames(): GameCard[] {
  ownerOf(load());
  return GAMES.map((g) => ({
    id: g.id,
    title: g.title,
    englishName: g.englishName,
    howTo: g.howTo,
    available: gamePool(g.skills).length >= MIN_GAME_QUESTIONS,
  }));
}

// ---------- Làm bài ----------

function attemptState(a: Attempt): AttemptState {
  return {
    id: a.id,
    mode: a.owner === 'trial' ? 'trial' : 'profile',
    kind: a.kind,
    lessonId: a.lessonId,
    gameId: a.gameId,
    title: lessonTitle(a),
    status: a.status,
    maxTries: MAX_TRIES,
    questions: a.questionIds.map((id) => toPublic(question(id))),
    progress: a.questionIds.map((id) => {
      const r = a.results[id];
      const q = question(id);
      // Mở lại bài giữa chừng: câu đang làm dở giữ nguyên mức gợi ý và các phương án đã loại.
      const help = !r.done && r.tries > 0 ? buddyLines({ isCorrect: false, attemptCount: r.tries, done: false, en: q.en, answerText: '', seed: 0 }) : null;
      return {
        questionId: id,
        done: r.done,
        tries: r.tries,
        firstTryCorrect: r.firstTryCorrect === true,
        finalCorrect: r.finalCorrect === true,
        hintLevel: r.done ? 0 : hintLevelFor(r.tries),
        eliminated: q.kind === 'choice' ? (r.answers ?? []).filter((x): x is string => typeof x === 'string' && x !== q.answer) : [],
        help: help && { tip: help.tip, steps: help.steps },
      };
    }),
  };
}

/** Câu Buddy nói khi cùng con xem đáp án. */
function answerText(q: Question): string {
  if (q.kind === 'number') return `The answer is ${q.answer}.`;
  if (q.kind === 'multi') return 'Look at the green ticks.';
  const label = q.options?.find((o) => o.id === q.answer)?.label;
  return label && /^[\d\s,+−=<>-]+$/.test(label) ? `The answer is ${label}.` : 'Look at the green tick.';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startAttempt(target: { lessonId: string } | { gameId: string }): AttemptState {
  return mutate((d) => {
    const owner = ownerOf(d);
    let questions: Question[];
    let lessonId: string | null = null;
    let gameId: string | null = null;
    if ('lessonId' in target) {
      const lesson = APPROVED.find((l) => l.id === target.lessonId);
      if (!lesson) throw new EngineError('not_found', 'Không tìm thấy bài này.');
      lessonId = lesson.id;
      // Câu Toán trước, từ vựng sau; trong mỗi phần đi từ dễ đến khó.
      questions = [...lesson.questions].sort(
        (x, y) => Number(x.domain === 'english') - Number(y.domain === 'english') || x.level - y.level || QUESTIONS.get(x.id)!.position - QUESTIONS.get(y.id)!.position,
      );
      for (const a of d.attempts) if (a.owner === owner && a.lessonId === lessonId && a.status === 'in_progress') a.status = 'abandoned';
    } else {
      const game = GAMES.find((g) => g.id === target.gameId);
      if (!game) throw new EngineError('not_found', 'Không tìm thấy trò chơi.');
      gameId = game.id;
      const pool = gamePool(game.skills);
      if (pool.length < MIN_GAME_QUESTIONS) throw new EngineError('conflict', 'Trò chơi này chưa đủ câu hỏi.');
      questions = shuffle(pool)
        .slice(0, game.size)
        .sort((x, y) => x.level - y.level);
    }
    const a: Attempt = {
      id: d.nextId++,
      owner,
      kind: lessonId ? 'lesson' : 'game',
      lessonId,
      gameId,
      questionIds: questions.map((q) => q.id),
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      results: Object.fromEntries(
        questions.map((q) => [q.id, { skill: q.skill, domain: q.domain, tries: 0, hintsUsed: 0, firstTryCorrect: null, finalCorrect: null, done: false, answers: [] }]),
      ),
      words: [],
    };
    d.attempts.push(a);
    return attemptState(a);
  });
}

/** Chỉ mở được bài làm của chính người học hiện tại. */
function owned(d: Data, id: number): Attempt {
  const owner = ownerOf(d);
  const a = d.attempts.find((x) => x.id === id && x.owner === owner);
  if (!a) throw new EngineError('not_found', 'Không tìm thấy bài làm.');
  return a;
}

export function getAttempt(id: number): AttemptState {
  return attemptState(owned(load(), id));
}

function openQuestion(a: Attempt, questionId: string) {
  if (a.status !== 'in_progress') throw new EngineError('conflict', 'Bài này đã kết thúc rồi.');
  const r = a.results[questionId];
  if (!r) throw new EngineError('invalid', 'Câu hỏi không thuộc bài này.');
  if (r.done) throw new EngineError('conflict', 'Câu này đã xong rồi.');
  return { q: question(questionId), r };
}

export function hint(attemptId: number, questionId: string) {
  return mutate((d) => {
    const { q, r } = openQuestion(owned(d, attemptId), questionId);
    const index = Math.min(r.hintsUsed, q.hints.length - 1);
    if (r.hintsUsed < q.hints.length) r.hintsUsed++;
    return { hint: q.hints[index], index: index + 1, total: q.hints.length };
  });
}

export function answer(attemptId: number, questionId: string, value: unknown): AnswerResponse {
  return mutate((d) => {
    const a = owned(d, attemptId);
    const { q, r } = openQuestion(a, questionId);
    const status = grade(q, value);
    if (status === 'invalid') {
      // Không tính là một lần trả lời; không tự đoán ý của trẻ.
      return {
        status,
        guide: q.kind === 'number' ? 'Con hãy nhập một số bằng các nút số nhé.' : q.kind === 'multi' ? 'Con hãy chạm chọn ít nhất một hình nhé.' : 'Con hãy chọn một đáp án nhé.',
      };
    }
    // 1) Chấm trước. 2) Lưu kết quả thật. 3) Sau đó mới chọn lời Buddy theo đúng kết quả đã chấm.
    const correct = status === 'correct';
    const tryNo = r.tries + 1;
    const done = correct || tryNo >= MAX_TRIES;
    r.tries = tryNo;
    if (r.firstTryCorrect === null) r.firstTryCorrect = correct;
    r.finalCorrect = done ? correct : null;
    r.done = done;
    (r.answers ??= []).push(value);

    const englishWord = correct ? introduceWord(a, q) : undefined;
    const lines = buddyLines({
      isCorrect: correct,
      attemptCount: tryNo,
      done,
      en: q.en,
      englishWord,
      answerText: answerText(q),
      seed: a.id * 31 + tryNo + a.questionIds.indexOf(q.id) * 7,
    });
    return {
      status,
      done,
      attemptCount: tryNo,
      hintLevel: done ? 0 : hintLevelFor(tryNo),
      ...lines,
      englishWord,
      reward: correct && a.gameId ? GAME_REWARD[a.gameId] : undefined,
      correctAnswer: done ? q.answer : undefined,
    };
  });
}

/**
 * Giới thiệu một từ tiếng Anh sau câu làm đúng – không phải câu nào cũng có, để con không bị quá tải:
 * chỉ câu Toán, mỗi từ một lần trong một bài, và không giới thiệu ở hai câu liền nhau.
 */
function introduceWord(a: Attempt, q: Question): string | undefined {
  const w = q.en.word;
  if (!w || q.domain !== 'math') return undefined;
  const words = (a.words ??= []);
  if (words.some((x) => x.word === w)) return undefined;
  const here = a.questionIds.indexOf(q.id);
  const last = words.at(-1);
  if (last && here - a.questionIds.indexOf(last.questionId) < 2) return undefined;
  words.push({ questionId: q.id, word: w });
  return w;
}

export function finish(attemptId: number): Result {
  return mutate((d) => {
    const a = owned(d, attemptId);
    if (a.status === 'in_progress') {
      const left = Object.values(a.results).filter((x) => !x.done).length;
      if (left > 0) throw new EngineError('conflict', `Con còn ${left} câu chưa làm.`);
      a.status = 'completed';
      a.finishedAt = new Date().toISOString();
    }
    return resultOf(d, a);
  });
}

export function result(attemptId: number): Result {
  const d = load();
  const a = owned(d, attemptId);
  if (a.status !== 'completed') throw new EngineError('conflict', 'Con chưa làm xong bài này.');
  return resultOf(d, a);
}

function resultOf(d: Data, a: Attempt): Result {
  const rs = Object.values(a.results);
  const math = rs.filter((x) => x.domain === 'math');
  const eng = rs.filter((x) => x.domain === 'english');
  const mathCorrect = math.filter((x) => x.firstTryCorrect).length;
  const bySkill = new Map<SkillId, { n: number; ok: number }>();
  for (const x of math) {
    const s = bySkill.get(x.skill) ?? { n: 0, ok: 0 };
    s.n++;
    if (x.firstTryCorrect) s.ok++;
    bySkill.set(x.skill, s);
  }
  const goodSkills = [...bySkill].filter(([, s]) => s.ok / s.n >= 0.8).map(([k]) => SKILL_NAMES[k]);
  // Chỉ gợi ý ôn lại kỹ năng chưa đạt mức "làm tốt" (tránh vừa khen vừa nhắc ôn cùng một kỹ năng).
  const weak = [...bySkill].filter(([, s]) => s.n - s.ok >= 2 && s.ok / s.n < 0.8).sort((x, y) => y[1].n - y[1].ok - (x[1].n - x[1].ok))[0];

  let next: Result['next'] = null;
  if (weak) {
    const l = lessonForSkill(weak[0]);
    if (l) next = { lessonId: l.id, title: l.title, reason: `Luyện thêm một chút phần “${SKILL_NAMES[weak[0]]}” nhé.` };
  }
  if (!next) {
    const done = new Set(d.attempts.filter((x) => x.owner === a.owner && x.status === 'completed' && x.lessonId).map((x) => x.lessonId));
    const upcoming = APPROVED.find((l) => !done.has(l.id) && l.domain === 'math');
    if (upcoming) next = { lessonId: upcoming.id, title: upcoming.title, reason: 'Con sẵn sàng khám phá bài mới rồi!' };
  }
  const ratio = math.length ? mathCorrect / math.length : eng.length ? eng.filter((x) => x.firstTryCorrect).length / eng.length : 0;
  // Lời chúc mừng của Buddy khi xong bài: chỉ tiếng Anh, luôn tích cực.
  const [buddy, praise] =
    ratio >= 0.9
      ? ['Fantastic! You finished!', 'You are a math star!']
      : ratio >= 0.7
        ? ['Great job! You finished!', 'You are doing great!']
        : ratio >= 0.4
          ? ['You did it! Well done!', 'Practice makes you stronger!']
          : ['You finished! Good trying!', "Let's practice again, step by step."];
  return {
    attemptId: a.id,
    kind: a.kind,
    mode: a.owner === 'trial' ? 'trial' : 'profile',
    lessonId: a.lessonId,
    gameId: a.gameId,
    mathCorrect,
    mathTotal: math.length,
    vocabCorrect: eng.filter((x) => x.firstTryCorrect).length,
    vocabTotal: eng.length,
    correctAfterRetry: math.filter((x) => !x.firstTryCorrect && x.finalCorrect).length,
    buddy,
    praise,
    goodSkills,
    next,
    trialNotice: a.owner === 'trial' ? TRIAL_NOTICE : null,
  };
}

// ---------- Góc phụ huynh & thầy cô (chỉ dữ liệu của các bạn học trên máy này, không tính học thử) ----------

export function labelFor(answered: number, accuracy: number | null): SkillLabel {
  if (answered < MIN_EVIDENCE || accuracy === null) return 'insufficient';
  if (accuracy >= 0.85) return 'mastered';
  if (accuracy < 0.6) return 'needs_practice';
  return 'developing';
}

function reportOf(d: Data, p: Profile): ProfileReport {
  const mine = d.attempts.filter((a) => a.owner === `p:${p.id}`);
  const answered = mine.flatMap((a) => Object.values(a.results).filter((r) => r.done));
  const math = answered.filter((r) => r.domain === 'math');
  const eng = answered.filter((r) => r.domain === 'english');
  const skills = new Map<SkillId, { answered: number; correct: number }>();
  for (const r of math) {
    const s = skills.get(r.skill) ?? { answered: 0, correct: 0 };
    s.answered++;
    if (r.firstTryCorrect) s.correct++;
    skills.set(r.skill, s);
  }
  const skillStats: SkillStat[] = [...skills].map(([skill, s]) => {
    const accuracy = s.answered ? s.correct / s.answered : null;
    return { skill, name: SKILL_NAMES[skill], ...s, accuracy, label: labelFor(s.answered, accuracy) };
  });
  const attempts: AttemptSummary[] = mine
    .filter((a) => a.status !== 'abandoned' || Object.values(a.results).some((r) => r.done))
    .map((a) => ({ id: a.id, kind: a.kind, title: lessonTitle(a), status: a.status, startedAt: a.startedAt, finishedAt: a.finishedAt, ...summary(a), ...effort(a) }))
    .reverse();
  const correct = math.filter((r) => r.firstTryCorrect).length;
  return {
    profile: p,
    questionsDone: math.length,
    correct,
    accuracy: math.length ? correct / math.length : null,
    correctAfterRetry: math.filter((r) => !r.firstTryCorrect && r.finalCorrect).length,
    lessonsCompleted: new Set(mine.filter((a) => a.status === 'completed' && a.lessonId).map((a) => a.lessonId)).size,
    hintsUsed: answered.reduce((s, r) => s + r.hintsUsed, 0),
    vocab: { answered: eng.length, correct: eng.filter((r) => r.firstTryCorrect).length },
    wordsMet: wordsMet(mine),
    skills: skillStats,
    attempts,
    lastActive: mine.map((a) => a.finishedAt ?? a.startedAt).sort().at(-1) ?? null,
  };
}

export function reports(): ProfileReport[] {
  const d = load();
  return d.profiles.map((p) => reportOf(d, p));
}

/** CSV (UTF-8 có BOM) để mở bằng Excel: tổng hợp theo bạn học, hoặc từng lần làm bài. */
export function exportCsv(type: 'profiles' | 'attempts'): string {
  const rs = reports();
  const pct = (x: number | null) => (x === null ? '' : Math.round(x * 100));
  if (type === 'profiles') {
    return toCsv(
      ['Bạn học', 'Lớp', 'Số câu Toán đã làm', 'Số câu đúng (lần đầu)', 'Tỷ lệ đúng (%)', 'Đúng sau khi thử lại', 'Số lần bấm Gợi ý', 'Số bài đã hoàn thành', 'Từ vựng: số câu', 'Từ vựng: số câu đúng', 'Từ tiếng Anh đã làm quen', 'Kỹ năng đã vững', 'Kỹ năng cần ôn', 'Lần học gần nhất'],
      rs.map((r) => [
        r.profile.nickname,
        r.profile.className ?? '',
        r.questionsDone,
        r.correct,
        pct(r.accuracy),
        r.correctAfterRetry,
        r.hintsUsed,
        r.lessonsCompleted,
        r.vocab.answered,
        r.vocab.correct,
        r.wordsMet.join('; '),
        r.skills.filter((s) => s.label === 'mastered').map((s) => s.name).join('; '),
        r.skills.filter((s) => s.label === 'needs_practice').map((s) => s.name).join('; '),
        csvTime(r.lastActive),
      ]),
    );
  }
  return toCsv(
    ['Bạn học', 'Lớp', 'Bài / trò chơi', 'Loại', 'Trạng thái', 'Bắt đầu', 'Hoàn thành', 'Toán: đúng', 'Toán: tổng', 'Từ vựng: đúng', 'Từ vựng: tổng', 'Số lần trả lời', 'Số lần bấm Gợi ý'],
    rs.flatMap((r) =>
      r.attempts.map((a) => [
        r.profile.nickname,
        r.profile.className ?? '',
        a.title,
        a.kind === 'lesson' ? 'Bài ôn luyện' : 'Trò chơi',
        a.status === 'completed' ? 'Hoàn thành' : a.status === 'in_progress' ? 'Đang làm' : 'Bỏ dở',
        csvTime(a.startedAt),
        csvTime(a.finishedAt),
        a.mathCorrect,
        a.mathTotal,
        a.vocabCorrect,
        a.vocabTotal,
        a.tries,
        a.hintsUsed,
      ]),
    ),
  );
}

/** Danh sách bài cho người lớn xem tình trạng kiểm duyệt / đối chiếu. */
export function lessonBank() {
  return LESSONS.map((l) => ({ id: l.id, title: l.title, topic: l.topic, status: l.status, verification: l.verification, questionCount: l.questions.length }));
}
