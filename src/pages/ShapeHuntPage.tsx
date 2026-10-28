import { useCallback } from 'react'
import GameScreen from '../components/GameScreen'
import { makeShapeRound } from '../utils/generators'

export default function ShapeHuntPage() {
  const load = useCallback(() => ({ questions: makeShapeRound(5) }), [])
  return (
    <GameScreen
      activity="shape-hunt"
      title="Thợ săn hình học"
      badge="Huy hiệu Thợ săn hình học"
      intro="Bé cùng Buddy đi săn hình nhé: hình vuông, hình tròn, hình tam giác, hình chữ nhật!"
      load={load}
    />
  )
}
