import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDb } from './db.js';
import { cleanup, seedIfEmpty } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
try {
  process.loadEnvFile(join(root, '.env'));
} catch {
  // Không có .env: dùng giá trị mặc định / biến môi trường hệ thống.
}

const dbPath = resolve(root, process.env.DB_PATH || 'server/data/math-buddy.db');
const db = openDb(dbPath);
if (seedIfEmpty(db)) console.log('Đã tạo tài khoản mẫu (xem README).');
cleanup(db);
setInterval(() => cleanup(db), 3600_000).unref();

// Dùng API_PORT riêng (không dùng PORT) để không tranh cổng với máy chủ giao diện Vite khi chạy dev.
const port = Number(process.env.API_PORT || 4000);
const app = createApp(db, { staticDir: join(root, 'client', 'dist') });
app.listen(port, () => {
  console.log(`Math Buddy AI API: http://localhost:${port}`);
  console.log(process.env.ANTHROPIC_API_KEY ? 'Tóm tắt AI: BẬT' : 'Tóm tắt AI: TẮT (chưa cấu hình ANTHROPIC_API_KEY) – phân tích theo quy tắc vẫn hoạt động.');
});
