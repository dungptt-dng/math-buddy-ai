import { useState, type FormEvent, type ReactNode } from 'react'
import { getStudentCode, isValidStudentCode, normalizeStudentCode, setStudentCode } from '../services/storage'

interface Props {
  onSaved: (code: string) => void
  submitLabel: ReactNode
  submitClassName?: string
  children?: ReactNode
}

/** Ô nhập mã học sinh (ví dụ HS-012). Chỉ dùng mã, không cần tên thật. */
export default function StudentCodeForm({ onSaved, submitLabel, submitClassName = 'btn-primary', children }: Props) {
  const [value, setValue] = useState(() => getStudentCode() ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const code = normalizeStudentCode(value)
    if (!isValidStudentCode(code)) {
      setError('Mã học sinh gồm "HS-" và 3 chữ số, ví dụ HS-012. Bé hỏi thầy cô nhé!')
      return
    }
    setError(null)
    setValue(code)
    setStudentCode(code)
    onSaved(code)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="student-code" className="text-sm font-extrabold text-ink/70">
        Mã học sinh của bé
      </label>
      <input
        id="student-code"
        className="input uppercase"
        placeholder="Ví dụ: HS-012"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        inputMode="text"
        maxLength={8}
        aria-invalid={!!error}
        aria-describedby={error ? 'student-code-error' : undefined}
      />
      {error && (
        <p id="student-code-error" className="text-sm font-bold text-[#C2410C]">
          {error}
        </p>
      )}
      <button type="submit" className={`${submitClassName} w-full text-lg`}>
        {submitLabel}
      </button>
      {children}
    </form>
  )
}
