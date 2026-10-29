import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, parseNumberInput } from '../src/engine/grading';

const choice = { kind: 'choice' as const, options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], answer: 'b' };
const num = { kind: 'number' as const, answer: 7 };
const multi = { kind: 'multi' as const, options: [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }], answer: ['s1', 's3'] };

test('chấm câu chọn đáp án', () => {
  assert.equal(grade(choice, 'b'), 'correct');
  assert.equal(grade(choice, 'a'), 'wrong');
  assert.equal(grade(choice, 'z'), 'invalid');
  assert.equal(grade(choice, 1), 'invalid');
  assert.equal(grade(choice, undefined), 'invalid');
});

test('chấm câu nhập số, xử lý khoảng trắng và định dạng', () => {
  assert.equal(grade(num, '7'), 'correct');
  assert.equal(grade(num, ' 7 '), 'correct');
  assert.equal(grade(num, '０７'), 'correct'); // chữ số toàn chiều rộng
  assert.equal(grade(num, 7), 'correct');
  assert.equal(grade(num, '8'), 'wrong');
  assert.equal(grade(num, ''), 'invalid');
  assert.equal(grade(num, 'bảy'), 'invalid');
  assert.equal(grade(num, '7.5'), 'invalid');
  assert.equal(grade(num, '-7'), 'invalid');
  assert.equal(grade(num, 7.5), 'invalid');
  assert.equal(grade(num, null), 'invalid');
  assert.equal(parseNumberInput('1 0'), 10);
});

test('chấm câu chọn nhiều hình', () => {
  assert.equal(grade(multi, ['s3', 's1']), 'correct');
  assert.equal(grade(multi, ['s1']), 'wrong');
  assert.equal(grade(multi, ['s1', 's3', 's4']), 'wrong');
  assert.equal(grade(multi, []), 'invalid');
  assert.equal(grade(multi, ['s1', 's1']), 'invalid');
  assert.equal(grade(multi, ['s9']), 'invalid');
  assert.equal(grade(multi, 's1'), 'invalid');
});
