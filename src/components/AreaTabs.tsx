// Hai khu học tập: Ôn luyện Toán và Làm quen tiếng Anh – luôn ở cùng một chỗ để con dễ chuyển qua lại.
import { Link } from 'react-router';

export function AreaTabs({ active }: { active: 'math' | 'english' }) {
  return (
    <nav className="area-tabs" aria-label="Khu học tập">
      <Link to="/hoc" className={`area-tab math${active === 'math' ? ' active' : ''}`} aria-current={active === 'math' ? 'page' : undefined}>
        <span className="emoji" aria-hidden>
          🧮
        </span>
        <span>
          Ôn luyện Toán
          <small lang="en">Math Practice</small>
        </span>
      </Link>
      <Link to="/tieng-anh" className={`area-tab english${active === 'english' ? ' active' : ''}`} aria-current={active === 'english' ? 'page' : undefined}>
        <span className="emoji" aria-hidden>
          🔤
        </span>
        <span>
          Làm quen tiếng Anh
          <small lang="en">English Practice</small>
        </span>
      </Link>
    </nav>
  );
}
