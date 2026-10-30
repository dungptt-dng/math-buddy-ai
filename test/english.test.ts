// Kiểm thử khu "Làm quen tiếng Anh": ngân hàng nội dung, chấm điểm, theo dõi từng từ, tách riêng với Toán.
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/engine/index';
import { wordLabel } from '../src/engine/english';
import { EN_AFTER_RETRY, EN_CORRECT, EN_REVEAL, EN_TIP, EN_TRY_AGAIN, enFinishLines } from '../src/engine/enFeedback';
import { EN_GAMES, TOPICS, WORDS, type EnQuestion } from '../src/content/englishTopics';
import { LESSONS } from '../src/content/lessons';
import type { EnAnswer } from '../src/types';

const mem = new Map<string, string>();
engine.useStorage({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
beforeEach(() => mem.clear());

const VIET = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const ALL = TOPICS.flatMap((t) => t.questions.map((q) => ({ t, q })));
const Q = new Map(ALL.map((x) => [x.q.id, x.q]));
/** Các từ gần nghĩa: không được làm phương án gây nhiễu cho nhau ở câu chọn hình / chọn từ theo hình. */
const CLOSE = [
  ['add', 'plus'],
  ['subtract', 'minus', 'take-away'],
  ['more', 'greater'],
  ['less', 'smaller'],
  ['equal', 'equals'],
];

const right = (q: EnQuestion) => q.answer;
function wrong(q: EnQuestion): unknown {
  if (q.kind === 'choice') return q.options.find((o) => o.id !== q.answer)!.id;
  // Đổi chỗ hai cặp đầu: hai từ sai, từ còn lại đúng.
  const [a, b, ...rest] = q.left.map((o) => o.id);
  return { [a]: q.answer[b], [b]: q.answer[a], ...Object.fromEntries(rest.map((l) => [l, q.answer[l]])) };
}
type Graded = Exclude<EnAnswer, { status: 'invalid' }>;
const graded = (r: EnAnswer): Graded => {
  assert.notEqual(r.status, 'invalid');
  return r as Graded;
};

/** Học hết một chủ đề: xem hết thẻ từ, rồi luyện tập. */
function playTopic(topicId: string, wrongFirst = new Set<string>(), wrongAll = new Set<string>()) {
  const a = engine.startEnglish({ topicId });
  for (const w of a.words) engine.seeWord(a.id, w.id);
  engine.startEnglishPractice(a.id);
  const replies: Graded[] = [];
  for (const pq of a.questions) {
    const q = Q.get(pq.id)!;
    if (wrongAll.has(q.id)) {
      for (let i = 0; i < engine.MAX_EN_TRIES; i++) replies.push(graded(engine.answerEnglish(a.id, q.id, wrong(q))));
    } else {
      if (wrongFirst.has(q.id)) replies.push(graded(engine.answerEnglish(a.id, q.id, wrong(q))));
      replies.push(graded(engine.answerEnglish(a.id, q.id, right(q))));
    }
  }
  return { attempt: a, replies, result: engine.finishEnglish(a.id) };
}

// ---------- Ngân hàng nội dung ----------

test('có đủ các nhóm từ vựng yêu cầu, mỗi chủ đề 3–5 từ mới', () => {
  const required = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'add', 'plus', 'equals', 'subtract', 'minus', 'take-away', 'more', 'less', 'greater', 'smaller', 'equal', 'circle', 'square', 'triangle', 'rectangle', 'count', 'how-many', 'above', 'below', 'inside', 'outside', 'long', 'short', 'tall', 'heavy', 'light'];
  const taught = new Set(TOPICS.flatMap((t) => t.words));
  for (const w of required) assert.ok(taught.has(w), `thiếu từ ${w}`);
  for (const t of TOPICS) {
    assert.ok(t.words.length >= 3 && t.words.length <= 5, `${t.id}: ${t.words.length} từ`);
    for (const w of t.words) assert.ok(WORDS[w], `${t.id}: từ ${w} chưa có trong ngân hàng`);
  }
});

test('mã chủ đề và mã câu là duy nhất', () => {
  const ids = ALL.map((x) => x.q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length);
});

test('mỗi chủ đề có 8–10 câu, ít nhất 4 dạng bài, có bài nghe; mỗi từ được luyện ít nhất 2 lần', () => {
  for (const t of TOPICS) {
    assert.ok(t.questions.length >= 8 && t.questions.length <= 10, `${t.id}: ${t.questions.length} câu`);
    const types = new Set(t.questions.map((q) => q.type));
    assert.ok(types.size >= 4, `${t.id}: chỉ có ${types.size} dạng bài`);
    assert.ok(types.has('listen_word') || types.has('listen_picture'), `${t.id}: chưa có bài nghe`);
    for (const w of t.words) {
      const n = t.questions.filter((q) => q.words.includes(w)).length;
      assert.ok(n >= 2, `${t.id}: từ ${w} chỉ được luyện ${n} lần`);
    }
    for (const q of t.questions) for (const w of q.words) assert.ok(t.words.includes(w), `${q.id}: luyện từ ${w} ngoài chủ đề`);
  }
});

test('đủ 7 dạng bài: nghe–chọn, nhìn hình–chọn từ, ghép, điền chỗ trống, nghe–nhận diện hình, mẫu câu, trò chơi', () => {
  const types = new Set(ALL.map((x) => x.q.type));
  for (const t of ['listen_word', 'picture_word', 'match', 'missing', 'listen_picture', 'sentence'] as const) assert.ok(types.has(t), `thiếu dạng ${t}`);
  assert.ok(EN_GAMES.length > 0, 'có trò chơi từ vựng');
  const matchTo = new Set(ALL.filter((x) => x.q.kind === 'match').map((x) => (x.q.kind === 'match' && x.q.right[0].pic ? 'pic' : 'vi')));
  assert.deepEqual([...matchTo].sort(), ['pic', 'vi'], 'có cả ghép với hình và ghép với nghĩa tiếng Việt');
});

test('đáp án chuẩn hợp lệ; phương án không trùng; câu ghép đúng 1–1', () => {
  for (const { q } of ALL) {
    if (q.kind === 'choice') {
      const ids = q.options.map((o) => o.id);
      assert.ok(ids.length >= 2, `${q.id}: cần ít nhất 2 phương án`);
      assert.equal(new Set(ids).size, ids.length, `${q.id}: trùng mã phương án`);
      assert.ok(ids.includes(q.answer), `${q.id}: đáp án không nằm trong phương án`);
      const shown = q.options.map((o) => JSON.stringify(o.pic ?? o.text));
      assert.equal(new Set(shown).size, shown.length, `${q.id}: hai phương án trông giống nhau`);
      if (['listen_word', 'listen_picture', 'picture_word'].includes(q.type)) {
        assert.equal(q.answer, q.words[0], `${q.id}: đáp án phải là từ đang luyện`);
        for (const id of ids) assert.ok(WORDS[id], `${q.id}: phương án ${id} không phải từ trong ngân hàng`);
      }
      if (q.type === 'picture_word') assert.deepEqual(q.pic, WORDS[q.answer].pic, `${q.id}: hình không khớp từ`);
      if (q.type === 'missing') assert.ok(q.text?.includes('_'), `${q.id}: thiếu chỗ trống`);
    } else {
      assert.deepEqual(q.left.map((o) => o.id), q.words);
      const values = Object.values(q.answer);
      assert.equal(new Set(values).size, values.length, `${q.id}: hai từ cùng nối vào một ô`);
      assert.deepEqual(new Set(values), new Set(q.right.map((o) => o.id)));
      q.left.forEach((o, i) => assert.notEqual(q.right[i].id, q.answer[o.id], `${q.id}: cột phải không được xếp thẳng hàng với cột trái`));
    }
  }
});

// Bài nghe – chọn từ phân biệt bằng âm nên không cần luật này; bài có hình thì hai từ gần nghĩa dễ cùng hợp một hình.
test('không đặt hai từ gần nghĩa làm phương án của nhau ở câu chọn hình / chọn từ theo hình', () => {
  for (const { q } of ALL) {
    if (q.kind !== 'choice' || !['listen_picture', 'picture_word'].includes(q.type)) continue;
    const ids = q.options.map((o) => o.id);
    for (const group of CLOSE) assert.ok(ids.filter((id) => group.includes(id)).length <= 1, `${q.id}: ${ids.join(', ')}`);
  }
});

test('phần tiếng Anh chỉ dùng tiếng Anh; nghĩa tiếng Việt tách riêng và luôn có', () => {
  for (const w of Object.values(WORDS)) {
    assert.ok(!VIET.test(w.text), w.id);
    assert.ok(w.vi.trim().length > 0, `${w.id}: thiếu nghĩa tiếng Việt`);
  }
  for (const { q } of ALL) {
    for (const s of [q.ask.en, q.say, q.text ?? '', q.full ?? '']) assert.ok(!VIET.test(s), `${q.id}: "${s}"`);
    assert.ok(q.ask.vi.trim().length > 0, `${q.id}: thiếu nghĩa tiếng Việt của lời hướng dẫn`);
    const texts = q.kind === 'choice' ? q.options.map((o) => o.text ?? '') : q.left.map((o) => o.text ?? '');
    for (const s of texts) assert.ok(!VIET.test(s), `${q.id}: "${s}"`);
  }
  const lines = [...EN_CORRECT, ...EN_AFTER_RETRY, ...EN_TRY_AGAIN[1], ...EN_TRY_AGAIN[2], EN_REVEAL, ...Object.values(EN_TIP), ...[0, 0.5, 0.8, 1].flatMap(enFinishLines)];
  for (const l of lines) {
    assert.ok(!VIET.test(l.en), `lời Buddy trộn tiếng Việt: ${l.en}`);
    assert.ok(l.en.split(/\s+/).length <= 8, `lời Buddy quá dài: ${l.en}`);
    assert.ok(l.vi.trim().length > 0, `thiếu nghĩa: ${l.en}`);
  }
});

test('bài Toán không còn câu tiếng Anh xen vào', () => {
  for (const l of LESSONS) assert.ok(l.questions.every((q) => q.domain === 'math'), l.id);
});

// ---------- Học và chấm điểm ----------

test('chưa vào học thì không mở được khu tiếng Anh', () => {
  assert.throws(() => engine.listEnglishTopics(), (e: engine.EngineError) => e.code === 'no_learner');
});

test('một chủ đề: làm quen từ (thẻ từ) → luyện tập → kết quả', () => {
  engine.createProfile('Bé An', '🐱');
  const topics = engine.listEnglishTopics();
  assert.equal(topics.length, TOPICS.length);
  assert.ok(topics.every((t) => t.status === 'new'));
  const a = engine.startEnglish({ topicId: 'en-numbers-1-5' });
  assert.equal(a.phase, 'learn');
  assert.deepEqual(a.words.map((w) => w.text), ['one', 'two', 'three', 'four', 'five']);
  assert.equal(a.words[0].vi, 'Số một');
  assert.ok(a.questions.every((q) => !('answer' in q)), 'màn hình không nhận đáp án');
  engine.seeWord(a.id, 'one');
  assert.deepEqual(engine.getEnglishAttempt(a.id).seen, ['one'], 'mở lại vẫn nhớ từ đã xem');
  assert.throws(() => engine.seeWord(a.id, 'circle'), (e: engine.EngineError) => e.code === 'invalid');
  assert.equal(engine.listEnglishTopics()[0].status, 'in_progress');

  const { result } = playTopic('en-numbers-1-5');
  assert.equal(result.correct, result.total);
  assert.equal(result.review.length, 0);
  assert.deepEqual(result.good.map((w) => w.id).sort(), ['five', 'four', 'one', 'three', 'two']);
  assert.equal(result.next?.topicId, 'en-numbers-6-10', 'gợi ý chủ đề tiếp theo');
  assert.ok(!VIET.test(result.buddy.en) && !VIET.test(result.praise.en));
  const card = engine.listEnglishTopics()[0];
  assert.equal(card.status, 'completed');
  assert.deepEqual(card.last, { correct: result.total, total: result.total });
});

test('đúng ngay lần đầu mới tính điểm chính; từ sai nhiều lần vào danh sách cần ôn, sai rồi sửa được thì không', () => {
  engine.createProfile('Bé Bin', '🐰');
  const topic = TOPICS.find((t) => t.id === 'en-shapes')!;
  const rect = topic.questions.filter((q) => q.words.includes('rectangle')).map((q) => q.id);
  const circleFirst = topic.questions.find((q) => q.words[0] === 'circle')!.id;
  const { result } = playTopic('en-shapes', new Set([...rect, circleFirst]));
  assert.equal(result.correct, result.total - rect.length - 1);
  assert.equal(result.correctAfterRetry, rect.length + 1);
  assert.deepEqual(result.review.map((w) => w.id), ['rectangle'], 'sai ở mọi lần gặp → cần ôn lại');
  assert.ok(result.good.some((w) => w.id === 'circle'), 'sai lần đầu nhưng các lần sau đều đúng → đã nhận biết');
  assert.equal(result.next?.topicId, 'en-shapes', 'gợi ý học lại chủ đề có từ cần ôn');
  assert.equal(result.skills.listening.correct, result.skills.listening.total - 1, 'kết quả nghe tính riêng');
  assert.equal(result.skills.sentence.correct, result.skills.sentence.total - 1);
  const e = engine.reports()[0].english;
  assert.equal(e.words.find((w) => w.id === 'rectangle')!.label, 'review', 'Góc giáo viên dùng cùng quy tắc');
  assert.equal(e.words.find((w) => w.id === 'circle')!.label, 'good');
});

test('lời Buddy theo đúng kết quả chấm: đúng → khen; sai → thử lại + gợi ý; hết lượt → cùng xem đáp án', () => {
  engine.createProfile('Bé Cốm', '🐻');
  const a = engine.startEnglish({ topicId: 'en-position' });
  engine.startEnglishPractice(a.id);
  const q = Q.get(a.questions[0].id)!;

  assert.equal(engine.answerEnglish(a.id, q.id, 'khong-co').status, 'invalid', 'đáp án lạ không tính lượt');
  const r1 = graded(engine.answerEnglish(a.id, q.id, wrong(q)));
  assert.equal(r1.status, 'wrong');
  assert.equal(r1.done, false);
  assert.equal(r1.attemptCount, 1, 'câu không hợp lệ không bị tính là một lần');
  assert.ok(EN_TRY_AGAIN[1].includes(r1.buddy));
  assert.deepEqual(r1.tip, EN_TIP[q.type]);
  assert.equal(r1.correctAnswer, undefined, 'chưa lộ đáp án');
  assert.deepEqual(engine.getEnglishAttempt(a.id).progress[0].eliminated, [wrong(q)], 'phương án sai được gạch khi mở lại');

  const q2 = Q.get(a.questions[1].id)!;
  let last: Graded | null = null;
  for (let i = 0; i < engine.MAX_EN_TRIES; i++) last = graded(engine.answerEnglish(a.id, q2.id, wrong(q2)));
  assert.equal(last!.done, true);
  assert.deepEqual(last!.buddy, EN_REVEAL);
  assert.equal(last!.correctAnswer, q2.answer);
  assert.deepEqual(last!.reveal!.words.map((w) => w.id), q2.words);
  assert.throws(() => engine.answerEnglish(a.id, q2.id, right(q2)), (e: engine.EngineError) => e.code === 'conflict');

  const r3 = graded(engine.answerEnglish(a.id, q.id, right(q)));
  assert.equal(r3.status, 'correct');
  assert.ok(EN_AFTER_RETRY.includes(r3.buddy), 'đúng sau khi thử lại: khen sự cố gắng');
});

test('lời Buddy không bao giờ trái với kết quả chấm, ở mọi câu của mọi chủ đề', () => {
  engine.createProfile('Bé Đậu', '🐶');
  for (const t of TOPICS) {
    const { replies } = playTopic(t.id, new Set(t.questions.filter((_, i) => i % 2 === 0).map((q) => q.id)));
    for (const r of replies) {
      if (r.status === 'correct') assert.ok([...EN_CORRECT, ...EN_AFTER_RETRY].includes(r.buddy), `${t.id}: ${r.buddy.en}`);
      else assert.ok([...EN_TRY_AGAIN[1], ...EN_TRY_AGAIN[2], EN_REVEAL].includes(r.buddy), `${t.id}: ${r.buddy.en}`);
    }
  }
});

test('câu ghép: chấm từng cặp, ghi riêng từng từ; nối thiếu hoặc trùng không tính lượt', () => {
  engine.createProfile('Bé Mít', '🦊');
  const a = engine.startEnglish({ topicId: 'en-numbers-1-5' });
  engine.startEnglishPractice(a.id);
  const q = Q.get('n5-4')!;
  if (q.kind !== 'match') throw new Error('n5-4 phải là câu ghép');
  assert.equal(engine.answerEnglish(a.id, q.id, { one: q.answer.one }).status, 'invalid', 'nối thiếu');
  assert.equal(engine.answerEnglish(a.id, q.id, { one: q.answer.one, two: q.answer.one, three: q.answer.three }).status, 'invalid', 'hai từ nối một ô');
  const r = graded(engine.answerEnglish(a.id, q.id, wrong(q)));
  assert.equal(r.status, 'wrong');
  assert.deepEqual(r.pairs, { one: false, two: false, three: true });
  assert.deepEqual(engine.getEnglishAttempt(a.id).progress.find((p) => p.questionId === q.id)!.lockedPairs, { three: q.answer.three }, 'cặp đúng được giữ khi thử lại');
  assert.equal(graded(engine.answerEnglish(a.id, q.id, q.answer)).status, 'correct');
  const stored = JSON.parse(mem.get('mathbuddy.v1')!).english[0].results[q.id];
  assert.deepEqual(stored.words, { one: false, two: false, three: true }, 'ghi theo lần trả lời đầu');
});

test('mức nhận biết từng từ theo các lần gặp gần nhất', () => {
  assert.equal(wordLabel([]), 'new');
  assert.equal(wordLabel([true]), 'learning');
  assert.equal(wordLabel([false]), 'review');
  assert.equal(wordLabel([true, true]), 'good');
  assert.equal(wordLabel([false, true]), 'good', 'đã sửa được');
  assert.equal(wordLabel([true, false]), 'review', 'lần gần nhất sai');
  assert.equal(wordLabel([false, false, true]), 'review', 'sai 2 trong 3 lần gần nhất');
  assert.equal(wordLabel([false, false, true, true]), 'good', 'chỉ xét 3 lần gần nhất');
});

test('kết quả Toán và tiếng Anh lưu riêng: sai tiếng Anh không đổi điểm Toán', () => {
  engine.createProfile('Bé Na', '🐼');
  const math = engine.startAttempt({ lessonId: 'add-10' });
  const mathQ = new Map(LESSONS.flatMap((l) => l.questions).map((q) => [q.id, q]));
  for (const pq of math.questions) engine.answer(math.id, pq.id, mathQ.get(pq.id)!.answer);
  engine.finish(math.id);
  const before = engine.reports()[0];
  assert.equal(before.english.answered, 0);

  const shapes = TOPICS.find((t) => t.id === 'en-shapes')!;
  playTopic('en-shapes', new Set(), new Set(shapes.questions.map((q) => q.id)));
  const after = engine.reports()[0];
  assert.equal(after.questionsDone, before.questionsDone);
  assert.equal(after.correct, before.correct);
  assert.equal(after.accuracy, 1, 'điểm Toán không bị trừ');
  assert.deepEqual(after.skills, before.skills);
  assert.equal(after.english.answered, shapes.questions.length);
  assert.equal(after.english.correct, 0);
  assert.equal(after.english.topicsCompleted, 1);
  // Câu ghép sai vẫn có một cặp đúng (xem wrong()), nên chỉ từ chưa đúng lần nào mới chắc chắn là “cần ôn”.
  const shapeWords = after.english.words.filter((w) => shapes.words.includes(w.id));
  assert.ok(shapeWords.every((w) => w.correct > 0 || w.label === 'review'));
  assert.ok(shapeWords.filter((w) => w.label === 'review').length >= 3);
  assert.equal(after.english.suggestions[0].topicId, 'en-shapes', 'gợi ý ôn đúng chủ đề có từ cần ôn');
  const data = JSON.parse(mem.get('mathbuddy.v1')!);
  assert.equal(data.attempts.length, 1, 'danh sách Toán chỉ có bài Toán');
  assert.equal(data.english.length, 1, 'danh sách tiếng Anh chỉ có bài tiếng Anh');
});

test('Góc giáo viên: tiến độ tiếng Anh, từ nhận biết tốt / cần luyện, nghe và nhận diện, CSV riêng', () => {
  engine.createProfile('Minh', '🐸', '1A');
  playTopic('en-numbers-1-5');
  const six = TOPICS.find((t) => t.id === 'en-numbers-6-10')!;
  playTopic('en-numbers-6-10', new Set(six.questions.filter((q) => q.words.includes('seven')).map((q) => q.id)));
  const e = engine.reports()[0].english;
  assert.equal(e.topicsCompleted, 2);
  assert.equal(e.topicsTotal, TOPICS.length);
  assert.equal(e.wordsFamiliar, 10);
  assert.ok(e.words.find((w) => w.id === 'one')!.label === 'good');
  assert.equal(e.words.find((w) => w.id === 'seven')!.label, 'review');
  assert.ok(e.skills.listening.total > 0 && e.skills.recognition.total > 0 && e.skills.sentence.total > 0);
  assert.equal(e.topics.find((t) => t.id === 'en-numbers-1-5')!.status, 'completed');
  assert.ok(e.suggestions.length > 0 && e.suggestions.every((s) => TOPICS.some((t) => t.id === s.topicId)), 'chỉ gợi ý chủ đề có sẵn');
  assert.equal(e.suggestions[0].topicId, 'en-numbers-6-10');

  const csv = engine.exportCsv('english');
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('Minh') && csv.includes('1A'));
  const words = engine.exportCsv('english-words');
  assert.ok(words.includes('seven') && words.includes('Cần ôn lại') && words.includes('Số bảy'));
  assert.ok(!engine.exportCsv('profiles').includes('seven'), 'CSV Toán không lẫn kết quả tiếng Anh');
});

test('trò chơi từ vựng chỉ mở khi đã học từ, và chỉ dùng từ con đã học', () => {
  engine.createProfile('Bé Su', '🐵');
  assert.equal(engine.listEnglishGames()[0].available, false);
  assert.throws(() => engine.startEnglish({ gameId: 'word-balloons' }), (e: engine.EngineError) => e.code === 'conflict');
  playTopic('en-numbers-1-5');
  assert.equal(engine.listEnglishGames()[0].available, true);
  const g = engine.startEnglish({ gameId: 'word-balloons' });
  assert.equal(g.phase, 'practice');
  const learned = new Set(TOPICS[0].words);
  assert.ok(g.questions.length >= 5 && g.questions.every((q) => q.words.every((w) => learned.has(w))));
  const q = Q.get(g.questions[0].id)!;
  const r = graded(engine.answerEnglish(g.id, q.id, right(q)));
  assert.ok(r.reward && !VIET.test(r.reward.en), 'có phần thưởng bằng tiếng Anh');
});

test('học thử tiếng Anh không vào Góc giáo viên và bị xóa khi kết thúc', () => {
  engine.createProfile('Bé Tí', '🐯');
  engine.signOut();
  engine.startTrial();
  playTopic('en-counting');
  assert.equal(engine.reports()[0].english.answered, 0);
  assert.equal(engine.englishSummary().topicsDone, 1, 'học thử vẫn tự xem được kết quả');
  engine.signOut();
  assert.ok(!mem.get('mathbuddy.v1')!.includes('"owner":"trial"'));
});

test('xóa một bạn xóa luôn kết quả tiếng Anh; không mở được bài tiếng Anh của bạn khác', () => {
  const p = engine.createProfile('Bé Một', '🐨');
  const { attempt } = playTopic('en-addition');
  engine.signOut();
  engine.createProfile('Bé Hai', '🐧');
  assert.throws(() => engine.getEnglishAttempt(attempt.id), (e: engine.EngineError) => e.code === 'not_found');
  engine.deleteProfile(p.id);
  assert.equal(JSON.parse(mem.get('mathbuddy.v1')!).english.length, 0);
});

test('dữ liệu bản cũ (chưa có phần tiếng Anh, có câu từ vựng trong bài Toán) vẫn mở được', () => {
  mem.set(
    'mathbuddy.v1',
    JSON.stringify({
      v: 1,
      profiles: [{ id: 'old', nickname: 'Bé Cũ', avatar: '🐱', createdAt: '2026-10-01T00:00:00Z' }],
      current: { kind: 'profile', id: 'old' },
      nextId: 2,
      attempts: [
        {
          id: 1,
          owner: 'p:old',
          kind: 'lesson',
          lessonId: 'english-words',
          gameId: null,
          questionIds: ['eng-01', 'n10-v1'],
          status: 'in_progress',
          startedAt: '2026-10-01T00:00:00Z',
          finishedAt: null,
          results: {
            'eng-01': { skill: 'vocab', domain: 'english', tries: 1, hintsUsed: 0, firstTryCorrect: true, finalCorrect: true, done: true, answers: ['a'] },
            'n10-v1': { skill: 'vocab', domain: 'english', tries: 0, hintsUsed: 0, firstTryCorrect: null, finalCorrect: null, done: false, answers: [] },
          },
        },
      ],
    }),
  );
  assert.equal(engine.getAttempt(1).questions.length, 2);
  const r = engine.reports()[0];
  assert.equal(r.vocab.answered, 1);
  assert.equal(r.attempts[0].title, 'Làm quen từ vựng Toán tiếng Anh (bản cũ)');
  assert.equal(r.english.answered, 0);
  assert.equal(engine.listEnglishTopics().length, TOPICS.length);
});
