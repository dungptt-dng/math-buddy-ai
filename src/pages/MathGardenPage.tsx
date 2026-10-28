import { useCallback } from 'react'
import GameScreen from '../components/GameScreen'
import { makeGardenRound } from '../utils/generators'

export default function MathGardenPage() {
  const load = useCallback(() => ({ questions: makeGardenRound(5) }), [])
  return (
    <GameScreen
      activity="math-garden"
      title="Khu vườn phép tính"
      badge="Huy hiệu Nhà nông tính nhẩm"
      intro="Chào mừng bé đến khu vườn! Mình cùng cộng, trừ trong phạm vi 10 nhé."
      load={load}
    />
  )
}
