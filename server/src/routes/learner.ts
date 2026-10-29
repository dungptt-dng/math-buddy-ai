// API cho học sinh (đã vào lớp) và người học thử. Mọi truy vấn đều lọc theo chủ sở hữu ở phía máy chủ.
import { Router, type Request } from 'express';
import { z } from 'zod';
import { createSession, deleteSession, HttpError, normalizeCode, rateLimit, requireLearner, type Auth } from '../auth.js';
import { tx, type DB } from '../db.js';
import { GAMES, MIN_GAME_QUESTIONS } from '../content/games.js';
import { SKILL_NAMES, type Option, type SkillId } from '../content/types.js';
import { BUDDY_CORRECT, BUDDY_REVEAL, BUDDY_TRY_AGAIN, grade, MAX_TRIES, pick } from '../grading.js';
import { lessonForSkill } from '../reports.js';

type Learner = Extract<Auth, { kind: 'student' | 'trial' }>;

type QRow = {
  id: string;
  lesson_id: string;
  skill: SkillId;
  domain: 'math' | 'english';
  level: number;
  public_json: string;
  answer_json: string;
  hints_json: string;
  explain: string;
  feedback_correct: string | null;
  feedback_wrong: string | null;
};

type AttemptRow = {
  id: number;
  mode: 'class' | 'trial';
  kind: 'lesson' | 'game';
  lesson_id: string | null;
  game_id: string | null;
  student_id: number | null;
  guest_id: number | null;
  class_id: number | null;
  question_ids: string;
  status: 'in_progress' | 'completed' | 'abandoned';
};

type ResultRow = {
  question_id: string;
  skill: SkillId;
  domain: 'math' | 'english';
  tries: number;
  hints_used: number;
  first_try_correct: number | null;
  final_correct: number | null;
  done: number;
};

export const TRIAL_NOTICE =
  'Con đang học thử. Kết quả chỉ để con tự xem, không gửi vào lớp học nào và sẽ tự xóa sau 7 ngày.';

const ownerClause = (a: Learner) => (a.kind === 'student' ? 'student_id = ?' : 'guest_id = ?');

export function learnerRouter(db: DB) {
  const r = Router();

  const qById = db.prepare('SELECT * FROM questions WHERE id = ?');
  const loadQ = (id: string) => qById.get(id) as QRow | undefined;
  const publicOf = (q: QRow) => {
    const p = JSON.parse(q.public_json);
    return {
      id: q.id,
      prompt: p.prompt,
      speak: p.speak ?? undefined,
      visual: p.visual ?? undefined,
      kind: p.kind,
      options: p.options ?? undefined,
      vocab: p.vocab ?? undefined,
      domain: q.domain,
      hintCount: (JSON.parse(q.hints_json) as string[]).length,
    };
  };

  /** Danh sách bài người học được phép truy cập (chỉ bài đã duyệt). */
  function availableLessons(a: Learner) {
    if (a.kind === 'student') {
      return db
        .prepare(
          `SELECT l.* FROM lessons l JOIN class_lessons cl ON cl.lesson_id = l.id
           WHERE cl.class_id = ? AND l.status = 'approved' ORDER BY l.sort_order`,
        )
        .all(a.classId) as Record<string, any>[];
    }
    return db.prepare(`SELECT * FROM lessons WHERE status = 'approved' ORDER BY sort_order`).all() as Record<string, any>[];
  }

  function loadOwnedAttempt(req: Request): { a: Learner; attempt: AttemptRow } {
    const a = requireLearner(req);
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(404, 'Không tìm thấy bài làm.');
    const attempt = db.prepare(`SELECT * FROM attempts WHERE id = ? AND ${ownerClause(a)}`).get(id, a.id) as AttemptRow | undefined;
    // Trả 404 cho cả trường hợp bài của người khác để không lộ sự tồn tại của dữ liệu.
    if (!attempt) throw new HttpError(404, 'Không tìm thấy bài làm.');
    return { a, attempt };
  }

  const results = (attemptId: number) =>
    db.prepare('SELECT * FROM question_results WHERE attempt_id = ?').all(attemptId) as ResultRow[];

  function attemptState(attempt: AttemptRow) {
    const ids = JSON.parse(attempt.question_ids) as string[];
    const res = new Map(results(attempt.id).map((x) => [x.question_id, x]));
    const title = attempt.lesson_id
      ? ((db.prepare('SELECT title FROM lessons WHERE id = ?').get(attempt.lesson_id) as { title: string }).title)
      : (GAMES.find((g) => g.id === attempt.game_id)?.title ?? '');
    return {
      id: attempt.id,
      mode: attempt.mode,
      kind: attempt.kind,
      lessonId: attempt.lesson_id,
      gameId: attempt.game_id,
      title,
      status: attempt.status,
      maxTries: MAX_TRIES,
      questions: ids.map((id) => publicOf(loadQ(id)!)),
      progress: ids.map((id) => {
        const x = res.get(id)!;
        return { questionId: id, done: !!x.done, tries: x.tries, firstTryCorrect: x.first_try_correct === 1, finalCorrect: x.final_correct === 1 };
      }),
    };
  }

  // ---------- Vào lớp / học thử ----------

  const loginBody = z.object({ classCode: z.string().min(1).max(20), studentCode: z.string().min(1).max(20) });
  r.post('/student/login', rateLimit(20, 15 * 60_000), (req, res) => {
    const body = loginBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Con hãy nhập đủ Mã lớp và Mã học sinh nhé.');
    const classCode = normalizeCode(body.data.classCode);
    const studentCode = normalizeCode(body.data.studentCode);
    const st = db
      .prepare(
        `SELECT s.id, s.nickname, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id
         WHERE c.class_code = ? AND s.access_code = ? AND s.active = 1`,
      )
      .get(classCode, studentCode) as { id: number; nickname: string; class_name: string } | undefined;
    if (!st) {
      throw new HttpError(401, 'Mã lớp hoặc mã học sinh chưa đúng. Con kiểm tra lại, hoặc nhờ thầy cô giúp nhé.');
    }
    db.prepare(`UPDATE students SET last_login_at = datetime('now') WHERE id = ?`).run(st.id);
    res.json({ token: createSession(db, 'student', st.id), nickname: st.nickname, className: st.class_name });
  });

  r.post('/trial/start', rateLimit(30, 15 * 60_000), (_req, res) => {
    const guest = db.prepare('INSERT INTO trial_guests DEFAULT VALUES').run();
    res.json({ token: createSession(db, 'trial', Number(guest.lastInsertRowid)), notice: TRIAL_NOTICE });
  });

  r.post('/learner/logout', (req, res) => {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) deleteSession(db, h.slice(7));
    res.json({ ok: true });
  });

  r.get('/learner/me', (req, res) => {
    const a = requireLearner(req);
    if (a.kind === 'trial') return res.json({ mode: 'trial', notice: TRIAL_NOTICE });
    const st = db
      .prepare('SELECT s.nickname, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?')
      .get(a.id) as { nickname: string; class_name: string };
    res.json({ mode: 'class', nickname: st.nickname, className: st.class_name });
  });

  // ---------- Danh sách bài & trò chơi ----------

  r.get('/learner/lessons', (req, res) => {
    const a = requireLearner(req);
    const lessons = availableLessons(a);
    const out = lessons.map((l) => {
      const count = (db.prepare('SELECT COUNT(*) AS n FROM questions WHERE lesson_id = ?').get(l.id) as { n: number }).n;
      const inProgress = db
        .prepare(`SELECT id FROM attempts WHERE ${ownerClause(a)} AND lesson_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1`)
        .get(a.id, l.id) as { id: number } | undefined;
      const last = db
        .prepare(
          `SELECT a.id, a.finished_at,
             SUM(CASE WHEN qr.domain = 'math' THEN 1 ELSE 0 END) AS math_total,
             SUM(CASE WHEN qr.domain = 'math' AND qr.first_try_correct = 1 THEN 1 ELSE 0 END) AS math_correct,
             SUM(CASE WHEN qr.domain = 'english' THEN 1 ELSE 0 END) AS vocab_total,
             SUM(CASE WHEN qr.domain = 'english' AND qr.first_try_correct = 1 THEN 1 ELSE 0 END) AS vocab_correct
           FROM attempts a JOIN question_results qr ON qr.attempt_id = a.id
           WHERE a.${ownerClause(a)} AND a.lesson_id = ? AND a.status = 'completed'
           GROUP BY a.id ORDER BY a.finished_at DESC, a.id DESC LIMIT 1`,
        )
        .get(a.id, l.id) as Record<string, number> | undefined;
      let answeredInProgress = 0;
      if (inProgress) {
        answeredInProgress = (
          db.prepare('SELECT COUNT(*) AS n FROM question_results WHERE attempt_id = ? AND done = 1').get(inProgress.id) as { n: number }
        ).n;
      }
      return {
        id: l.id,
        title: l.title,
        topic: l.topic,
        icon: l.icon,
        domain: l.domain,
        questionCount: count,
        status: inProgress ? 'in_progress' : last ? 'completed' : 'new',
        inProgressAttemptId: inProgress?.id ?? null,
        answeredInProgress,
        last: last
          ? { mathCorrect: last.math_correct, mathTotal: last.math_total, vocabCorrect: last.vocab_correct, vocabTotal: last.vocab_total }
          : null,
      };
    });
    res.json({ lessons: out, mode: a.kind === 'student' ? 'class' : 'trial' });
  });

  function gamePool(a: Learner, skills: SkillId[]): QRow[] {
    const allowed = availableLessons(a).map((l) => l.id as string);
    if (allowed.length === 0) return [];
    const marks = allowed.map(() => '?').join(',');
    const skillMarks = skills.map(() => '?').join(',');
    return db
      .prepare(`SELECT * FROM questions WHERE domain = 'math' AND lesson_id IN (${marks}) AND skill IN (${skillMarks})`)
      .all(...allowed, ...skills) as QRow[];
  }

  r.get('/learner/games', (req, res) => {
    const a = requireLearner(req);
    res.json({
      games: GAMES.map((g) => ({
        id: g.id,
        title: g.title,
        englishName: g.englishName,
        howTo: g.howTo,
        available: gamePool(a, g.skills).length >= MIN_GAME_QUESTIONS,
      })),
    });
  });

  // ---------- Làm bài ----------

  const startBody = z.union([z.object({ lessonId: z.string().max(64) }), z.object({ gameId: z.string().max(64) })]);
  r.post('/learner/attempts', (req, res) => {
    const a = requireLearner(req);
    const body = startBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Yêu cầu không hợp lệ.');
    let questions: QRow[];
    let lessonId: string | null = null;
    let gameId: string | null = null;
    if ('lessonId' in body.data) {
      lessonId = body.data.lessonId;
      if (!availableLessons(a).some((l) => l.id === lessonId)) throw new HttpError(404, 'Bài này chưa được mở cho con.');
      questions = db.prepare(`SELECT * FROM questions WHERE lesson_id = ? ORDER BY (domain = 'english'), level, position`).all(lessonId) as QRow[];
    } else {
      const game = GAMES.find((g) => g.id === (body.data as { gameId: string }).gameId);
      if (!game) throw new HttpError(404, 'Không tìm thấy trò chơi.');
      gameId = game.id;
      const pool = gamePool(a, game.skills);
      if (pool.length < MIN_GAME_QUESTIONS) throw new HttpError(409, 'Trò chơi này cần thêm bài học. Con hãy luyện bài trước nhé.');
      questions = shuffle(pool)
        .slice(0, game.size)
        .sort((x, y) => x.level - y.level);
    }
    const attemptId = tx(db, () => {
      if (lessonId) {
        db.prepare(`UPDATE attempts SET status = 'abandoned' WHERE ${ownerClause(a)} AND lesson_id = ? AND status = 'in_progress'`).run(a.id, lessonId);
      }
      const ins = db
        .prepare(
          `INSERT INTO attempts (mode, kind, lesson_id, game_id, student_id, class_id, guest_id, question_ids, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress')`,
        )
        .run(
          a.kind === 'student' ? 'class' : 'trial',
          lessonId ? 'lesson' : 'game',
          lessonId,
          gameId,
          a.kind === 'student' ? a.id : null,
          a.kind === 'student' ? a.classId : null,
          a.kind === 'trial' ? a.id : null,
          JSON.stringify(questions.map((q) => q.id)),
        );
      const id = Number(ins.lastInsertRowid);
      const qr = db.prepare('INSERT INTO question_results (attempt_id, question_id, skill, domain) VALUES (?, ?, ?, ?)');
      for (const q of questions) qr.run(id, q.id, q.skill, q.domain);
      return id;
    });
    const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId) as AttemptRow;
    res.status(201).json(attemptState(attempt));
  });

  r.get('/learner/attempts/:id', (req, res) => {
    const { attempt } = loadOwnedAttempt(req);
    res.json(attemptState(attempt));
  });

  function openQuestion(attempt: AttemptRow, questionId: unknown) {
    if (attempt.status !== 'in_progress') throw new HttpError(409, 'Bài này đã kết thúc rồi.');
    if (typeof questionId !== 'string' || !(JSON.parse(attempt.question_ids) as string[]).includes(questionId)) {
      throw new HttpError(400, 'Câu hỏi không thuộc bài này.');
    }
    const qr = db.prepare('SELECT * FROM question_results WHERE attempt_id = ? AND question_id = ?').get(attempt.id, questionId) as ResultRow;
    const q = loadQ(questionId)!;
    return { q, qr };
  }

  r.post('/learner/attempts/:id/hint', (req, res) => {
    const { attempt } = loadOwnedAttempt(req);
    const { q, qr } = openQuestion(attempt, req.body?.questionId);
    if (qr.done) throw new HttpError(409, 'Câu này đã xong rồi.');
    const hints = JSON.parse(q.hints_json) as string[];
    const index = Math.min(qr.hints_used, hints.length - 1);
    if (qr.hints_used < hints.length) {
      db.prepare('UPDATE question_results SET hints_used = hints_used + 1 WHERE attempt_id = ? AND question_id = ?').run(attempt.id, q.id);
    }
    res.json({ hint: hints[index], index: index + 1, total: hints.length });
  });

  r.post('/learner/attempts/:id/answer', (req, res) => {
    const { attempt } = loadOwnedAttempt(req);
    const { q, qr } = openQuestion(attempt, req.body?.questionId);
    if (qr.done) throw new HttpError(409, 'Câu này đã xong rồi.');
    const pub = JSON.parse(q.public_json) as { kind: 'choice' | 'number' | 'multi'; options: Option[] | null };
    const answer = JSON.parse(q.answer_json);
    const status = grade({ kind: pub.kind, options: pub.options, answer }, req.body?.answer);
    if (status === 'invalid') {
      // Không tính là một lần trả lời; không tự đoán ý của trẻ.
      return res.json({
        status,
        guide: pub.kind === 'number' ? 'Con hãy nhập một số bằng các nút số nhé.' : pub.kind === 'multi' ? 'Con hãy chạm chọn ít nhất một hình nhé.' : 'Con hãy chọn một đáp án nhé.',
      });
    }
    const correct = status === 'correct';
    const tryNo = qr.tries + 1;
    const done = correct || tryNo >= MAX_TRIES;
    const hints = JSON.parse(q.hints_json) as string[];
    tx(db, () => {
      db.prepare('INSERT INTO responses (attempt_id, question_id, try_no, answer_json, is_correct) VALUES (?, ?, ?, ?, ?)').run(
        attempt.id,
        q.id,
        tryNo,
        JSON.stringify(req.body.answer ?? null).slice(0, 500),
        correct ? 1 : 0,
      );
      db.prepare(
        `UPDATE question_results SET tries = ?, first_try_correct = COALESCE(first_try_correct, ?),
           final_correct = ?, done = ?, hints_used = hints_used + ?
         WHERE attempt_id = ? AND question_id = ?`,
      ).run(tryNo, correct ? 1 : 0, done ? (correct ? 1 : 0) : null, done ? 1 : 0, !correct && !done && qr.hints_used < hints.length ? 1 : 0, attempt.id, q.id);
    });
    const seed = attempt.id * 31 + tryNo + q.id.length;
    if (correct) {
      const pool = q.feedback_correct ? [...BUDDY_CORRECT, q.feedback_correct, q.feedback_correct] : BUDDY_CORRECT;
      return res.json({ status, buddy: pick(pool, seed), done: true, correctAnswer: answer, explain: q.explain });
    }
    if (!done) {
      const pool = q.feedback_wrong ? [...BUDDY_TRY_AGAIN, q.feedback_wrong] : BUDDY_TRY_AGAIN;
      return res.json({
        status,
        buddy: pick(pool, seed),
        guide: hints[Math.min(qr.hints_used, hints.length - 1)],
        done: false,
        triesLeft: MAX_TRIES - tryNo,
      });
    }
    res.json({ status, buddy: BUDDY_REVEAL, guide: q.explain, done: true, correctAnswer: answer, explain: q.explain });
  });

  r.post('/learner/attempts/:id/finish', (req, res) => {
    const { attempt } = loadOwnedAttempt(req);
    if (attempt.status === 'in_progress') {
      const left = results(attempt.id).filter((x) => !x.done).length;
      if (left > 0) throw new HttpError(409, `Con còn ${left} câu chưa làm.`);
      db.prepare(`UPDATE attempts SET status = 'completed', finished_at = datetime('now') WHERE id = ?`).run(attempt.id);
    }
    res.json(resultOf(attempt.id));
  });

  r.get('/learner/attempts/:id/result', (req, res) => {
    const { attempt } = loadOwnedAttempt(req);
    if (attempt.status !== 'completed') throw new HttpError(409, 'Con chưa làm xong bài này.');
    res.json(resultOf(attempt.id));
  });

  function resultOf(attemptId: number) {
    const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId) as AttemptRow;
    const rs = results(attemptId);
    const math = rs.filter((x) => x.domain === 'math');
    const eng = rs.filter((x) => x.domain === 'english');
    const mathCorrect = math.filter((x) => x.first_try_correct).length;
    const bySkill = new Map<SkillId, { n: number; ok: number }>();
    for (const x of math) {
      const s = bySkill.get(x.skill) ?? { n: 0, ok: 0 };
      s.n++;
      if (x.first_try_correct) s.ok++;
      bySkill.set(x.skill, s);
    }
    const goodSkills = [...bySkill].filter(([, s]) => s.ok / s.n >= 0.8).map(([k]) => SKILL_NAMES[k]);
    // Chỉ gợi ý ôn lại kỹ năng chưa đạt mức "làm tốt" (tránh vừa khen vừa nhắc ôn cùng một kỹ năng).
    const weak = [...bySkill].filter(([, s]) => s.n - s.ok >= 2 && s.ok / s.n < 0.8).sort((x, y) => (y[1].n - y[1].ok) - (x[1].n - x[1].ok))[0];

    const learner: Learner =
      attempt.mode === 'class' ? { kind: 'student', id: attempt.student_id!, classId: attempt.class_id! } : { kind: 'trial', id: attempt.guest_id! };
    const allowedIds = new Set(availableLessons(learner).map((l) => l.id as string));
    let next: { lessonId: string; title: string; reason: string } | null = null;
    if (weak) {
      const l = lessonForSkill(db, weak[0], allowedIds);
      if (l) next = { lessonId: l.id, title: l.title, reason: `Luyện thêm một chút phần “${SKILL_NAMES[weak[0]]}” nhé.` };
    }
    if (!next) {
      const done = new Set(
        (
          db.prepare(`SELECT DISTINCT lesson_id FROM attempts WHERE ${ownerClause(learner)} AND status = 'completed' AND lesson_id IS NOT NULL`).all(learner.id) as {
            lesson_id: string;
          }[]
        ).map((x) => x.lesson_id),
      );
      const upcoming = availableLessons(learner).find((l) => !done.has(l.id) && l.domain === 'math');
      if (upcoming) next = { lessonId: upcoming.id, title: upcoming.title, reason: 'Con sẵn sàng khám phá bài mới rồi!' };
    }
    const ratio = math.length ? mathCorrect / math.length : eng.length ? eng.filter((x) => x.first_try_correct).length / eng.length : 0;
    const praise =
      ratio >= 0.9
        ? 'Con làm rất giỏi! Buddy tự hào về con lắm.'
        : ratio >= 0.7
          ? 'Con làm tốt lắm! Cố gắng thêm một chút nữa là tuyệt vời.'
          : ratio >= 0.4
            ? 'Con đã rất chăm chỉ! Luyện thêm một lần nữa con sẽ giỏi hơn.'
            : 'Cảm ơn con đã cố gắng! Mình cùng luyện lại thật chậm nhé.';
    return {
      attemptId,
      kind: attempt.kind,
      mode: attempt.mode,
      lessonId: attempt.lesson_id,
      gameId: attempt.game_id,
      mathCorrect,
      mathTotal: math.length,
      vocabCorrect: eng.filter((x) => x.first_try_correct).length,
      vocabTotal: eng.length,
      correctAfterRetry: math.filter((x) => !x.first_try_correct && x.final_correct).length,
      buddy: ratio >= 0.7 ? 'Great job!' : 'You can do it!',
      praise,
      goodSkills,
      next,
      trialNotice: attempt.mode === 'trial' ? TRIAL_NOTICE : null,
    };
  }

  return r;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
