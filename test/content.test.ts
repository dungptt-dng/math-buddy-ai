// Kiểm tra tính chính xác của ngân hàng câu hỏi: đáp án khớp phương án, khớp hình minh họa và phép tính.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../src/content/lessons';
import type { Question } from '../src/content/types';
import { BUDDY_CORRECT, BUDDY_REVEAL, BUDDY_TRY_AGAIN } from '../src/engine/grading';

const all = LESSONS.flatMap((l) => l.questions.map((q) => ({ lesson: l, q })));
const VIET = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

test('mã câu hỏi và mã bài là duy nhất', () => {
  const ids = all.map((x) => x.q.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
});

test('mỗi bài Toán đã duyệt có 10–15 câu', () => {
  for (const l of LESSONS.filter((x) => x.status === 'approved')) {
    assert.ok(l.questions.length >= 10 && l.questions.length <= 15, `${l.id}: ${l.questions.length} câu`);
  }
});

test('đáp án chuẩn hợp lệ với dạng câu hỏi', () => {
  for (const { q } of all) {
    const ids = (q.options ?? []).map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${q.id}: trùng mã phương án`);
    if (q.kind === 'choice') {
      assert.ok(ids.includes(q.answer as string), `${q.id}: đáp án không nằm trong phương án`);
      assert.ok(ids.length >= 2, `${q.id}: cần ít nhất 2 phương án`);
    } else if (q.kind === 'multi') {
      const ans = q.answer as string[];
      assert.ok(Array.isArray(ans) && ans.length > 0 && ans.every((a) => ids.includes(a)), `${q.id}: đáp án nhiều lựa chọn sai`);
    } else {
      assert.ok(Number.isInteger(q.answer) && (q.answer as number) >= 0, `${q.id}: đáp án số không hợp lệ`);
      assert.equal(q.options, undefined);
    }
  }
});

test('phương án dạng số không trùng nhau và nhãn không trùng', () => {
  for (const { q } of all) {
    const labels = (q.options ?? []).filter((o) => o.label).map((o) => o.label);
    assert.equal(new Set(labels).size, labels.length, `${q.id}: trùng nhãn phương án`);
  }
});

function numericAnswer(q: Question): number | null {
  if (q.kind === 'number') return q.answer as number;
  if (q.kind === 'choice') {
    const label = q.options!.find((o) => o.id === q.answer)?.label;
    return label !== undefined && /^\d+$/.test(label) ? Number(label) : null;
  }
  return null;
}

test('đáp án khớp với hình minh họa và phép tính', () => {
  for (const { q } of all) {
    const v = q.visual;
    const n = numericAnswer(q);
    if (!v || n === null) continue;
    if (v.type === 'objects' && /bao nhiêu|mấy/.test(q.prompt)) {
      assert.equal(n, v.groups.reduce((s, g) => s + g.count, 0), `${q.id}: đếm hình không khớp đáp án`);
    }
    if (v.type === 'crossed') assert.equal(n, v.total - v.crossed, `${q.id}: phép trừ hình không khớp`);
    if (v.type === 'expression') {
      const t = v.tokens.map((x) => (x === '−' ? '-' : x));
      const op = t[1];
      if (t[4] === '?') {
        const expect = op === '+' ? Number(t[0]) + Number(t[2]) : Number(t[0]) - Number(t[2]);
        assert.equal(n, expect, `${q.id}: kết quả phép tính sai`);
      } else if (t[2] === '?') {
        const expect = op === '+' ? Number(t[4]) - Number(t[0]) : Number(t[0]) - Number(t[4]);
        assert.equal(n, expect, `${q.id}: số còn thiếu sai`);
      }
    }
    if (v.type === 'sequence') {
      const gap = v.items.indexOf(null);
      const step = (v.items[1] ?? 0) - (v.items[0] ?? 0) || (v.items[4] as number) - (v.items[3] as number);
      assert.equal(n, (v.items[gap - 1] as number) + step, `${q.id}: dãy số sai`);
    }
    if (v.type === 'shapes' && q.kind === 'number') {
      const kind = q.prompt.includes('tam giác') ? 'triangle' : q.prompt.includes('tròn') ? 'circle' : q.prompt.includes('vuông') ? 'square' : 'rectangle';
      assert.equal(n, v.shapes.filter((s) => s.kind === kind).length, `${q.id}: đếm hình học sai`);
    }
  }
});

test('câu săn hình chọn đúng tất cả hình cùng loại', () => {
  for (const { q } of all.filter((x) => x.q.kind === 'multi')) {
    const kind = q.prompt.includes('tròn') ? 'circle' : q.prompt.includes('vuông') ? 'square' : q.prompt.includes('tam giác') ? 'triangle' : 'rectangle';
    const expected = q.options!.filter((o) => o.shape === kind).map((o) => o.id);
    assert.deepEqual([...(q.answer as string[])].sort(), expected.sort(), q.id);
  }
});

test('phép tính nằm trong phạm vi 10', () => {
  for (const { lesson, q } of all) {
    if (lesson.id === 'numbers-20') continue;
    const n = numericAnswer(q);
    if (n !== null) assert.ok(n >= 0 && n <= 10, `${q.id}: ${n} ngoài phạm vi 10`);
  }
});

test('mỗi câu có gợi ý, lời giải và kỹ năng; câu từ vựng tách riêng miền tiếng Anh', () => {
  for (const { lesson, q } of all) {
    assert.ok(q.hints.length >= 1 && q.hints.every((h) => h.trim().length > 0), `${q.id}: thiếu gợi ý`);
    assert.ok(q.explain.trim().length > 0, `${q.id}: thiếu lời giải`);
    assert.ok(q.skill, `${q.id}: thiếu kỹ năng`);
    if (q.skill === 'vocab') assert.equal(q.domain, 'english', q.id);
    else assert.equal(q.domain, 'math', q.id);
    if (lesson.domain === 'english') assert.equal(q.domain, 'english', q.id);
  }
});

test('lời thoại Buddy chỉ dùng tiếng Anh (không trộn tiếng Việt)', () => {
  const lines = [...BUDDY_CORRECT, ...BUDDY_TRY_AGAIN, BUDDY_REVEAL];
  for (const { q } of all) {
    if (q.feedbackCorrect) lines.push(q.feedbackCorrect);
    if (q.feedbackWrong) lines.push(q.feedbackWrong);
  }
  for (const line of lines) assert.ok(!VIET.test(line), `Lời thoại có tiếng Việt: "${line}"`);
});

test('gợi ý không nói thẳng đáp án ở câu tính toán', () => {
  for (const { q } of all) {
    if (q.visual?.type !== 'expression' || q.kind !== 'number') continue;
    const n = String(q.answer);
    assert.ok(!q.hints[0].includes(`= ${n}`), `${q.id}: gợi ý đầu tiên lộ đáp án`);
  }
});

test('mọi bài đều ghi rõ tình trạng đối chiếu nguồn', () => {
  for (const l of LESSONS) {
    assert.ok(l.sourceNote.length > 20, l.id);
    assert.equal(l.verification, 'pending', `${l.id}: chưa có tài liệu xác minh nên phải để "pending"`);
  }
});
