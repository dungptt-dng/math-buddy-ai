// Ngân hàng bài: xem, tìm, xem trước câu hỏi và trạng thái kiểm duyệt.
// Không có công cụ tạo câu hỏi bằng AI. Chỉ quản trị viên đổi được trạng thái kiểm duyệt.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../api';
import { STATUS_TEXT, useTeacher } from './TeacherLayout';
import { Visual } from '../../components/Visual';
import type { Option, Visual as V } from '../../types';

type LessonRow = {
  id: string;
  title: string;
  topic: string;
  domain: string;
  status: keyof typeof STATUS_TEXT;
  verification: string;
  sourceNote: string;
  questionCount: number;
};
type QPreview = {
  id: string;
  prompt: string;
  kind: string;
  visual?: V | null;
  options?: Option[] | null;
  answer: string | number | string[];
  hints: string[];
  explain: string;
  skillName: string;
  level: number;
  domain: string;
};
const LEVEL = ['', 'Nhận biết', 'Thông hiểu', 'Vận dụng'];

export default function LessonBank() {
  const { user } = useTeacher();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [lessons, setLessons] = useState<LessonRow[] | null>(null);
  const [preview, setPreview] = useState<{ lesson: LessonRow; questions: QPreview[] } | null>(null);
  const [err, setErr] = useState('');
  const selected = params.get('bai');

  const load = useCallback(() => {
    api<{ lessons: LessonRow[] }>(`/teacher/lessons?q=${encodeURIComponent(q)}`, { as: 'teacher' })
      .then((r) => setLessons(r.lessons))
      .catch((e) => setErr(e.message));
  }, [q]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!selected) return setPreview(null);
    api<{ lesson: LessonRow; questions: QPreview[] }>(`/teacher/lessons/${selected}`, { as: 'teacher' })
      .then(setPreview)
      .catch((e) => setErr(e.message));
  }, [selected]);

  const setStatus = async (id: string, status: string) => {
    try {
      await api(`/admin/lessons/${id}/status`, { method: 'PATCH', body: { status }, as: 'teacher' });
      load();
      if (preview) setPreview({ ...preview, lesson: { ...preview.lesson, status: status as LessonRow['status'] } });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const answerText = (x: QPreview) => {
    const ids = Array.isArray(x.answer) ? x.answer : [String(x.answer)];
    if (!x.options) return String(x.answer);
    return ids
      .map((id) => {
        const o = x.options!.find((op) => op.id === id);
        return o?.label ?? (o?.shape ? `hình ${o.shape}` : o?.count !== undefined ? `nhóm ${o.count}` : id);
      })
      .join(', ');
  };

  return (
    <>
      <h1 className="t-title">Ngân hàng bài ôn luyện</h1>
      <p className="t-sub">Giáo viên sử dụng các bài có sẵn đã được kiểm tra và phê duyệt. Nội dung mới được biên soạn và duyệt theo quy trình, không tạo tự động bằng AI.</p>
      <div className="t-note warn">
        Trạng thái “Đã duyệt” nghĩa là câu hỏi đã được kiểm tra đáp án và cách chấm. Điều này <b>không</b> có nghĩa nội dung đã được xác minh là bài chính
        thức trong sách giáo khoa. Hiện tất cả bài đều đang <b>chờ đối chiếu</b> với bộ sách nhà trường lựa chọn.
      </div>
      {err && <div className="t-error">{err}</div>}
      <div className="t-card">
        <label className="t-label" htmlFor="search">
          Tìm theo tên bài hoặc chủ đề
        </label>
        <input id="search" className="t-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: phép cộng, hình học…" />
      </div>
      <div className="t-card">
        <div className="t-table-wrap">
          <table className="t-table">
            <thead>
              <tr>
                <th>Bài</th>
                <th>Chủ đề</th>
                <th className="num">Số câu</th>
                <th>Kiểm duyệt</th>
                <th>Đối chiếu SGK</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lessons?.map((l) => (
                <tr key={l.id}>
                  <td>
                    <b>{l.title}</b>
                  </td>
                  <td>{l.topic}</td>
                  <td className="num">{l.questionCount}</td>
                  <td>
                    {user.role === 'admin' ? (
                      <select className="t-select" style={{ minHeight: 36 }} value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} aria-label={`Trạng thái ${l.title}`}>
                        {Object.entries(STATUS_TEXT).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge ${l.status}`}>{STATUS_TEXT[l.status]}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${l.verification}`}>{l.verification === 'verified' ? 'Đã đối chiếu' : 'Chờ đối chiếu'}</span>
                  </td>
                  <td>
                    <button className="t-btn secondary small" onClick={() => setParams({ bai: l.id })}>
                      Xem trước
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {preview && (
        <div className="t-card">
          <div className="t-row" style={{ justifyContent: 'space-between' }}>
            <h2>
              Xem trước: {preview.lesson.title} <span className={`badge ${preview.lesson.status}`}>{STATUS_TEXT[preview.lesson.status]}</span>
            </h2>
            <button className="t-btn secondary small" onClick={() => setParams({})}>
              Đóng
            </button>
          </div>
          <p className="t-note">
            <b>Nguồn / ghi chú đối chiếu:</b> {preview.lesson.sourceNote}
          </p>
          {preview.questions.map((x, i) => (
            <div className="q-preview" key={x.id}>
              <div className="meta">
                <b>Câu {i + 1}</b>
                <span className="badge draft">{x.skillName}</span>
                <span className="badge pending">{LEVEL[x.level]}</span>
                {x.domain === 'english' && <span className="badge review">Từ vựng – tính riêng, không vào điểm Toán</span>}
              </div>
              <div style={{ fontWeight: 700 }}>{x.prompt}</div>
              {x.visual && (
                <div style={{ transform: 'scale(0.7)', transformOrigin: 'left top', marginBottom: -20 }}>
                  <Visual v={x.visual} />
                </div>
              )}
              <div>
                <b>Đáp án chuẩn:</b> {answerText(x)}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                <b>Gợi ý:</b> {x.hints.join(' → ')}
                <br />
                <b>Lời giải:</b> {x.explain}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
