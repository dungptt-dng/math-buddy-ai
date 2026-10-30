// Trang đầu: ảnh banner Math Buddy AI phủ toàn màn hình.
// Chưa vào học: ô "Tên của con", "Tên lớp" và nút Bắt đầu học (rồi chạm con vật của con) – hoặc Học thử.
// Đang học: lời chào, Học tiếp, Đổi thông tin, Kết thúc phiên học.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { BUDDY_IMG } from '../components/Kid';
import * as engine from '../engine';
import { speak, useSound } from '../speech';
import { startMusic, stopMusic } from '../music';

const BANNER = 'assets/home-banner.webp';
const OOPS = 'Buddy chưa mở được bài. Con thử lại nhé!';
/** Lời nhắc cho trẻ: chỉ lời của bộ máy học (đã viết cho trẻ), không bao giờ hiện lỗi kỹ thuật. */
const kidMessage = (e: unknown) => (e instanceof engine.EngineError ? e.message : OOPS);
/** Chạm sai con vật quá chừng này lần thì quay lại, nhờ thầy cô giúp. */
const MAX_WRONG_ANIMAL = 3;

export default function Home() {
  const nav = useNavigate();
  const location = useLocation();
  const [soundOn, toggleSound] = useSound();
  const [me, setMe] = useState(engine.me);
  const profile = me?.mode === 'profile' ? me.profile : null;
  const [lessons] = useState(() => (profile ? engine.listLessons() : null));
  // "Đổi thông tin" ở danh sách bài mở thẳng trang đầu ở chế độ sửa.
  const [editing, setEditing] = useState(() => Boolean(profile && (location.state as { edit?: boolean } | null)?.edit));
  const [error, setError] = useState('');

  // Nhạc nền vui tươi chỉ ở trang đầu: tắt theo nút loa, nhỏ dần khi bé rời trang.
  useEffect(() => {
    if (!soundOn) return;
    startMusic();
    return stopMusic;
  }, [soundOn]);

  const startTrial = () => {
    setError('');
    try {
      engine.startTrial();
      nav('/hoc');
    } catch (e) {
      setError(kidMessage(e));
    }
  };

  const endSession = () => {
    engine.signOut();
    setMe(null);
    setEditing(false);
  };

  const current = lessons?.find((l) => l.status === 'in_progress') ?? lessons?.find((l) => l.status === 'new' && l.domain === 'math');
  const greeting = profile ? `Chào ${profile.nickname}!` : 'Xin chào! Mình là Buddy.';

  return (
    <div className="splash">
      <img className="splash-blur" src={BANNER} alt="" aria-hidden />
      <img
        className="splash-img"
        src={BANNER}
        alt="Math Buddy AI – Bé vui học Toán song ngữ. Mỗi ngày một khám phá: học Toán bằng tiếng Việt, làm quen tiếng Anh, vui học mỗi ngày. Cùng Buddy khám phá thế giới Toán học!"
        width={1774}
        height={887}
        fetchPriority="high"
      />

      <div className="splash-top">
        <button className="icon-btn" onClick={toggleSound} aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'} title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}>
          <span className="emoji">{soundOn ? '🔊' : '🔇'}</span>
        </button>
      </div>

      <main className="splash-panel">
        {profile && !editing && (
          <>
            <h1 className="splash-greet" style={{ margin: 0 }}>
              <button className="splash-hello" onClick={() => speak(`${greeting} Cùng học Toán vui nhé!`, 'vi-VN', true)} title="Nghe Buddy chào">
                <span className="emoji" aria-hidden>
                  👋
                </span>
                {greeting}
                <small className="emoji" aria-hidden>
                  {profile.avatar}
                </small>
              </button>
            </h1>
            <p className="splash-continue">
              {profile.className && <>Lớp {profile.className} · </>}
              {current?.status === 'in_progress' ? 'Con đang học dở bài: ' : 'Bài tiếp theo: '}
              <b>{current?.title ?? 'Xem các bài của con'}</b>
            </p>
            <div className="splash-buttons four">
              <Link className="btn big green wide" to={current?.inProgressAttemptId ? `/lam-bai/${current.inProgressAttemptId}` : '/hoc'}>
                <span>{current?.status === 'in_progress' ? 'Học tiếp ▶' : 'Vào học ▶'}</span>
              </Link>
              <Link className="btn white" to="/hoc">
                <span className="emoji">📚</span>
                <span>Tất cả bài</span>
              </Link>
              <button className="btn white" onClick={() => setEditing(true)}>
                <span className="emoji">✏️</span>
                <span>Đổi thông tin</span>
              </button>
              <button className="btn white" onClick={endSession}>
                <span className="emoji">👋</span>
                <span>Kết thúc phiên học</span>
              </button>
            </div>
          </>
        )}

        {profile && editing && (
          <LearnerForm
            key="edit"
            title="Đổi thông tin của con"
            initial={{ name: profile.nickname, cls: profile.className ?? '' }}
            onSubmit={(name, cls) => engine.updateLearner(name, cls)}
            onDone={() => nav('/hoc')}
            submitLabel="Lưu và học tiếp ▶"
            footer={
              <button type="button" className="btn white" onClick={() => setEditing(false)}>
                ◀ Quay lại
              </button>
            }
          />
        )}

        {!profile && (
          <LearnerForm
            key="enter"
            title="Chào mừng con đến với Math Buddy!"
            initial={{ name: '', cls: engine.lastClassName() }}
            onDone={() => nav('/hoc')}
            submitLabel="Bắt đầu học ▶"
            footer={
              <>
                <button type="button" className="btn yellow" onClick={startTrial}>
                  <span>
                    <span className="emoji">⭐</span> Học thử
                  </span>
                  <small>Không lưu kết quả</small>
                </button>
                {me?.mode === 'trial' && (
                  <Link className="btn white wide" to="/hoc">
                    Tiếp tục học thử ▶
                  </Link>
                )}
              </>
            }
          />
        )}

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <nav className="splash-links" aria-label="Liên kết khác">
          <Link to="/phu-huynh">👨‍👩‍👧 Góc phụ huynh & thầy cô</Link>
          <Link to="/rieng-tu">🔒 Quyền riêng tư</Link>
        </nav>

        <footer className="splash-credit">
          <span>
            Giáo viên: <b>Lê Thị Minh Thanh</b>
          </span>
          <span>Trường Tiểu học Huỳnh Ngọc Huệ - Phường Thanh Khê - Thành phố Đà Nẵng</span>
        </footer>
      </main>
    </div>
  );
}

/**
 * Ô "Tên của con" + "Tên lớp". Có onSubmit: lưu luôn (Đổi thông tin). Không có: vào học – nhập xong, con chạm con vật của mình
 * (bạn mới: chọn con vật để lần sau nhận ra; bạn đã học: phải chạm đúng con vật mới xem được kết quả cũ).
 */
function LearnerForm({
  title,
  initial,
  onSubmit,
  onDone,
  submitLabel,
  footer,
}: {
  title: string;
  initial: { name: string; cls: string };
  onSubmit?: (name: string, cls: string) => void;
  onDone: () => void;
  submitLabel: string;
  footer: ReactNode;
}) {
  const [name, setName] = useState(initial.name);
  const [cls, setCls] = useState(initial.cls);
  const [errors, setErrors] = useState<{ name?: string; cls?: string }>({});
  const [notice, setNotice] = useState('');
  const [choosingAnimal, setChoosingAnimal] = useState(false);
  const [wrong, setWrong] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const clsRef = useRef<HTMLInputElement>(null);

  const check = (fn: (s: string) => string, s: string) => {
    try {
      fn(s);
      return undefined;
    } catch (e) {
      return kidMessage(e);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setNotice('');
    const errs = { name: check(engine.cleanName, name), cls: check(engine.cleanClassName, cls) };
    setErrors(errs);
    if (errs.name) return nameRef.current?.focus();
    if (errs.cls) return clsRef.current?.focus();
    if (!onSubmit) return setChoosingAnimal(true);
    try {
      onSubmit(name, cls);
      onDone();
    } catch (err) {
      setNotice(kidMessage(err));
    }
  };

  const pickAnimal = (avatar: string) => {
    setNotice('');
    try {
      engine.enterLearner(name, cls, avatar);
      onDone();
    } catch (e) {
      if (e instanceof engine.EngineError && e.code === 'denied' && wrong + 1 >= MAX_WRONG_ANIMAL) {
        setWrong(0);
        setName('');
        setChoosingAnimal(false);
        setNotice('Buddy chưa nhận ra con. Con hãy nhờ thầy cô giúp nhé!');
        return;
      }
      if (e instanceof engine.EngineError && e.code === 'denied') setWrong(wrong + 1);
      setNotice(kidMessage(e));
    }
  };

  const backToForm = () => {
    setChoosingAnimal(false);
    setNotice('');
    setWrong(0);
  };

  const noticeBox = notice && (
    <div className="notice error" role="alert">
      <span className="emoji">🤔</span>
      <span>{notice}</span>
    </div>
  );

  if (choosingAnimal) {
    return (
      <section className="welcome-card" aria-labelledby="animal-title">
        <h1 id="animal-title">
          <img src={BUDDY_IMG} alt="" />
          Chạm vào con vật của con 🐾
        </h1>
        <p className="welcome-help">
          <b>{name.trim()}</b> · Lớp <b>{engine.cleanClassName(cls)}</b>
          <br />
          Lần đầu: chọn con vật con thích và nhớ nó nhé. Lần sau chạm đúng con vật đó để học tiếp.
        </p>
        <div className="avatar-grid" role="group" aria-label="Các con vật">
          {engine.AVATARS.map((a) => (
            <button type="button" key={a} className="avatar-btn emoji" onClick={() => pickAnimal(a)}>
              {a}
            </button>
          ))}
        </div>
        {noticeBox}
        <button type="button" className="btn white" onClick={backToForm}>
          ◀ Sửa tên, lớp
        </button>
      </section>
    );
  }

  return (
    <form className="welcome-card" onSubmit={submit} noValidate aria-labelledby="welcome-title">
      <h1 id="welcome-title">
        <img src={BUDDY_IMG} alt="" />
        {title}
      </h1>
      <div className="welcome-fields">
        <div className="welcome-field">
          <label htmlFor="learner-name">🧒 Tên của con</label>
          <input
            id="learner-name"
            ref={nameRef}
            className="big-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter ở ô tên: sang ô lớp nếu chưa nhập lớp.
              if (e.key === 'Enter' && !cls.trim()) {
                e.preventDefault();
                clsRef.current?.focus();
              }
            }}
            placeholder="Nhập tên học sinh"
            maxLength={engine.MAX_NAME + 10}
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            lang="vi"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'learner-name-error' : undefined}
          />
          {errors.name && (
            <p className="field-error" id="learner-name-error">
              {errors.name}
            </p>
          )}
        </div>
        <div className="welcome-field">
          <label htmlFor="learner-class">🏫 Tên lớp</label>
          <input
            id="learner-class"
            ref={clsRef}
            className="big-input"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            placeholder="Ví dụ: 1A, 1B, 1C"
            maxLength={engine.MAX_CLASS + 10}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            lang="vi"
            aria-invalid={errors.cls ? true : undefined}
            aria-describedby={errors.cls ? 'learner-class-error' : undefined}
          />
          {errors.cls && (
            <p className="field-error" id="learner-class-error">
              {errors.cls}
            </p>
          )}
        </div>
      </div>
      {noticeBox}
      <div className="splash-buttons">
        <button className="btn big green">{submitLabel}</button>
        {footer}
      </div>
    </form>
  );
}
