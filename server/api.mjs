// API phía máy chủ của Math Buddy AI.
// - Giữ API key AI và mật khẩu giáo viên ở máy chủ (đọc từ .env).
// - Lưu kết quả học tập, câu hỏi và cài đặt bài học vào server/data/db.json.
// - Được gắn vào Vite dev server (vite.config.ts) hoặc chạy độc lập (server/index.mjs).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { validateQuestion, QUESTION_TYPES } from '../shared/validateQuestion.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '..')
const DATA_DIR = path.join(here, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const DEFAULT_PASSWORD = 'doi-mat-khau-nay'
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000
const STUDENT_CODE = /^HS-\d{3}$/
const ACTIVITIES = ['magic-numbers', 'math-garden', 'shape-hunt', 'buddy-challenge']

function loadEnv() {
  const file = path.join(ROOT, '.env')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    const value = m[2].replace(/^['"]|['"]$/g, '')
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}

const LESSONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/lessons.json'), 'utf8')).lessons
const LESSON_IDS = LESSONS.map((l) => l.id)

function emptyDb() {
  return {
    results: [],
    questions: [],
    lessonSettings: Object.fromEntries(LESSON_IDS.map((id) => [id, { enabled: true }])),
    aiLog: [],
  }
}

function loadDb() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    const base = emptyDb()
    return { ...base, ...db, lessonSettings: { ...base.lessonSettings, ...(db.lessonSettings || {}) } }
  } catch {
    return emptyDb()
  }
}

function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_FILE)
}

function send(res, status, body, headers = {}) {
  const isText = typeof body === 'string'
  res.statusCode = status
  res.setHeader('Content-Type', isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.end(isText ? body : JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1_000_000) {
        reject(new Error('Dữ liệu gửi lên quá lớn'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('JSON không hợp lệ'))
      }
    })
    req.on('error', reject)
  })
}

const id = (prefix) => `${prefix}-${crypto.randomBytes(5).toString('hex')}`
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest()

function csvCell(v) {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ---------------- Thống kê ----------------
function buildOverview(db) {
  const answers = db.results.filter((r) => r.kind === 'answer')
  const listens = db.results.filter((r) => r.kind === 'listen')
  const students = new Map()
  const get = (code, demo) => {
    if (!students.has(code)) {
      students.set(code, {
        studentCode: code,
        demo: !!demo,
        answered: 0,
        correctFirstTry: 0,
        hintsUsed: 0,
        englishWords: new Set(),
        listens: 0,
        lastActive: 0,
        byActivity: Object.fromEntries(ACTIVITIES.map((a) => [a, { answered: 0, correctFirstTry: 0 }])),
      })
    }
    return students.get(code)
  }
  for (const r of answers) {
    const s = get(r.studentCode, r.demo)
    s.answered++
    if (r.correctFirstTry) s.correctFirstTry++
    s.hintsUsed += r.hintsUsed || 0
    if (r.englishWord) s.englishWords.add(r.englishWord)
    s.lastActive = Math.max(s.lastActive, r.ts)
    if (s.byActivity[r.activity]) {
      s.byActivity[r.activity].answered++
      if (r.correctFirstTry) s.byActivity[r.activity].correctFirstTry++
    }
  }
  for (const r of listens) {
    const s = get(r.studentCode, r.demo)
    s.listens++
    if (r.englishWord) s.englishWords.add(r.englishWord)
    s.lastActive = Math.max(s.lastActive, r.ts)
  }
  const list = [...students.values()]
    .map((s) => ({
      ...s,
      englishWords: [...s.englishWords].sort(),
      mathAccuracy: s.answered ? Math.round((s.correctFirstTry / s.answered) * 100) : null,
    }))
    .sort((a, b) => b.lastActive - a.lastActive)

  const realAnswers = answers.filter((r) => !r.demo)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  return {
    totals: {
      realAnswers: realAnswers.length,
      demoAnswers: answers.length - realAnswers.length,
      realStudents: list.filter((s) => !s.demo).length,
      demoStudents: list.filter((s) => s.demo).length,
      answersLast24h: realAnswers.filter((r) => r.ts >= dayAgo).length,
      correctFirstTry: realAnswers.filter((r) => r.correctFirstTry).length,
      hintsUsed: realAnswers.reduce((n, r) => n + (r.hintsUsed || 0), 0),
      questionsDraft: db.questions.filter((q) => q.status === 'draft').length,
      questionsApproved: db.questions.filter((q) => q.status === 'approved').length,
    },
    students: list,
  }
}

function makeDemoResults() {
  const out = []
  const now = Date.now()
  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'circle', 'square', 'triangle']
  for (const code of ['HS-901', 'HS-902', 'HS-903']) {
    for (let i = 0; i < 12; i++) {
      const activity = ACTIVITIES[i % ACTIVITIES.length]
      const firstTry = Math.random() > 0.3
      out.push({
        id: id('r'),
        kind: 'answer',
        demo: true,
        studentCode: code,
        activity,
        lessonId: LESSON_IDS[i % LESSON_IDS.length],
        questionId: `demo-${i}`,
        correctFirstTry: firstTry,
        attempts: firstTry ? 1 : 2,
        hintsUsed: firstTry ? 0 : 1,
        englishWord: words[(i * 3) % words.length],
        ts: now - (i + 1) * 3_600_000,
      })
    }
  }
  return out
}

// ---------------- AI sinh câu hỏi ----------------
const AI_SYSTEM = `Bạn hỗ trợ giáo viên Việt Nam soạn câu hỏi luyện tập Toán lớp 1 (định hướng SGK Toán 1 – Kết nối tri thức với cuộc sống).
Chỉ trả về MỘT mảng JSON, không kèm giải thích. Mỗi phần tử có dạng:
{"type": "count"|"add"|"sub"|"shape"|"compare", "prompt": "câu hỏi tiếng Việt ngắn gọn cho trẻ 6–7 tuổi", "options": [2–3 phương án], "answer": đáp án,
 "count": số (với count), "a": số, "b": số (với add/sub/compare), "item": "apple"|"star"|"fish"|"flower"|"balloon",
 "shape": "square"|"circle"|"triangle"|"rectangle" và "mode": "name"|"find" (với shape)}
Quy tắc: mọi số là số nguyên 0–10; tổng phép cộng không quá 10; phép trừ không âm; options của shape là các khóa hình ở trên; options của compare là "<", ">", "=".
Không dùng tên riêng, không nhắc tới học sinh cụ thể, không tự đặt tên bài hoặc số thứ tự bài trong sách giáo khoa.`

function extractJsonArray(text) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end <= start) throw new Error('AI không trả về mảng JSON')
  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!Array.isArray(parsed)) throw new Error('AI không trả về mảng JSON')
  return parsed
}

async function generateWithAi(lesson, count) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.AI_MODEL || 'claude-opus-5-5'
  // Chỉ gửi thông tin chủ đề bài học – KHÔNG gửi tên, ảnh hay giọng nói của học sinh.
  const userPrompt = `Hãy soạn ${count} câu hỏi cho chủ đề "${lesson.title}" (${lesson.skill}).
Chỉ dùng loại câu hỏi: ${lesson.types.join(', ')}. Câu hỏi đa dạng, không trùng nhau.`
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: AI_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })
  if (response.stop_reason === 'refusal') throw new Error('Mô hình AI từ chối yêu cầu này')
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { items: extractJsonArray(text), model: response.model }
}

function describeAiError(error) {
  if (error instanceof Anthropic.AuthenticationError) return 'API key không hợp lệ'
  if (error instanceof Anthropic.RateLimitError) return 'AI đang quá tải, thử lại sau ít phút'
  if (error instanceof Anthropic.BadRequestError) return `Yêu cầu AI không hợp lệ: ${error.message}`
  if (error instanceof Anthropic.APIConnectionError) return 'Không kết nối được tới máy chủ AI'
  if (error instanceof Anthropic.APIError) return `Lỗi AI ${error.status}: ${error.message}`
  return error instanceof Error ? error.message : String(error)
}

// ---------------- Router ----------------
export function createApiHandler() {
  loadEnv()
  const tokens = new Map() // token -> hết hạn
  const failedLogins = new Map() // ip -> { count, until }

  const teacherPassword = () => process.env.TEACHER_PASSWORD || DEFAULT_PASSWORD
  const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY)

  function isTeacher(req) {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const exp = tokens.get(token)
    if (!exp) return false
    if (exp < Date.now()) {
      tokens.delete(token)
      return false
    }
    return true
  }

  return async function handler(req, res, next) {
    const url = new URL(req.url || '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return next ? next() : send(res, 404, { error: 'Không tìm thấy' })
    const p = url.pathname
    const method = req.method || 'GET'

    try {
      // ---- Công khai ----
      if (p === '/api/health' && method === 'GET') {
        const db = loadDb()
        const last = db.aiLog[db.aiLog.length - 1]
        return send(res, 200, {
          ok: true,
          aiMode: aiConfigured() ? 'AI THẬT' : 'NGÂN HÀNG CÓ SẴN',
          aiConfigured: aiConfigured(),
          model: aiConfigured() ? process.env.AI_MODEL || 'claude-opus-5-5' : null,
          lastAiCall: last || null,
        })
      }

      if (p === '/api/results' && method === 'POST') {
        const body = await readBody(req)
        const items = Array.isArray(body.items) ? body.items : [body]
        const db = loadDb()
        let saved = 0
        for (const r of items.slice(0, 200)) {
          const code = String(r.studentCode || '').toUpperCase()
          if (!STUDENT_CODE.test(code)) continue
          if (r.kind !== 'answer' && r.kind !== 'listen') continue
          if (r.kind === 'answer' && !ACTIVITIES.includes(r.activity)) continue
          if (db.results.some((x) => x.id === r.id)) {
            saved++
            continue
          }
          db.results.push({
            id: typeof r.id === 'string' ? r.id.slice(0, 40) : id('r'),
            kind: r.kind,
            demo: false,
            studentCode: code,
            activity: r.activity,
            lessonId: LESSON_IDS.includes(r.lessonId) ? r.lessonId : undefined,
            questionId: String(r.questionId || '').slice(0, 60),
            correctFirstTry: !!r.correctFirstTry,
            attempts: Math.max(0, Math.min(10, Number(r.attempts) || 0)),
            hintsUsed: Math.max(0, Math.min(20, Number(r.hintsUsed) || 0)),
            englishWord: typeof r.englishWord === 'string' ? r.englishWord.slice(0, 40) : undefined,
            ts: Number(r.ts) || Date.now(),
          })
          saved++
        }
        saveDb(db)
        return send(res, 200, { saved })
      }

      if (p === '/api/questions/approved' && method === 'GET') {
        const db = loadDb()
        const enabled = LESSON_IDS.filter((lid) => db.lessonSettings[lid]?.enabled !== false)
        const questions = db.questions.filter((q) => q.status === 'approved' && enabled.includes(q.lessonId))
        return send(res, 200, { enabledLessons: enabled, questions })
      }

      if (p === '/api/teacher/login' && method === 'POST') {
        const ip = req.socket?.remoteAddress || 'local'
        const f = failedLogins.get(ip)
        if (f && f.count >= 5 && f.until > Date.now()) {
          return send(res, 429, { error: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút.' })
        }
        const body = await readBody(req)
        const ok = crypto.timingSafeEqual(sha(body.password || ''), sha(teacherPassword()))
        if (!ok) {
          const cur = f && f.until > Date.now() ? f.count + 1 : 1
          failedLogins.set(ip, { count: cur, until: Date.now() + 5 * 60 * 1000 })
          return send(res, 401, { error: 'Mật khẩu chưa đúng' })
        }
        failedLogins.delete(ip)
        const token = crypto.randomBytes(24).toString('hex')
        tokens.set(token, Date.now() + TOKEN_TTL_MS)
        return send(res, 200, { token, expiresInMs: TOKEN_TTL_MS, usingDefaultPassword: !process.env.TEACHER_PASSWORD })
      }

      // ---- Góc giáo viên (cần đăng nhập) ----
      if (p.startsWith('/api/teacher/')) {
        if (!isTeacher(req)) return send(res, 401, { error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' })

        if (p === '/api/teacher/logout' && method === 'POST') {
          tokens.delete((req.headers.authorization || '').slice(7))
          return send(res, 200, { ok: true })
        }

        if (p === '/api/teacher/overview' && method === 'GET') {
          const db = loadDb()
          return send(res, 200, {
            ...buildOverview(db),
            ai: {
              mode: aiConfigured() ? 'AI THẬT' : 'NGÂN HÀNG CÓ SẴN',
              configured: aiConfigured(),
              model: process.env.AI_MODEL || 'claude-opus-5-5',
              recent: db.aiLog.slice(-5).reverse(),
            },
            usingDefaultPassword: !process.env.TEACHER_PASSWORD,
          })
        }

        if (p === '/api/teacher/lessons' && method === 'GET') {
          const db = loadDb()
          return send(res, 200, {
            lessons: LESSONS.map((l) => ({
              ...l,
              enabled: db.lessonSettings[l.id]?.enabled !== false,
              approved: db.questions.filter((q) => q.lessonId === l.id && q.status === 'approved').length,
              drafts: db.questions.filter((q) => q.lessonId === l.id && q.status === 'draft').length,
            })),
          })
        }

        const lessonMatch = p.match(/^\/api\/teacher\/lessons\/([\w-]+)$/)
        if (lessonMatch && method === 'PUT') {
          if (!LESSON_IDS.includes(lessonMatch[1])) return send(res, 404, { error: 'Không có chủ đề này' })
          const body = await readBody(req)
          const db = loadDb()
          db.lessonSettings[lessonMatch[1]] = { enabled: !!body.enabled }
          saveDb(db)
          return send(res, 200, { ok: true })
        }

        if (p === '/api/teacher/questions' && method === 'GET') {
          const db = loadDb()
          return send(res, 200, { questions: [...db.questions].sort((a, b) => b.createdAt - a.createdAt) })
        }

        if (p === '/api/teacher/questions' && method === 'POST') {
          const body = await readBody(req)
          const check = validateQuestion(body, LESSON_IDS)
          if (!check.ok) return send(res, 422, { error: 'Câu hỏi chưa hợp lệ', errors: check.errors })
          const db = loadDb()
          const q = { ...check.question, id: id('q'), source: 'teacher', status: 'draft', createdAt: Date.now() }
          db.questions.push(q)
          saveDb(db)
          return send(res, 201, { question: q })
        }

        const qMatch = p.match(/^\/api\/teacher\/questions\/([\w-]+)(?:\/(approve|reject))?$/)
        if (qMatch) {
          const db = loadDb()
          const idx = db.questions.findIndex((q) => q.id === qMatch[1])
          if (idx === -1) return send(res, 404, { error: 'Không tìm thấy câu hỏi' })
          const current = db.questions[idx]

          if (qMatch[2] === 'approve' && method === 'POST') {
            const check = validateQuestion(current, LESSON_IDS)
            if (!check.ok) return send(res, 422, { error: 'Không thể duyệt câu hỏi sai', errors: check.errors })
            db.questions[idx] = { ...current, ...check.question, id: current.id, status: 'approved', reviewedAt: Date.now() }
            saveDb(db)
            return send(res, 200, { question: db.questions[idx] })
          }
          if (qMatch[2] === 'reject' && method === 'POST') {
            db.questions[idx] = { ...current, status: 'rejected', reviewedAt: Date.now() }
            saveDb(db)
            return send(res, 200, { question: db.questions[idx] })
          }
          if (!qMatch[2] && method === 'PUT') {
            const body = await readBody(req)
            const check = validateQuestion({ ...body, lessonId: body.lessonId || current.lessonId }, LESSON_IDS)
            if (!check.ok) return send(res, 422, { error: 'Câu hỏi chưa hợp lệ', errors: check.errors })
            // Sửa xong luôn quay về trạng thái nháp để giáo viên duyệt lại.
            db.questions[idx] = {
              ...check.question,
              id: current.id,
              source: current.source,
              createdAt: current.createdAt,
              status: 'draft',
              editedAt: Date.now(),
            }
            saveDb(db)
            return send(res, 200, { question: db.questions[idx] })
          }
          if (!qMatch[2] && method === 'DELETE') {
            db.questions.splice(idx, 1)
            saveDb(db)
            return send(res, 200, { ok: true })
          }
        }

        if (p === '/api/teacher/generate' && method === 'POST') {
          if (!aiConfigured()) {
            return send(res, 400, {
              error: 'Chưa cấu hình ANTHROPIC_API_KEY trong file .env. Ứng dụng đang dùng NGÂN HÀNG CÓ SẴN.',
            })
          }
          const body = await readBody(req)
          const lesson = LESSONS.find((l) => l.id === body.lessonId)
          if (!lesson) return send(res, 400, { error: 'Chọn chủ đề bài học hợp lệ' })
          const count = Math.max(1, Math.min(8, Number(body.count) || 4))
          const db = loadDb()
          try {
            const { items, model } = await generateWithAi(lesson, count)
            const created = []
            const invalid = []
            for (const raw of items.slice(0, count)) {
              const candidate = { ...raw, lessonId: lesson.id }
              if (!lesson.types.includes(candidate.type) || !QUESTION_TYPES.includes(candidate.type)) {
                invalid.push({ raw, errors: [`Loại câu hỏi ${candidate.type} không thuộc chủ đề này`] })
                continue
              }
              const check = validateQuestion(candidate, LESSON_IDS)
              if (!check.ok) {
                invalid.push({ raw, errors: check.errors })
                continue
              }
              const q = { ...check.question, id: id('q'), source: 'ai', status: 'draft', createdAt: Date.now(), model }
              db.questions.push(q)
              created.push(q)
            }
            db.aiLog.push({ ts: Date.now(), ok: true, lessonId: lesson.id, created: created.length, invalid: invalid.length, model })
            db.aiLog = db.aiLog.slice(-50)
            saveDb(db)
            return send(res, 200, { created, invalid })
          } catch (error) {
            const message = describeAiError(error)
            db.aiLog.push({ ts: Date.now(), ok: false, lessonId: lesson.id, error: message })
            db.aiLog = db.aiLog.slice(-50)
            saveDb(db)
            return send(res, 502, { error: message })
          }
        }

        if (p === '/api/teacher/export.csv' && method === 'GET') {
          const db = loadDb()
          const header = ['ma_hoc_sinh', 'loai', 'hoat_dong', 'chu_de', 'ma_cau_hoi', 'dung_lan_dau', 'so_lan_thu', 'so_lan_goi_y', 'tu_tieng_anh', 'thoi_gian', 'du_lieu']
          const rows = db.results.map((r) => [
            r.studentCode,
            r.kind,
            r.activity,
            r.lessonId,
            r.questionId,
            r.kind === 'answer' ? (r.correctFirstTry ? 1 : 0) : '',
            r.attempts,
            r.hintsUsed,
            r.englishWord,
            new Date(r.ts).toISOString(),
            r.demo ? 'DỮ LIỆU DEMO' : 'DỮ LIỆU THẬT',
          ])
          const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
          return send(res, 200, csv, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="math-buddy-ket-qua.csv"',
          })
        }

        if (p === '/api/teacher/demo' && method === 'POST') {
          const db = loadDb()
          db.results = db.results.filter((r) => !r.demo).concat(makeDemoResults())
          saveDb(db)
          return send(res, 200, { ok: true })
        }

        if (p === '/api/teacher/results' && method === 'DELETE') {
          const scope = url.searchParams.get('scope')
          const code = (url.searchParams.get('code') || '').toUpperCase()
          const db = loadDb()
          const before = db.results.length
          if (scope === 'demo') db.results = db.results.filter((r) => !r.demo)
          else if (scope === 'student' && STUDENT_CODE.test(code)) db.results = db.results.filter((r) => r.studentCode !== code)
          else if (scope === 'all') db.results = []
          else return send(res, 400, { error: 'Phạm vi xóa không hợp lệ' })
          saveDb(db)
          return send(res, 200, { deleted: before - db.results.length })
        }
      }

      return send(res, 404, { error: 'Không tìm thấy API' })
    } catch (error) {
      return send(res, 400, { error: error instanceof Error ? error.message : 'Lỗi không xác định' })
    }
  }
}
