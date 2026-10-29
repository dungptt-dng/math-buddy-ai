import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { LESSONS } from './content/lessons.js';
import type { Lesson } from './content/types.js';

export type DB = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  access_code TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, access_code)
);
CREATE TABLE IF NOT EXISTS trial_guests (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('teacher', 'student', 'trial')),
  subject_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved')),
  source_note TEXT NOT NULL,
  verification TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  skill TEXT NOT NULL,
  domain TEXT NOT NULL,
  level INTEGER NOT NULL,
  public_json TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  hints_json TEXT NOT NULL,
  explain TEXT NOT NULL,
  feedback_correct TEXT,
  feedback_wrong TEXT
);
CREATE TABLE IF NOT EXISTS class_lessons (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (class_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('class', 'trial')),
  kind TEXT NOT NULL CHECK (kind IN ('lesson', 'game')),
  lesson_id TEXT REFERENCES lessons(id),
  game_id TEXT,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES trial_guests(id) ON DELETE CASCADE,
  question_ids TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  CHECK ((mode = 'class' AND student_id IS NOT NULL AND class_id IS NOT NULL AND guest_id IS NULL)
      OR (mode = 'trial' AND guest_id IS NOT NULL AND student_id IS NULL AND class_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_class ON attempts(class_id);
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  try_no INTEGER NOT NULL,
  answer_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Một dòng cho mỗi câu hỏi trong một lần làm bài: đây là kết quả CHÍNH THỨC do hệ thống chấm.
CREATE TABLE IF NOT EXISTS question_results (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  domain TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  first_try_correct INTEGER,
  final_correct INTEGER,
  done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (attempt_id, question_id)
);
CREATE TABLE IF NOT EXISTS ai_insights (
  id INTEGER PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  source TEXT NOT NULL,
  insights_json TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  actor_kind TEXT NOT NULL,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  syncContent(db, LESSONS);
  return db;
}

export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/**
 * Đồng bộ ngân hàng nội dung (trong mã nguồn) vào CSDL.
 * Câu hỏi được cập nhật theo mã nguồn; trạng thái kiểm duyệt của bài đã có trong CSDL được giữ nguyên
 * để thay đổi của người quản trị không bị ghi đè khi khởi động lại.
 */
export function syncContent(db: DB, lessons: Lesson[]) {
  const upsertLesson = db.prepare(`
    INSERT INTO lessons (id, title, topic, icon, sort_order, domain, status, source_note, verification)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, topic = excluded.topic, icon = excluded.icon,
      sort_order = excluded.sort_order, domain = excluded.domain, source_note = excluded.source_note,
      verification = excluded.verification`);
  const upsertQuestion = db.prepare(`
    INSERT INTO questions (id, lesson_id, position, skill, domain, level, public_json, answer_json, hints_json, explain, feedback_correct, feedback_wrong)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET lesson_id = excluded.lesson_id, position = excluded.position, skill = excluded.skill,
      domain = excluded.domain, level = excluded.level, public_json = excluded.public_json, answer_json = excluded.answer_json,
      hints_json = excluded.hints_json, explain = excluded.explain, feedback_correct = excluded.feedback_correct,
      feedback_wrong = excluded.feedback_wrong`);
  tx(db, () => {
    for (const l of lessons) {
      upsertLesson.run(l.id, l.title, l.topic, l.icon, l.order, l.domain, l.status, l.sourceNote, l.verification);
      l.questions.forEach((q, i) => {
        const pub = { prompt: q.prompt, speak: q.speak ?? null, visual: q.visual ?? null, kind: q.kind, options: q.options ?? null, vocab: q.vocab ?? null };
        upsertQuestion.run(
          q.id, l.id, i, q.skill, q.domain, q.level, JSON.stringify(pub), JSON.stringify(q.answer),
          JSON.stringify(q.hints), q.explain, q.feedbackCorrect ?? null, q.feedbackWrong ?? null,
        );
      });
    }
  });
}

export function audit(db: DB, actorKind: string, actorId: number | null, action: string, target?: string, detail?: unknown) {
  db.prepare('INSERT INTO audit_log (actor_kind, actor_id, action, target, detail) VALUES (?, ?, ?, ?, ?)').run(
    actorKind,
    actorId,
    action,
    target ?? null,
    detail === undefined ? null : JSON.stringify(detail),
  );
}
