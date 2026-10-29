// Vẽ hình minh họa câu hỏi từ dữ liệu (không dùng ảnh ngoài) để số lượng luôn chính xác.
// `help` là gợi ý bằng hình sau khi con trả lời sai: 2 = các hình sáng lần lượt để cùng đếm, 3 = hiện thêm số đếm / chấm tròn.
import type { CSSProperties } from 'react';
import type { Group, HintLevel, ShapeKind, Visual as V } from '../types';
import { speak } from '../speech';

/** Thời gian giữa hai hình khi "cùng đếm". */
const STEP_S = 0.45;
const spotStyle = (order: number, total: number): CSSProperties => ({
  animationDelay: `${order * STEP_S}s`,
  animationDuration: `${total * STEP_S + 1.2}s`,
});

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

function Objects({
  group,
  crossed = 0,
  style,
  help = 0,
  start = 0,
  total,
}: {
  group: Group;
  crossed?: number;
  style?: CSSProperties;
  help?: HintLevel;
  /** Số đã đếm ở nhóm trước (đếm tiếp sang nhóm sau). */
  start?: number;
  /** Tổng số hình được đếm trong cả hình minh họa. */
  total?: number;
}) {
  const cols = Math.min(Math.max(group.count, 1), 5);
  if (group.count === 0) return <div className={`obj-group empty${help >= 2 ? ' spot-box' : ''}`} aria-label="Không có đồ vật nào" />;
  const counted = group.count - crossed;
  return (
    <div className="obj-group" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, ...style }} aria-label={`${group.count} hình`}>
      {Array.from({ length: group.count }, (_, i) => {
        const isCrossed = i >= counted;
        const spot = help >= 2 && !isCrossed;
        return (
          <span
            key={i}
            className={`obj emoji${isCrossed ? ' crossed' : ''}${spot ? ' spot' : ''}`}
            style={spot ? spotStyle(start + i, total ?? counted) : { animationDelay: `${i * 0.04}s` }}
          >
            {ICONS[group.icon] ?? '●'}
            {help >= 3 && !isCrossed && <b className="count-badge">{start + i + 1}</b>}
          </span>
        );
      })}
    </div>
  );
}

/** Chấm tròn dưới một số (gợi ý mức 2–3 cho phép tính). */
function Dots({ n }: { n: number }) {
  return (
    <span className="tok-dots" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={spotStyle(i, n)} />
      ))}
    </span>
  );
}

const CAR_COLORS = ['#58B9F7', '#FF9A6E', '#3FC488', '#A98BF0', '#F5B82E', '#FF8FB1'];

export function Visual({ v, help = 0 }: { v: V; help?: HintLevel }) {
  switch (v.type) {
    case 'objects': {
      // Phép cộng: đếm tiếp sang nhóm sau, không bắt đầu lại từ 1.
      const total = v.groups.reduce((s, g) => s + g.count, 0);
      let start = 0;
      return (
        <div className="visual">
          {v.groups.map((g, i) => {
            const from = v.op ? start : 0;
            start += g.count;
            return (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && v.op && <span className="op-sign">{v.op}</span>}
                <Objects group={g} help={help} start={from} total={v.op ? total : g.count} />
              </span>
            );
          })}
        </div>
      );
    }
    case 'crossed':
      return (
        <div className="visual">
          <Objects group={{ icon: v.icon, count: v.total }} crossed={v.crossed} help={help} />
        </div>
      );
    case 'compare':
      // Hai bên sáng cùng lúc từng cặp: con thấy ngay bên nào còn thừa.
      return (
        <div className="visual">
          <div className="compare">
            {[v.left, v.right].map((g, i) => (
              <div className="side" key={i}>
                {g.label && <div className="side-label">{g.label}</div>}
                <Objects group={g} help={help} total={Math.max(v.left.count, v.right.count)} style={{ gridTemplateColumns: `repeat(${Math.min(g.count, 3)}, auto)` }} />
              </div>
            ))}
          </div>
        </div>
      );
    case 'expression':
      return (
        <div className="visual">
          <div className="expr" aria-label={v.tokens.join(' ').replace('?', 'ô trống')}>
            {v.tokens.map((t, i) => {
              const n = /^\d+$/.test(t) ? Number(t) : null;
              return (
                <span key={i} className="tok-wrap">
                  <span className={`tok${t === '?' ? ' q' : /^[+−=<>]$/.test(t) ? ' op' : ''}`}>{t === '?' ? '?' : t}</span>
                  {help >= 2 && n !== null && n > 0 && n <= 10 && <Dots n={n} />}
                </span>
              );
            })}
          </div>
        </div>
      );
    case 'shapes': {
      const targets = v.shapes.map((s, i) => (s.kind === v.target ? i : -1)).filter((i) => i >= 0);
      return (
        <div className="visual">
          <div className="shape-row">
            {v.shapes.map((s, i) => {
              const order = targets.indexOf(i);
              const spot = help >= 2 && order >= 0;
              return (
                <span key={i} className={`shape-item${spot ? ' spot' : ''}`} style={spot ? spotStyle(order, targets.length) : undefined}>
                  <Shape kind={s.kind} color={s.color} size={v.shapes.length > 3 ? 70 : 120} />
                  {help >= 3 && order >= 0 && v.shapes.length > 1 && <b className="count-badge">{order + 1}</b>}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    case 'sequence': {
      const gap = v.items.indexOf(null);
      return (
        <div className="visual">
          <div className="seq">
            {v.items.map((n, i) => {
              // Mức 2: số đứng ngay trước ô trống sáng lên. Mức 3: đọc lần lượt các số trước ô trống.
              const spot = (help === 2 && i === gap - 1) || (help >= 3 && i < gap);
              return (
                <span
                  key={i}
                  className={`car${n === null ? ' q' : ''}${spot ? ' spot' : ''}`}
                  style={{ background: CAR_COLORS[i % CAR_COLORS.length], ...(spot ? spotStyle(help >= 3 ? i : 0, help >= 3 ? gap : 1) : {}) }}
                >
                  {n === null ? '?' : n}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    case 'bars': {
      const max = 10;
      return (
        <div className="visual">
          <div className="bars">
            {v.bars.map((b, i) => (
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
                  {/* Gợi ý: vạch đánh dấu đầu bên phải của từng băng để so sánh. */}
                  {help >= 2 && <span className="bar-end spot" style={{ left: `${(b.length / max) * 100}%`, ...spotStyle(i, v.bars.length) }} />}                </div>
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
            <button className={help >= 2 ? 'spot' : undefined} onClick={() => speak(v.text, 'en-US', true)} aria-label={`Nghe đọc từ ${v.text}`}>
              <span className="emoji">🔊</span>
            </button>
          </div>
        </div>
      );
  }
}
