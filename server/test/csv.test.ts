import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvTime, toCsv } from '../src/csv.js';
import { analyzeClass } from '../src/analysis.js';
import { openDb } from '../src/db.js';
import { seedIfEmpty } from '../src/seed.js';

test('CSV có BOM, chặn ô công thức và bọc ô có dấu phẩy', () => {
  const csv = toCsv(['Tên', 'Ghi chú'], [['=SUM(A1)', 'a, b']]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes(`'=SUM(A1)`));
  assert.ok(csv.includes('"a, b"'));
});

test('thời điểm trong CSV đổi từ UTC sang giờ địa phương của trường', () => {
  const saved = process.env.REPORT_TIMEZONE;
  delete process.env.REPORT_TIMEZONE;
  assert.equal(csvTime('2026-10-29 16:03:43'), '2026-10-29 23:03');
  assert.equal(csvTime(null), '');
  if (saved !== undefined) process.env.REPORT_TIMEZONE = saved;
});

test('học sinh có đủ dữ liệu nhưng không nổi bật vẫn được nêu, kèm số liệu', () => {
  const db = openDb(':memory:');
  seedIfEmpty(db, { SEED_DEMO_CLASS: 'true' });
  const cls = db.prepare(`SELECT id FROM classes WHERE class_code = 'DEMO1A'`).get() as { id: number };
  const st = db.prepare(`SELECT id FROM students WHERE access_code = 'MEO234'`).get() as { id: number };
  // 6 câu cộng, đúng 4 (67%): đủ dữ liệu, không "cần ôn" (< 60%) cũng không "vững" (≥ 85%).
  const qs = db.prepare(`SELECT id FROM questions WHERE lesson_id = 'add-10' AND domain = 'math' ORDER BY position LIMIT 6`).all() as { id: string }[];
  const attempt = db
    .prepare(`INSERT INTO attempts (student_id, class_id, mode, kind, lesson_id, question_ids, status, finished_at) VALUES (?, ?, 'class', 'lesson', 'add-10', ?, 'completed', datetime('now'))`)
    .run(st.id, cls.id, JSON.stringify(qs.map((q) => q.id))).lastInsertRowid;
  qs.forEach((q, i) =>
    db
      .prepare(`INSERT INTO question_results (attempt_id, question_id, skill, domain, first_try_correct, final_correct, tries, hints_used, done) VALUES (?, ?, 'add', 'math', ?, 1, 1, 0, 1)`)
      .run(attempt, q.id, i < 4 ? 1 : 0),
  );
  const meo = analyzeClass(db, cls.id).insights.filter((i) => i.nickname === 'Bé Mèo');
  assert.equal(meo.length, 1);
  assert.equal(meo[0].type, 'steady');
  assert.ok(meo[0].evidence.includes('4/6'));
});
