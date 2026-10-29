// Vẽ hình minh họa câu hỏi từ dữ liệu (không dùng ảnh ngoài) để số lượng luôn chính xác.
import type { CSSProperties } from 'react';
import type { Group, ShapeKind, Visual as V } from '../types';
import { speak } from '../speech';

export const ICONS: Record<string, string> = {
  apple: '🍎',
  star: '⭐',
  fish: '🐟',
  flower: '🌸',
  sunflower: '🌼',
  chick: '🐤',
  duck: '🦆',
  balloon: '🎈',
  banana: '🍌',
  car: '🚗',
  ladybug: '🐞',
  strawberry: '🍓',
  candy: '🍬',
  cake: '🧁',
  butterfly: '🦋',
  carrot: '🥕',
};

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'hình tròn',
  triangle: 'hình tam giác',
  square: 'hình vuông',
  rectangle: 'hình chữ nhật',
};

export function Shape({ kind, color, size = 80 }: { kind: ShapeKind; color: string; size?: number }) {
  const stroke = 'rgba(36,59,83,0.25)';
  const w = kind === 'rectangle' ? size * 1.5 : size;
  return (
    <svg width={w} height={size} viewBox={`0 0 ${w} ${size}`} role="img" aria-label={SHAPE_NAMES[kind]}>
      {kind === 'circle' && <circle cx={w / 2} cy={size / 2} r={size / 2 - 4} fill={color} stroke={stroke} strokeWidth={3} />}
      {kind === 'square' && <rect x={4} y={4} width={size - 8} height={size - 8} rx={4} fill={color} stroke={stroke} strokeWidth={3} />}
      {kind === 'rectangle' && <rect x={4} y={size * 0.18} width={w - 8} height={size * 0.64} rx={4} fill={color} stroke={stroke} strokeWidth={3} />}
      {kind === 'triangle' && (
        <polygon points={`${w / 2},5 ${w - 5},${size - 5} 5,${size - 5}`} fill={color} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
      )}
    </svg>
  );
}

function Objects({ group, crossed = 0, style }: { group: Group; crossed?: number; style?: CSSProperties }) {
  const cols = Math.min(Math.max(group.count, 1), 5);
  if (group.count === 0) return <div className="obj-group empty" aria-label="Không có đồ vật nào" />;
  return (
    <div className="obj-group" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, ...style }} aria-label={`${group.count} hình`}>
      {Array.from({ length: group.count }, (_, i) => (
        <span key={i} className={`obj emoji${i >= group.count - crossed ? ' crossed' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
          {ICONS[group.icon] ?? '●'}
        </span>
      ))}
    </div>
  );
}

const CAR_COLORS = ['#58B9F7', '#FF9A6E', '#3FC488', '#A98BF0', '#F5B82E', '#FF8FB1'];

export function Visual({ v }: { v: V }) {
  switch (v.type) {
    case 'objects':
      return (
        <div className="visual">
          {v.groups.map((g, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && v.op && <span className="op-sign">{v.op}</span>}
              <Objects group={g} />
            </span>
          ))}
        </div>
      );
    case 'crossed':
      return (
        <div className="visual">
          <Objects group={{ icon: v.icon, count: v.total }} crossed={v.crossed} />
        </div>
      );
    case 'compare':
      return (
        <div className="visual">
          <div className="compare">
            {[v.left, v.right].map((g, i) => (
              <div className="side" key={i}>
                {g.label && <div className="side-label">{g.label}</div>}
                <Objects group={g} style={{ gridTemplateColumns: `repeat(${Math.min(g.count, 3)}, auto)` }} />
              </div>
            ))}
          </div>
        </div>
      );
    case 'expression':
      return (
        <div className="visual">
          <div className="expr" aria-label={v.tokens.join(' ').replace('?', 'ô trống')}>
            {v.tokens.map((t, i) => (
              <span key={i} className={`tok${t === '?' ? ' q' : /^[+−=<>]$/.test(t) ? ' op' : ''}`}>
                {t === '?' ? '?' : t}
              </span>
            ))}
          </div>
        </div>
      );
    case 'shapes':
      return (
        <div className="visual">
          <div className="shape-row">
            {v.shapes.map((s, i) => (
              <Shape key={i} kind={s.kind} color={s.color} size={v.shapes.length > 3 ? 70 : 120} />
            ))}
          </div>
        </div>
      );
    case 'sequence':
      return (
        <div className="visual">
          <div className="seq">
            {v.items.map((n, i) => (
              <span key={i} className={`car${n === null ? ' q' : ''}`} style={{ background: CAR_COLORS[i % CAR_COLORS.length] }}>
                {n === null ? '?' : n}
              </span>
            ))}
          </div>
        </div>
      );
    case 'bars': {
      const max = 10;
      return (
        <div className="visual">
          <div className="bars">
            {v.bars.map((b) => (
              <div className="bar-row" key={b.label}>
                <span className="lbl">{b.label}</span>
                <div className="bar-track">
                  <div
                    className={`bar ${v.units ? 'units' : 'pencil'}`}
                    style={{
                      width: `${(b.length / max) * 100}%`,
                      background: b.color,
                      backgroundImage: v.units
                        ? `repeating-linear-gradient(90deg, ${b.color} 0 calc(${100 / b.length}% - 3px), rgba(255,255,255,0.95) calc(${100 / b.length}% - 3px) ${100 / b.length}%)`
                        : undefined,
                    }}
                    aria-label={v.units ? `Băng ${b.label}` : `Bút chì ${b.label}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'word':
      return (
        <div className="visual">
          <div className="word-card" lang="en">
            {v.text}
            <button onClick={() => speak(v.text, 'en-US', true)} aria-label={`Nghe đọc từ ${v.text}`}>
              <span className="emoji">🔊</span>
            </button>
          </div>
        </div>
      );
  }
}
