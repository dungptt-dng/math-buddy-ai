// Góc giáo viên. Mỗi yêu cầu đều kiểm tra lớp/học sinh thuộc giáo viên đang đăng nhập.
// KHÔNG có chức năng dùng AI để tạo câu hỏi.
import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  createSession,
  deleteSession,
  generateCode,
  HttpError,
  rateLimit,
  requireAdmin,
  requireTeacher,
  verifyPassword,
} from '../auth.js';
import { audit, tx, type DB } from '../db.js';
import { analyzeClass, summarizeWithLlm, type Insight } from '../analysis.js';
import { classReport, studentReport } from '../reports.js';
import { csvTime, toCsv } from '../csv.js';
import { SKILL_NAMES, type SkillId } from '../content/types.js';

export function teacherRouter(db: DB) {
  const r = Router();

  const ownedClass = (req: Request, classId: unknown) => {
    const t = requireTeacher(req);
    const id = Number(classId);
    const c = Number.isInteger(id)
      ? (db.prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?').get(id, t.id) as Record<string, any> | undefined)
      : undefined;
    if (!c) throw new HttpError(404, 'Không tìm thấy lớp học trong phạm vi quyền của thầy/cô.');
    return { t, c };
  };

  const ownedStudent = (req: Request, studentId: unknown) => {
    const t = requireTeacher(req);
    const id = Number(studentId);
    const s = Number.isInteger(id)
      ? (db
          .prepare('SELECT s.*, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ? AND c.teacher_id = ?')
          .get(id, t.id) as Record<string, any> | undefined)
      : undefined;
    if (!s) throw new HttpError(404, 'Không tìm thấy học sinh trong phạm vi quyền của thầy/cô.');
    return { t, s };
  };

  // ---------- Đăng nhập ----------

  const loginBody = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });
  r.post('/teacher/login', rateLimit(10, 15 * 60_000), (req, res) => {
    const body = loginBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Vui lòng nhập email và mật khẩu.');
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(body.data.email.toLowerCase()) as Record<string, any> | undefined;
    if (!u || !verifyPassword(body.data.password, u.password_hash)) throw new HttpError(401, 'Email hoặc mật khẩu không đúng.');
    audit(db, 'teacher', u.id, 'login');
    res.json({ token: createSession(db, 'teacher', u.id), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  });

  r.post('/teacher/logout', (req, res) => {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) deleteSession(db, h.slice(7));
    res.json({ ok: true });
  });

  r.get('/teacher/me', (req, res) => {
    const t = requireTeacher(req);
    const u = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(t.id);
    res.json({ user: u, aiSummaryEnabled: !!process.env.ANTHROPIC_API_KEY });
  });

  // ---------- Lớp học ----------

  r.get('/teacher/classes', (req, res) => {
    const t = requireTeacher(req);
    const classes = db
      .prepare(
        `SELECT c.id, c.name, c.class_code, c.created_at,
           (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.active = 1) AS student_count,
           (SELECT COUNT(*) FROM class_lessons cl WHERE cl.class_id = c.id) AS lesson_count
         FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at DESC, c.id DESC`,
      )
      .all(t.id);
    res.json({ classes });
  });

  const classBody = z.object({ name: z.string().trim().min(1).max(60) });
  r.post('/teacher/classes', (req, res) => {
    const t = requireTeacher(req);
    const body = classBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Tên lớp cần từ 1 đến 60 ký tự.');
    const id = tx(db, () => {
      const code = uniqueClassCode(db);
      const ins = db.prepare('INSERT INTO classes (teacher_id, name, class_code) VALUES (?, ?, ?)').run(t.id, body.data.name, code);
      const classId = Number(ins.lastInsertRowid);
      // Mặc định giao các bài Toán đã duyệt; giáo viên có thể bỏ bớt.
      db.prepare(`INSERT INTO class_lessons (class_id, lesson_id) SELECT ?, id FROM lessons WHERE status = 'approved'`).run(classId);
      audit(db, 'teacher', t.id, 'class.create', `class:${classId}`, { name: body.data.name });
      return classId;
    });
    res.status(201).json({ id });
  });

  r.get('/teacher/classes/:id', (req, res) => {
    const { c } = ownedClass(req, req.params.id);
    const students = db
      .prepare('SELECT id, nickname, access_code, active, last_login_at, created_at FROM students WHERE class_id = ? ORDER BY nickname COLLATE NOCASE')
      .all(c.id);
    const lessons = db
      .prepare(
        `SELECT l.id, l.title, l.topic, l.domain, l.status, (cl.lesson_id IS NOT NULL) AS assigned,
           (SELECT COUNT(*) FROM questions q WHERE q.lesson_id = l.id) AS question_count
         FROM lessons l LEFT JOIN class_lessons cl ON cl.lesson_id = l.id AND cl.class_id = ?
         WHERE l.status = 'approved' ORDER BY l.sort_order`,
      )
      .all(c.id);
    res.json({ class: { id: c.id, name: c.name, classCode: c.class_code, createdAt: c.created_at }, students, lessons });
  });

  r.patch('/teacher/classes/:id', (req, res) => {
    const { t, c } = ownedClass(req, req.params.id);
    const body = classBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Tên lớp cần từ 1 đến 60 ký tự.');
    db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(body.data.name, c.id);
    audit(db, 'teacher', t.id, 'class.rename', `class:${c.id}`, { name: body.data.name });
    res.json({ ok: true });
  });

  r.delete('/teacher/classes/:id', (req, res) => {
    const { t, c } = ownedClass(req, req.params.id);
    db.prepare('DELETE FROM classes WHERE id = ?').run(c.id);
    audit(db, 'teacher', t.id, 'class.delete', `class:${c.id}`);
    res.json({ ok: true });
  });

  const lessonsBody = z.object({ lessonIds: z.array(z.string().max(64)).max(100) });
  r.put('/teacher/classes/:id/lessons', (req, res) => {
    const { t, c } = ownedClass(req, req.params.id);
    const body = lessonsBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Danh sách bài không hợp lệ.');
    const approved = new Set((db.prepare(`SELECT id FROM lessons WHERE status = 'approved'`).all() as { id: string }[]).map((x) => x.id));
    const bad = body.data.lessonIds.filter((id) => !approved.has(id));
    if (bad.length) throw new HttpError(400, 'Chỉ có thể giao bài đã được duyệt.');
    tx(db, () => {
      db.prepare('DELETE FROM class_lessons WHERE class_id = ?').run(c.id);
      const ins = db.prepare('INSERT INTO class_lessons (class_id, lesson_id) VALUES (?, ?)');
      for (const id of new Set(body.data.lessonIds)) ins.run(c.id, id);
    });
    audit(db, 'teacher', t.id, 'class.assign', `class:${c.id}`, body.data.lessonIds);
    res.json({ ok: true });
  });

  // ---------- Học sinh ----------

  const studentsBody = z.object({ nicknames: z.array(z.string().trim().min(1).max(40)).min(1).max(60) });
  r.post('/teacher/classes/:id/students', (req, res) => {
    const { t, c } = ownedClass(req, req.params.id);
    const body = studentsBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Mỗi tên gọi cần từ 1 đến 40 ký tự (tối đa 60 học sinh mỗi lần).');
    const created = tx(db, () =>
      body.data.nicknames.map((nickname) => {
        const code = uniqueStudentCode(db, c.id);
        const ins = db.prepare('INSERT INTO students (class_id, nickname, access_code) VALUES (?, ?, ?)').run(c.id, nickname, code);
        return { id: Number(ins.lastInsertRowid), nickname, accessCode: code };
      }),
    );
    audit(db, 'teacher', t.id, 'student.create', `class:${c.id}`, { count: created.length });
    res.status(201).json({ students: created });
  });

  const studentPatch = z.object({ nickname: z.string().trim().min(1).max(40).optional(), active: z.boolean().optional() });
  r.patch('/teacher/students/:id', (req, res) => {
    const { t, s } = ownedStudent(req, req.params.id);
    const body = studentPatch.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Dữ liệu không hợp lệ.');
    if (body.data.nickname !== undefined) db.prepare('UPDATE students SET nickname = ? WHERE id = ?').run(body.data.nickname, s.id);
    if (body.data.active !== undefined) {
      db.prepare('UPDATE students SET active = ? WHERE id = ?').run(body.data.active ? 1 : 0, s.id);
      if (!body.data.active) db.prepare(`DELETE FROM sessions WHERE kind = 'student' AND subject_id = ?`).run(s.id);
    }
    audit(db, 'teacher', t.id, 'student.update', `student:${s.id}`, body.data);
    res.json({ ok: true });
  });

  r.post('/teacher/students/:id/reset-code', (req, res) => {
    const { t, s } = ownedStudent(req, req.params.id);
    const code = uniqueStudentCode(db, s.class_id);
    tx(db, () => {
      db.prepare('UPDATE students SET access_code = ? WHERE id = ?').run(code, s.id);
      // Mã cũ hết hiệu lực: đăng xuất mọi thiết bị đang dùng mã cũ.
      db.prepare(`DELETE FROM sessions WHERE kind = 'student' AND subject_id = ?`).run(s.id);
    });
    audit(db, 'teacher', t.id, 'student.reset_code', `student:${s.id}`);
    res.json({ accessCode: code });
  });

  r.delete('/teacher/students/:id', (req, res) => {
    const { t, s } = ownedStudent(req, req.params.id);
    tx(db, () => {
      db.prepare(`DELETE FROM sessions WHERE kind = 'student' AND subject_id = ?`).run(s.id);
      db.prepare('DELETE FROM students WHERE id = ?').run(s.id);
    });
    audit(db, 'teacher', t.id, 'student.delete', `student:${s.id}`);
    res.json({ ok: true });
  });

  // ---------- Kết quả & báo cáo ----------

  r.get('/teacher/classes/:id/report', (req, res) => {
    const { c } = ownedClass(req, req.params.id);
    res.json({ className: c.name, ...classReport(db, c.id) });
  });

  r.get('/teacher/students/:id/report', (req, res) => {
    const { s } = ownedStudent(req, req.params.id);
    res.json({ className: s.class_name, classId: s.class_id, ...studentReport(db, s.id) });
  });

  r.get('/teacher/classes/:id/export.csv', (req, res) => {
    const { t, c } = ownedClass(req, req.params.id);
    const type = req.query.type === 'attempts' ? 'attempts' : 'students';
    const report = classReport(db, c.id);
    const pct = (x: number | null) => (x === null ? '' : String(Math.round(x * 100)));
    const skillList = (labels: string[], st: (typeof report.students)[number]) =>
      st.skills
        .filter((x) => labels.includes(x.label))
        .map((x) => x.name)
        .join('; ');
    let csv: string;
    if (type === 'students') {
      csv = toCsv(
        ['Học sinh', 'Trạng thái', 'Số câu Toán đã làm', 'Số câu đúng (lần đầu)', 'Số câu sai', 'Tỷ lệ đúng (%)', 'Đúng sau khi thử lại', 'Số bài đã hoàn thành', 'Từ vựng: số câu', 'Từ vựng: số câu đúng', 'Kỹ năng đã vững', 'Kỹ năng cần ôn', 'Lần học gần nhất'],
        report.students.map((st) => [
          st.nickname,
          st.active ? 'Đang học' : 'Tạm khóa',
          st.questionsDone,
          st.correct,
          st.wrong,
          pct(st.accuracy),
          st.correctAfterRetry,
          st.lessonsCompleted,
          st.vocab.answered,
          st.vocab.correct,
          skillList(['mastered'], st),
          skillList(['needs_practice'], st),
          csvTime(st.lastActive),
        ]),
      );
    } else {
      csv = toCsv(
        ['Học sinh', 'Bài / trò chơi', 'Loại', 'Bắt đầu', 'Hoàn thành', 'Toán: đúng', 'Toán: tổng', 'Từ vựng: đúng', 'Từ vựng: tổng'],
        report.students.flatMap((st) =>
          st.attempts.map((a) => [
            st.nickname,
            a.title,
            a.kind === 'lesson' ? 'Bài ôn luyện' : 'Trò chơi',
            csvTime(a.startedAt),
            csvTime(a.finishedAt),
            a.mathCorrect,
            a.mathTotal,
            a.vocabCorrect,
            a.vocabTotal,
          ]),
        ),
      );
    }
    audit(db, 'teacher', t.id, 'report.export', `class:${c.id}`, { type });
    const filename = `math-buddy-${type === 'students' ? 'hoc-sinh' : 'lan-lam-bai'}-lop-${c.id}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });

  // ---------- Phân tích AI (chỉ đọc dữ liệu thật) ----------

  r.get('/teacher/classes/:id/insights', (req, res) => {
    const { c } = ownedClass(req, req.params.id);
    const row = db.prepare('SELECT * FROM ai_insights WHERE class_id = ? ORDER BY id DESC LIMIT 1').get(c.id) as Record<string, any> | undefined;
    res.json(row ? { createdAt: row.created_at, source: row.source, insights: JSON.parse(row.insights_json), summary: row.summary } : null);
  });

  r.post('/teacher/classes/:id/insights', async (req, res) => {
    const { t, c } = ownedClass(req, req.params.id);
    const { insights } = analyzeClass(db, c.id);
    let summary: string | null = null;
    let summaryError: string | null = null;
    try {
      summary = await summarizeWithLlm(insights);
    } catch (e) {
      // Không ghi chi tiết lỗi (có thể chứa thông tin cấu hình) ra phản hồi.
      console.error('[ai] Không tạo được tóm tắt:', (e as Error).name);
      summaryError = 'Không kết nối được dịch vụ AI. Các nhận định bên dưới vẫn được tính từ dữ liệu thật.';
    }
    const source = summary ? 'rules+llm' : 'rules';
    const ins = db
      .prepare('INSERT INTO ai_insights (class_id, created_by, source, insights_json, summary) VALUES (?, ?, ?, ?, ?)')
      .run(c.id, t.id, source, JSON.stringify(insights), summary);
    audit(db, 'teacher', t.id, 'insights.run', `class:${c.id}`, { id: Number(ins.lastInsertRowid), count: insights.length });
    const row = db.prepare('SELECT created_at FROM ai_insights WHERE id = ?').get(Number(ins.lastInsertRowid)) as { created_at: string };
    res.json({ createdAt: row.created_at, source, insights: insights as Insight[], summary, summaryError });
  });

  // ---------- Ngân hàng bài (chỉ xem; quản trị viên đổi trạng thái kiểm duyệt) ----------

  r.get('/teacher/lessons', (req, res) => {
    requireTeacher(req);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const lessons = (
      db
        .prepare(
          `SELECT l.*, (SELECT COUNT(*) FROM questions qq WHERE qq.lesson_id = l.id) AS question_count FROM lessons l ORDER BY l.sort_order`,
        )
        .all() as Record<string, any>[]
    )
      .filter((l) => !q || `${l.title} ${l.topic}`.toLowerCase().includes(q))
      .map((l) => ({
        id: l.id,
        title: l.title,
        topic: l.topic,
        domain: l.domain,
        status: l.status,
        verification: l.verification,
        sourceNote: l.source_note,
        questionCount: l.question_count,
        updatedAt: l.updated_at,
      }));
    res.json({ lessons });
  });

  r.get('/teacher/lessons/:id', (req, res) => {
    requireTeacher(req);
    const l = db.prepare('SELECT * FROM lessons WHERE id = ?').get(String(req.params.id)) as Record<string, any> | undefined;
    if (!l) throw new HttpError(404, 'Không tìm thấy bài.');
    const questions = (db.prepare(`SELECT * FROM questions WHERE lesson_id = ? ORDER BY (domain = 'english'), level, position`).all(l.id) as Record<string, any>[]).map(
      (q) => ({
        id: q.id,
        ...JSON.parse(q.public_json),
        answer: JSON.parse(q.answer_json),
        hints: JSON.parse(q.hints_json),
        explain: q.explain,
        skill: q.skill,
        skillName: SKILL_NAMES[q.skill as SkillId],
        level: q.level,
        domain: q.domain,
      }),
    );
    res.json({
      lesson: { id: l.id, title: l.title, topic: l.topic, domain: l.domain, status: l.status, verification: l.verification, sourceNote: l.source_note },
      questions,
    });
  });

  const statusBody = z.object({ status: z.enum(['draft', 'review', 'approved']) });
  r.patch('/admin/lessons/:id/status', (req, res) => {
    const a = requireAdmin(req);
    const body = statusBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Trạng thái không hợp lệ.');
    const l = db.prepare('SELECT id, status FROM lessons WHERE id = ?').get(String(req.params.id)) as { id: string; status: string } | undefined;
    if (!l) throw new HttpError(404, 'Không tìm thấy bài.');
    tx(db, () => {
      db.prepare(`UPDATE lessons SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(body.data.status, l.id);
      // Bài không còn ở trạng thái "Đã duyệt" thì gỡ khỏi các lớp.
      if (body.data.status !== 'approved') db.prepare('DELETE FROM class_lessons WHERE lesson_id = ?').run(l.id);
    });
    audit(db, 'admin', a.id, 'lesson.status', `lesson:${l.id}`, { from: l.status, to: body.data.status });
    res.json({ ok: true });
  });

  return r;
}

function uniqueClassCode(db: DB): string {
  for (;;) {
    const code = generateCode(6);
    if (!db.prepare('SELECT 1 FROM classes WHERE class_code = ?').get(code)) return code;
  }
}

function uniqueStudentCode(db: DB, classId: number): string {
  for (;;) {
    const code = generateCode(6);
    if (!db.prepare('SELECT 1 FROM students WHERE class_id = ? AND access_code = ?').get(classId, code)) return code;
  }
}
