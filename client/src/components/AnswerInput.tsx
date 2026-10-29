// Khu vực trả lời: chọn đáp án, chọn nhiều hình, hoặc bàn phím số lớn.
import { useEffect } from 'react';
import type { Option, PublicQuestion } from '../types';
import { ICONS, Shape } from './Visual';
import { sfx } from '../speech';

export type Mark = { right: Set<string>; wrong: Set<string> };

function OptionBody({ o }: { o: Option }) {
  if (o.shape) return <Shape kind={o.shape} color={o.color ?? '#58B9F7'} size={70} />;
  if (o.icon && o.count !== undefined) {
    return (
      <span className="mini-grid emoji" style={{ gridTemplateColumns: `repeat(${Math.min(o.count, 4)}, 30px)` }} aria-label={`${o.count} hình`}>
        {Array.from({ length: o.count }, (_, i) => (
          <span key={i}>{ICONS[o.icon!]}</span>
        ))}
      </span>
    );
  }
  return (
    <>
      {o.icon && <span className="opt-icon emoji">{ICONS[o.icon]}</span>}
      <span className={o.icon ? 'opt-label' : undefined}>{o.label}</span>
    </>
  );
}

export function Choices({
  q,
  value,
  onChange,
  locked,
  mark,
}: {
  q: PublicQuestion;
  value: string | string[] | null;
  onChange: (v: string | string[]) => void;
  locked: boolean;
  mark: Mark;
}) {
  const multi = q.kind === 'multi';
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const longText = (q.options ?? []).some((o) => (o.label?.length ?? 0) > 6);
  return (
    <div className="options" role={multi ? 'group' : 'radiogroup'} aria-label="Các phương án">
      {(q.options ?? []).map((o) => {
        const isSel = selected.has(o.id);
        const state = mark.right.has(o.id) ? 'right' : mark.wrong.has(o.id) ? 'wrong' : isSel ? 'selected' : '';
        return (
          <button
            key={o.id}
            className={`opt ${state} ${longText ? 'text-sm' : ''}`}
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={isSel}
            disabled={locked}
            onClick={() => {
              sfx('tap');
              if (multi) {
                const next = new Set(selected);
                if (next.has(o.id)) next.delete(o.id);
                else next.add(o.id);
                onChange([...next]);
              } else onChange(o.id);
            }}
          >
            <OptionBody o={o} />
            {state === 'right' && <span className="mark" aria-label="Đúng">✓</span>}
            {state === 'wrong' && <span className="mark" aria-label="Chưa đúng">✗</span>}
            {state === 'selected' && multi && <span className="mark">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export function NumberPad({ value, onChange, locked, state }: { value: string; onChange: (v: string) => void; locked: boolean; state?: 'right' | 'wrong' }) {
  // Cho phép gõ bằng bàn phím máy tính.
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (/^[0-9]$/.test(e.key) && value.length < 2) onChange(value + e.key);
      else if (e.key === 'Backspace') onChange(value.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, locked]);

  const press = (d: string) => {
    sfx('tap');
    if (value.length < 2) onChange(value === '0' ? d : value + d);
  };
  const color = state === 'right' ? 'var(--ok)' : state === 'wrong' ? 'var(--orange-deep)' : undefined;
  return (
    <div className="numpad-wrap">
      <div className={`num-display ${value ? '' : 'placeholder'}`} style={color ? { borderColor: color, color } : undefined} aria-live="polite" aria-label={`Số con chọn: ${value || 'chưa có'}`}>
        {value || '?'}
        {state === 'right' && <span style={{ fontSize: 28, marginLeft: 8 }}>✓</span>}
      </div>
      <div className="numpad" role="group" aria-label="Bàn phím số">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
          <button key={d} onClick={() => press(d)} disabled={locked} aria-label={`Số ${d}`}>
            {d}
          </button>
        ))}
        <button className="del" onClick={() => onChange(value.slice(0, -1))} disabled={locked || !value} aria-label="Xóa">
          ⌫
        </button>
      </div>
    </div>
  );
}
