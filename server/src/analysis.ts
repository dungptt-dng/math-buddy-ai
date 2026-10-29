// Phân tích hỗ trợ giáo viên. Mọi nhận định được tính từ dữ liệu làm bài thật và kèm bằng chứng.
// Bộ phân tích chỉ ĐỌC dữ liệu: không sửa đáp án, không sửa điểm, không tạo câu hỏi.
import Anthropic from '@anthropic-ai/sdk';
import type { DB } from './db.js';
import { classReport, lessonForSkill, MIN_EVIDENCE, type ClassReport } from './reports.js';

export type Insight = {
  scope: 'class' | 'student';
  studentId?: number;
  nickname?: string;
  type: 'needs_practice' | 'strength' | 'progress' | 'vocab_support' | 'steady' | 'insufficient_data';
  message: string;
  evidence: string;
  suggestedLesson?: { id: string; title: string };
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function analyzeClass(db: DB, classId: number): { insights: Insight[]; report: ClassReport } {
  const report = classReport(db, classId);
  const assigned = new Set(report.lessons.map((l) => l.lessonId));
  const insights: Insight[] = [];

  for (const s of report.skills) {
    if (s.answered < MIN_EVIDENCE * 2 || s.accuracy === null) continue;
    if (s.accuracy < 0.6) {
      const lesson = lessonForSkill(db, s.skill, assigned) ?? lessonForSkill(db, s.skill);
      insights.push({
        scope: 'class',
        type: 'needs_practice',
        message: `Cả lớp còn hay nhầm ở kỹ năng “${s.name}”. Có thể cho lớp luyện lại bài “${lesson?.title ?? '—'}”.`,
        evidence: `${s.correct}/${s.answered} câu đúng ngay lần đầu (${pct(s.accuracy)}) trên toàn lớp.`,
        suggestedLesson: lesson ?? undefined,
      });
    }
  }

  for (const st of report.students) {
    if (!st.active) continue;
    if (st.questionsDone < MIN_EVIDENCE) {
      insights.push({
        scope: 'student',
        studentId: st.studentId,
        nickname: st.nickname,
        type: 'insufficient_data',
        message: 'Chưa đủ dữ liệu để nhận xét. Cần học sinh làm thêm bài.',
        evidence: `Mới có ${st.questionsDone} câu Toán đã làm (cần ít nhất ${MIN_EVIDENCE}).`,
      });
      continue;
    }
    const before = insights.length;
    for (const sk of st.skills) {
      if (sk.label === 'needs_practice') {
        const lesson = lessonForSkill(db, sk.skill, assigned) ?? lessonForSkill(db, sk.skill);
        insights.push({
          scope: 'student',
          studentId: st.studentId,
          nickname: st.nickname,
          type: 'needs_practice',
          message: `Nên ôn thêm “${sk.name}”${lesson ? ` với bài “${lesson.title}”` : ''}.`,
          evidence: `${sk.correct}/${sk.answered} câu đúng ngay lần đầu (${pct(sk.accuracy!)}).`,
          suggestedLesson: lesson ?? undefined,
        });
      } else if (sk.label === 'mastered') {
        insights.push({
          scope: 'student',
          studentId: st.studentId,
          nickname: st.nickname,
          type: 'strength',
          message: `Đã làm tốt “${sk.name}”.`,
          evidence: `${sk.correct}/${sk.answered} câu đúng ngay lần đầu (${pct(sk.accuracy!)}).`,
        });
      }
    }
    // Tiến bộ: so sánh lần đầu và lần gần nhất của cùng một bài.
    const byLesson = new Map<string, typeof st.attempts>();
    for (const a of st.attempts) {
      if (a.kind !== 'lesson' || !a.lessonId || a.mathTotal === 0) continue;
      byLesson.set(a.lessonId, [...(byLesson.get(a.lessonId) ?? []), a]);
    }
    for (const list of byLesson.values()) {
      if (list.length < 2) continue;
      const first = list[0];
      const last = list[list.length - 1];
      const r1 = first.mathCorrect / first.mathTotal;
      const r2 = last.mathCorrect / last.mathTotal;
      if (r2 - r1 >= 0.15) {
        insights.push({
          scope: 'student',
          studentId: st.studentId,
          nickname: st.nickname,
          type: 'progress',
          message: `Có tiến bộ ở bài “${first.title}”.`,
          evidence: `Lần 1: ${first.mathCorrect}/${first.mathTotal} câu đúng → lần ${list.length}: ${last.mathCorrect}/${last.mathTotal} câu đúng.`,
        });
      }
    }
    // Toán tốt nhưng từ vựng còn yếu: gợi ý hoạt động từ vựng, KHÔNG hạ đánh giá Toán.
    if (st.accuracy !== null && st.accuracy >= 0.8 && st.vocab.answered >= 3 && st.vocab.accuracy !== null && st.vocab.accuracy < 0.5) {
      insights.push({
        scope: 'student',
        studentId: st.studentId,
        nickname: st.nickname,
        type: 'vocab_support',
        message: 'Làm Toán tốt nhưng chưa nhớ nhiều từ tiếng Anh. Có thể cho làm bài “Làm quen từ vựng Toán tiếng Anh”. Điểm Toán không bị ảnh hưởng.',
        evidence: `Toán: ${pct(st.accuracy)} đúng; từ vựng: ${st.vocab.correct}/${st.vocab.answered} câu đúng.`,
        suggestedLesson: { id: 'english-words', title: 'Làm quen từ vựng Toán tiếng Anh' },
      });
    }
    // Có dữ liệu nhưng không có kết luận rõ: vẫn báo cho giáo viên, kèm số liệu, không suy diễn thêm.
    if (insights.length === before) {
      const counted = st.skills.filter((sk) => sk.answered > 0);
      insights.push({
        scope: 'student',
        studentId: st.studentId,
        nickname: st.nickname,
        type: 'steady',
        message: 'Chưa thấy kỹ năng cần ôn hay điểm nổi bật rõ ràng. Cần thêm bài làm để kết luận chắc hơn.',
        evidence: counted.map((sk) => `${sk.name}: ${sk.correct}/${sk.answered} câu đúng ngay lần đầu`).join('; ') + '.',
      });
    }
  }
  return { insights, report };
}

/**
 * Tóm tắt bằng mô hình ngôn ngữ (TÙY CHỌN, chỉ chạy khi có ANTHROPIC_API_KEY).
 * Dữ liệu gửi đi đã tối thiểu hóa: chỉ các nhận định và số liệu ở trên, học sinh được thay bằng "Học sinh 1, 2…",
 * không gửi biệt danh, mã truy cập hay câu trả lời gốc.
 */
export async function summarizeWithLlm(insights: Insight[]): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY || insights.length === 0) return null;
  const alias = new Map<number, string>();
  const anonymized = insights.map((i) => {
    if (i.studentId !== undefined && !alias.has(i.studentId)) alias.set(i.studentId, `Học sinh ${alias.size + 1}`);
    return {
      doi_tuong: i.scope === 'class' ? 'Cả lớp' : alias.get(i.studentId!),
      loai: i.type,
      nhan_dinh: i.message,
      bang_chung: i.evidence,
    };
  });
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
    // Bản tóm tắt cố ý ngắn (vài câu) nên giới hạn đầu ra nhỏ.
    max_tokens: 4000,
    output_config: { effort: 'low' },
    // Nếu mô hình chính từ chối, máy chủ Anthropic tự chuyển sang mô hình dự phòng phù hợp.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system:
      'Bạn hỗ trợ giáo viên lớp 1 tại Việt Nam. Hãy viết một đoạn tóm tắt ngắn (tối đa 5 câu, tiếng Việt) dựa DUY NHẤT trên danh sách nhận định có kèm bằng chứng được cung cấp. ' +
      'Không thêm số liệu, không suy đoán nguyên nhân, không chẩn đoán tâm lý hay năng lực của trẻ, không đề xuất bài học nằm ngoài danh sách. ' +
      'Nếu dữ liệu còn ít, hãy nói rõ là chưa đủ thông tin để kết luận. Giọng văn tích cực, tôn trọng học sinh.',
    messages: [{ role: 'user', content: JSON.stringify(anonymized) }],
  });
  if (response.stop_reason === 'refusal') return null;
  let text = '';
  for (const block of response.content) if (block.type === 'text') text += block.text;
  // Trả lại biệt danh thật chỉ ở phía máy chủ.
  // Thay từ số lớn đến số nhỏ để "Học sinh 10" không bị khớp nhầm với "Học sinh 1".
  for (const [id, a] of [...alias].reverse()) {
    const nick = insights.find((i) => i.studentId === id)?.nickname;
    if (nick) text = text.split(a).join(nick);
  }
  return text.trim() || null;
}
