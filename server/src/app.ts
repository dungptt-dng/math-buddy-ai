import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { authenticate, HttpError } from './auth.js';
import type { DB } from './db.js';
import { learnerRouter } from './routes/learner.js';
import { teacherRouter } from './routes/teacher.js';

export function createApp(db: DB, opts: { staticDir?: string } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', authenticate(db));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api', learnerRouter(db));
  app.use('/api', teacherRouter(db));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Không tìm thấy.')));

  if (opts.staticDir && existsSync(opts.staticDir)) {
    app.use(express.static(opts.staticDir, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(opts.staticDir!, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if ((err as { type?: string }).type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });
    console.error('[error]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Có lỗi xảy ra. Vui lòng thử lại.' });
  });
  return app;
}
