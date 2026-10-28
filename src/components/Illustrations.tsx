// Hình minh họa đồ vật và hình phẳng (SVG) cho câu hỏi. Không dùng để thay nhân vật Buddy.
import type { ItemKey, ShapeKey } from '../types'

export function ItemIcon({ item, size = 48, crossed = false }: { item: ItemKey; size?: number; crossed?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={crossed ? 'opacity-40' : ''}>
      {item === 'apple' && (
        <g>
          <path d="M32 18c-6-6-20-4-20 12 0 14 10 26 20 22 10 4 20-8 20-22 0-16-14-18-20-12z" fill="#F0555A" />
          <path d="M20 26c2-4 6-6 9-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
          <path d="M32 18c0-5 1-9 4-12" stroke="#7A4A2A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M35 11c5-5 12-4 14-2-3 5-9 6-14 2z" fill="#4CC38A" />
        </g>
      )}
      {item === 'star' && (
        <path
          d="M32 6l7.6 15.6 17.2 2.4-12.5 12 3 17L32 45l-15.3 8 3-17L7.2 24l17.2-2.4z"
          fill="#FFD34D"
          stroke="#F4B400"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}
      {item === 'fish' && (
        <g>
          <path d="M44 32 60 20v24z" fill="#FF9F68" />
          <ellipse cx="28" cy="32" rx="22" ry="15" fill="#FFAE8B" />
          <path d="M26 20c4 4 4 20 0 24" stroke="#FF8A5B" strokeWidth="3" fill="none" />
          <circle cx="15" cy="29" r="3.5" fill="#243B53" />
        </g>
      )}
      {item === 'flower' && (
        <g>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx="32" cy="17" rx="9" ry="12" fill="#F49AC1" transform={`rotate(${deg} 32 32)`} />
          ))}
          <circle cx="32" cy="32" r="9" fill="#FFD34D" />
        </g>
      )}
      {item === 'balloon' && (
        <g>
          <path d="M32 46c2 6-4 8 0 14" stroke="#287FC1" strokeWidth="2" fill="none" />
          <ellipse cx="32" cy="26" rx="17" ry="20" fill="#58B9F7" />
          <path d="M29 45h6l-3 4z" fill="#287FC1" />
          <ellipse cx="25" cy="18" rx="4" ry="7" fill="#fff" opacity=".45" />
        </g>
      )}
      {crossed && <path d="M12 12 52 52M52 12 12 52" stroke="#243B53" strokeWidth="5" strokeLinecap="round" />}
    </svg>
  )
}

const SHAPE_COLORS: Record<ShapeKey, string> = {
  square: '#58B9F7',
  circle: '#C9B6F5',
  triangle: '#FFD34D',
  rectangle: '#83DDB4',
}

export function ShapeIcon({ shape, size = 96 }: { shape: ShapeKey; size?: number }) {
  const fill = SHAPE_COLORS[shape]
  const stroke = 'rgba(36,59,83,.25)'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {shape === 'square' && <rect x="18" y="18" width="64" height="64" rx="6" fill={fill} stroke={stroke} strokeWidth="3" />}
      {shape === 'circle' && <circle cx="50" cy="50" r="34" fill={fill} stroke={stroke} strokeWidth="3" />}
      {shape === 'triangle' && <path d="M50 14 88 82H12z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />}
      {shape === 'rectangle' && <rect x="8" y="28" width="84" height="44" rx="6" fill={fill} stroke={stroke} strokeWidth="3" />}
    </svg>
  )
}

/** Minh họa nhỏ cho các thẻ hoạt động ở trang chủ. */
export function ActivityArt({ kind }: { kind: 'count' | 'garden' | 'shape' | 'challenge' }) {
  if (kind === 'count')
    return (
      <div className="flex items-end justify-center gap-1">
        <ItemIcon item="apple" size={40} />
        <ItemIcon item="apple" size={46} />
        <ItemIcon item="apple" size={40} />
        <span className="ml-2 text-4xl font-black text-deep">3</span>
      </div>
    )
  if (kind === 'garden')
    return (
      <div className="flex items-center justify-center gap-1 text-3xl font-black text-ink">
        <ItemIcon item="flower" size={40} />
        <span>+</span>
        <ItemIcon item="flower" size={40} />
        <span>=</span>
        <span className="text-[#1F9D68]">2</span>
      </div>
    )
  if (kind === 'shape')
    return (
      <div className="flex items-center justify-center gap-1">
        <ShapeIcon shape="square" size={46} />
        <ShapeIcon shape="circle" size={46} />
        <ShapeIcon shape="triangle" size={46} />
      </div>
    )
  return (
    <div className="flex items-center justify-center gap-1">
      <ItemIcon item="star" size={40} />
      <ItemIcon item="star" size={52} />
      <ItemIcon item="star" size={40} />
    </div>
  )
}
