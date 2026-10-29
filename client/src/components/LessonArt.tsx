// Hình minh họa cho thẻ bài (vẽ bằng CSS/SVG, không dùng ảnh ngoài).
import type { ReactNode } from 'react';
import { Shape } from './Visual';

const ART: Record<string, { bg: string; content: ReactNode }> = {
  numbers: { bg: 'linear-gradient(135deg,#58B9F7,#287FC1)', content: <span className="big">1 2 3</span> },
  compare: { bg: 'linear-gradient(135deg,#FFAE8B,#F07A4F)', content: <span className="big">5 &gt; 3</span> },
  plus: { bg: 'linear-gradient(135deg,#83DDB4,#2FAE78)', content: <span className="big">2 + 3</span> },
  minus: { bg: 'linear-gradient(135deg,#C9B6F5,#8D6EE0)', content: <span className="big">5 − 1</span> },
  shapes: {
    bg: 'linear-gradient(135deg,#FFE083,#F5B82E)',
    content: (
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Shape kind="circle" color="#58B9F7" size={54} />
        <Shape kind="triangle" color="#FF8A65" size={58} />
        <Shape kind="square" color="#83DDB4" size={50} />
      </span>
    ),
  },
  ruler: {
    bg: 'linear-gradient(135deg,#FF8FB1,#F06292)',
    content: (
      <span style={{ display: 'grid', gap: 10, width: '70%' }}>
        <span style={{ height: 18, width: '100%', background: '#FFE083', borderRadius: 4 }} />
        <span style={{ height: 18, width: '60%', background: '#fff', borderRadius: 4 }} />
      </span>
    ),
  },
  abc: { bg: 'linear-gradient(135deg,#A98BF0,#58B9F7)', content: <span className="big" lang="en">ABC</span> },
};

export function LessonArt({ icon }: { icon: string }) {
  const a = ART[icon] ?? ART.numbers;
  return (
    <div className="lesson-art" style={{ background: a.bg }} aria-hidden>
      {a.content}
    </div>
  );
}
