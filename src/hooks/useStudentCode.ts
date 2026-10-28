import { useEffect, useState } from 'react'
import { getStudentCode } from '../services/storage'

/** Mã học sinh hiện tại, tự cập nhật khi được đổi ở bất kỳ đâu trong ứng dụng. */
export function useStudentCode(): string | null {
  const [code, setCode] = useState(getStudentCode)
  useEffect(() => {
    const update = () => setCode(getStudentCode())
    window.addEventListener('mathbuddy:student', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('mathbuddy:student', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return code
}
