// Lưu kết quả học tập trên thiết bị (localStorage) và đồng bộ lên máy chủ.
// Chỉ lưu MÃ học sinh (ví dụ HS-012), không lưu tên thật, ảnh hay giọng nói.
import type { ActivityId, AnswerRecord, LearningRecord, ListenRecord, RoundRecord } from '../types'
import { STATIC_MODE } from '../config'

const KEYS = {
  student: 'mathBuddy.studentCode',
  records: 'mathBuddy.records',
  rounds: 'mathBuddy.rounds',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn cho chơi, chỉ không lưu được trên máy.
  }
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const STUDENT_CODE_PATTERN = /^HS-\d{3}$/

export function normalizeStudentCode(input: string): string {
  const s = input.trim().toUpperCase().replace(/\s+/g, '')
  const digits = s.replace(/^HS-?/, '')
  return /^\d{1,3}$/.test(digits) ? `HS-${digits.padStart(3, '0')}` : s
}

export const isValidStudentCode = (code: string) => STUDENT_CODE_PATTERN.test(code)

export function getStudentCode(): string | null {
  const code = read<string | null>(KEYS.student, null)
  return code && isValidStudentCode(code) ? code : null
}

export function setStudentCode(code: string) {
  write(KEYS.student, code)
  window.dispatchEvent(new Event('mathbuddy:student'))
}

export function clearStudentCode() {
  try {
    localStorage.removeItem(KEYS.student)
  } catch {
    /* bỏ qua */
  }
  window.dispatchEvent(new Event('mathbuddy:student'))
}

export function getRecords(code?: string): LearningRecord[] {
  const all = read<LearningRecord[]>(KEYS.records, [])
  return code ? all.filter((r) => r.studentCode === code) : all
}

export function getRounds(code?: string): RoundRecord[] {
  const all = read<RoundRecord[]>(KEYS.rounds, [])
  return code ? all.filter((r) => r.studentCode === code) : all
}

function saveRecord(r: LearningRecord) {
  const all = read<LearningRecord[]>(KEYS.records, [])
  all.push(r)
  write(KEYS.records, all.slice(-2000))
  void syncPending()
}

export function recordAnswer(data: Omit<AnswerRecord, 'id' | 'kind' | 'ts' | 'synced'>) {
  saveRecord({ ...data, id: newId('r'), kind: 'answer', ts: Date.now(), synced: false })
}

export function recordListen(studentCode: string | null, englishWord: string) {
  if (!studentCode) return
  const r: ListenRecord = { id: newId('l'), kind: 'listen', studentCode, englishWord, ts: Date.now(), synced: false }
  saveRecord(r)
}

export function saveRound(data: Omit<RoundRecord, 'id' | 'ts'>): RoundRecord {
  const round = { ...data, id: newId('round'), ts: Date.now() }
  const all = read<RoundRecord[]>(KEYS.rounds, [])
  all.push(round)
  write(KEYS.rounds, all.slice(-500))
  return round
}

let syncing = false
/** Gửi các kết quả chưa đồng bộ lên máy chủ; lỗi mạng thì giữ lại để gửi sau. */
export async function syncPending(): Promise<void> {
  if (syncing || STATIC_MODE) return
  const pending = getRecords().filter((r) => !r.synced)
  if (!pending.length) return
  syncing = true
  try {
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pending }),
    })
    if (res.ok) {
      const ids = new Set(pending.map((r) => r.id))
      write(
        KEYS.records,
        getRecords().map((r) => (ids.has(r.id) ? { ...r, synced: true } : r)),
      )
    }
  } catch {
    /* máy chủ chưa sẵn sàng – thử lại lần sau */
  } finally {
    syncing = false
  }
}

export function clearLocalData(code?: string) {
  if (!code) {
    write(KEYS.records, [])
    write(KEYS.rounds, [])
    return
  }
  write(KEYS.records, getRecords().filter((r) => r.studentCode !== code))
  write(KEYS.rounds, getRounds().filter((r) => r.studentCode !== code))
}

export const ACTIVITY_LABELS: Record<ActivityId, string> = {
  'magic-numbers': 'Bé đếm cùng Buddy',
  'math-garden': 'Khu vườn phép tính',
  'shape-hunt': 'Thợ săn hình học',
  'buddy-challenge': 'Thử thách thông minh',
}
