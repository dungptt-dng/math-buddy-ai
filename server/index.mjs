// Máy chủ độc lập cho bản build: phục vụ thư mục dist/ và API.
// Dùng: npm run build && npm run start
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiHandler } from './api.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(here, '..', 'dist')
const api = createApiHandler()
const port = Number(process.env.PORT) || 8787

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

function serveStatic(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  let file = path.join(DIST, decodeURIComponent(url.pathname))
  if (!file.startsWith(DIST)) {
    res.statusCode = 403
    return res.end()
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  if (!fs.existsSync(file)) {
    res.statusCode = 500
    return res.end('Chưa có thư mục dist/. Hãy chạy: npm run build')
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
}

http
  .createServer((req, res) => api(req, res, () => serveStatic(req, res)))
  .listen(port, () => console.log(`Math Buddy AI đang chạy tại http://localhost:${port}`))
