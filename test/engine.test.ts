// Kiểm thử bộ máy học chạy trong trình duyệt (dùng bộ nhớ giả thay cho localStorage).
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/engine/index';
import { LESSONS } from '../src/content/lessons';
import type { Question } from '../src/content/types';

const mem = new Map<string, string>();
engine.useStorage({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
beforeEach(() => mem.clear());

const Q = new Map(LESSONS.flatMap((l) => l.questions).map((q) => [q.id, q]));
const right = (q: Question) => q.answer;
function wrong(q: Question) {
  if (q.kind === 'number') return (q.answer as number) + 1;
  if (q.kind === 'choice') return q.options!.find((o) => o.id !== q.answer)!.id;
  return [q.options!.find((o) => !(q.answer as string[]).includes(o.id))!.id];
}
/** Làm hết một bài; `wrongFirst` là các câu cố ý trả lời sai lần đầu. */
function play(target: { lessonId: string } | { gameId: string }, wrongFirst = new Set<string>(), wrongTwice = new Set<string>()) {
  const a = engine.startAttempt(target);
  for (const pq of a.questions) {
    const q = Q.get(pq.id)!;
    if (wrongTwice.has(q.id)) {
      engine.answer(a.id, q.id, wrong(q));
      engine.answer(a.id, q.id, wrong(q));
    } else {
      if (wrongFirst.has(q.id)) engine.answer(a.id, q.id, wrong(q));
      engine.answer(a.id, q.id, right(q));
    }
  }
  return { attempt: a, result: engine.finish(a.id) };
}

test('chưa chọn tên thì không mở được bài', () => {
  assert.equal(engine.me(), null);
  assert.throws(() => engine.listLessons(), (e: engine.EngineError) => e.code === 'no_learner');
});

test('bạn học chỉ thấy bài đã duyệt, kèm trạng thái và kết quả gần nhất', () => {
  engine.createProfile('Bé Mèo', '🐱');
  const lessons = engine.listLessons();
  assert.ok(!lessons.some((l) => l.id === 'numbers-20'), 'bài nháp bị ẩn');
  assert.ok(lessons.every((l) => l.status === 'new' && l.last === null));
  play({ lessonId: 'add-10' });
  const add = engine.listLessons().find((l) => l.id === 'add-10')!;
  assert.equal(add.status, 'completed');
  assert.equal(add.last!.mathCorrect, add.last!.mathTotal);
});

test('tên trùng (không phân biệt hoa thường) bị từ chối, tên quá dài bị từ chối', () => {
  engine.createProfile('Bé Mèo', '🐱');
  assert.throws(() => engine.createProfile('bé mèo', '🐰'), (e: engine.EngineError) => e.code === 'conflict');
  assert.throws(() => engine.createProfile('x'.repeat(21), '🐰'), (e: engine.EngineError) => e.code === 'invalid');
  assert.throws(() => engine.createProfile('   ', '🐰'), (e: engine.EngineError) => e.code === 'invalid');
});

test('điểm chính thức = đúng ngay lần đầu; đúng khi thử lại được ghi riêng; từ vựng tính riêng', () => {
  engine.createProfile('Bé Thỏ', '🐰');
  const add = LESSONS.find((l) => l.id === 'add-10')!;
  const math = add.questions.filter((q) => q.domain === 'math');
  const vocab = add.questions.filter((q) => q.domain === 'english');
  const { result } = play({ lessonId: 'add-10' }, new Set([math[0].id, ...vocab.map((q) => q.id)]), new Set([math[1].id]));
  assert.equal(result.mathTotal, math.length);
  assert.equal(result.mathCorrect, math.length - 2);
  assert.equal(result.correctAfterRetry, 1);
  assert.equal(result.vocabCorrect, 0, 'sai từ vựng chỉ ảnh hưởng phần từ vựng');
  assert.equal(result.vocabTotal, vocab.length);
  assert.equal(result.trialNotice, null);
});

test('câu Toán đứng trước câu từ vựng trong bài', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'add-10' });
  const firstEnglish = a.questions.findIndex((q) => q.domain === 'english');
  assert.ok(firstEnglish > 0 && a.questions.slice(firstEnglish).every((q) => q.domain === 'english'));
});

test('tối đa 2 lần thử; câu trả lời không hợp lệ không tính là một lần thử', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'numbers-10' });
  const q = Q.get(a.questions[0].id)!;
  const invalid = engine.answer(a.id, q.id, q.kind === 'number' ? 'abc' : 'không-có');
  assert.equal(invalid.status, 'invalid');
  const first = engine.answer(a.id, q.id, wrong(q));
  assert.equal(first.status, 'wrong');
  assert.ok(first.status !== 'invalid' && !first.done && first.guide, 'lần sai đầu: có hướng dẫn, chưa lộ đáp án');
  assert.ok(first.status !== 'invalid' && first.correctAnswer === undefined);
  const second = engine.answer(a.id, q.id, wrong(q));
  assert.ok(second.status === 'wrong' && second.done);
  assert.deepEqual(second.correctAnswer, q.answer);
  assert.throws(() => engine.answer(a.id, q.id, right(q)), (e: engine.EngineError) => e.code === 'conflict');
});

test('lời Buddy trong phản hồi chỉ dùng tiếng Anh', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'compare-10' });
  const VIET = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const pq of a.questions.slice(0, 4)) {
    const r = engine.answer(a.id, pq.id, wrong(Q.get(pq.id)!));
    assert.ok(r.status !== 'invalid' && !VIET.test(r.buddy), r.status !== 'invalid' ? r.buddy : '');
  }
});

test('chưa làm xong thì không kết thúc được bài', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'shapes' });
  assert.throws(() => engine.finish(a.id), (e: engine.EngineError) => e.code === 'conflict');
  assert.throws(() => engine.result(a.id), (e: engine.EngineError) => e.code === 'conflict');
});

test('gợi ý từng bước, không vượt quá số gợi ý có sẵn', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'sub-10' });
  const q = Q.get(a.questions[0].id)!;
  const seen = q.hints.map(() => engine.hint(a.id, q.id));
  assert.deepEqual(seen.map((h) => h.index), q.hints.map((_, i) => i + 1));
  assert.equal(engine.hint(a.id, q.id).index, q.hints.length);
});

test('không mở được bài làm của bạn khác hoặc của lượt học thử', () => {
  engine.createProfile('Bé Mèo', '🐱');
  const a = engine.startAttempt({ lessonId: 'add-10' });
  engine.createProfile('Bé Thỏ', '🐰');
  assert.throws(() => engine.getAttempt(a.id), (e: engine.EngineError) => e.code === 'not_found');
  engine.startTrial();
  assert.throws(() => engine.getAttempt(a.id), (e: engine.EngineError) => e.code === 'not_found');
});

test('học thử không vào Góc phụ huynh và được xóa khi bắt đầu lượt mới', () => {
  engine.createProfile('Bé Mèo', '🐱');
  engine.startTrial();
  const { result } = play({ lessonId: 'add-10' });
  assert.ok(result.trialNotice);
  assert.equal(engine.reports()[0].questionsDone, 0);
  engine.startTrial();
  assert.equal(engine.listLessons().find((l) => l.id === 'add-10')!.status, 'new');
});

test('dữ liệu học thử quá 7 ngày tự hết hạn', () => {
  engine.startTrial();
  const raw = JSON.parse(mem.get('mathbuddy.v1')!);
  raw.current.since = new Date(Date.now() - 8 * 24 * 3600_000).toISOString();
  mem.set('mathbuddy.v1', JSON.stringify(raw));
  assert.equal(engine.me(), null);
});

test('trò chơi chỉ lấy câu Toán từ bài đã duyệt, đúng kỹ năng của trò chơi', () => {
  engine.createProfile('Bé Mèo', '🐱');
  const approved = new Set(LESSONS.filter((l) => l.status === 'approved').flatMap((l) => l.questions.map((q) => q.id)));
  for (const g of engine.listGames()) {
    assert.ok(g.available, g.id);
    const a = engine.startAttempt({ gameId: g.id });
    assert.ok(a.questions.length >= 4);
    assert.ok(a.questions.every((q) => approved.has(q.id) && q.domain === 'math'));
  }
  const hunt = engine.startAttempt({ gameId: 'shape-hunt' });
  assert.ok(hunt.questions.every((q) => Q.get(q.id)!.skill === 'shapes'));
});

test('Góc phụ huynh: kỹ năng dưới 5 câu ghi “chưa đủ dữ liệu”; CSV có BOM, chặn công thức', () => {
  engine.createProfile('=Bé Na', '🦊');
  play({ lessonId: 'length' });
  const r = engine.reports()[0];
  assert.equal(r.questionsDone, LESSONS.find((l) => l.id === 'length')!.questions.length);
  assert.ok(r.skills.every((s) => (s.answered < engine.MIN_EVIDENCE ? s.label === 'insufficient' : s.label === 'mastered')));
  const csv = engine.exportCsv('profiles');
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("'=Bé Na"), 'ô bắt đầu bằng = được chặn');
  assert.ok(engine.exportCsv('attempts').includes('Dài hơn, ngắn hơn'));
});

test('xóa một bạn xóa luôn kết quả của bạn đó', () => {
  const p = engine.createProfile('Bé Mèo', '🐱');
  play({ lessonId: 'add-10' });
  engine.createProfile('Bé Thỏ', '🐰');
  engine.deleteProfile(p.id);
  assert.deepEqual(engine.listProfiles().map((x) => x.nickname), ['Bé Thỏ']);
  assert.ok(!mem.get('mathbuddy.v1')!.includes(`p:${p.id}`));
});

test('gợi ý bài tiếp theo: ôn kỹ năng còn sai nhiều, nếu không thì bài mới chưa học', () => {
  engine.createProfile('Bé Mèo', '🐱');
  const sub = LESSONS.find((l) => l.id === 'sub-10')!.questions.filter((q) => q.skill === 'sub');
  const { result } = play({ lessonId: 'sub-10' }, new Set(), new Set(sub.slice(0, 4).map((q) => q.id)));
  assert.equal(result.next?.lessonId, 'sub-10');
  const ok = play({ lessonId: 'numbers-10' }).result;
  assert.ok(ok.next && ok.next.lessonId !== 'numbers-10' && ok.goodSkills.length > 0);
});
