// Kiểm thử bộ máy học chạy trong trình duyệt (dùng bộ nhớ giả thay cho localStorage).
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/engine/index';
import { ENCOURAGE, NEW_WORD, PRAISE, PRAISE_AFTER_RETRY, REVEAL } from '../src/engine/feedback';
import { MAX_TRIES } from '../src/engine/grading';
import { LESSONS } from '../src/content/lessons';
import type { Question } from '../src/content/types';
import type { AnswerResponse } from '../src/types';

const mem = new Map<string, string>();
engine.useStorage({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
beforeEach(() => mem.clear());

const Q = new Map(LESSONS.flatMap((l) => l.questions).map((q) => [q.id, q]));
const VIET = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const right = (q: Question) => q.answer;
function wrong(q: Question) {
  if (q.kind === 'number') return (q.answer as number) + 1;
  if (q.kind === 'choice') return q.options!.find((o) => o.id !== q.answer)!.id;
  return [q.options!.find((o) => !(q.answer as string[]).includes(o.id))!.id];
}
type Graded = Exclude<AnswerResponse, { status: 'invalid' }>;
const graded = (r: AnswerResponse): Graded => {
  assert.notEqual(r.status, 'invalid');
  return r as Graded;
};
/** Mọi chữ Buddy nói trong một phản hồi. */
const buddyText = (r: Graded) => [r.buddy, r.tip, r.reward, r.englishWord, ...(r.steps ?? [])].filter(Boolean).join(' ');

/** Làm hết một bài; `wrongFirst`: sai lần đầu rồi đúng; `wrongAll`: sai đến hết lượt. */
function play(target: { lessonId: string } | { gameId: string }, wrongFirst = new Set<string>(), wrongAll = new Set<string>()) {
  const a = engine.startAttempt(target);
  const replies: Graded[] = [];
  for (const pq of a.questions) {
    const q = Q.get(pq.id)!;
    if (wrongAll.has(q.id)) {
      for (let i = 0; i < MAX_TRIES; i++) replies.push(graded(engine.answer(a.id, q.id, wrong(q))));
    } else {
      if (wrongFirst.has(q.id)) replies.push(graded(engine.answer(a.id, q.id, wrong(q))));
      replies.push(graded(engine.answer(a.id, q.id, right(q))));
    }
  }
  return { attempt: a, replies, result: engine.finish(a.id) };
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

test('tên và lớp: bỏ khoảng trắng thừa, chuẩn hóa lớp, từ chối ô trống hoặc ký tự lạ', () => {
  assert.equal(engine.cleanName('   Minh    Anh  '), 'Minh Anh');
  assert.equal(engine.cleanName('Nguyễn Thị Ánh'.normalize('NFD')), 'Nguyễn Thị Ánh');
  assert.equal(engine.cleanClassName('  lớp 1a '), '1A');
  assert.equal(engine.cleanClassName('Lớp1b'), '1B');
  for (const bad of ['', '   ', '123', '<b>Minh</b>', 'Minh 😀', 'x'.repeat(21)]) {
    assert.throws(() => engine.cleanName(bad), (e: engine.EngineError) => e.code === 'invalid', bad);
  }
  for (const bad of ['', '  ', 'lớp', '1A<script>', '1'.repeat(11), '!!']) {
    assert.throws(() => engine.cleanClassName(bad), (e: engine.EngineError) => e.code === 'invalid', bad);
  }
});

test('Bắt đầu học: bạn mới được tạo kèm lớp; vào lại phải đúng con vật; cùng tên khác lớp là bạn khác', () => {
  const minh = engine.enterLearner(' Minh ', '1a', '🐸');
  assert.deepEqual([minh.nickname, minh.className, minh.avatar], ['Minh', '1A', '🐸']);
  assert.deepEqual(engine.me(), { mode: 'profile', profile: minh });
  play({ lessonId: 'add-10' });
  engine.signOut();
  assert.equal(engine.me(), null);
  assert.equal(engine.lastClassName(), '1A', 'chỉ nhớ lớp để điền sẵn');
  assert.ok(!engine.lastClassName().includes('Minh'));

  // Chỉ biết tên + lớp thì không xem được kết quả của Minh.
  assert.throws(() => engine.enterLearner('minh', '1A', '🐱'), (e: engine.EngineError) => e.code === 'denied');
  assert.equal(engine.me(), null);

  assert.equal(engine.enterLearner('MINH', 'Lớp 1A', '🐸').id, minh.id);
  assert.equal(engine.listLessons().find((l) => l.id === 'add-10')!.status, 'completed');

  engine.signOut();
  const other = engine.enterLearner('Minh', '1B', '🐱');
  assert.notEqual(other.id, minh.id);
  assert.ok(engine.listLessons().every((l) => l.status === 'new'), 'bạn khác không thấy kết quả của Minh');
});

test('Đổi thông tin: sửa tên/lớp, giữ kết quả; không trùng bạn khác', () => {
  engine.enterLearner('Lan', '1A', '🐰');
  engine.signOut();
  const an = engine.enterLearner('An', '1A', '🐻');
  play({ lessonId: 'add-10' });
  assert.throws(() => engine.updateLearner('lan', '1a'), (e: engine.EngineError) => e.code === 'conflict');
  const renamed = engine.updateLearner('  An   Nhiên ', '1c');
  assert.deepEqual([renamed.id, renamed.nickname, renamed.className], [an.id, 'An Nhiên', '1C']);
  assert.equal(engine.listLessons().find((l) => l.id === 'add-10')!.status, 'completed');
  assert.ok(engine.exportCsv('profiles').includes('An Nhiên,1C,'));
  engine.signOut();
  assert.throws(() => engine.updateLearner('An', '1A'), (e: engine.EngineError) => e.code === 'no_learner');
});

test('bạn tạo từ bản cũ (chưa có lớp) được nhận lại khi đúng tên và con vật', () => {
  const old = engine.createProfile('Bé Mèo', '🐱');
  play({ lessonId: 'add-10' });
  engine.signOut();
  const back = engine.enterLearner('bé mèo', '1A', '🐱');
  assert.equal(back.id, old.id);
  assert.equal(back.className, '1A');
  assert.equal(engine.listLessons().find((l) => l.id === 'add-10')!.status, 'completed');
});

test('học thử tách riêng: không gắn tên, kết thúc thì xóa', () => {
  engine.enterLearner('Hoa', '1A', '🐼');
  engine.signOut();
  engine.startTrial();
  play({ lessonId: 'add-10' });
  assert.equal(engine.reports()[0].questionsDone, 0, 'kết quả học thử không vào hồ sơ của bạn nào');
  engine.signOut();
  assert.ok(!mem.get('mathbuddy.v1')!.includes('"owner":"trial"'));
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

// ---------- Tiêu chí nghiệm thu: Buddy phản hồi bằng tiếng Anh ----------

test('1. Trả lời đúng: Buddy khen bằng tiếng Anh', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'add-10' });
  const q = Q.get(a.questions[0].id)!;
  const r = graded(engine.answer(a.id, q.id, right(q)));
  assert.equal(r.status, 'correct');
  assert.ok(r.done && r.hintLevel === 0 && !r.tip && !r.steps);
  assert.ok([...PRAISE, NEW_WORD, q.en.praise, q.en.say].includes(r.buddy), r.buddy);
  assert.ok(!VIET.test(buddyText(r)), buddyText(r));
});

test('2. Sai lần đầu: Buddy động viên bằng tiếng Anh, gợi ý nhẹ, chưa lộ đáp án', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'numbers-10' });
  const q = Q.get(a.questions[0].id)!;
  const r = graded(engine.answer(a.id, q.id, wrong(q)));
  assert.equal(r.status, 'wrong');
  assert.ok(!r.done && r.attemptCount === 1 && r.hintLevel === 1);
  assert.ok(ENCOURAGE[1].includes(r.buddy), r.buddy);
  assert.equal(r.tip, q.en.tips[0]);
  assert.equal(r.correctAnswer, undefined);
  assert.ok(!VIET.test(buddyText(r)));
});

test('3. Sai nhiều lần: gợi ý rõ dần (nhẹ → cùng đếm → từng bước), hết lượt mới cùng xem đáp án', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'add-10' });
  const q = Q.get(a.questions.find((x) => x.kind === 'number')!.id)!;
  const invalid = engine.answer(a.id, q.id, 'abc');
  assert.equal(invalid.status, 'invalid', 'câu trả lời không hợp lệ không tính là một lần thử');
  const rs = Array.from({ length: MAX_TRIES }, () => graded(engine.answer(a.id, q.id, wrong(q))));
  assert.deepEqual(rs.map((r) => r.hintLevel), [1, 2, 3, 0]);
  assert.deepEqual(rs.map((r) => r.done), [false, false, false, true]);
  assert.equal(rs[0].tip, q.en.tips[0]);
  assert.equal(rs[1].tip, q.en.tips[1]);
  assert.notEqual(rs[0].tip, rs[1].tip, 'lần 2 gợi ý khác lần 1');
  assert.ok(ENCOURAGE[2].includes(rs[1].buddy));
  assert.deepEqual(rs[2].steps, q.en.steps, 'lần 3: chia thành các bước nhỏ');
  assert.ok(ENCOURAGE[3].includes(rs[2].buddy));
  assert.ok(rs.slice(0, 3).every((r) => r.correctAnswer === undefined), 'chưa lộ đáp án khi còn lượt');
  assert.equal(rs[3].buddy, REVEAL);
  assert.equal(rs[3].tip, `The answer is ${q.answer}.`);
  assert.equal(rs[3].correctAnswer, q.answer);
  for (const r of rs) assert.ok(!VIET.test(buddyText(r)), buddyText(r));
  assert.throws(() => engine.answer(a.id, q.id, right(q)), (e: engine.EngineError) => e.code === 'conflict');
});

test('đúng sau khi thử lại: Buddy khen sự cố gắng (hoặc giới thiệu từ mới)', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const a = engine.startAttempt({ lessonId: 'shapes' });
  const q = Q.get(a.questions[0].id)!;
  engine.answer(a.id, q.id, wrong(q));
  const r = graded(engine.answer(a.id, q.id, right(q)));
  assert.equal(r.status, 'correct');
  assert.ok([...PRAISE_AFTER_RETRY, NEW_WORD].includes(r.buddy), r.buddy);
});

test('4. Hoàn thành bài: Buddy chúc mừng bằng tiếng Anh (cả khi làm chưa tốt)', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const good = play({ lessonId: 'shapes' }).result;
  const sub = LESSONS.find((l) => l.id === 'sub-10')!.questions.map((q) => q.id);
  const weak = play({ lessonId: 'sub-10' }, new Set(), new Set(sub)).result;
  for (const r of [good, weak]) {
    assert.ok(r.buddy && r.praise);
    assert.ok(!VIET.test(r.buddy + r.praise), r.buddy + r.praise);
  }
  assert.notEqual(good.buddy, weak.buddy);
});

test('5. Không có AI / mất mạng: Buddy vẫn phản hồi tiếng Anh từ ngân hàng có sẵn', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  try {
    engine.createProfile('Bé Gấu', '🐻');
    const ids = LESSONS.find((l) => l.id === 'compare-10')!.questions.map((q) => q.id);
    const { replies, result } = play({ lessonId: 'compare-10' }, new Set(ids.slice(0, 4)), new Set(ids.slice(4, 6)));
    assert.ok(replies.length > ids.length);
    for (const r of replies) assert.ok(r.buddy.length > 0 && !VIET.test(buddyText(r)), buddyText(r));
    assert.ok(!VIET.test(result.buddy + result.praise));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('lời Buddy không bao giờ trái với kết quả chấm, ở mọi câu của mọi bài', () => {
  engine.createProfile('Bé Gấu', '🐻');
  const praise = new Set([...PRAISE, ...PRAISE_AFTER_RETRY, NEW_WORD]);
  const wrongLines = new Set([...ENCOURAGE[1], ...ENCOURAGE[2], ...ENCOURAGE[3], REVEAL]);
  for (const lesson of LESSONS.filter((l) => l.status === 'approved')) {
    const a = engine.startAttempt({ lessonId: lesson.id });
    a.questions.forEach((pq, i) => {
      const q = Q.get(pq.id)!;
      if (i % 2 === 0) {
        const r = graded(engine.answer(a.id, q.id, right(q)));
        assert.equal(r.status, 'correct');
        assert.ok(praise.has(r.buddy) || r.buddy === q.en.praise || r.buddy === q.en.say, `${q.id}: ${r.buddy}`);
      } else {
        const r = graded(engine.answer(a.id, q.id, wrong(q)));
        assert.equal(r.status, 'wrong');
        assert.ok(wrongLines.has(r.buddy), `${q.id}: ${r.buddy}`);
        assert.ok(!/great|excellent|correct|well done/i.test(buddyText(r)), `${q.id}: khen khi sai`);
      }
    });
  }
});

test('trò chơi: trả lời đúng có phần thưởng bằng tiếng Anh, quy tắc phản hồi giống bài học', () => {
  engine.createProfile('Bé Mèo', '🐱');
  for (const g of engine.listGames()) {
    const a = engine.startAttempt({ gameId: g.id });
    const q = Q.get(a.questions[0].id)!;
    const w = graded(engine.answer(a.id, q.id, wrong(q)));
    assert.ok(ENCOURAGE[1].includes(w.buddy) && w.tip && !w.reward);
    const r = graded(engine.answer(a.id, q.id, right(q)));
    assert.ok(r.reward && !VIET.test(r.reward), g.id);
  }
});

test('từ tiếng Anh mới: không phải câu nào cũng có, không lặp lại, không ở hai câu liền nhau', () => {
  engine.createProfile('Bé Mèo', '🐱');
  const { replies } = play({ lessonId: 'numbers-10' });
  const introduced = replies.map((r, i) => ({ i, w: r.englishWord })).filter((x) => x.w);
  assert.ok(introduced.length > 0, 'có giới thiệu từ mới');
  assert.ok(introduced.length < replies.length / 2 + 1, 'không giới thiệu ở mọi câu');
  assert.equal(new Set(introduced.map((x) => x.w)).size, introduced.length, 'không lặp từ');
  for (let k = 1; k < introduced.length; k++) assert.ok(introduced[k].i - introduced[k - 1].i >= 2, 'không ở hai câu liền nhau');
  for (const x of introduced) assert.equal(replies[x.i].buddy, NEW_WORD);
});

test('lưu câu trả lời thật, số lần thử, số gợi ý; tiếng Anh theo dõi riêng với Toán', () => {
  engine.createProfile('Bé Na', '🦊');
  const a = engine.startAttempt({ lessonId: 'add-10' });
  const first = Q.get(a.questions[0].id)!;
  engine.hint(a.id, first.id);
  engine.answer(a.id, first.id, wrong(first));
  const stored = JSON.parse(mem.get('mathbuddy.v1')!).attempts[0].results[first.id];
  assert.deepEqual(stored.answers, [wrong(first)]);
  assert.equal(stored.tries, 1);
  assert.equal(stored.hintsUsed, 1, 'chỉ đếm lần con tự bấm Gợi ý');

  // Mở lại giữa chừng: giữ mức gợi ý và phương án đã loại.
  const p = engine.getAttempt(a.id).progress[0];
  assert.equal(p.hintLevel, 1);
  assert.equal(p.help?.tip, first.en.tips[0]);
  if (first.kind === 'choice') assert.deepEqual(p.eliminated, [wrong(first)]);

  engine.answer(a.id, first.id, right(first));
  for (const pq of a.questions.slice(1)) engine.answer(a.id, pq.id, right(Q.get(pq.id)!));
  engine.finish(a.id);
  const r = engine.reports()[0];
  assert.equal(r.hintsUsed, 1);
  assert.equal(r.attempts[0].tries, a.questions.length + 1);
  assert.ok(r.wordsMet.includes('plus'), 'từ đã gặp gồm từ ở câu từ vựng');
  assert.equal(r.vocab.answered, 2);
  assert.equal(r.questionsDone, a.questions.length - 2, 'câu từ vựng không tính vào số câu Toán');
  assert.ok(engine.exportCsv('profiles').includes('plus'));
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
  engine.createProfile('-Bé Na', '🦊');
  play({ lessonId: 'length' });
  const r = engine.reports()[0];
  assert.equal(r.questionsDone, LESSONS.find((l) => l.id === 'length')!.questions.length);
  assert.ok(r.skills.every((s) => (s.answered < engine.MIN_EVIDENCE ? s.label === 'insufficient' : s.label === 'mastered')));
  const csv = engine.exportCsv('profiles');
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("'-Bé Na"), 'ô bắt đầu bằng - được chặn');
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
