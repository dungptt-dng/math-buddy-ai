import type { ReactNode } from 'react'

export type AnswerState = 'idle' | 'correct' | 'wrong'

interface Props {
  children: ReactNode
  state: AnswerState
  disabled?: boolean
  onClick: () => void
  label: string
}

const STYLES: Record<AnswerState, string> = {
  idle: 'border-primary/30 bg-white hover:border-deep hover:bg-primary/5',
  correct: 'border-[#1F9D68] bg-mint/40 anim-pop',
  wrong: 'border-orange bg-orange/15 anim-shake',
}

export default function AnswerButton({ children, state, disabled, onClick, label }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex min-h-[88px] min-w-[76px] flex-1 items-center justify-center rounded-3xl border-[3px] px-2 py-3 sm:min-w-[96px] sm:px-4 text-4xl font-black text-ink shadow-card transition active:scale-95 disabled:cursor-default ${STYLES[state]} ${
        state === 'wrong' ? 'opacity-70' : ''
      }`}
    >
      {children}
      {state === 'correct' && (
        <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1F9D68] text-lg text-white">
          ✓
        </span>
      )}
    </button>
  )
}
