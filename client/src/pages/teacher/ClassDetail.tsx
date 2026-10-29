import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, download } from '../../api';
import { fmtDate, LABEL_TEXT, pct, useTeacher } from './TeacherLayout';

type Student = { id: number; nickname: string; access_code: string; active: number; last_login_at: string | null };
type LessonRow = { id: string; title: string; topic: string; domain: string; assigned: number; question_count: number };
type Detail = { class: { id: number; name: string; classCode: string }; students: Student[]; lessons: LessonRow[] };
type SkillStat = { skill: string; name: string; answered: number; correct: number; accuracy: number | null; label: keyof typeof LABEL_TEXT };
type StudentReport = {
  studentId: number;
  nickname: string;
  active: boolean;
  questionsDone: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  lessonsCompleted: number;
  vocab: { answered: number; correct: number; accuracy: number | null };
  skills: SkillStat[];
  lastActive: string | null;
};
type Report = {
  students: StudentReport[];
  skills: SkillStat[];
  lessons: { lessonId: string; title: string; completedBy: number; studentCount: number }[];
  totals: { questionsDone: number; correct: number; accuracy: number | null; vocabAnswered: number; vocabCorrect: number };
};
type Insight = { scope: string; nickname?: string; studentId?: number; type: string; message: string; evidence: string };
type Insights = { createdAt: string; source: string; insights: Insight[]; summary: string | null; summaryError?: string | null };

const TABS = [
  ['students', 'Học sinh & mã'],
  ['lessons', 'Bài được giao'],
  ['results', 'Kết quả'],
  ['ai', 'Phân tích AI'],
] as const;

export default function ClassDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('students');
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<Detail>(`/teacher/classes/${id}`, { as: 'teacher' })
      .then(setD)
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  if (error && !d) return <div className="t-error">{error}</div>;
  if (!d) return <p>Đang tải…</p>;

  const removeClass = async () => {
    if (!confirm(`Xóa lớp “${d.class.name}”? Toàn bộ học sinh và kết quả học tập của lớp sẽ bị xóa vĩnh viễn.`)) return;
    await api(`/teacher/classes/${id}`, { method: 'DELETE', as: 'teacher' });
    nav('/giao-vien');
  };

  return (
    <>
      <p style={{ margin: '0 0 6px' }}>
        <Link to="/giao-vien">← Tất cả lớp</Link>
      </p>
      <div className="t-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h1 className="t-title">{d.class.name}</h1>
          <div>
            Mã lớp: <span className="code-badge">{d.class.classCode}</span>
          </div>
        </div>
        <button className="t-btn danger small no-print" onClick={removeClass}>
          Xóa lớp
        </button>
      </div>
      {error && <div className="t-error">{error}</div>}
      <div className="t-tabs no-print" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'students' && <StudentsTab d={d} reload={load} />}
      {tab === 'lessons' && <LessonsTab d={d} reload={load} />}
      {tab === 'results' && <ResultsTab classId={d.class.id} />}
      {tab === 'ai' && <InsightsTab classId={d.class.id} />}
    </>
  );
}

function StudentsTab({ d, reload }: { d: Detail; reload: () => void }) {
  const [names, setNames] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const nicknames = names
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!nicknames.length) return;
    try {
      const r = await api<{ students: unknown[] }>(`/teacher/classes/${d.class.id}/students`, { body: { nicknames }, as: 'teacher' });
      setMsg({ ok: `Đã thêm ${r.students.length} học sinh.` });
      setNames('');
      reload();
    } catch (err) {
      setMsg({ err: (err as Error).message });
    }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg({ ok });
      reload();
    } catch (err) {
      setMsg({ err: (err as Error).message });
    }
  };

  return (
    <>
      {msg.ok && <div className="t-success">{msg.ok}</div>}
      {msg.err && <div className="t-error">{msg.err}</div>}
      <div className="t-card">
        <div className="t-row" style={{ justifyContent: 'space-between' }}>
          <h2>Danh sách học sinh ({d.students.length})</h2>
          <button className="t-btn secondary small no-print" onClick={() => window.print()}>
            In phiếu mã
          </button>
        </div>
        <p className="t-note">
          Học sinh vào lớp bằng <b>Mã lớp {d.class.classCode}</b> + <b>Mã học sinh</b> riêng. Hãy đưa mã trực tiếp cho từng em, không đăng công khai. Khi
          học sinh quên hoặc lộ mã, bấm “Cấp mã mới”: mã cũ hết hiệu lực ngay.
        </p>
        <div className="t-table-wrap">
          <table className="t-table">
            <thead>
              <tr>
                <th>Tên gọi</th>
                <th>Mã học sinh</th>
                <th>Trạng thái</th>
                <th>Vào lớp gần nhất</th>
                <th className="no-print">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {d.students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/giao-vien/hoc-sinh/${s.id}`}>{s.nickname}</Link>
                  </td>
                  <td>
                    <span className="code-badge">{s.access_code}</span>
                  </td>
                  <td>{s.active ? <span className="badge approved">Đang học</span> : <span className="badge draft">Tạm khóa</span>}</td>
                  <td>{fmtDate(s.last_login_at)}</td>
                  <td className="no-print">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="t-btn secondary small"
                        onClick={() => act(() => api(`/teacher/students/${s.id}/reset-code`, { method: 'POST', as: 'teacher' }), `Đã cấp mã mới cho ${s.nickname}.`)}
                      >
                        Cấp mã mới
                      </button>
                      <button
                        className="t-btn secondary small"
                        onClick={() =>
                          act(
                            () => api(`/teacher/students/${s.id}`, { method: 'PATCH', body: { active: !s.active }, as: 'teacher' }),
                            s.active ? `Đã tạm khóa ${s.nickname}.` : `Đã mở lại ${s.nickname}.`,
                          )
                        }
                      >
                        {s.active ? 'Tạm khóa' : 'Mở lại'}
                      </button>
                      <button
                        className="t-btn danger small"
                        onClick={() =>
                          confirm(`Xóa ${s.nickname} và toàn bộ kết quả học tập của em? Không thể hoàn tác.`) &&
                          act(() => api(`/teacher/students/${s.id}`, { method: 'DELETE', as: 'teacher' }), `Đã xóa ${s.nickname}.`)
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {d.students.length === 0 && (
                <tr>
                  <td colSpan={5}>Chưa có học sinh.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <form className="t-card no-print" onSubmit={add}>
        <h2>Thêm học sinh</h2>
        <label className="t-label" htmlFor="names">
          Mỗi dòng một tên gọi (có thể dùng biệt danh, không cần họ tên đầy đủ)
        </label>
        <textarea id="names" className="t-textarea" value={names} onChange={(e) => setNames(e.target.value)} placeholder={'An\nBình\nChi'} />
        <button className="t-btn" style={{ marginTop: 10 }}>
          Thêm và tạo mã
        </button>
      </form>
    </>
  );
}

function LessonsTab({ d, reload }: { d: Detail; reload: () => void }) {
  const [sel, setSel] = useState(() => new Set(d.lessons.filter((l) => l.assigned).map((l) => l.id)));
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const save = async () => {
    try {
      await api(`/teacher/classes/${d.class.id}/lessons`, { method: 'PUT', body: { lessonIds: [...sel] }, as: 'teacher' });
      setMsg({ ok: 'Đã lưu danh sách bài được giao.' });
      reload();
    } catch (err) {
      setMsg({ err: (err as Error).message });
    }
  };
  return (
    <div className="t-card">
      <h2>Bài được giao cho lớp</h2>
      <p className="t-note">Chỉ hiển thị bài đã được duyệt trong ngân hàng nội dung. Học sinh chỉ nhìn thấy và làm được những bài được đánh dấu.</p>
      {msg.ok && <div className="t-success">{msg.ok}</div>}
      {msg.err && <div className="t-error">{msg.err}</div>}
      <div className="check-list">
        {d.lessons.map((l) => (
          <label key={l.id}>
            <input
              type="checkbox"
              checked={sel.has(l.id)}
              onChange={(e) => {
                const n = new Set(sel);
                if (e.target.checked) n.add(l.id);
                else n.delete(l.id);
                setSel(n);
              }}
            />
            <span style={{ flex: 1 }}>
              <b>{l.title}</b> <span style={{ color: 'var(--muted)' }}>· {l.topic} · {l.question_count} câu</span>
            </span>
            <Link to={`/giao-vien/ngan-hang?bai=${l.id}`}>Xem trước</Link>
          </label>
        ))}
      </div>
      <button className="t-btn" style={{ marginTop: 14 }} onClick={save}>
        Lưu
      </button>
    </div>
  );
}

function ResultsTab({ classId }: { classId: number }) {
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Report>(`/teacher/classes/${classId}/report`, { as: 'teacher' })
      .then(setR)
      .catch((e) => setErr(e.message));
  }, [classId]);
  if (err) return <div className="t-error">{err}</div>;
  if (!r) return <p>Đang tải…</p>;
  const exportCsv = (type: 'students' | 'attempts') =>
    download(`/teacher/classes/${classId}/export.csv?type=${type}`, `math-buddy-lop-${classId}-${type === 'students' ? 'hoc-sinh' : 'lan-lam-bai'}.csv`).catch((e) =>
      setErr(e.message),
    );
  return (
    <>
      <div className="t-row no-print" style={{ marginBottom: 12 }}>
        <button className="t-btn secondary" onClick={() => exportCsv('students')}>
          ⬇ Xuất CSV theo học sinh
        </button>
        <button className="t-btn secondary" onClick={() => exportCsv('attempts')}>
          ⬇ Xuất CSV từng lần làm bài
        </button>
      </div>
      <div className="t-stats">
        <Stat k="Câu Toán đã làm" v={r.totals.questionsDone} />
        <Stat k="Đúng ngay lần đầu" v={pct(r.totals.accuracy)} />
        <Stat k="Câu từ vựng đã làm" v={r.totals.vocabAnswered} />
        <Stat k="Từ vựng đúng" v={r.totals.vocabAnswered ? pct(r.totals.vocabCorrect / r.totals.vocabAnswered) : '—'} />
      </div>
      {r.totals.questionsDone === 0 && <p className="t-note">Chưa có dữ liệu làm bài. Số liệu sẽ xuất hiện khi học sinh làm bài trong lớp (chế độ học thử không được tính).</p>}
      <div className="t-card">
        <h2>Kết quả từng học sinh</h2>
        <div className="t-table-wrap">
          <table className="t-table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th className="num">Câu đã làm</th>
                <th className="num">Đúng</th>
                <th className="num">Sai</th>
                <th className="num">Tỷ lệ đúng</th>
                <th className="num">Bài hoàn thành</th>
                <th className="num">Từ vựng</th>
                <th>Kỹ năng cần ôn</th>
                <th>Học gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {r.students.map((s) => (
                <tr key={s.studentId}>
                  <td>
                    <Link to={`/giao-vien/hoc-sinh/${s.studentId}`}>{s.nickname}</Link>
                  </td>
                  <td className="num">{s.questionsDone}</td>
                  <td className="num">{s.correct}</td>
                  <td className="num">{s.wrong}</td>
                  <td className="num">{pct(s.accuracy)}</td>
                  <td className="num">{s.lessonsCompleted}</td>
                  <td className="num">{s.vocab.answered ? `${s.vocab.correct}/${s.vocab.answered}` : '—'}</td>
                  <td>
                    {s.skills
                      .filter((k) => k.label === 'needs_practice')
                      .map((k) => (
                        <span key={k.skill} className="badge needs_practice" style={{ marginRight: 4 }}>
                          {k.name}
                        </span>
                      ))}
                    {s.questionsDone < 5 && <span className="badge insufficient">Chưa đủ dữ liệu</span>}
                    {s.questionsDone >= 5 && !s.skills.some((k) => k.label === 'needs_practice') && <span className="muted">Chưa thấy kỹ năng cần ôn</span>}
                  </td>
                  <td>{fmtDate(s.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="t-card">
        <h2>Kỹ năng của cả lớp (đúng ngay lần đầu)</h2>
        <SkillBars skills={r.skills} />
      </div>
      <div className="t-card">
        <h2>Tiến độ hoàn thành bài</h2>
        <div className="bar-chart">
          {r.lessons.map((l) => (
            <div className="row" key={l.lessonId} title={`${l.completedBy}/${l.studentCount} học sinh đã hoàn thành`}>
              <span>{l.title}</span>
              <div className="track">
                <div className="fill" style={{ width: `${l.studentCount ? (l.completedBy / l.studentCount) * 100 : 0}%` }} />
              </div>
              <span className="num">
                {l.completedBy}/{l.studentCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function SkillBars({ skills }: { skills: SkillStat[] }) {
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

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="t-stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}

const INSIGHT_LABEL: Record<string, string> = {
  needs_practice: 'Cần ôn thêm',
  strength: 'Điểm mạnh',
  progress: 'Tiến bộ',
  vocab_support: 'Từ vựng',
  steady: 'Theo dõi thêm',
  insufficient_data: 'Chưa đủ dữ liệu',
};
const INSIGHT_BADGE: Record<string, string> = {
  needs_practice: 'needs_practice',
  strength: 'mastered',
  progress: 'mastered',
  vocab_support: 'pending',
  steady: 'developing',
  insufficient_data: 'insufficient',
};

function InsightsTab({ classId }: { classId: number }) {
  const { aiSummaryEnabled } = useTeacher();
  const [data, setData] = useState<Insights | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Insights | null>(`/teacher/classes/${classId}/insights`, { as: 'teacher' })
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [classId]);
  const run = async () => {
    setBusy(true);
    setErr('');
    try {
      setData(await api<Insights>(`/teacher/classes/${classId}/insights`, { method: 'POST', as: 'teacher' }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="t-card">
        <h2>Phân tích hỗ trợ giáo viên</h2>
        <p className="t-note">
          Nhận định được tính từ <b>các lần làm bài thực tế</b> của lớp và luôn kèm bằng chứng. Một kỹ năng chỉ được nhận xét khi học sinh đã làm ít nhất 5
          câu của kỹ năng đó. Bài gợi ý chỉ lấy từ ngân hàng bài đã duyệt. Phân tích không sửa đáp án, không sửa điểm và không thay thế đánh giá của
          thầy/cô.
        </p>
        {!aiSummaryEnabled && (
          <p className="t-note warn">Tóm tắt bằng mô hình ngôn ngữ đang tắt (chưa cấu hình ANTHROPIC_API_KEY trên máy chủ). Phân tích theo quy tắc vẫn hoạt động đầy đủ.</p>
        )}
        <button className="t-btn" onClick={run} disabled={busy}>
          {busy ? 'Đang phân tích…' : 'Phân tích dữ liệu hiện tại'}
        </button>
        {err && <div className="t-error">{err}</div>}
      </div>
      {data === undefined ? (
        <p>Đang tải…</p>
      ) : data === null ? (
        <p className="t-sub">Chưa có lần phân tích nào.</p>
      ) : (
        <div className="t-card">
          <h2>
            Kết quả phân tích lúc {fmtDate(data.createdAt)}{' '}
            <span className="badge draft">{data.source === 'rules+llm' ? 'Quy tắc + tóm tắt AI' : 'Phân tích theo quy tắc'}</span>
          </h2>
          {data.summaryError && <div className="t-note warn">{data.summaryError}</div>}
          {data.summary && (
            <div className="t-note">
              <b>Tóm tắt (do AI viết từ các nhận định bên dưới):</b> {data.summary}
            </div>
          )}
          {data.insights.length === 0 && <p>Chưa có nhận định nào – cần thêm dữ liệu làm bài.</p>}
          {data.insights.map((i, n) => (
            <div className="insight" key={n}>
              <div className="who">
                {i.scope === 'class' ? 'Cả lớp' : i.studentId ? <Link to={`/giao-vien/hoc-sinh/${i.studentId}`}>{i.nickname}</Link> : i.nickname}{' '}
                <span className={`badge ${INSIGHT_BADGE[i.type]}`}>{INSIGHT_LABEL[i.type] ?? i.type}</span>
              </div>
              <div>{i.message}</div>
              <div className="ev">Căn cứ: {i.evidence}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
