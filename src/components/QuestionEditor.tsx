import { useMemo, useState } from 'react'
import type { ItemKey, Lesson, Question, QuestionType, ShapeKey } from '../types'
import { computeAnswer, ITEM_VI, ITEMS, SHAPE_VI, SHAPES, validateQuestion } from '../utils/validateQuestion'

const TYPE_LABEL: Record<QuestionType, string> = {
  count: 'Đếm số lượng',
  add: 'Phép cộng',
  sub: 'Phép trừ',
  shape: 'Nhận biết hình',
  compare: 'So sánh số',
}

interface Props {
  lessons: Lesson[]
  initial?: Partial<Question>
  submitLabel: string
  onSubmit: (q: Partial<Question>) => Promise<void>
  onCancel?: () => void
}

/** Soạn/sửa câu hỏi. Đáp án KHÔNG nhập tay – chương trình tự tính và kiểm tra trực tiếp. */
export default function QuestionEditor({ lessons, initial, submitLabel, onSubmit, onCancel }: Props) {
  const [lessonId, setLessonId] = useState(initial?.lessonId ?? lessons[0]?.id ?? '')
  const lesson = lessons.find((l) => l.id === lessonId)
  const [type, setType] = useState<QuestionType>(initial?.type ?? lesson?.types[0] ?? 'count')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [a, setA] = useState(String(initial?.a ?? 2))
  const [b, setB] = useState(String(initial?.b ?? 1))
  const [count, setCount] = useState(String(initial?.count ?? 3))
  const [item, setItem] = useState<ItemKey>(initial?.item ?? 'apple')
  const [shape, setShape] = useState<ShapeKey>(initial?.shape ?? 'circle')
  const [mode, setMode] = useState<'name' | 'find'>(initial?.mode ?? 'name')
  const [options, setOptions] = useState((initial?.options ?? []).join(', '))
  const [busy, setBusy] = useState(false)
  const [serverErrors, setServerErrors] = useState<string[]>([])

  const draft = useMemo<Partial<Question>>(() => {
    const opts = options
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (type === 'shape' || type === 'compare' ? s : Number(s)))
    const q: Partial<Question> = { lessonId, type, prompt, options: opts }
    if (type === 'count') Object.assign(q, { count: Number(count), item })
    if (type === 'add' || type === 'sub' || type === 'compare') Object.assign(q, { a: Number(a), b: Number(b), item })
    if (type === 'shape') Object.assign(q, { shape, mode })
    return q
  }, [lessonId, type, prompt, a, b, count, item, shape, mode, options])

  const check = validateQuestion(draft)
  const answer = computeAnswer(draft)

  const changeLesson = (id: string) => {
    setLessonId(id)
    const l = lessons.find((x) => x.id === id)
    if (l && !l.types.includes(type)) setType(l.types[0])
  }

  const submit = async () => {
    setBusy(true)
    setServerErrors([])
    try {
      await onSubmit(draft)
    } catch (e) {
      const err = e as { message?: string; details?: string[] }
      setServerErrors(err.details?.length ? err.details : [err.message ?? 'Lỗi không xác định'])
    } finally {
      setBusy(false)
    }
  }

  const field = 'flex flex-col gap-1 text-sm font-extrabold text-ink/70'
  const select = 'input py-2 text-base'

  return (
    <div className="grid gap-3 rounded-3xl bg-bg p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={field}>
          Chủ đề
          <select className={select} value={lessonId} onChange={(e) => changeLesson(e.target.value)}>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          Loại câu hỏi
          <select className={select} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {(lesson?.types ?? []).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={field}>
        Câu hỏi hiển thị cho học sinh
        <input className="input py-2 text-base" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ví dụ: 3 + 4 = ?" />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {type === 'count' && (
          <label className={field}>
            Số lượng (1–10)
            <input className="input py-2 text-base" type="number" min={1} max={10} value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
        )}
        {(type === 'add' || type === 'sub' || type === 'compare') && (
          <>
            <label className={field}>
              Số a
              <input className="input py-2 text-base" type="number" min={0} max={10} value={a} onChange={(e) => setA(e.target.value)} />
            </label>
            <label className={field}>
              Số b
              <input className="input py-2 text-base" type="number" min={0} max={10} value={b} onChange={(e) => setB(e.target.value)} />
            </label>
          </>
        )}
        {type !== 'shape' && (
          <label className={field}>
            Đồ vật minh họa
            <select className={select} value={item} onChange={(e) => setItem(e.target.value as ItemKey)}>
              {ITEMS.map((i) => (
                <option key={i} value={i}>
                  {ITEM_VI[i]}
                </option>
              ))}
            </select>
          </label>
        )}
        {type === 'shape' && (
          <>
            <label className={field}>
              Hình cần nhận biết
              <select className={select} value={shape} onChange={(e) => setShape(e.target.value as ShapeKey)}>
                {SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {SHAPE_VI[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              Kiểu hỏi
              <select className={select} value={mode} onChange={(e) => setMode(e.target.value as 'name' | 'find')}>
                <option value="name">Xem hình, chọn tên</option>
                <option value="find">Đọc tên, chọn hình</option>
              </select>
            </label>
          </>
        )}
      </div>
      <label className={field}>
        Phương án (2–3, cách nhau bằng dấu phẩy)
        <input
          className="input py-2 text-base"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          placeholder={type === 'shape' ? 'circle, square, triangle' : type === 'compare' ? '<, >, =' : '6, 7, 8'}
        />
        {type === 'shape' && <span className="text-xs font-semibold text-ink/50">Dùng khóa: {SHAPES.join(', ')}</span>}
      </label>

      <div className={`rounded-2xl p-3 text-sm font-bold ${check.ok ? 'bg-mint/30 text-ink' : 'bg-orange/15 text-ink'}`}>
        Đáp án do chương trình tự tính: <b className="text-deep">{answer === null ? '—' : type === 'shape' ? SHAPE_VI[answer as ShapeKey] : String(answer)}</b>
        {!check.ok && (
          <ul className="mt-1 list-disc pl-5 font-semibold text-[#C2410C]">
            {check.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {serverErrors.length > 0 && (
          <ul className="mt-1 list-disc pl-5 font-semibold text-[#C2410C]">
            {serverErrors.map((e) => (
              <li key={e}>Máy chủ: {e}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={!check.ok || busy} onClick={submit}>
          {busy ? 'Đang lưu…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-soft" onClick={onCancel}>
            Hủy
          </button>
        )}
      </div>
    </div>
  )
}
