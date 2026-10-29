// "Vào học": bé chọn tên của mình trên thiết bị này (máy dùng chung cho cả lớp vẫn tách riêng kết quả từng bạn).
// Chỉ cần biệt danh; không email, không số điện thoại, không mật khẩu. Dữ liệu chỉ nằm trên thiết bị này.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { BUDDY_IMG, KidLayout } from '../components/Kid';
import * as engine from '../engine';

export default function ChooseProfile() {
  const nav = useNavigate();
  const [profiles] = useState(engine.listProfiles);
  const [adding, setAdding] = useState(profiles.length === 0);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(engine.AVATARS[0]);
  const [error, setError] = useState('');

  const choose = (id: string) => {
    engine.chooseProfile(id);
    nav('/hoc');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      engine.createProfile(nickname, avatar);
      nav('/hoc');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <KidLayout>
      <div className="join">
        <img className="buddy-head" src={BUDDY_IMG} alt="" />
        <div className="card">
          <h1>Con là bạn nào?</h1>
          {profiles.length > 0 && (
            <>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--muted)' }}>Chạm vào tên của con để vào học nhé.</p>
              <div className="profile-grid">
                {profiles.map((p) => (
                  <button key={p.id} className="profile-btn" onClick={() => choose(p.id)}>
                    <span className="emoji" aria-hidden>
                      {p.avatar}
                    </span>
                    <span>{p.nickname}</span>
                  </button>
                ))}
                {!adding && (
                  <button className="profile-btn add" onClick={() => setAdding(true)}>
                    <span className="emoji" aria-hidden>
                      ➕
                    </span>
                    <span>Bạn mới</span>
                  </button>
                )}
              </div>
            </>
          )}

          {adding && (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="nickname">🧒 Tên gọi của con</label>
                <input
                  id="nickname"
                  className="code-input"
                  style={{ textTransform: 'none', letterSpacing: 0 }}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoComplete="off"
                  maxLength={20}
                  placeholder="VD: Bé Mèo"
                  autoFocus
                />
                <div className="help">Chỉ cần tên gọi hoặc biệt danh, không cần họ tên đầy đủ.</div>
              </div>
              <div className="field">
                <span className="field-label" id="avatar-label">
                  🐾 Chọn con vật của con
                </span>
                <div className="avatar-grid" role="radiogroup" aria-labelledby="avatar-label">
                  {engine.AVATARS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      role="radio"
                      aria-checked={a === avatar}
                      className={`avatar-btn emoji${a === avatar ? ' on' : ''}`}
                      onClick={() => setAvatar(a)}
                    >
                      {a}
                      {a === avatar && <span className="tick" aria-hidden>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="notice error" role="alert">
                  <span className="emoji">🤔</span>
                  <span>{error}</span>
                </div>
              )}
              <button className="btn big green block" style={{ marginTop: 18 }}>
                Vào học ▶
              </button>
            </form>
          )}
          <p style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 700, marginBottom: 0 }}>
            Kết quả học được lưu trên thiết bị này để con xem lại tiến bộ của mình.
          </p>
        </div>
        <p style={{ marginTop: 18 }}>
          <Link className="btn white" to="/">
            ◀ Quay lại
          </Link>
        </p>
      </div>
    </KidLayout>
  );
}
