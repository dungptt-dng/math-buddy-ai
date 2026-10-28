interface Props {
  total: number
  current: number
  /** Kết quả từng câu đã xong: true = đúng ngay lần đầu, false = cần thử lại. */
  results: boolean[]
}

export default function ProgressPath({ total, current, results }: Props) {
  return (
    <div className="flex items-center" aria-label={`Câu ${Math.min(current + 1, total)} trên ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < results.length
        const isCurrent = i === current
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-black transition sm:h-10 sm:w-10 ${
                done
                  ? results[i]
                    ? 'border-[#F4B400] bg-sunshine text-ink'
                    : 'border-primary bg-primary/20 text-deep'
                  : isCurrent
                    ? 'scale-110 border-deep bg-white text-deep'
                    : 'border-primary/25 bg-white text-ink/40'
              }`}
            >
              {done ? (results[i] ? '★' : '✓') : i + 1}
            </div>
            {i < total - 1 && <div className={`mx-1 h-1.5 flex-1 rounded-full ${done ? 'bg-sunshine' : 'bg-primary/15'}`} />}
          </div>
        )
      })}
    </div>
  )
}
