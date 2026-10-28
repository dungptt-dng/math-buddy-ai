import { useCallback } from 'react'
import GameScreen from '../components/GameScreen'
import { makeCountingRound } from '../utils/generators'

export default function MagicNumbersPage() {
  const load = useCallback(() => ({ questions: makeCountingRound(5) }), [])
  return (
    <GameScreen
      activity="magic-numbers"
      title="Bé đếm cùng Buddy"
      badge="Huy hiệu Bé đếm giỏi"
      intro="Mình cùng đếm nhé! Bé có thể chạm vào từng đồ vật để đếm."
      load={load}
    />
  )
}
