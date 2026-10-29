import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { DB } from './db.js';

export type Auth =
  | { kind: 'teacher'; id: number; role: 'teacher' | 'admin' }
  | { kind: 'student'; id: number; classId: number }
  | { kind: 'trial'; id: number };

declare module 'express-serve-static-core' {
  interface Request {
    auth?: Auth;
  }
}

const HOUR = 3600_000;
export const SESSION_TTL = { teacher: 12 * HOUR, student: 7 * 24 * HOUR, trial: 7 * 24 * HOUR };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Tạo phiên đăng nhập. Chỉ lưu giá trị băm của token trong CSDL. */
export function createSession(db: DB, kind: Auth['kind'], subjectId: number): string {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, kind, subject_id, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    kind,
    subjectId,
    Date.now() + SESSION_TTL[kind],
  );
  return token;
}

export function deleteSession(db: DB, token: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

/** Đọc token và gắn req.auth. Mọi kiểm tra quyền đều dựa trên dữ liệu trong CSDL, không tin dữ liệu từ client. */
export function authenticate(db: DB) {
  const findSession = db.prepare('SELECT kind, subject_id, expires_at FROM sessions WHERE token_hash = ?');
  const findTeacher = db.prepare('SELECT id, role FROM users WHERE id = ?');
  const findStudent = db.prepare('SELECT id, class_id FROM students WHERE id = ? AND active = 1');
  const findGuest = db.prepare('SELECT id FROM trial_guests WHERE id = ?');
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) return next();
    const s = findSession.get(sha256(token)) as { kind: Auth['kind']; subject_id: number; expires_at: number } | undefined;
    if (!s || s.expires_at < Date.now()) return next();
    if (s.kind === 'teacher') {
      const u = findTeacher.get(s.subject_id) as { id: number; role: 'teacher' | 'admin' } | undefined;
      if (u) req.auth = { kind: 'teacher', id: u.id, role: u.role };
    } else if (s.kind === 'student') {
      const st = findStudent.get(s.subject_id) as { id: number; class_id: number } | undefined;
      if (st) req.auth = { kind: 'student', id: st.id, classId: st.class_id };
    } else {
      const g = findGuest.get(s.subject_id) as { id: number } | undefined;
      if (g) req.auth = { kind: 'trial', id: g.id };
    }
    next();
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireTeacher(req: Request): Extract<Auth, { kind: 'teacher' }> {
  if (req.auth?.kind !== 'teacher') throw new HttpError(401, 'Vui lòng đăng nhập Góc giáo viên.');
  return req.auth;
}

export function requireAdmin(req: Request) {
  const a = requireTeacher(req);
  if (a.role !== 'admin') throw new HttpError(403, 'Chỉ người quản trị nội dung mới có quyền này.');
  return a;
}

export function requireLearner(req: Request): Extract<Auth, { kind: 'student' | 'trial' }> {
  const a = req.auth;
  if (a?.kind !== 'student' && a?.kind !== 'trial') throw new HttpError(401, 'Con hãy vào lớp hoặc chọn Học thử nhé.');
  return a;
}

// Mã ngắn, bỏ các ký tự dễ nhầm (0/O, 1/I/L) để trẻ và giáo viên dễ đọc.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateCode(length = 6): string {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[\s-]/g, '');
}

/** Giới hạn số lần thử đăng nhập theo IP để chống dò mã. */
export function rateLimit(maxAttempts: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    h.count++;
    if (h.count > maxAttempts) return next(new HttpError(429, 'Con đã thử nhiều lần quá. Hãy nghỉ một chút rồi thử lại, hoặc nhờ thầy cô giúp nhé.'));
    next();
  };
}
