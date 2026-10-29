import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api';
import { SkillBars } from './ClassDetail';
import { fmtDate, pct } from './TeacherLayout';

type Attempt = {
  attemptId: number;
  kind: 'lesson' | 'game';
  title: string;
  finishedAt: string | null;
  mathCorrect: number;
  mathTotal: number;
  vocabCorrect: number;
  vocabTotal: number;
};
type Report = {
  className: string;
  classId: number;
  nickname: string;
  questionsDone: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  correctAfterRetry: number;
  hintsUsed: number;
  lessonsCompleted: number;
  vocab: { answered: number; correct: number; accuracy: number | null };
  skills: Parameters<typeof SkillBars>[0]['skills'];
  attempts: Attempt[];
};

export default function StudentDetail() {
  const { id } = useParams();
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Report>(`/teacher/students/${id}/report`, { as: 'teacher' })
      .then(setR)
      .catch((e) => setErr(e.message));
  }, [id]);
  if (err) return <div className="t-error">{err}</div>;
  if (!r) return <p>Đang tải…</p>;
  const mastered = r.skills.filter((s) => s.label === 'mastered');
  const weak = r.skills.filter((s) => s.label === 'needs_practice');
  return (
    <>
      <p style={{ margin: '0 0 6px' }}>
        <Link to={`/giao-vien/lop/${r.classId}`}>← {r.className}</Link>
      </p>
      <h1 className="t-title">{r.nickname}</h1>
      <p className="t-sub">Số liệu chỉ tính các lần làm bài trong lớp. “Đúng” nghĩa là đúng ngay ở lần trả lời đầu tiên.</p>
      <div className="t-stats">
        <div className="t-stat">
          <div className="v">{r.questionsDone}</div>
          <div className="k">Câu Toán đã làm</div>
        </div>
        <div className="t-stat">
          <div className="v">
            {r.correct} / {r.wrong}
          </div>
          <div className="k">Đúng / sai</div>
        </div>
        <div className="t-stat">
          <div className="v">{pct(r.accuracy)}</div>
          <div className="k">Tỷ lệ đúng</div>
        </div>
        <div className="t-stat">
          <div className="v">{r.lessonsCompleted}</div>
          <div className="k">Bài đã hoàn thành</div>
        </div>
        <div className="t-stat">
          <div className="v">{r.correctAfterRetry}</div>
          <div className="k">Đúng sau khi thử lại</div>
        </div>
        <div className="t-stat">
          <div className="v">{r.vocab.answered ? `${r.vocab.correct}/${r.vocab.answered}` : '—'}</div>
          <div className="k">Từ vựng tiếng Anh (tính riêng)</div>
        </div>
      </div>
      <div className="t-card">
        <h2>Kỹ năng Toán</h2>
        <p style={{ margin: '0 0 10px' }}>
          <b>Đã vững:</b> {mastered.length ? mastered.map((s) => s.name).join(', ') : '—'}
          <br />
          <b>Cần ôn thêm:</b> {weak.length ? weak.map((s) => s.name).join(', ') : '—'}
        </p>
        <SkillBars skills={r.skills} />
      </div>
      <div className="t-card">
        <h2>Tiến bộ qua các lần luyện tập</h2>
        {r.attempts.length === 0 ? (
          <p className="t-sub">Chưa hoàn thành bài nào.</p>
        ) : (
          <div className="t-table-wrap">
            <table className="t-table">
              <thead>
                <tr>
                  <th>Hoàn thành</th>
                  <th>Bài / trò chơi</th>
                  <th style={{ width: '35%' }}>Toán (đúng ngay lần đầu)</th>
                  <th className="num">Từ vựng</th>
                </tr>
              </thead>
              <tbody>
                {r.attempts.map((a) => (
                  <tr key={a.attemptId}>
                    <td>{fmtDate(a.finishedAt)}</td>
                    <td>
                      {a.title}
                      {a.kind === 'game' && <span className="badge draft"> trò chơi</span>}
                    </td>
                    <td>
                      {a.mathTotal ? (
                        <div className="bar-chart">
                          <div className="row" style={{ gridTemplateColumns: '1fr 60px' }} title={`${a.mathCorrect}/${a.mathTotal}`}>
                            <div className="track">
                              <div className="fill" style={{ width: `${(a.mathCorrect / a.mathTotal) * 100}%` }} />
                            </div>
                            <span className="num">
                              {a.mathCorrect}/{a.mathTotal}
                            </span>
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num">{a.vocabTotal ? `${a.vocabCorrect}/${a.vocabTotal}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
