// Tổng hợp kết quả học tập từ dữ liệu làm bài THỰC TẾ (chỉ chế độ lớp học, không gồm học thử).
import type { DB } from './db.js';
import { SKILL_NAMES, type SkillId } from './content/types.js';

/** Số câu tối thiểu của một kỹ năng trước khi được phép kết luận "vững" hay "cần ôn". */
export const MIN_EVIDENCE = 5;

export type SkillStat = {
  skill: SkillId;
  name: string;
  answered: number;
  correct: number;
  accuracy: number | null;
  label: 'mastered' | 'developing' | 'needs_practice' | 'insufficient';
};

export type AttemptSummary = {
  attemptId: number;
  kind: 'lesson' | 'game';
  lessonId: string | null;
  gameId: string | null;
  title: string;
  startedAt: string;
  finishedAt: string | null;
  mathCorrect: number;
  mathTotal: number;
  vocabCorrect: number;
  vocabTotal: number;
};

export type StudentReport = {
  studentId: number;
  nickname: string;
  active: boolean;
  questionsDone: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  correctAfterRetry: number;
  hintsUsed: number;
  lessonsCompleted: number;
  vocab: { answered: number; correct: number; accuracy: number | null };
  skills: SkillStat[];
  attempts: AttemptSummary[];
  lastActive: string | null;
};

type Row = {
  attempt_id: number;
  skill: SkillId;
  domain: 'math' | 'english';
  first_try_correct: number | null;
  final_correct: number | null;
  hints_used: number;
};

export function labelFor(answered: number, accuracy: number | null): SkillStat['label'] {
  if (answered < MIN_EVIDENCE || accuracy === null) return 'insufficient';
  if (accuracy >= 0.85) return 'mastered';
  if (accuracy < 0.6) return 'needs_practice';
  return 'developing';
}

export function skillStats(rows: Pick<Row, 'skill' | 'domain' | 'first_try_correct'>[]): SkillStat[] {
  const m = new Map<SkillId, { answered: number; correct: number }>();
  for (const r of rows) {
    if (r.domain !== 'math') continue;
    const s = m.get(r.skill) ?? { answered: 0, correct: 0 };
    s.answered++;
    if (r.first_try_correct) s.correct++;
    m.set(r.skill, s);
  }
  return [...m.entries()].map(([skill, s]) => {
    const accuracy = s.answered ? s.correct / s.answered : null;
    return { skill, name: SKILL_NAMES[skill], ...s, accuracy, label: labelFor(s.answered, accuracy) };
  });
}

export function attemptSummaries(db: DB, where: string, param: number): AttemptSummary[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.kind, a.lesson_id, a.game_id, a.started_at, a.finished_at, l.title,
        SUM(CASE WHEN qr.domain = 'math' AND qr.done = 1 THEN 1 ELSE 0 END) AS math_total,
        SUM(CASE WHEN qr.domain = 'math' AND qr.first_try_correct = 1 THEN 1 ELSE 0 END) AS math_correct,
        SUM(CASE WHEN qr.domain = 'english' AND qr.done = 1 THEN 1 ELSE 0 END) AS vocab_total,
        SUM(CASE WHEN qr.domain = 'english' AND qr.first_try_correct = 1 THEN 1 ELSE 0 END) AS vocab_correct
       FROM attempts a
       LEFT JOIN lessons l ON l.id = a.lesson_id
       JOIN question_results qr ON qr.attempt_id = a.id
       WHERE ${where} AND a.status = 'completed'
       GROUP BY a.id ORDER BY a.finished_at ASC, a.id ASC`,
    )
    .all(param) as Record<string, any>[];
  return rows.map((r) => ({
    attemptId: r.id,
    kind: r.kind,
    lessonId: r.lesson_id,
    gameId: r.game_id,
    title: r.title ?? gameTitle(r.game_id),
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    mathCorrect: r.math_correct ?? 0,
    mathTotal: r.math_total ?? 0,
    vocabCorrect: r.vocab_correct ?? 0,
    vocabTotal: r.vocab_total ?? 0,
  }));
}

const GAME_TITLES: Record<string, string> = {
  'magic-numbers': 'Trò chơi: Số kỳ diệu',
  'math-garden': 'Trò chơi: Vườn Toán',
  'shape-hunt': 'Trò chơi: Săn hình',
};
const gameTitle = (id: string | null) => (id ? (GAME_TITLES[id] ?? id) : '');

export function studentReport(db: DB, studentId: number): StudentReport {
  const st = db.prepare('SELECT id, nickname, active FROM students WHERE id = ?').get(studentId) as
    | { id: number; nickname: string; active: number }
    | undefined;
  if (!st) throw new Error('student not found');
  const rows = db
    .prepare(
      `SELECT qr.attempt_id, qr.skill, qr.domain, qr.first_try_correct, qr.final_correct, qr.hints_used
       FROM question_results qr JOIN attempts a ON a.id = qr.attempt_id
       WHERE a.student_id = ? AND a.mode = 'class' AND qr.done = 1`,
    )
    .all(studentId) as Row[];
  const math = rows.filter((r) => r.domain === 'math');
  const eng = rows.filter((r) => r.domain === 'english');
  const correct = math.filter((r) => r.first_try_correct).length;
  const lessonsCompleted = (
    db
      .prepare(`SELECT COUNT(DISTINCT lesson_id) AS n FROM attempts WHERE student_id = ? AND kind = 'lesson' AND status = 'completed'`)
      .get(studentId) as { n: number }
  ).n;
  const last = db.prepare(`SELECT MAX(COALESCE(finished_at, started_at)) AS t FROM attempts WHERE student_id = ?`).get(studentId) as {
    t: string | null;
  };
  const engCorrect = eng.filter((r) => r.first_try_correct).length;
  return {
    studentId: st.id,
    nickname: st.nickname,
    active: !!st.active,
    questionsDone: math.length,
    correct,
    wrong: math.length - correct,
    accuracy: math.length ? correct / math.length : null,
    correctAfterRetry: math.filter((r) => !r.first_try_correct && r.final_correct).length,
    hintsUsed: rows.reduce((s, r) => s + r.hints_used, 0),
    lessonsCompleted,
    vocab: { answered: eng.length, correct: engCorrect, accuracy: eng.length ? engCorrect / eng.length : null },
    skills: skillStats(rows),
    attempts: attemptSummaries(db, 'a.student_id = ?', studentId),
    lastActive: last.t,
  };
}

export type ClassReport = {
  classId: number;
  students: StudentReport[];
  skills: SkillStat[];
  lessons: { lessonId: string; title: string; completedBy: number; studentCount: number }[];
  totals: { questionsDone: number; correct: number; accuracy: number | null; vocabAnswered: number; vocabCorrect: number };
};

export function classReport(db: DB, classId: number): ClassReport {
  const ids = db.prepare('SELECT id FROM students WHERE class_id = ? ORDER BY nickname COLLATE NOCASE').all(classId) as { id: number }[];
  const students = ids.map((s) => studentReport(db, s.id));
  const rows = db
    .prepare(
      `SELECT qr.skill, qr.domain, qr.first_try_correct FROM question_results qr JOIN attempts a ON a.id = qr.attempt_id
       WHERE a.class_id = ? AND a.mode = 'class' AND qr.done = 1`,
    )
    .all(classId) as Row[];
  const classSkills = skillStats(rows).map((s) => ({ ...s, label: labelFor(s.answered >= MIN_EVIDENCE * 2 ? s.answered : 0, s.accuracy) }));
  const lessons = (
    db
      .prepare(
        `SELECT l.id, l.title,
          (SELECT COUNT(DISTINCT a.student_id) FROM attempts a WHERE a.class_id = cl.class_id AND a.lesson_id = l.id AND a.status = 'completed') AS done
         FROM class_lessons cl JOIN lessons l ON l.id = cl.lesson_id WHERE cl.class_id = ? ORDER BY l.sort_order`,
      )
      .all(classId) as { id: string; title: string; done: number }[]
  ).map((l) => ({ lessonId: l.id, title: l.title, completedBy: l.done, studentCount: students.filter((s) => s.active).length }));
  const q = students.reduce((s, x) => s + x.questionsDone, 0);
  const c = students.reduce((s, x) => s + x.correct, 0);
  return {
    classId,
    students,
    skills: classSkills,
    lessons,
    totals: {
      questionsDone: q,
      correct: c,
      accuracy: q ? c / q : null,
      vocabAnswered: students.reduce((s, x) => s + x.vocab.answered, 0),
      vocabCorrect: students.reduce((s, x) => s + x.vocab.correct, 0),
    },
  };
}

/** Bài đã duyệt luyện tập tốt nhất cho một kỹ năng (bài có nhiều câu của kỹ năng đó nhất). */
export function lessonForSkill(db: DB, skill: SkillId, allowed?: Set<string>): { id: string; title: string } | null {
  const rows = db
    .prepare(
      `SELECT l.id, l.title, COUNT(*) AS n FROM questions q JOIN lessons l ON l.id = q.lesson_id
       WHERE q.skill = ? AND l.status = 'approved' GROUP BY l.id ORDER BY n DESC, l.sort_order`,
    )
    .all(skill) as { id: string; title: string }[];
  return rows.find((r) => !allowed || allowed.has(r.id)) ?? null;
}
