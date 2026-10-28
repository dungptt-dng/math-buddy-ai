// Giao tiếp với API máy chủ. Trình duyệt KHÔNG bao giờ giữ API key AI:
// mọi lệnh gọi AI đều đi qua /api/teacher/generate ở máy chủ.
import type { Lesson, Question } from '../types'

export interface Health {
  ok: boolean
  aiMode: 'AI THẬT' | 'NGÂN HÀNG CÓ SẴN'
  aiConfigured: boolean
  model: string | null
}

export interface StudentStat {
  studentCode: string
  demo: boolean
  answered: number
  correctFirstTry: number
  hintsUsed: number
  englishWords: string[]
  listens: number
  lastActive: number
  mathAccuracy: number | null
  byActivity: Record<string, { answered: number; correctFirstTry: number }>
}

export interface Overview {
  totals: {
    realAnswers: number
    demoAnswers: number
    realStudents: number
    demoStudents: number
    answersLast24h: number
    correctFirstTry: number
    hintsUsed: number
    questionsDraft: number
    questionsApproved: number
  }
  students: StudentStat[]
  ai: {
    mode: string
    configured: boolean
    model: string
    recent: { ts: number; ok: boolean; lessonId: string; created?: number; invalid?: number; error?: string }[]
  }
  usingDefaultPassword: boolean
}

export interface TeacherLesson extends Lesson {
  enabled: boolean
  approved: number
  drafts: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: string[] = [],
  ) {
    super(message)
  }
}

const TOKEN_KEY = 'mathBuddy.teacherToken'
export const getTeacherToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
const setTeacherToken = (t: string | null) => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* bỏ qua */
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getTeacherToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } })
  } catch {
    throw new ApiError('Không kết nối được máy chủ Math Buddy. Hãy chạy "npm run dev".', 0)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && auth) setTeacherToken(null)
    throw new ApiError(body.error || `Lỗi ${res.status}`, res.status, body.errors || [])
  }
  return body as T
}

export const getHealth = () => request<Health>('/api/health')

export const getApprovedQuestions = () =>
  request<{ enabledLessons: string[]; questions: Question[] }>('/api/questions/approved')

export async function teacherLogin(password: string) {
  const r = await request<{ token: string; usingDefaultPassword: boolean }>('/api/teacher/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setTeacherToken(r.token)
  return r
}

export async function teacherLogout() {
  await request('/api/teacher/logout', { method: 'POST' }, true).catch(() => undefined)
  setTeacherToken(null)
}

export const teacher = {
  overview: () => request<Overview>('/api/teacher/overview', {}, true),
  lessons: () => request<{ lessons: TeacherLesson[] }>('/api/teacher/lessons', {}, true),
  setLesson: (id: string, enabled: boolean) =>
    request(`/api/teacher/lessons/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }, true),
  questions: () => request<{ questions: Question[] }>('/api/teacher/questions', {}, true),
  createQuestion: (q: Partial<Question>) =>
    request<{ question: Question }>('/api/teacher/questions', { method: 'POST', body: JSON.stringify(q) }, true),
  updateQuestion: (id: string, q: Partial<Question>) =>
    request<{ question: Question }>(`/api/teacher/questions/${id}`, { method: 'PUT', body: JSON.stringify(q) }, true),
  approve: (id: string) => request(`/api/teacher/questions/${id}/approve`, { method: 'POST' }, true),
  reject: (id: string) => request(`/api/teacher/questions/${id}/reject`, { method: 'POST' }, true),
  remove: (id: string) => request(`/api/teacher/questions/${id}`, { method: 'DELETE' }, true),
  generate: (lessonId: string, count: number) =>
    request<{ created: Question[]; invalid: { raw: unknown; errors: string[] }[] }>(
      '/api/teacher/generate',
      { method: 'POST', body: JSON.stringify({ lessonId, count }) },
      true,
    ),
  loadDemo: () => request('/api/teacher/demo', { method: 'POST' }, true),
  deleteResults: (scope: 'demo' | 'all' | 'student', code?: string) =>
    request<{ deleted: number }>(
      `/api/teacher/results?scope=${scope}${code ? `&code=${encodeURIComponent(code)}` : ''}`,
      { method: 'DELETE' },
      true,
    ),
  async exportCsv() {
    const token = getTeacherToken()
    const res = await fetch('/api/teacher/export.csv', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new ApiError('Không xuất được CSV', res.status)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `math-buddy-ket-qua-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
