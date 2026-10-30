// Góc phụ huynh & thầy cô: kết quả học của các bạn trên THIẾT BỊ NÀY (không có máy chủ, không gửi dữ liệu đi đâu).
// Mọi số liệu được tính từ các lần làm bài thật; kỹ năng chỉ được nhận xét khi có đủ dữ liệu.
import { useState } from 'react';
import { Link } from 'react-router';
import { BUDDY_IMG } from '../components/Kid';
import * as engine from '../engine';
import type { ProfileReport, SkillStat } from '../types';

const LABEL_TEXT = {
  mastered: 'Đã vững',
  developing: 'Đang tiến bộ',
  needs_practice: 'Cần ôn thêm',
  insufficient: 'Chưa đủ dữ liệu',
} as const;
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Parents() {
  const [reports, setReports] = useState(engine.reports);
  const refresh = () => setReports(engine.reports());

  const removeOne = (r: ProfileReport) => {
    if (!window.confirm(`Xóa bạn “${r.profile.nickname}” và toàn bộ kết quả học của bạn này trên thiết bị? Không thể hoàn tác.`)) return;
    engine.deleteProfile(r.profile.id);
    refresh();
  };
  const removeAll = () => {
    if (!window.confirm('Xóa TẤT CẢ bạn học và kết quả trên thiết bị này? Không thể hoàn tác.')) return;
    engine.deleteAllData();
    refresh();
  };

  return (
    <div className="teacher">
      <header className="t-header">
        <div className="t-header-inner">
          <Link to="/" className="brand">
            <img src={BUDDY_IMG} alt="" />
            <span>
              Math Buddy AI
              <small>Góc phụ huynh & thầy cô</small>
            </span>
          </Link>
          <nav className="t-nav">
            <Link to="/">◀ Về trang học</Link>
          </nav>
        </div>
      </header>
      <main className="t-main">
        <h1 className="t-title">Kết quả học trên thiết bị này</h1>
        <p className="t-sub">
          Ứng dụng chạy hoàn toàn trên trình duyệt: kết quả chỉ lưu trên máy này, không gửi lên mạng. Học thử không được tính vào đây. Nếu xóa dữ
          liệu trình duyệt, kết quả cũng mất – hãy tải CSV để lưu lại khi cần.
        </p>

        <div className="t-row" style={{ margin: '14px 0 18px' }}>
          <button className="t-btn" disabled={!reports.length} onClick={() => download(engine.exportCsv('profiles'), 'math-buddy-ket-qua-theo-ban.csv')}>
            ⬇ Tải CSV theo bạn học
          </button>
          <button className="t-btn secondary" disabled={!reports.length} onClick={() => download(engine.exportCsv('attempts'), 'math-buddy-tung-lan-lam-bai.csv')}>
            ⬇ Tải CSV từng lần làm bài
          </button>
        </div>

        {reports.length === 0 && (
          <div className="t-card">
            <p style={{ margin: 0 }}>
              Chưa có bạn nào học trên thiết bị này. Trẻ nhập <b>tên và lớp</b> ở trang đầu, bấm <b>Bắt đầu học</b> rồi chọn một con vật để bắt đầu lưu kết quả.
            </p>
          </div>
        )}

        {reports.map((r) => (
          <section className="t-card" key={r.profile.id}>
            <div className="t-row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>
                <span className="emoji">{r.profile.avatar}</span> {r.profile.nickname}
                {r.profile.className && <span className="t-sub" style={{ fontSize: 17 }}> · Lớp {r.profile.className}</span>}
              </h2>
              <span className="t-sub">Học gần nhất: {fmtDate(r.lastActive)}</span>
            </div>
            <div className="t-stats" style={{ marginTop: 12 }}>
              <Stat k="Câu Toán đã làm" v={r.questionsDone} />
              <Stat k="Đúng ngay lần đầu" v={pct(r.accuracy)} />
              <Stat k="Bài đã hoàn thành" v={r.lessonsCompleted} />
              <Stat k="Lần bấm Gợi ý" v={r.hintsUsed} />
            </div>
            {r.correctAfterRetry > 0 && <p className="t-sub">Thêm {r.correctAfterRetry} câu Toán làm đúng sau khi thử lại (không tính vào điểm chính).</p>}

            <h3>Kỹ năng Toán (đúng ngay lần đầu)</h3>
            <SkillBars skills={r.skills} />
            <p className="t-sub" style={{ fontSize: 13 }}>
              Kỹ năng chỉ được nhận xét khi đã làm ít nhất {engine.MIN_EVIDENCE} câu. Đây là số liệu luyện tập, không phải đánh giá chính thức.
            </p>

            <h3>Làm quen tiếng Anh (tính riêng, không ảnh hưởng điểm Toán)</h3>
            <div className="t-stats">
              <Stat k="Câu từ vựng đúng ngay lần đầu" v={r.vocab.answered ? `${r.vocab.correct}/${r.vocab.answered}` : '—'} />
              <Stat k="Số từ đã gặp" v={r.wordsMet.length} />
            </div>
            {r.wordsMet.length > 0 && (
              <p className="t-sub" lang="en">
                {r.wordsMet.join(', ')}
              </p>
            )}

            {r.attempts.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Các lần làm bài ({r.attempts.length})</summary>
                <div className="t-table-wrap">
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Bài / trò chơi</th>
                        <th>Thời gian</th>
                        <th>Trạng thái</th>
                        <th className="num">Toán</th>
                        <th className="num">Từ vựng</th>
                        <th className="num">Lần trả lời</th>
                        <th className="num">Gợi ý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.attempts.map((a) => (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td>{fmtDate(a.finishedAt ?? a.startedAt)}</td>
                          <td>{a.status === 'completed' ? 'Hoàn thành' : a.status === 'in_progress' ? 'Đang làm' : 'Bỏ dở'}</td>
                          <td className="num">{a.mathTotal ? `${a.mathCorrect}/${a.mathTotal}` : '—'}</td>
                          <td className="num">{a.vocabTotal ? `${a.vocabCorrect}/${a.vocabTotal}` : '—'}</td>
                          <td className="num">{a.tries}</td>
                          <td className="num">{a.hintsUsed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            <div style={{ marginTop: 14 }}>
              <button className="t-btn danger small" onClick={() => removeOne(r)}>
                Xóa bạn này và kết quả
              </button>
            </div>
          </section>
        ))}

        <section className="t-card">
          <h2>Nội dung bài học</h2>
          <p className="t-note warn">
            Tên bài là tên mô tả chủ đề, <b>chưa đối chiếu</b> với bộ sách giáo khoa nhà trường chọn. “Đã duyệt” nghĩa là đáp án và cách chấm đã được
            kiểm tra, không có nghĩa là bài chính thức trong SGK.
          </p>
          <div className="t-table-wrap">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Bài</th>
                  <th>Chủ đề</th>
                  <th className="num">Số câu</th>
                  <th>Kiểm duyệt</th>
                  <th>Đối chiếu SGK</th>
                </tr>
              </thead>
              <tbody>
                {engine.lessonBank().map((l) => (
                  <tr key={l.id}>
                    <td>{l.title}</td>
                    <td>{l.topic}</td>
                    <td className="num">{l.questionCount}</td>
                    <td>
                      <span className={`badge ${l.status}`}>{l.status === 'approved' ? 'Đã duyệt' : l.status === 'review' ? 'Cần kiểm tra' : 'Bản nháp (ẩn)'}</span>
                    </td>
                    <td>
                      <span className="badge pending">{l.verification === 'verified' ? 'Đã đối chiếu' : 'Chờ đối chiếu'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {reports.length > 0 && (
          <p>
            <button className="t-btn danger" onClick={removeAll}>
              Xóa toàn bộ dữ liệu trên thiết bị
            </button>
          </p>
        )}
      </main>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="t-stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}

function SkillBars({ skills }: { skills: SkillStat[] }) {
  if (!skills.length) return <p className="t-sub">Chưa có dữ liệu.</p>;
  return (
    <div className="bar-chart">
      {skills.map((s) => (
        <div className="row" key={s.skill} title={`${s.name}: ${s.correct}/${s.answered} câu đúng ngay lần đầu`}>
          <span>
            {s.name} <span className={`badge ${s.label}`}>{LABEL_TEXT[s.label]}</span>
          </span>
          <div className="track">
            <div className="fill" style={{ width: `${(s.accuracy ?? 0) * 100}%` }} />
          </div>
          <span className="num">
            {s.correct}/{s.answered}
          </span>
        </div>
      ))}
    </div>
  );
}
