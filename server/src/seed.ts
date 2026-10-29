// Tạo tài khoản ban đầu khi CSDL còn trống. Chỉ tạo tài khoản và lớp mẫu, KHÔNG tạo kết quả học tập giả.
import { hashPassword } from './auth.js';
import { audit, tx, type DB } from './db.js';

export const DEMO_CLASS_CODE = 'DEMO1A';
export const DEMO_STUDENTS = [
  { nickname: 'Bé Mèo', code: 'MEO234' },
  { nickname: 'Bé Thỏ', code: 'THO234' },
  { nickname: 'Bé Gấu', code: 'GAU234' },
];

export function seedIfEmpty(db: DB, env: NodeJS.ProcessEnv = process.env) {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (count > 0) return false;
  const teacherEmail = (env.SEED_TEACHER_EMAIL || 'giaovien@mathbuddy.local').toLowerCase();
  const teacherPassword = env.SEED_TEACHER_PASSWORD || 'Buddy@2026';
  const adminEmail = (env.SEED_ADMIN_EMAIL || 'quantri@mathbuddy.local').toLowerCase();
  const adminPassword = env.SEED_ADMIN_PASSWORD || 'Admin@2026';
  tx(db, () => {
    const t = db
      .prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'teacher')`)
      .run(teacherEmail, 'Cô giáo mẫu', hashPassword(teacherPassword));
    db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`).run(
      adminEmail,
      'Quản trị nội dung',
      hashPassword(adminPassword),
    );
    if (env.SEED_DEMO_CLASS !== 'false') {
      const c = db
        .prepare('INSERT INTO classes (teacher_id, name, class_code) VALUES (?, ?, ?)')
        .run(Number(t.lastInsertRowid), 'Lớp 1A (lớp mẫu)', DEMO_CLASS_CODE);
      const classId = Number(c.lastInsertRowid);
      db.prepare(`INSERT INTO class_lessons (class_id, lesson_id) SELECT ?, id FROM lessons WHERE status = 'approved'`).run(classId);
      const ins = db.prepare('INSERT INTO students (class_id, nickname, access_code) VALUES (?, ?, ?)');
      for (const s of DEMO_STUDENTS) ins.run(classId, s.nickname, s.code);
    }
    audit(db, 'system', null, 'seed');
  });
  return true;
}

/** Xóa dữ liệu học thử quá 7 ngày và phiên đăng nhập hết hạn. */
export function cleanup(db: DB) {
  db.prepare(`DELETE FROM trial_guests WHERE created_at < datetime('now', '-7 days')`).run();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}
