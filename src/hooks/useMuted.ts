import { useEffect, useState } from 'react'
import { isMuted, setMuted } from '../services/sound'

/** Trạng thái bật/tắt âm thanh, đồng bộ giữa màn hình mở đầu và thanh đầu trang. */
export function useMuted(): [boolean, () => void] {
  const [muted, setState] = useState(isMuted)
  useEffect(() => {
    const update = () => setState(isMuted())
    window.addEventListener('mathbuddy:sound', update)
    return () => window.removeEventListener('mathbuddy:sound', update)
  }, [])
  return [muted, () => setMuted(!muted)]
}
