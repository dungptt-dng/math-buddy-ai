// Hình minh họa từ vựng tiếng Anh, vẽ từ dữ liệu (biểu tượng, CSS, SVG) – không dùng ảnh ngoài.
import type { EnPic } from '../types';
import { ICONS, Shape } from './Visual';

const SHAPE_COLOR = { circle: '#58B9F7', square: '#83DDB4', triangle: '#FF8A65', rectangle: '#C9B6F5' } as const;

function Items({ icon, n, faded = 0, numbers = false }: { icon: string; n: number; faded?: number; numbers?: boolean }) {
  return (
    <span className="enp-items" style={{ gridTemplateColumns: `repeat(${Math.min(n, 5)}, auto)` }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`enp-item emoji${i >= n - faded ? ' away' : ''}`}>
          {ICONS[icon]}
          {numbers && <small>{i + 1}</small>}
        </span>
      ))}
    </span>
  );
}

function Position({ p }: { p: 'above' | 'below' | 'inside' | 'outside' }) {
  const box = p === 'below' ? { x: 30, y: 18 } : p === 'outside' ? { x: 14, y: 52 } : { x: 30, y: 52 };
  const ball = { above: [60, 26], below: [60, 104], inside: [60, 70], outside: [104, 98] }[p];
  return (
    <svg className="enp-pos" viewBox="0 0 120 120" role="img" aria-label={`ball ${p} the box`}>
      <rect x={4} y={114} width={112} height={4} rx={2} fill="#cfe3f7" />
      {/* Hộp mở nắp: vẽ thành bên trước và sau quả bóng để thấy rõ bóng nằm trong. */}
      <rect x={box.x} y={box.y} width={60} height={46} rx={4} fill="#f3c48b" stroke="#a86d2c" strokeWidth={3} />
      <circle cx={ball[0]} cy={ball[1]} r={11} fill="#ff5a5f" stroke="#b3262b" strokeWidth={2.5} />
      {p === 'inside' && <rect x={box.x} y={box.y + 24} width={60} height={22} rx={4} fill="#e9a964" stroke="#a86d2c" strokeWidth={3} />}
    </svg>
  );
}

export function EnPicture({ pic, small = false }: { pic: EnPic; small?: boolean }) {
  const cls = `enp${small ? ' sm' : ''}`;
  switch (pic.k) {
    case 'num':
      return (
        <span className={`${cls} enp-num`}>
          <b>{pic.n}</b>
          <span className="enp-dots" aria-hidden>
            {Array.from({ length: pic.n }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </span>
      );
    case 'text':
      return (
        <span className={`${cls} enp-text`}>
          <b>{pic.t}</b>
        </span>
      );
    case 'objs':
      return (
        <span className={`${cls} enp-objs`}>
          {pic.tag === 'count' && (
            <span className="enp-badge emoji" aria-hidden>
              👆
            </span>
          )}
          <Items icon={pic.icon} n={pic.n} numbers={pic.tag === 'count'} />
          {pic.tag === 'ask' && <span className="enp-ask">?</span>}
        </span>
      );
    case 'shape':
      return (
        <span className={`${cls} enp-shape`}>
          <Shape kind={pic.shape} color={SHAPE_COLOR[pic.shape]} size={small ? 64 : 110} />
        </span>
      );
    case 'sign':
      return (
        <span className={`${cls} enp-sign`}>
          <b>{pic.s}</b>
        </span>
      );
    case 'expr':
      return (
        <span className={`${cls} enp-expr`}>
          {pic.tokens.map((t, i) => (
            <b key={i} className={/[+−=]/.test(t) ? 'op' : t === '?' ? 'ask' : undefined}>
              {t}
            </b>
          ))}
        </span>
      );
    case 'join':
      return (
        <span className={`${cls} enp-join`}>
          <span className="enp-box">
            <Items icon={pic.icon} n={pic.a} />
          </span>
          <span className="enp-arrow" aria-hidden>
            ⟵
          </span>
          <Items icon={pic.icon} n={pic.b} />
        </span>
      );
    case 'take':
      return (
        <span className={`${cls} enp-take`}>
          <Items icon={pic.icon} n={pic.total} faded={pic.away} />
          <span className="enp-hand emoji" aria-hidden>
            ✋
          </span>
        </span>
      );
    case 'groups':
      return (
        <span className={`${cls} enp-groups`}>
          <span className={`enp-box${pic.hi !== 'right' ? ' hi' : ''}`}>
            <Items icon={pic.left.icon} n={pic.left.count} />
          </span>
          {pic.hi === 'both' && <b className="enp-eq">=</b>}
          <span className={`enp-box${pic.hi !== 'left' ? ' hi' : ''}`}>
            <Items icon={pic.right.icon} n={pic.right.count} />
          </span>
        </span>
      );
    case 'nums':
      return (
        <span className={`${cls} enp-nums`}>
          <b className={pic.hi === 'a' ? 'hi' : undefined}>{pic.a}</b>
          <i>{pic.a > pic.b ? '>' : pic.a < pic.b ? '<' : '='}</i>
          <b className={pic.hi === 'b' ? 'hi' : undefined}>{pic.b}</b>
        </span>
      );
    case 'pos':
      return (
        <span className={`${cls} enp-posw`}>
          <Position p={pic.p} />
        </span>
      );
    case 'bars':
      return (
        <span className={`${cls} enp-bars`}>
          <i className={pic.hi === 'long' ? 'hi' : undefined} style={{ width: '100%' }} />
          <i className={pic.hi === 'short' ? 'hi' : undefined} style={{ width: '42%' }} />
        </span>
      );
    case 'tall':
      return (
        <span className={`${cls} enp-tall emoji`}>
          <span className="hi">🦒</span>
          <span>🐱</span>
        </span>
      );
    case 'emoji':
      return <span className={`${cls} enp-emoji emoji`}>{pic.e}</span>;
  }
}
