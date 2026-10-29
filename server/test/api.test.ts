// Kiểm thử luồng học sinh, học thử, giáo viên và phân quyền trên CSDL tạm trong bộ nhớ.
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb, type DB } from '../src/db.js';
import { hashPassword } from '../src/auth.js';
import { seedIfEmpty } from '../src/seed.js';

let db: DB;
let app: ReturnType<typeof createApp>;
const env = { SEED_TEACHER_PASSWORD: 'Buddy@2026', SEED_ADMIN_PASSWORD: 'Admin@2026' } as NodeJS.ProcessEnv;

const answerOf = (qid: string) => JSON.parse((db.prepare('SELECT answer_json FROM questions WHERE id = ?').get(qid) as { answer_json: string }).answer_json);
const wrongFor = (q: { kind: string; options?: { id: string }[] }, correct: unknown) => {
  if (q.kind === 'number') return String((correct as number) + 1);
  if (q.kind === 'multi') return [q.options!.find((o) => !(correct as string[]).includes(o.id))!.id];
  return q.options!.find((o) => o.id !== correct)!.id;
};
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function studentLogin(classCode: string, studentCode: string) {
  const res = await request(app).post('/api/student/login').send({ classCode, studentCode });
  return res;
}

async function teacherLogin(email: string, password: string) {
  return request(app).post('/api/teacher/login').send({ email, password });
}

before(() => {
  db = openDb(':memory:');
  seedIfEmpty(db, env);
  app = createApp(db);
});

describe('Luồng học sinh', () => {
  let token = '';
  let attemptId = 0;
  let questions: any[] = [];

  test('vào lớp với mã hợp lệ (không phân biệt hoa thường, bỏ khoảng trắng)', async () => {
    const res = await studentLogin(' demo1a ', 'meo 234');
    assert.equal(res.status, 200);
    assert.equal(res.body.nickname, 'Bé Mèo');
    token = res.body.token;
  });

  test('mã không hợp lệ nhận thông báo thân thiện', async () => {
    const res = await studentLogin('DEMO1A', 'SAIMA9');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /chưa đúng/);
    const res2 = await studentLogin('', '');
    assert.equal(res2.status, 400);
  });

  test('chỉ mã lớp thì không đủ để vào lớp', async () => {
    const res = await request(app).post('/api/student/login').send({ classCode: 'DEMO1A' });
    assert.equal(res.status, 400);
  });

  test('danh sách bài chỉ gồm bài đã duyệt được giao', async () => {
    const res = await request(app).get('/api/learner/lessons').set(auth(token));
    assert.equal(res.status, 200);
    const ids = res.body.lessons.map((l: any) => l.id);
    assert.ok(ids.includes('add-10'));
    assert.ok(!ids.includes('numbers-20'), 'bài nháp không được hiện');
    assert.ok(res.body.lessons.every((l: any) => l.status === 'new'));
    assert.ok(!JSON.stringify(res.body).includes('source'), 'không lộ thông tin nguồn/kiểm duyệt');
  });

  test('bắt đầu bài: không lộ đáp án, gợi ý hay lời giải cho học sinh', async () => {
    const res = await request(app).post('/api/learner/attempts').set(auth(token)).send({ lessonId: 'add-10' });
    assert.equal(res.status, 201);
    attemptId = res.body.id;
    questions = res.body.questions;
    assert.equal(questions.length, 15);
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes('"answer"'));
    assert.ok(!text.includes('"hints"'));
    assert.ok(!text.includes('"explain"'));
    assert.ok(!text.includes('giơ'), 'nội dung gợi ý không được gửi trước');
  });

  test('trả lời đúng: Buddy khen bằng tiếng Anh', async () => {
    const q = questions[0];
    const res = await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: answerOf(q.id) });
    assert.equal(res.body.status, 'correct');
    assert.equal(res.body.done, true);
    assert.match(res.body.buddy, /^[\x20-\x7E]+$/, 'lời thoại Buddy chỉ là tiếng Anh');
  });

  test('trả lời sai: nhận gợi ý tiếng Việt, được làm lại, câu không hợp lệ không bị trừ lượt', async () => {
    const q = questions.find((x) => x.kind === 'number')!;
    const inv = await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: 'abc' });
    assert.equal(inv.body.status, 'invalid');

    const wrong = await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: wrongFor(q, answerOf(q.id)) });
    assert.equal(wrong.body.status, 'wrong');
    assert.equal(wrong.body.done, false);
    assert.match(wrong.body.buddy, /^[\x20-\x7E]+$/);
    assert.ok(wrong.body.guide.length > 5, 'có hướng dẫn tiếng Việt');

    const hint = await request(app).post(`/api/learner/attempts/${attemptId}/hint`).set(auth(token)).send({ questionId: q.id });
    assert.equal(hint.status, 200);
    assert.ok(hint.body.hint);

    const retry = await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: ` ${answerOf(q.id)} ` });
    assert.equal(retry.body.status, 'correct');
    const row = db.prepare('SELECT first_try_correct, final_correct, tries FROM question_results WHERE attempt_id = ? AND question_id = ?').get(attemptId, q.id) as any;
    assert.deepEqual({ ...row }, { first_try_correct: 0, final_correct: 1, tries: 2 });
  });

  test('sai 2 lần thì Buddy hướng dẫn đáp án và câu kết thúc', async () => {
    const q = questions.find((x, i) => i > 0 && x.kind === 'choice')!;
    const wrong = wrongFor(q, answerOf(q.id));
    await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: wrong });
    const res = await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: wrong });
    assert.equal(res.body.done, true);
    assert.deepEqual(res.body.correctAnswer, answerOf(q.id));
    const again = await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: q.id, answer: answerOf(q.id) });
    assert.equal(again.status, 409, 'không được sửa kết quả đã chấm');
  });

  test('chưa xong thì chưa nộp được; danh sách bài hiện "Đang luyện"', async () => {
    const fin = await request(app).post(`/api/learner/attempts/${attemptId}/finish`).set(auth(token));
    assert.equal(fin.status, 409);
    const list = await request(app).get('/api/learner/lessons').set(auth(token));
    const l = list.body.lessons.find((x: any) => x.id === 'add-10');
    assert.equal(l.status, 'in_progress');
    assert.equal(l.inProgressAttemptId, attemptId);
  });

  test('hoàn thành bài và xem kết quả: Toán và từ vựng tách riêng', async () => {
    const state = await request(app).get(`/api/learner/attempts/${attemptId}`).set(auth(token));
    for (const p of state.body.progress) {
      if (p.done) continue;
      await request(app).post(`/api/learner/attempts/${attemptId}/answer`).set(auth(token)).send({ questionId: p.questionId, answer: answerOf(p.questionId) });
    }
    const fin = await request(app).post(`/api/learner/attempts/${attemptId}/finish`).set(auth(token));
    assert.equal(fin.status, 200);
    assert.equal(fin.body.mathTotal, 13);
    assert.equal(fin.body.mathCorrect, 11);
    assert.equal(fin.body.vocabTotal, 2);
    assert.equal(fin.body.vocabCorrect, 2);
    assert.equal(fin.body.correctAfterRetry, 1);
    assert.ok(fin.body.praise);
    assert.equal(fin.body.trialNotice, null);
    const list = await request(app).get('/api/learner/lessons').set(auth(token));
    const l = list.body.lessons.find((x: any) => x.id === 'add-10');
    assert.equal(l.status, 'completed');
    assert.deepEqual(l.last, { mathCorrect: 11, mathTotal: 13, vocabCorrect: 2, vocabTotal: 2 });
  });

  test('sai từ vựng tiếng Anh không làm giảm điểm Toán', async () => {
    const start = await request(app).post('/api/learner/attempts').set(auth(token)).send({ lessonId: 'sub-10' });
    const id = start.body.id;
    for (const q of start.body.questions) {
      const correct = answerOf(q.id);
      const ans = q.domain === 'english' ? wrongFor(q, correct) : correct;
      const r1 = await request(app).post(`/api/learner/attempts/${id}/answer`).set(auth(token)).send({ questionId: q.id, answer: ans });
      if (!r1.body.done) await request(app).post(`/api/learner/attempts/${id}/answer`).set(auth(token)).send({ questionId: q.id, answer: ans });
    }
    const fin = await request(app).post(`/api/learner/attempts/${id}/finish`).set(auth(token));
    assert.equal(fin.body.mathCorrect, fin.body.mathTotal, 'Toán vẫn đạt trọn vẹn');
    assert.equal(fin.body.vocabCorrect, 0);
  });

  test('luyện lại tạo lần làm mới', async () => {
    const res = await request(app).post('/api/learner/attempts').set(auth(token)).send({ lessonId: 'add-10' });
    assert.equal(res.status, 201);
    assert.notEqual(res.body.id, attemptId);
    assert.ok(res.body.progress.every((p: any) => !p.done));
  });

  test('trò chơi lấy câu hỏi từ bài đã duyệt, đúng kỹ năng', async () => {
    const games = await request(app).get('/api/learner/games').set(auth(token));
    assert.ok(games.body.games.every((g: any) => g.available));
    const res = await request(app).post('/api/learner/attempts').set(auth(token)).send({ gameId: 'shape-hunt' });
    assert.equal(res.status, 201);
    assert.equal(res.body.kind, 'game');
    for (const q of res.body.questions) {
      const row = db.prepare('SELECT skill, domain FROM questions WHERE id = ?').get(q.id) as any;
      assert.equal(row.skill, 'shapes');
      assert.equal(row.domain, 'math');
    }
  });
});

describe('Phân quyền học sinh và học thử', () => {
  test('học sinh không xem được bài làm của bạn khác', async () => {
    const meo = (await studentLogin('DEMO1A', 'MEO234')).body.token;
    const tho = (await studentLogin('DEMO1A', 'THO234')).body.token;
    const a = await request(app).post('/api/learner/attempts').set(auth(meo)).send({ lessonId: 'shapes' });
    const res = await request(app).get(`/api/learner/attempts/${a.body.id}`).set(auth(tho));
    assert.equal(res.status, 404);
    const ans = await request(app).post(`/api/learner/attempts/${a.body.id}/answer`).set(auth(tho)).send({ questionId: a.body.questions[0].id, answer: 'circle' });
    assert.equal(ans.status, 404);
  });

  test('học sinh không vào được Góc giáo viên', async () => {
    const meo = (await studentLogin('DEMO1A', 'MEO234')).body.token;
    const res = await request(app).get('/api/teacher/classes').set(auth(meo));
    assert.equal(res.status, 401);
    const res2 = await request(app).get('/api/learner/lessons');
    assert.equal(res2.status, 401);
  });

  test('học thử: kết quả không vào báo cáo lớp, không truy cập được dữ liệu lớp', async () => {
    const teacher = (await teacherLogin('giaovien@mathbuddy.local', 'Buddy@2026')).body.token;
    const classId = (db.prepare(`SELECT id FROM classes WHERE class_code = 'DEMO1A'`).get() as { id: number }).id;
    const before = (await request(app).get(`/api/teacher/classes/${classId}/report`).set(auth(teacher))).body.totals;

    const trial = await request(app).post('/api/trial/start');
    assert.ok(trial.body.notice.includes('không gửi vào lớp'));
    const t = trial.body.token;
    const me = await request(app).get('/api/learner/me').set(auth(t));
    assert.equal(me.body.mode, 'trial');
    const a = await request(app).post('/api/learner/attempts').set(auth(t)).send({ lessonId: 'numbers-10' });
    for (const q of a.body.questions) {
      await request(app).post(`/api/learner/attempts/${a.body.id}/answer`).set(auth(t)).send({ questionId: q.id, answer: answerOf(q.id) });
    }
    const fin = await request(app).post(`/api/learner/attempts/${a.body.id}/finish`).set(auth(t));
    assert.equal(fin.body.mode, 'trial');
    assert.ok(fin.body.trialNotice);

    const after = (await request(app).get(`/api/teacher/classes/${classId}/report`).set(auth(teacher))).body;
    assert.deepEqual(after.totals, before);
    const row = db.prepare('SELECT mode, class_id, student_id FROM attempts WHERE id = ?').get(a.body.id) as any;
    assert.deepEqual({ ...row }, { mode: 'trial', class_id: null, student_id: null });

    const meo = (await studentLogin('DEMO1A', 'MEO234')).body.token;
    assert.equal((await request(app).get(`/api/learner/attempts/${a.body.id}`).set(auth(meo))).status, 404);
    const meoAttempt = db.prepare('SELECT id FROM attempts WHERE student_id IS NOT NULL LIMIT 1').get() as { id: number };
    assert.equal((await request(app).get(`/api/learner/attempts/${meoAttempt.id}`).set(auth(t))).status, 404);
  });
});

describe('Góc giáo viên', () => {
  let teacher = '';
  let other = '';
  let classId = 0;

  before(() => {
    db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'teacher')`).run('khac@mathbuddy.local', 'Giáo viên khác', hashPassword('Khac@2026'));
  });

  test('đăng nhập: sai mật khẩu bị từ chối', async () => {
    assert.equal((await teacherLogin('giaovien@mathbuddy.local', 'sai')).status, 401);
    const ok = await teacherLogin('giaovien@mathbuddy.local', 'Buddy@2026');
    assert.equal(ok.status, 200);
    teacher = ok.body.token;
    other = (await teacherLogin('khac@mathbuddy.local', 'Khac@2026')).body.token;
  });

  test('tạo lớp, thêm học sinh và học sinh vào lớp bằng mã mới', async () => {
    const c = await request(app).post('/api/teacher/classes').set(auth(teacher)).send({ name: 'Lớp 1B' });
    assert.equal(c.status, 201);
    classId = c.body.id;
    const s = await request(app).post(`/api/teacher/classes/${classId}/students`).set(auth(teacher)).send({ nicknames: ['An', 'Bình'] });
    assert.equal(s.body.students.length, 2);
    const detail = await request(app).get(`/api/teacher/classes/${classId}`).set(auth(teacher));
    const login = await studentLogin(detail.body.class.classCode, s.body.students[0].accessCode);
    assert.equal(login.status, 200);
  });

  test('giáo viên khác không truy cập được lớp, học sinh, báo cáo', async () => {
    assert.equal((await request(app).get(`/api/teacher/classes/${classId}`).set(auth(other))).status, 404);
    assert.equal((await request(app).get(`/api/teacher/classes/${classId}/report`).set(auth(other))).status, 404);
    assert.equal((await request(app).get(`/api/teacher/classes/${classId}/export.csv`).set(auth(other))).status, 404);
    assert.equal((await request(app).post(`/api/teacher/classes/${classId}/insights`).set(auth(other))).status, 404);
    const sid = (db.prepare('SELECT id FROM students WHERE class_id = ? LIMIT 1').get(classId) as { id: number }).id;
    assert.equal((await request(app).get(`/api/teacher/students/${sid}/report`).set(auth(other))).status, 404);
    assert.equal((await request(app).delete(`/api/teacher/students/${sid}`).set(auth(other))).status, 404);
    const list = await request(app).get('/api/teacher/classes').set(auth(other));
    assert.equal(list.body.classes.length, 0);
  });

  test('giao bài: bỏ giao thì học sinh không thấy và không mở được', async () => {
    const demoId = (db.prepare(`SELECT id FROM classes WHERE class_code = 'DEMO1A'`).get() as { id: number }).id;
    const detail = await request(app).get(`/api/teacher/classes/${demoId}`).set(auth(teacher));
    const keep = detail.body.lessons.filter((l: any) => l.id !== 'length').map((l: any) => l.id);
    assert.equal((await request(app).put(`/api/teacher/classes/${demoId}/lessons`).set(auth(teacher)).send({ lessonIds: keep })).status, 200);
    const gau = (await studentLogin('DEMO1A', 'GAU234')).body.token;
    const lessons = await request(app).get('/api/learner/lessons').set(auth(gau));
    assert.ok(!lessons.body.lessons.some((l: any) => l.id === 'length'));
    assert.equal((await request(app).post('/api/learner/attempts').set(auth(gau)).send({ lessonId: 'length' })).status, 404);
    const draft = await request(app).put(`/api/teacher/classes/${demoId}/lessons`).set(auth(teacher)).send({ lessonIds: ['numbers-20'] });
    assert.equal(draft.status, 400, 'không giao được bài chưa duyệt');
  });

  test('báo cáo lớp dựa trên lần làm bài thật', async () => {
    const demoId = (db.prepare(`SELECT id FROM classes WHERE class_code = 'DEMO1A'`).get() as { id: number }).id;
    const res = await request(app).get(`/api/teacher/classes/${demoId}/report`).set(auth(teacher));
    const meo = res.body.students.find((s: any) => s.nickname === 'Bé Mèo');
    // add-10 (11/13 Toán, 2/2 từ vựng) + sub-10 (13/13 Toán, 0/2 từ vựng)
    assert.equal(meo.questionsDone, 26);
    assert.equal(meo.correct, 24);
    assert.equal(meo.vocab.answered, 4);
    assert.equal(meo.vocab.correct, 2);
    assert.equal(meo.lessonsCompleted, 2);
    const tho = res.body.students.find((s: any) => s.nickname === 'Bé Thỏ');
    assert.equal(tho.questionsDone, 0);
  });

  test('xuất CSV có BOM, tiếng Việt và không chứa mã truy cập', async () => {
    const demoId = (db.prepare(`SELECT id FROM classes WHERE class_code = 'DEMO1A'`).get() as { id: number }).id;
    const res = await request(app).get(`/api/teacher/classes/${demoId}/export.csv`).set(auth(teacher)).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks).toString('utf8')));
    });
    assert.equal(res.status, 200);
    const text = res.body as string;
    assert.equal(text.charCodeAt(0), 0xfeff);
    assert.ok(text.includes('Tỷ lệ đúng (%)'));
    assert.ok(text.includes('Bé Mèo'));
    assert.ok(!text.includes('MEO234') && !text.includes('DEMO1A'));
    const att = await request(app).get(`/api/teacher/classes/${demoId}/export.csv?type=attempts`).set(auth(teacher));
    assert.equal(att.status, 200);
  });

  test('phân tích AI chỉ đọc dữ liệu thật, có bằng chứng, không sửa đáp án/điểm', async () => {
    const demoId = (db.prepare(`SELECT id FROM classes WHERE class_code = 'DEMO1A'`).get() as { id: number }).id;
    const answersBefore = JSON.stringify(db.prepare('SELECT id, answer_json FROM questions ORDER BY id').all());
    const resultsBefore = JSON.stringify(db.prepare('SELECT * FROM question_results ORDER BY attempt_id, question_id').all());
    const res = await request(app).post(`/api/teacher/classes/${demoId}/insights`).set(auth(teacher));
    assert.equal(res.status, 200);
    assert.ok(res.body.insights.every((i: any) => i.evidence && i.message));
    const tho = res.body.insights.find((i: any) => i.nickname === 'Bé Thỏ');
    assert.equal(tho.type, 'insufficient_data');
    const meo = res.body.insights.filter((i: any) => i.nickname === 'Bé Mèo');
    assert.ok(meo.some((i: any) => i.type === 'strength'));
    // Học sinh nào đang học cũng có ít nhất một dòng nhận định (kể cả "chưa đủ dữ liệu" / "theo dõi thêm").
    assert.ok(['Bé Mèo', 'Bé Thỏ', 'Bé Gấu'].every((n) => res.body.insights.some((i: any) => i.nickname === n)));
    assert.equal(res.body.summary, null, 'chưa cấu hình khóa AI thì không có tóm tắt');
    assert.equal(JSON.stringify(db.prepare('SELECT id, answer_json FROM questions ORDER BY id').all()), answersBefore);
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM question_results ORDER BY attempt_id, question_id').all()), resultsBefore);
  });

  test('không có chức năng AI tạo câu hỏi trong Góc giáo viên', async () => {
    for (const path of ['/api/teacher/questions/generate', '/api/teacher/lessons/generate', '/api/teacher/ai/questions']) {
      assert.equal((await request(app).post(path).set(auth(teacher)).send({})).status, 404);
    }
  });

  test('chỉ quản trị viên được đổi trạng thái kiểm duyệt', async () => {
    assert.equal((await request(app).patch('/api/admin/lessons/shapes/status').set(auth(teacher)).send({ status: 'review' })).status, 403);
    const admin = (await teacherLogin('quantri@mathbuddy.local', 'Admin@2026')).body.token;
    assert.equal((await request(app).patch('/api/admin/lessons/numbers-20/status').set(auth(admin)).send({ status: 'review' })).status, 200);
    assert.equal((db.prepare(`SELECT status FROM lessons WHERE id = 'numbers-20'`).get() as any).status, 'review');
  });

  test('cấp lại mã: mã cũ và phiên cũ hết hiệu lực', async () => {
    const old = (await studentLogin('DEMO1A', 'THO234')).body.token;
    const sid = (db.prepare(`SELECT id FROM students WHERE access_code = 'THO234'`).get() as { id: number }).id;
    const res = await request(app).post(`/api/teacher/students/${sid}/reset-code`).set(auth(teacher));
    assert.equal(res.status, 200);
    assert.equal((await request(app).get('/api/learner/me').set(auth(old))).status, 401);
    assert.equal((await studentLogin('DEMO1A', 'THO234')).status, 401);
    assert.equal((await studentLogin('DEMO1A', res.body.accessCode)).status, 200);
  });

  test('xóa học sinh xóa luôn dữ liệu học tập', async () => {
    const sid = (db.prepare(`SELECT id FROM students WHERE access_code = 'MEO234'`).get() as { id: number }).id;
    assert.equal((await request(app).delete(`/api/teacher/students/${sid}`).set(auth(teacher))).status, 200);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE student_id = ?').get(sid) as any).n, 0);
  });
});
