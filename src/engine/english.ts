// Bộ máy học của khu "Làm quen tiếng Anh – English Practice".
// Mỗi chủ đề: làm quen từ mới (thẻ từ + nghe đọc) → luyện tập → kết quả. Chấm cố định theo đáp án chuẩn, không dùng AI.
// Kết quả lưu ở danh sách riêng (Data.english): không bao giờ cộng vào hay trừ đi điểm Toán.
import { EN_GAMES, EN_SKILL, MIN_EN_GAME_QUESTIONS, TOPICS, WORDS, type EnQuestion, type EnSkill, type EnTopic } from '../content/englishTopics';
import type {
  EnAnswer,
  EnAttemptState,
  EnAttemptSummary,
  EnGameCard,
  EnglishReport,
  EnPublicQuestion,
  EnResult,
  EnSuggestion,
  EnSummary,
  EnTopicCard,
  EnWordInfo,
  EnWordLabel,
  EnWordStat,
  Score,
} from '../types';
import { EN_AFTER_RETRY, EN_CORRECT, EN_GAME_REWARD, EN_REVEAL, EN_TIP, EN_TRY_AGAIN, enFinishLines, pickLine } from './enFeedback';
import { EngineError, load, mutate, ownerOf, type Data, type EnAttempt, type EnQResult } from './store';

/** Mỗi câu tiếng Anh được trả lời tối đa 3 lần; lần 3 vẫn sai thì Buddy cùng con xem đáp án. */
export const MAX_EN_TRIES = 3;
const TRIAL_NOTICE = 'Con đang học thử. Kết quả chỉ để con tự xem, không lưu vào tiến độ của bạn nào và sẽ tự xóa sau 7 ngày.';

const ORDERED = [...TOPICS].sort((a, b) => a.order - b.order);
const EN_QUESTIONS = new Map<string, { q: EnQuestion; topic: EnTopic }>();
for (const topic of TOPICS) for (const q of topic.questions) EN_QUESTIONS.set(q.id, { q, topic });
const TOPIC_OF_WORD = new Map<string, EnTopic>();
for (const topic of ORDERED) for (const w of topic.words) if (!TOPIC_OF_WORD.has(w)) TOPIC_OF_WORD.set(w, topic);
const ALL_WORDS = [...TOPIC_OF_WORD.keys()];

const enq = (id: string) => EN_QUESTIONS.get(id)!.q;
const info = (id: string): EnWordInfo => {
  const w = WORDS[id];
  return { id, text: w.text, vi: w.vi, pic: w.pic };
};
const mine = (d: Data, owner: string) => (d.english ?? []).filter((a) => a.owner === owner);
const titleOf = (a: EnAttempt) => {
  if (a.topicId) {
    const t = TOPICS.find((x) => x.id === a.topicId);
    return { title: t?.title ?? '', vi: t?.vi ?? '' };
  }
  const g = EN_GAMES.find((x) => x.id === a.gameId);
  return { title: g?.englishName ?? '', vi: g?.title ?? '' };
};

function toPublic(q: EnQuestion): EnPublicQuestion {
  const base = { id: q.id, kind: q.kind, type: q.type, ask: q.ask, say: q.say, listen: !!q.listen, pic: q.pic, text: q.text, words: q.words };
  return q.kind === 'choice' ? { ...base, options: q.options } : { ...base, left: q.left, right: q.right };
}

// ---------- Thống kê từng từ ----------

/** Từ con đã làm quen: đã xem thẻ từ, hoặc đã gặp trong câu luyện tập. */
function familiarWords(attempts: EnAttempt[]): Set<string> {
  const set = new Set<string>();
  for (const a of attempts) {
    a.seen.forEach((w) => set.add(w));
    for (const r of Object.values(a.results)) if (r.done) Object.keys(r.words).forEach((w) => set.add(w));
  }
  return set;
}

/** Kết quả đúng ngay lần đầu của từng từ, theo thứ tự thời gian. */
function wordOutcomes(attempts: EnAttempt[]): Map<string, boolean[]> {
  const out = new Map<string, boolean[]>();
  for (const a of [...attempts].sort((x, y) => x.id - y.id)) {
    for (const id of a.questionIds) {
      const r = a.results[id];
      if (!r?.done) continue;
      for (const [w, ok] of Object.entries(r.words)) out.set(w, [...(out.get(w) ?? []), ok]);
    }
  }
  return out;
}

/**
 * Mức nhận biết một từ, dựa trên 3 lần gặp gần nhất (để con tiến bộ thì nhãn đổi theo):
 * - cần ôn lại: lần gần nhất chưa đúng, hoặc sai từ 2 lần trở lên;
 * - nhận biết tốt: đã gặp ít nhất 2 lần, lần gần nhất đúng, sai không quá 1 lần;
 * - đang làm quen: mới gặp 1 lần; mới: chỉ mới xem thẻ từ.
 */
export function wordLabel(outcomes: boolean[]): EnWordLabel {
  if (!outcomes.length) return 'new';
  const recent = outcomes.slice(-3);
  const wrong = recent.filter((x) => !x).length;
  if (!recent.at(-1) || wrong >= 2) return 'review';
  if (outcomes.length >= 2) return 'good';
  return 'learning';
}

function wordStats(attempts: EnAttempt[]): EnWordStat[] {
  const familiar = familiarWords(attempts);
  const outcomes = wordOutcomes(attempts);
  return ALL_WORDS.filter((w) => familiar.has(w) || outcomes.has(w)).map((w) => {
    const o = outcomes.get(w) ?? [];
    return { ...info(w), topicId: TOPIC_OF_WORD.get(w)!.id, answered: o.length, correct: o.filter(Boolean).length, label: wordLabel(o) };
  });
}

function skillScores(results: EnQResult[]): Record<EnSkill, Score> {
  const s: Record<EnSkill, Score> = { listening: { correct: 0, total: 0 }, recognition: { correct: 0, total: 0 }, sentence: { correct: 0, total: 0 } };
  for (const r of results) {
    if (!r.done) continue;
    s[r.skill].total++;
    if (r.firstTryCorrect) s[r.skill].correct++;
  }
  return s;
}

const topicStatus = (attempts: EnAttempt[], topicId: string) =>
  attempts.some((a) => a.topicId === topicId && a.status === 'in_progress')
    ? 'in_progress'
    : attempts.some((a) => a.topicId === topicId && a.status === 'completed')
      ? 'completed'
      : 'new';

/**
 * Gợi ý chủ đề để ôn – tính theo quy tắc từ kết quả thật (không dùng AI, chỉ chọn chủ đề có sẵn trong ngân hàng):
 * 1) chủ đề có nhiều từ cần ôn lại nhất; 2) chủ đề đang học dở; 3) chủ đề tiếp theo chưa học.
 */
function suggestions(attempts: EnAttempt[], stats: EnWordStat[], limit = 3): EnSuggestion[] {
  const out: EnSuggestion[] = [];
  const add = (t: EnTopic, reason: string) => {
    if (out.length < limit && !out.some((x) => x.topicId === t.id)) out.push({ topicId: t.id, title: t.title, vi: t.vi, reason });
  };
  const review = stats.filter((s) => s.label === 'review');
  const byTopic = ORDERED.map((t) => ({ t, words: review.filter((s) => s.topicId === t.id) }))
    .filter((x) => x.words.length)
    .sort((x, y) => y.words.length - x.words.length || x.t.order - y.t.order);
  for (const x of byTopic) add(x.t, `Ôn lại ${x.words.length} từ chưa nhớ: ${x.words.map((s) => s.text).join(', ')}.`);
  for (const t of ORDERED) if (topicStatus(attempts, t.id) === 'in_progress') add(t, 'Đang học dở, học tiếp cho xong nhé.');
  for (const t of ORDERED) if (topicStatus(attempts, t.id) === 'new') add(t, 'Chủ đề tiếp theo chưa học.');
  return out;
}

// ---------- Danh sách chủ đề & trò chơi ----------

export function listEnglishTopics(): EnTopicCard[] {
  const d = load();
  const list = mine(d, ownerOf(d));
  return ORDERED.map((t) => {
    const inProgress = list.filter((a) => a.topicId === t.id && a.status === 'in_progress').at(-1);
    const last = list.filter((a) => a.topicId === t.id && a.status === 'completed').at(-1);
    return {
      id: t.id,
      title: t.title,
      vi: t.vi,
      icon: t.icon,
      words: t.words.map((w) => WORDS[w].text),
      questionCount: t.questions.length,
      status: topicStatus(list, t.id),
      inProgressAttemptId: inProgress?.id ?? null,
      last: last ? scoreOf(last) : null,
    };
  });
}

/** Câu cho trò chơi: dạng nghe/nhìn, chỉ với từ con đã làm quen. */
function gamePool(attempts: EnAttempt[], gameId: string): EnQuestion[] {
  const game = EN_GAMES.find((g) => g.id === gameId)!;
  const known = familiarWords(attempts);
  return TOPICS.flatMap((t) => t.questions).filter((q) => game.types.includes(q.type) && q.words.every((w) => known.has(w)));
}

export function listEnglishGames(): EnGameCard[] {
  const d = load();
  const list = mine(d, ownerOf(d));
  return EN_GAMES.map((g) => ({ id: g.id, title: g.title, englishName: g.englishName, howTo: g.howTo, available: gamePool(list, g.id).length >= MIN_EN_GAME_QUESTIONS }));
}

/** Tóm tắt tiến độ tiếng Anh của người học hiện tại (hiện ở đầu khu tiếng Anh). */
export function englishSummary(): EnSummary {
  const d = load();
  const list = mine(d, ownerOf(d));
  const stats = wordStats(list);
  return {
    topicsDone: ORDERED.filter((t) => list.some((a) => a.topicId === t.id && a.status === 'completed')).length,
    topicsTotal: ORDERED.length,
    wordsFamiliar: stats.length,
    wordsTotal: ALL_WORDS.length,
    review: stats.filter((s) => s.label === 'review').map(({ id, text, vi, pic }) => ({ id, text, vi, pic })),
    suggestion: suggestions(list, stats, 1)[0] ?? null,
  };
}

// ---------- Làm bài ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stateOf(d: Data, a: EnAttempt): EnAttemptState {
  const topic = a.topicId ? TOPICS.find((t) => t.id === a.topicId) : undefined;
  return {
    id: a.id,
    mode: a.owner === 'trial' ? 'trial' : 'profile',
    topicId: a.topicId,
    gameId: a.gameId,
    ...titleOf(a),
    phase: a.phase,
    status: a.status,
    words: (topic?.words ?? []).map(info),
    seen: a.seen,
    learnedBefore: !!topic && mine(d, a.owner).some((x) => x.topicId === topic.id && x.status === 'completed'),
    maxTries: MAX_EN_TRIES,
    questions: a.questionIds.map((id) => toPublic(enq(id))),
    progress: a.questionIds.map((id) => {
      const r = a.results[id];
      const q = enq(id);
      const lockedPairs: Record<string, string> = {};
      if (q.kind === 'match')
        for (const v of r.answers as Record<string, string>[]) for (const [l, rt] of Object.entries(v)) if (q.answer[l] === rt) lockedPairs[l] = rt;
      return {
        questionId: id,
        done: r.done,
        tries: r.tries,
        firstTryCorrect: r.firstTryCorrect === true,
        finalCorrect: r.finalCorrect === true,
        eliminated: q.kind === 'choice' ? (r.answers as string[]).filter((x) => x !== q.answer) : [],
        lockedPairs: r.done ? {} : lockedPairs,
      };
    }),
  };
}

export function startEnglish(target: { topicId: string } | { gameId: string }): EnAttemptState {
  return mutate((d) => {
    const owner = ownerOf(d);
    const list = mine(d, owner);
    let questions: EnQuestion[];
    let topicId: string | null = null;
    let gameId: string | null = null;
    if ('topicId' in target) {
      const topic = TOPICS.find((t) => t.id === target.topicId);
      if (!topic) throw new EngineError('not_found', 'Không tìm thấy chủ đề này.');
      topicId = topic.id;
      questions = topic.questions;
      for (const a of list) if (a.topicId === topicId && a.status === 'in_progress') a.status = 'abandoned';
    } else {
      const game = EN_GAMES.find((g) => g.id === target.gameId);
      if (!game) throw new EngineError('not_found', 'Không tìm thấy trò chơi.');
      gameId = game.id;
      const pool = gamePool(list, game.id);
      if (pool.length < MIN_EN_GAME_QUESTIONS) throw new EngineError('conflict', 'Con hãy học thêm một chủ đề để mở trò chơi này nhé.');
      questions = shuffle(pool).slice(0, game.size);
    }
    const a: EnAttempt = {
      id: d.nextId++,
      owner,
      topicId,
      gameId,
      phase: topicId ? 'learn' : 'practice',
      seen: [],
      questionIds: questions.map((q) => q.id),
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      results: Object.fromEntries(
        questions.map((q) => [q.id, { skill: EN_SKILL[q.type], tries: 0, firstTryCorrect: null, finalCorrect: null, done: false, answers: [], words: {} } satisfies EnQResult]),
      ),
    };
    (d.english ??= []).push(a);
    return stateOf(d, a);
  });
}

function owned(d: Data, id: number): EnAttempt {
  const owner = ownerOf(d);
  const a = (d.english ?? []).find((x) => x.id === id && x.owner === owner);
  if (!a) throw new EngineError('not_found', 'Không tìm thấy bài học này.');
  return a;
}

export function getEnglishAttempt(id: number): EnAttemptState {
  const d = load();
  return stateOf(d, owned(d, id));
}

/** Con đã xem thẻ một từ mới (phần làm quen). */
export function seeWord(attemptId: number, word: string) {
  mutate((d) => {
    const a = owned(d, attemptId);
    const topic = TOPICS.find((t) => t.id === a.topicId);
    if (!topic?.words.includes(word)) throw new EngineError('invalid', 'Từ này không thuộc chủ đề.');
    if (!a.seen.includes(word)) a.seen.push(word);
  });
}

/** Xong phần làm quen, chuyển sang luyện tập. */
export function startEnglishPractice(attemptId: number): EnAttemptState {
  return mutate((d) => {
    const a = owned(d, attemptId);
    if (a.status !== 'in_progress') throw new EngineError('conflict', 'Bài này đã kết thúc rồi.');
    a.phase = 'practice';
    return stateOf(d, a);
  });
}

/** Chấm cố định theo đáp án chuẩn. Câu nối: trả về từng cặp đúng/sai. */
export function gradeEnglish(q: EnQuestion, value: unknown): { status: 'invalid' } | { status: 'correct' | 'wrong'; pairs?: Record<string, boolean> } {
  if (q.kind === 'choice') {
    if (typeof value !== 'string' || !q.options.some((o) => o.id === value)) return { status: 'invalid' };
    return { status: value === q.answer ? 'correct' : 'wrong' };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { status: 'invalid' };
  const v = value as Record<string, unknown>;
  const lefts = q.left.map((o) => o.id);
  const rights = new Set(q.right.map((o) => o.id));
  const chosen = lefts.map((l) => v[l]);
  if (Object.keys(v).length !== lefts.length || chosen.some((x) => typeof x !== 'string' || !rights.has(x)) || new Set(chosen).size !== chosen.length) {
    return { status: 'invalid' };
  }
  const pairs = Object.fromEntries(lefts.map((l) => [l, v[l] === q.answer[l]]));
  return { status: Object.values(pairs).every(Boolean) ? 'correct' : 'wrong', pairs };
}

export function answerEnglish(attemptId: number, questionId: string, value: unknown): EnAnswer {
  return mutate((d) => {
    const a = owned(d, attemptId);
    if (a.status !== 'in_progress') throw new EngineError('conflict', 'Bài này đã kết thúc rồi.');
    const r = a.results[questionId];
    if (!r) throw new EngineError('invalid', 'Câu hỏi không thuộc bài này.');
    if (r.done) throw new EngineError('conflict', 'Câu này đã xong rồi.');
    const q = enq(questionId);
    const g = gradeEnglish(q, value);
    if (g.status === 'invalid') {
      // Không tính là một lần trả lời.
      return { status: 'invalid', guide: q.kind === 'match' ? 'Con hãy nối hết các từ nhé.' : 'Con hãy chọn một đáp án nhé.' };
    }
    // 1) Chấm. 2) Lưu kết quả thật. 3) Rồi mới chọn lời Buddy theo đúng kết quả đó.
    const correct = g.status === 'correct';
    const tryNo = r.tries + 1;
    const done = correct || tryNo >= MAX_EN_TRIES;
    r.tries = tryNo;
    if (r.firstTryCorrect === null) {
      r.firstTryCorrect = correct;
      r.words = Object.fromEntries(q.words.map((w) => [w, g.pairs ? g.pairs[w] : correct]));
    }
    r.finalCorrect = done ? correct : null;
    r.done = done;
    r.answers.push(value);

    const seed = a.id * 31 + tryNo + a.questionIds.indexOf(q.id) * 7;
    const buddy = correct ? pickLine(tryNo > 1 ? EN_AFTER_RETRY : EN_CORRECT, seed) : done ? EN_REVEAL : pickLine(EN_TRY_AGAIN[tryNo as 1 | 2], seed);
    return {
      status: g.status,
      done,
      attemptCount: tryNo,
      buddy,
      tip: !correct && !done ? EN_TIP[q.type] : undefined,
      reward: correct && a.gameId ? EN_GAME_REWARD[a.gameId] : undefined,
      pairs: g.pairs,
      correctAnswer: done ? q.answer : undefined,
      reveal: done ? { words: q.words.map(info), full: q.full } : undefined,
    };
  });
}

function scoreOf(a: EnAttempt): Score {
  const rs = Object.values(a.results);
  return { correct: rs.filter((r) => r.firstTryCorrect).length, total: rs.length };
}

export function finishEnglish(attemptId: number): EnResult {
  return mutate((d) => {
    const a = owned(d, attemptId);
    if (a.status === 'in_progress') {
      const left = Object.values(a.results).filter((r) => !r.done).length;
      if (left > 0) throw new EngineError('conflict', `Con còn ${left} câu chưa làm.`);
      a.status = 'completed';
      a.finishedAt = new Date().toISOString();
    }
    return resultOf(d, a);
  });
}

export function englishResult(attemptId: number): EnResult {
  const d = load();
  const a = owned(d, attemptId);
  if (a.status !== 'completed') throw new EngineError('conflict', 'Con chưa học xong bài này.');
  return resultOf(d, a);
}

function resultOf(d: Data, a: EnAttempt): EnResult {
  const rs = Object.values(a.results);
  const { correct, total } = scoreOf(a);
  // Từng từ trong lần học này, cùng quy tắc với Góc giáo viên (wordLabel): sai ở lần gặp cuối hoặc sai từ 2 lần → cần ôn lại.
  const byWord = wordOutcomes([a]);
  const good = [...byWord].filter(([, o]) => wordLabel(o) !== 'review').map(([w]) => info(w));
  const review = [...byWord].filter(([, o]) => wordLabel(o) === 'review').map(([w]) => info(w));
  const [buddy, praise] = enFinishLines(total ? correct / total : 0);

  let next: EnSuggestion | null = null;
  const topic = TOPICS.find((t) => t.id === a.topicId);
  if (review.length) {
    const t = topic ?? TOPIC_OF_WORD.get(review[0].id)!;
    const words = review.filter((w) => t.words.includes(w.id)).map((w) => w.text);
    next = { topicId: t.id, title: t.title, vi: t.vi, reason: `Học lại để nhớ: ${words.join(', ')}.` };
  } else {
    const list = mine(d, a.owner);
    const upcoming = ORDERED.find((t) => t.id !== a.topicId && !list.some((x) => x.topicId === t.id && x.status === 'completed'));
    if (upcoming) next = { topicId: upcoming.id, title: upcoming.title, vi: upcoming.vi, reason: 'Con sẵn sàng học chủ đề mới rồi!' };
  }
  return {
    attemptId: a.id,
    mode: a.owner === 'trial' ? 'trial' : 'profile',
    topicId: a.topicId,
    gameId: a.gameId,
    ...titleOf(a),
    correct,
    total,
    correctAfterRetry: rs.filter((r) => !r.firstTryCorrect && r.finalCorrect).length,
    skills: skillScores(rs),
    good,
    review,
    buddy,
    praise,
    next,
    trialNotice: a.owner === 'trial' ? TRIAL_NOTICE : null,
  };
}

// ---------- Góc phụ huynh & thầy cô ----------

export function englishReportOf(d: Data, owner: string): EnglishReport {
  const list = mine(d, owner);
  const stats = wordStats(list);
  const done = list.flatMap((a) => Object.values(a.results)).filter((r) => r.done);
  const attempts: EnAttemptSummary[] = list
    .filter((a) => a.status !== 'abandoned' || Object.values(a.results).some((r) => r.done))
    .map((a): EnAttemptSummary => ({
      id: a.id,
      kind: a.topicId ? 'topic' : 'game',
      title: titleOf(a).title,
      status: a.status,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
      ...scoreOf(a),
      tries: Object.values(a.results).reduce((s, r) => s + r.tries, 0),
    }))
    .reverse();
  return {
    topicsTotal: ORDERED.length,
    topicsCompleted: ORDERED.filter((t) => list.some((a) => a.topicId === t.id && a.status === 'completed')).length,
    topics: ORDERED.map((t) => {
      const completed = list.filter((a) => a.topicId === t.id && a.status === 'completed').map(scoreOf);
      const best = completed.sort((x, y) => y.correct / y.total - x.correct / x.total)[0] ?? null;
      return {
        id: t.id,
        title: t.title,
        vi: t.vi,
        status: completed.length ? 'completed' : topicStatus(list, t.id),
        best,
        times: completed.length,
      };
    }),
    wordsTotal: ALL_WORDS.length,
    wordsFamiliar: stats.length,
    words: stats,
    answered: done.length,
    correct: done.filter((r) => r.firstTryCorrect).length,
    skills: skillScores(done),
    suggestions: suggestions(list, stats),
    attempts,
    lastActive: list.map((a) => a.finishedAt ?? a.startedAt).sort().at(-1) ?? null,
  };
}

/** Ngân hàng chủ đề cho người lớn xem. */
export function englishBank() {
  return ORDERED.map((t) => ({
    id: t.id,
    title: t.title,
    vi: t.vi,
    words: t.words.map((w) => WORDS[w].text),
    questionCount: t.questions.length,
    types: [...new Set(t.questions.map((q) => q.type))],
  }));
}
