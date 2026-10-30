// Góc phụ huynh & thầy cô: kết quả học của các bạn trên THIẾT BỊ NÀY (không có máy chủ, không gửi dữ liệu đi đâu).
// Mọi số liệu được tính từ các lần làm bài thật; kỹ năng chỉ được nhận xét khi có đủ dữ liệu.
// Báo cáo Toán và báo cáo tiếng Anh tách riêng (hai thẻ), không gộp thành một điểm chung.
import { useState } from 'react';
import { Link } from 'react-router';
import { BUDDY_IMG } from '../components/Kid';
import * as engine from '../engine';
import type { EnglishReport, EnWordStat, ProfileReport, SkillStat } from '../types';

const LABEL_TEXT = {
  mastered: 'Đã vững',
  developing: 'Đang tiến bộ',
  needs_practice: 'Cần ôn thêm',
  insufficient: 'Chưa đủ dữ liệu',
} as const;
const TYPE_TEXT: Record<string, string> = {
  listen_word: 'Nghe – chọn từ',
  listen_picture: 'Nghe – chọn hình',
  picture_word: 'Nhìn hình – chọn từ',
  match: 'Ghép từ',
  missing: 'Chọn chữ/từ còn thiếu',
  sentence: 'Mẫu câu',
};
const score = (s: { correct: number; total: number }) => (s.total ? `${s.correct}/${s.total}` : '—');
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
  const [tab, setTab] = useState<'math' | 'english'>('math');
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

        <div className="t-tabs" role="tablist" style={{ marginTop: 14 }}>
          <button role="tab" aria-selected={tab === 'math'} className={tab === 'math' ? 'active' : ''} onClick={() => setTab('math')}>
            🧮 Báo cáo Toán
          </button>
          <button role="tab" aria-selected={tab === 'english'} className={tab === 'english' ? 'active' : ''} onClick={() => setTab('english')}>
            🔤 Báo cáo tiếng Anh
          </button>
        </div>

        {tab === 'math' ? (
          <div className="t-row" style={{ margin: '0 0 18px' }}>
            <button className="t-btn" disabled={!reports.length} onClick={() => download(engine.exportCsv('profiles'), 'math-buddy-toan-theo-ban.csv')}>
              ⬇ CSV Toán theo bạn học
            </button>
            <button className="t-btn secondary" disabled={!reports.length} onClick={() => download(engine.exportCsv('attempts'), 'math-buddy-toan-tung-lan-lam-bai.csv')}>
              ⬇ CSV Toán từng lần làm bài
            </button>
          </div>
        ) : (
          <div className="t-row" style={{ margin: '0 0 18px' }}>
            <button className="t-btn" disabled={!reports.length} onClick={() => download(engine.exportCsv('english'), 'math-buddy-tieng-anh-theo-ban.csv')}>
              ⬇ CSV tiếng Anh theo bạn học
            </button>
            <button className="t-btn secondary" disabled={!reports.length} onClick={() => download(engine.exportCsv('english-words'), 'math-buddy-tieng-anh-tung-tu.csv')}>
              ⬇ CSV tiếng Anh từng từ
            </button>
          </div>
        )}

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
              <span className="t-sub">Học gần nhất: {fmtDate([r.lastActive, r.english.lastActive].filter(Boolean).sort().at(-1) ?? null)}</span>
            </div>
            {tab === 'english' ? (
              <EnglishPanel e={r.english} wordsMet={r.wordsMet} />
            ) : (
            <>
            <div className="t-stats" style={{ marginTop: 12 }}>
              <Stat k="Bài Toán đã hoàn thành" v={`${r.lessonsCompleted}/${r.lessonsTotal}`} />
              <Stat k="Tỷ lệ hoàn thành" v={pct(r.lessonsTotal ? r.lessonsCompleted / r.lessonsTotal : null)} />
              <Stat k="Câu Toán đã làm" v={r.questionsDone} />
              <Stat k="Đúng ngay lần đầu" v={`${r.correct} (${pct(r.accuracy)})`} />
              <Stat k="Sai ở lần đầu" v={r.wrong} />
              <Stat k="Lần bấm Gợi ý" v={r.hintsUsed} />
            </div>
            {r.correctAfterRetry > 0 && <p className="t-sub">Thêm {r.correctAfterRetry} câu Toán làm đúng sau khi thử lại (không tính vào điểm chính).</p>}

            <h3>Kỹ năng Toán (đúng ngay lần đầu)</h3>
            <SkillBars skills={r.skills} />
            <p className="t-sub" style={{ fontSize: 13 }}>
              Kỹ năng chỉ được nhận xét khi đã làm ít nhất {engine.MIN_EVIDENCE} câu. Đây là số liệu luyện tập, không phải đánh giá chính thức.
            </p>

            {r.skills.some((s) => s.label === 'needs_practice') && (
              <p className="t-note warn">
                <b>Kỹ năng Toán cần ôn:</b> {r.skills.filter((s) => s.label === 'needs_practice').map((s) => s.name).join(', ')}.
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
                        {r.vocab.answered > 0 && <th className="num">Từ vựng (bản cũ)</th>}
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
                          {r.vocab.answered > 0 && <td className="num">{a.vocabTotal ? `${a.vocabCorrect}/${a.vocabTotal}` : '—'}</td>}
                          <td className="num">{a.tries}</td>
                          <td className="num">{a.hintsUsed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            </>
            )}
            <div style={{ marginTop: 14 }}>
              <button className="t-btn danger small" onClick={() => removeOne(r)}>
                Xóa bạn này và kết quả
              </button>
            </div>
          </section>
        ))}

        {tab === 'english' && <EnglishBank />}
        <section className="t-card" hidden={tab !== 'math'}>
          <h2>Nội dung bài Toán</h2>
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

function EnglishPanel({ e, wordsMet }: { e: EnglishReport; wordsMet: string[] }) {
  const by = (l: EnWordStat['label']) => e.words.filter((w) => w.label === l);
  return (
    <>
      <div className="t-stats" style={{ marginTop: 12 }}>
        <Stat k="Chủ đề đã hoàn thành" v={`${e.topicsCompleted}/${e.topicsTotal}`} />
        <Stat k="Từ đã làm quen" v={`${e.wordsFamiliar}/${e.wordsTotal}`} />
        <Stat k="Câu đúng ngay lần đầu" v={score({ correct: e.correct, total: e.answered })} />
        <Stat k="Nghe (nghe – chọn từ/hình)" v={score(e.skills.listening)} />
        <Stat k="Nhận diện từ (hình, ghép, điền)" v={score(e.skills.recognition)} />
        <Stat k="Mẫu câu" v={score(e.skills.sentence)} />
      </div>
      <p className="t-sub" style={{ fontSize: 13 }}>
        Kết quả tiếng Anh tính riêng, không cộng vào và không trừ điểm Toán. Ứng dụng chỉ chấm nghe – nhìn – chọn; không ghi âm, không chấm phát âm.
      </p>

      <h3>Từ vựng</h3>
      <WordGroup title="Nhận biết tốt" cls="mastered" words={by('good')} />
      <WordGroup title="Cần luyện thêm" cls="needs_practice" words={by('review')} />
      <WordGroup title="Đang làm quen" cls="insufficient" words={[...by('learning'), ...by('new')]} />
      <p className="t-sub" style={{ fontSize: 13 }}>
        Mức của từng từ tính theo 3 lần gặp gần nhất trong câu luyện tập: “Nhận biết tốt” khi đã gặp ít nhất 2 lần, lần gần nhất đúng và sai không quá 1 lần; “Cần luyện
        thêm” khi lần gần nhất chưa đúng hoặc sai từ 2 lần; “Đang làm quen” khi mới gặp 1 lần hoặc mới xem thẻ từ.
      </p>
      {wordsMet.length > 0 && (
        <p className="t-sub">
          Từ Buddy giới thiệu thêm trong bài Toán: <span lang="en">{wordsMet.join(', ')}</span>
        </p>
      )}

      <h3>Chủ đề</h3>
      <div className="t-table-wrap">
        <table className="t-table">
          <thead>
            <tr>
              <th>Chủ đề</th>
              <th>Trạng thái</th>
              <th className="num">Số lần hoàn thành</th>
              <th className="num">Kết quả tốt nhất</th>
            </tr>
          </thead>
          <tbody>
            {e.topics.map((t) => (
              <tr key={t.id}>
                <td>
                  <span lang="en">{t.title}</span> <span className="t-sub">· {t.vi}</span>
                </td>
                <td>
                  <span className={`badge ${t.status === 'completed' ? 'mastered' : t.status === 'in_progress' ? 'developing' : 'insufficient'}`}>
                    {t.status === 'completed' ? 'Đã hoàn thành' : t.status === 'in_progress' ? 'Đang học' : 'Chưa học'}
                  </span>
                </td>
                <td className="num">{t.times}</td>
                <td className="num">{t.best ? score(t.best) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Gợi ý ôn tập</h3>
      {e.suggestions.length ? (
        <ul className="t-suggest">
          {e.suggestions.map((x) => (
            <li key={x.topicId}>
              <b lang="en">{x.title}</b> ({x.vi}): {x.reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-sub">Bạn đã hoàn thành tất cả chủ đề và không có từ cần ôn.</p>
      )}
      <p className="t-sub" style={{ fontSize: 13 }}>
        Gợi ý được tính theo quy tắc từ kết quả thật của bạn (từ cần ôn → chủ đề đang học dở → chủ đề chưa học) và chỉ chọn chủ đề có sẵn trong ngân hàng. Ứng dụng không
        dùng AI và không tự tạo câu hỏi mới.
      </p>

      {e.attempts.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Các lần học tiếng Anh ({e.attempts.length})</summary>
          <div className="t-table-wrap">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Chủ đề / trò chơi</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th className="num">Đúng ngay lần đầu</th>
                  <th className="num">Lần trả lời</th>
                </tr>
              </thead>
              <tbody>
                {e.attempts.map((a) => (
                  <tr key={a.id}>
                    <td lang="en">{a.title}</td>
                    <td>{fmtDate(a.finishedAt ?? a.startedAt)}</td>
                    <td>{a.status === 'completed' ? 'Hoàn thành' : a.status === 'in_progress' ? 'Đang học' : 'Bỏ dở'}</td>
                    <td className="num">
                      {a.correct}/{a.total}
                    </td>
                    <td className="num">{a.tries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}

function WordGroup({ title, cls, words }: { title: string; cls: string; words: EnWordStat[] }) {
  return (
    <div className="t-words">
      <span className={`badge ${cls}`}>
        {title} ({words.length})
      </span>
      {words.length ? (
        words.map((w) => (
          <span key={w.id} className="t-word" lang="en" title={`${w.vi} · đúng ngay lần đầu ${w.correct}/${w.answered}`}>
            {w.text}
            {w.answered > 0 && (
              <small>
                {' '}
                {w.correct}/{w.answered}
              </small>
            )}
          </span>
        ))
      ) : (
        <span className="t-sub">—</span>
      )}
    </div>
  );
}

function EnglishBank() {
  return (
    <section className="t-card">
      <h2>Nội dung tiếng Anh</h2>
      <p className="t-note warn">
        Từ vựng và câu luyện tập do nhóm phát triển soạn cho trẻ 6–7 tuổi, gắn với Toán lớp 1. <b>Chưa được giáo viên tiếng Anh tiểu học rà soát</b> và chưa đối chiếu với
        chương trình tiếng Anh lớp 1. Mỗi chủ đề có 3–5 từ mới.
      </p>
      <div className="t-table-wrap">
        <table className="t-table">
          <thead>
            <tr>
              <th>Chủ đề</th>
              <th>Từ vựng</th>
              <th className="num">Số câu</th>
              <th>Dạng bài</th>
            </tr>
          </thead>
          <tbody>
            {engine.englishBank().map((t) => (
              <tr key={t.id}>
                <td>
                  <span lang="en">{t.title}</span> <span className="t-sub">· {t.vi}</span>
                </td>
                <td lang="en">{t.words.join(', ')}</td>
                <td className="num">{t.questionCount}</td>
                <td>{t.types.map((x) => TYPE_TEXT[x]).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
