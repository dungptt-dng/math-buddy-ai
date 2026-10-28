import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import BuddyMascot from '../components/BuddyMascot'
import QuestionEditor from '../components/QuestionEditor'
import { ApiError, getTeacherToken, teacher, teacherLogin, teacherLogout, type Overview, type TeacherLesson } from '../services/aiService'
import { clearLocalData } from '../services/storage'
import { SHAPE_VI } from '../utils/validateQuestion'
import type { Question, QuestionStatus, ShapeKey } from '../types'
import { STATIC_MODE } from '../config'

type Tab = 'overview' | 'lessons' | 'questions' | 'students' | 'data'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'lessons', label: 'Bài học' },
  { id: 'questions', label: 'Câu hỏi & AI' },
  { id: 'students', label: 'Học sinh' },
  { id: 'data', label: 'Dữ liệu' },
]

const fmtTime = (ts: number) =>
  ts ? new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await teacherLogin(password)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card grid items-center gap-6 p-6 sm:p-10 md:grid-cols-2">
      <div className="flex justify-center">
        <BuddyMascot size="lg" message="Chào thầy cô! Mời thầy cô đăng nhập Góc giáo viên." />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <h1 className="text-2xl font-black text-deep">Góc giáo viên</h1>
        <label htmlFor="teacher-pass" className="text-sm font-extrabold text-ink/70">
          Mật khẩu giáo viên
        </label>
        <input id="teacher-pass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="text-sm font-bold text-[#C2410C]">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy || !password}>
          {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
        </button>
        <p className="text-xs font-semibold text-ink/55">
          Mật khẩu được kiểm tra ở máy chủ (biến <code>TEACHER_PASSWORD</code> trong file <code>.env</code>), không lưu trong mã giao diện.
        </p>
      </form>
    </section>
  )
}

function StatCard({ label, value, tone = 'bg-primary/15', sub }: { label: string; value: ReactNode; tone?: string; sub?: string }) {
  return (
    <div className={`rounded-3xl p-4 ${tone}`}>
      <div className="text-3xl font-black text-ink">{value}</div>
      <div className="text-sm font-extrabold text-ink/70">{label}</div>
      {sub && <div className="mt-1 text-xs font-semibold text-ink/55">{sub}</div>}
    </div>
  )
}

function DataBadge({ demo }: { demo: boolean }) {
  return demo ? <span className="chip bg-orange/25 text-ink">DỮ LIỆU DEMO</span> : <span className="chip bg-mint/40 text-ink">DỮ LIỆU THẬT</span>
}

function SourceBadge({ q }: { q: Question }) {
  if (q.source === 'ai') return <span className="chip bg-lavender/40 text-ink">AI THẬT{q.model ? ` · ${q.model}` : ''}</span>
  if (q.source === 'teacher') return <span className="chip bg-primary/15 text-deep">Giáo viên soạn</span>
  return <span className="chip bg-sunshine/60 text-ink">NGÂN HÀNG CÓ SẴN</span>
}

const STATUS_LABEL: Record<QuestionStatus, { text: string; cls: string }> = {
  draft: { text: 'Bản nháp – chờ duyệt', cls: 'bg-sunshine/60' },
  approved: { text: 'Đã duyệt', cls: 'bg-mint/50' },
  rejected: { text: 'Đã từ chối', cls: 'bg-orange/25' },
}

function answerText(q: Question) {
  return q.type === 'shape' ? SHAPE_VI[q.answer as ShapeKey] : String(q.answer)
}

function StaticNotice() {
  return (
    <section className="card grid items-center gap-6 p-6 sm:p-10 md:grid-cols-2">
      <div className="flex justify-center">
        <BuddyMascot size="lg" mood="think" message="Góc giáo viên cần máy chủ của lớp học để lưu và quản lý dữ liệu." />
      </div>
      <div className="flex flex-col gap-3 text-[15px] font-semibold text-ink/75">
        <h1 className="text-2xl font-black text-deep">Góc giáo viên</h1>
        <p>
          Đây là <b>bản trực tuyến</b> (GitHub Pages) – chỉ có trang tĩnh, không có máy chủ. Học sinh vẫn chơi đầy đủ 4 trò, kết quả lưu trên
          trình duyệt của từng máy (xem ở trang <b>Tiến độ học tập</b>).
        </p>
        <p>Để dùng Góc giáo viên (thống kê cả lớp, duyệt câu hỏi, xuất CSV), thầy cô chạy bản đầy đủ:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Giải nén gói <b>MathBuddyAI.zip</b> và nháy đúp <code>CHAY-MATH-BUDDY.bat</code>, hoặc
          </li>
          <li>
            Tải mã nguồn, chạy <code>npm install</code> rồi <code>npm run dev</code>.
          </li>
        </ul>
      </div>
    </section>
  )
}

export default function TeacherDashboard() {
  if (STATIC_MODE) return <StaticNotice />
  return <TeacherDashboardInner />
}

function TeacherDashboardInner() {
  const [authed, setAuthed] = useState(() => !!getTeacherToken())
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [lessons, setLessons] = useState<TeacherLesson[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setAuthed(false)
      return
    }
    setError(e instanceof Error ? e.message : 'Có lỗi xảy ra')
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [o, l, q] = await Promise.all([teacher.overview(), teacher.lessons(), teacher.questions()])
      setOverview(o)
      setLessons(l.lessons)
      setQuestions(q.questions)
      setError(null)
    } catch (e) {
      handleError(e)
    }
  }, [handleError])

  useEffect(() => {
    if (authed) void refresh()
  }, [authed, refresh])

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setNotice(null)
    try {
      await fn()
      if (done) setNotice(done)
      await refresh()
    } catch (e) {
      handleError(e)
    }
  }

  if (!authed) return <Login onDone={() => setAuthed(true)} />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BuddyMascot size="xs" />
          <div>
            <h1 className="text-2xl font-black text-deep sm:text-3xl">Góc giáo viên</h1>
            <p className="text-sm font-bold text-ink/60">Theo dõi lớp học, quản lý bài học và duyệt câu hỏi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-soft min-h-[44px] py-2 text-sm" onClick={() => void refresh()}>
            ↻ Làm mới
          </button>
          <button
            type="button"
            className="btn-ghost min-h-[44px] py-2 text-sm"
            onClick={async () => {
              await teacherLogout()
              setAuthed(false)
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Các mục Góc giáo viên">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`btn min-h-[44px] shrink-0 py-2 text-sm ${tab === t.id ? 'bg-deep text-white' : 'bg-bg text-ink hover:bg-primary/10'}`}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {overview?.usingDefaultPassword && (
        <p className="rounded-2xl bg-orange/20 px-4 py-3 text-sm font-bold text-ink">
          ⚠ Máy chủ đang dùng mật khẩu mặc định. Hãy tạo file <code>.env</code> và đặt <code>TEACHER_PASSWORD</code> riêng.
        </p>
      )}
      {error && <p className="rounded-2xl bg-orange/20 px-4 py-3 text-sm font-bold text-[#9A3412]">{error}</p>}
      {notice && <p className="rounded-2xl bg-mint/30 px-4 py-3 text-sm font-bold text-ink">{notice}</p>}

      {!overview ? (
        <div className="card p-8 text-center font-bold text-ink/60">Đang tải dữ liệu…</div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab o={overview} />}
          {tab === 'lessons' && (
            <LessonsTab lessons={lessons} onToggle={(id, enabled) => act(() => teacher.setLesson(id, enabled), enabled ? 'Đã bật chủ đề.' : 'Đã tắt chủ đề.')} />
          )}
          {tab === 'questions' && <QuestionsTab o={overview} lessons={lessons} questions={questions} act={act} />}
          {tab === 'students' && (
            <StudentsTab o={overview} onDelete={(code) => window.confirm(`Xóa toàn bộ dữ liệu của ${code}?`) && act(() => teacher.deleteResults('student', code), `Đã xóa dữ liệu của ${code}.`)} />
          )}
          {tab === 'data' && <DataTab o={overview} act={act} />}
        </>
      )}
    </div>
  )
}

function OverviewTab({ o }: { o: Overview }) {
  const t = o.totals
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lượt trả lời (thật)" value={t.realAnswers} sub={`${t.answersLast24h} lượt trong 24 giờ qua`} />
        <StatCard label="Học sinh có dữ liệu thật" value={t.realStudents} tone="bg-mint/35" sub={t.demoStudents ? `+ ${t.demoStudents} học sinh demo` : undefined} />
        <StatCard
          label="Đúng ngay lần đầu"
          value={t.realAnswers ? `${Math.round((t.correctFirstTry / t.realAnswers) * 100)}%` : '—'}
          tone="bg-sunshine/50"
          sub={`${t.correctFirstTry}/${t.realAnswers} câu`}
        />
        <StatCard label="Số lần cần gợi ý" value={t.hintsUsed} tone="bg-lavender/35" sub="Gồm trả lời sai và bấm Gợi ý" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-black text-ink">Trạng thái AI</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`chip ${o.ai.configured ? 'bg-lavender/50' : 'bg-sunshine/60'} text-ink`}>{o.ai.mode}</span>
            {o.ai.configured && <span className="text-sm font-bold text-ink/60">Mô hình: {o.ai.model}</span>}
          </div>
          <p className="mt-2 text-sm font-semibold text-ink/70">
            {o.ai.configured
              ? 'Đã cấu hình API key ở máy chủ. Câu hỏi AI tạo ra luôn là bản nháp và cần thầy cô duyệt.'
              : 'Chưa có ANTHROPIC_API_KEY trong .env – học sinh dùng NGÂN HÀNG CÓ SẴN và câu hỏi thầy cô tự soạn.'}
          </p>
          {o.ai.recent.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm font-semibold text-ink/70">
              {o.ai.recent.map((r) => (
                <li key={r.ts}>
                  {fmtTime(r.ts)} · {r.ok ? `tạo ${r.created} câu, loại ${r.invalid} câu sai` : `lỗi: ${r.error}`}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-black text-ink">Ngân hàng câu hỏi</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Chờ duyệt" value={t.questionsDraft} tone="bg-sunshine/50" />
            <StatCard label="Đã duyệt" value={t.questionsApproved} tone="bg-mint/35" />
          </div>
          {t.demoAnswers > 0 && (
            <p className="mt-3 text-sm font-bold text-ink/60">
              Có {t.demoAnswers} lượt <DataBadge demo /> (không tính vào số liệu thật ở trên).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LessonsTab({ lessons, onToggle }: { lessons: TeacherLesson[]; onToggle: (id: string, enabled: boolean) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink/65">
        Tên chủ đề mang tính mô tả theo định hướng SGK Toán 1 – Kết nối tri thức với cuộc sống, không phải tên/số thứ tự bài chính thức. Chủ đề đang
        bật sẽ được dùng cho phần “luyện thêm” của Thử thách thông minh.
      </p>
      {lessons.map((l) => (
        <div key={l.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-ink">{l.title}</h3>
            <p className="text-sm font-semibold text-ink/65">{l.skill}</p>
            <p className="text-sm font-semibold text-[#1F9D68]">Tiếng Anh: {l.english}</p>
            <p className="mt-1 text-xs font-bold text-ink/50">
              {l.approved} câu đã duyệt · {l.drafts} câu nháp
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-start sm:self-center">
            <span className="text-sm font-extrabold text-ink/70">{l.enabled ? 'Đang bật' : 'Đang tắt'}</span>
            <input type="checkbox" className="peer sr-only" checked={l.enabled} onChange={(e) => onToggle(l.id, e.target.checked)} />
            <span className="relative h-8 w-14 rounded-full bg-ink/20 transition peer-checked:bg-[#1F9D68] after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-6" />
          </label>
        </div>
      ))}
    </div>
  )
}

function QuestionsTab({
  o,
  lessons,
  questions,
  act,
}: {
  o: Overview
  lessons: TeacherLesson[]
  questions: Question[]
  act: (fn: () => Promise<unknown>, done?: string) => Promise<void>
}) {
  const [genLesson, setGenLesson] = useState(lessons[0]?.id ?? '')
  const [genCount, setGenCount] = useState(4)
  const [generating, setGenerating] = useState(false)
  const [invalid, setInvalid] = useState<{ raw: unknown; errors: string[] }[]>([])
  const [filter, setFilter] = useState<QuestionStatus | 'all'>('draft')
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    setInvalid([])
    await act(async () => {
      const r = await teacher.generate(genLesson, genCount)
      setInvalid(r.invalid)
      setFilter('draft')
    }, 'AI đã tạo câu hỏi nháp. Chương trình đã tự kiểm tra đáp án – thầy cô xem và duyệt bên dưới.')
    setGenerating(false)
  }

  const lessonTitle = (id: string) => lessons.find((l) => l.id === id)?.title ?? id
  const shown = questions.filter((q) => filter === 'all' || q.status === filter)

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-ink">Tạo câu hỏi bằng AI</h2>
          <span className={`chip ${o.ai.configured ? 'bg-lavender/50' : 'bg-sunshine/60'} text-ink`}>{o.ai.mode}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-ink/65">
          Máy chủ chỉ gửi tên chủ đề cho AI (không gửi thông tin học sinh). Kết quả là bản nháp; câu sai phép tính, sai phạm vi hoặc sai schema bị loại tự động.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm font-extrabold text-ink/70">
            Chủ đề
            <select className="input py-2 text-base" value={genLesson} onChange={(e) => setGenLesson(e.target.value)}>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-full flex-col gap-1 text-sm font-extrabold text-ink/70 sm:w-32">
            Số câu
            <input className="input py-2 text-base" type="number" min={1} max={8} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
          </label>
          <button type="button" className="btn-primary" disabled={!o.ai.configured || generating} onClick={generate}>
            {generating ? 'AI đang soạn…' : '✨ Tạo bằng AI'}
          </button>
        </div>
        {!o.ai.configured && (
          <p className="mt-2 text-sm font-bold text-ink/60">Thêm ANTHROPIC_API_KEY vào file .env rồi khởi động lại máy chủ để bật tính năng này.</p>
        )}
        {invalid.length > 0 && (
          <div className="mt-3 rounded-2xl bg-orange/15 p-3 text-sm font-semibold text-ink">
            <b>{invalid.length} câu AI tạo bị loại vì không qua kiểm chứng:</b>
            <ul className="mt-1 list-disc pl-5">
              {invalid.map((x, i) => (
                <li key={i}>{x.errors.join('; ')}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-ink">Thầy cô tự soạn câu hỏi</h2>
          {!creating && (
            <button type="button" className="btn-soft min-h-[44px] py-2 text-sm" onClick={() => setCreating(true)}>
              + Soạn câu mới
            </button>
          )}
        </div>
        {creating && (
          <div className="mt-3">
            <QuestionEditor
              lessons={lessons}
              submitLabel="Lưu bản nháp"
              onCancel={() => setCreating(false)}
              onSubmit={async (q) => {
                await teacher.createQuestion(q)
                setCreating(false)
                setFilter('draft')
                await act(async () => undefined, 'Đã lưu câu hỏi nháp.')
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['draft', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`btn min-h-[40px] py-1.5 text-sm ${filter === f ? 'bg-deep text-white' : 'bg-bg text-ink hover:bg-primary/10'}`}
          >
            {f === 'all' ? 'Tất cả' : STATUS_LABEL[f].text} ({f === 'all' ? questions.length : questions.filter((q) => q.status === f).length})
          </button>
        ))}
      </div>

      {shown.length === 0 && <div className="card p-6 text-center font-bold text-ink/55">Chưa có câu hỏi nào trong mục này.</div>}

      <div className="grid gap-3">
        {shown.map((q) => (
          <div key={q.id} className="card p-5">
            {editing === q.id ? (
              <QuestionEditor
                lessons={lessons}
                initial={q}
                submitLabel="Lưu thay đổi (quay về nháp)"
                onCancel={() => setEditing(null)}
                onSubmit={async (draft) => {
                  await teacher.updateQuestion(q.id, draft)
                  setEditing(null)
                  await act(async () => undefined, 'Đã lưu. Câu hỏi quay về trạng thái nháp để duyệt lại.')
                }}
              />
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceBadge q={q} />
                    <span className={`chip text-ink ${STATUS_LABEL[q.status ?? 'draft'].cls}`}>{STATUS_LABEL[q.status ?? 'draft'].text}</span>
                    <span className="text-xs font-bold text-ink/50">{lessonTitle(q.lessonId)}</span>
                  </div>
                  <p className="mt-2 text-lg font-black text-ink">{q.prompt}</p>
                  <p className="text-sm font-semibold text-ink/65">
                    Phương án: {q.options.map((x) => (q.type === 'shape' ? SHAPE_VI[x as ShapeKey] : x)).join(' · ')} — Đáp án (chương trình tính):{' '}
                    <b className="text-deep">{answerText(q)}</b>
                    {q.englishWord && <> · Tiếng Anh: <b className="text-[#1F9D68]">{q.englishWord}</b></>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {q.status !== 'approved' && (
                    <button type="button" className="btn min-h-[40px] bg-[#1F9D68] py-1.5 text-sm text-white" onClick={() => act(() => teacher.approve(q.id), 'Đã duyệt câu hỏi.')}>
                      Duyệt
                    </button>
                  )}
                  {q.status !== 'rejected' && (
                    <button type="button" className="btn min-h-[40px] bg-orange/30 py-1.5 text-sm text-ink" onClick={() => act(() => teacher.reject(q.id), 'Đã từ chối câu hỏi.')}>
                      Từ chối
                    </button>
                  )}
                  <button type="button" className="btn-soft min-h-[40px] py-1.5 text-sm" onClick={() => setEditing(q.id)}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-ghost min-h-[40px] py-1.5 text-sm"
                    onClick={() => window.confirm('Xóa câu hỏi này?') && act(() => teacher.remove(q.id), 'Đã xóa câu hỏi.')}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StudentsTab({ o, onDelete }: { o: Overview; onDelete: (code: string) => void }) {
  if (!o.students.length)
    return <div className="card p-8 text-center font-bold text-ink/55">Chưa có dữ liệu học sinh. Kết quả sẽ hiện ở đây khi các bé bắt đầu chơi.</div>
  return (
    <div className="card overflow-x-auto p-2">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="text-xs font-black uppercase tracking-wide text-ink/55">
            <th className="p-3">Mã học sinh</th>
            <th className="p-3">Năng lực Toán</th>
            <th className="p-3">Cần gợi ý</th>
            <th className="p-3">Làm quen tiếng Anh</th>
            <th className="p-3">Hoạt động gần nhất</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {o.students.map((s) => (
            <tr key={s.studentCode} className="border-t border-primary/10 align-top">
              <td className="p-3">
                <div className="font-black text-ink">{s.studentCode}</div>
                <DataBadge demo={s.demo} />
              </td>
              <td className="p-3 font-semibold text-ink/80">
                <div className="font-black text-ink">{s.mathAccuracy === null ? '—' : `${s.mathAccuracy}%`}</div>
                đúng ngay {s.correctFirstTry}/{s.answered} câu
              </td>
              <td className="p-3 font-black text-ink">{s.hintsUsed} lần</td>
              <td className="p-3 font-semibold text-ink/80">
                <div className="font-black text-ink">{s.englishWords.length} từ · nghe lại {s.listens} lần</div>
                <div className="max-w-[240px] text-xs text-ink/60">{s.englishWords.join(', ') || '—'}</div>
              </td>
              <td className="p-3 font-semibold text-ink/70">{fmtTime(s.lastActive)}</td>
              <td className="p-3">
                <button type="button" className="btn-ghost min-h-[36px] px-2 py-1 text-xs" onClick={() => onDelete(s.studentCode)}>
                  Xóa dữ liệu
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DataTab({ o, act }: { o: Overview; act: (fn: () => Promise<unknown>, done?: string) => Promise<void> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <h2 className="text-lg font-black text-ink">Xuất dữ liệu</h2>
        <p className="mt-1 text-sm font-semibold text-ink/65">File CSV (mở được bằng Excel) gồm mọi lượt trả lời, có cột phân biệt DỮ LIỆU THẬT / DỮ LIỆU DEMO.</p>
        <button type="button" className="btn-primary mt-3" onClick={() => act(() => teacher.exportCsv())}>
          ⬇ Xuất CSV
        </button>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-black text-ink">Dữ liệu demo</h2>
        <p className="mt-1 text-sm font-semibold text-ink/65">
          Tạo 3 học sinh mẫu (HS-901…903) để xem thử bảng thống kê. Dữ liệu demo luôn được gắn nhãn và không tính vào số liệu thật.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-soft" onClick={() => act(() => teacher.loadDemo(), 'Đã tạo dữ liệu demo.')}>
            Tạo dữ liệu demo
          </button>
          <button type="button" className="btn-ghost" disabled={!o.totals.demoAnswers} onClick={() => act(() => teacher.deleteResults('demo'), 'Đã xóa dữ liệu demo.')}>
            Xóa dữ liệu demo
          </button>
        </div>
      </div>
      <div className="card p-5 md:col-span-2">
        <h2 className="text-lg font-black text-[#9A3412]">Xóa dữ liệu</h2>
        <p className="mt-1 text-sm font-semibold text-ink/65">Thao tác không thể hoàn tác. Nên xuất CSV trước khi xóa.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn bg-orange/30 text-ink"
            onClick={() => window.confirm('Xóa TOÀN BỘ kết quả học tập trên máy chủ?') && act(() => teacher.deleteResults('all'), 'Đã xóa toàn bộ kết quả trên máy chủ.')}
          >
            Xóa toàn bộ kết quả trên máy chủ
          </button>
          <button
            type="button"
            className="btn-soft"
            onClick={() => {
              if (window.confirm('Xóa kết quả đang lưu trên trình duyệt của thiết bị này?')) {
                clearLocalData()
                void act(async () => undefined, 'Đã xóa dữ liệu lưu trên thiết bị này.')
              }
            }}
          >
            Xóa dữ liệu trên thiết bị này
          </button>
        </div>
      </div>
    </div>
  )
}
