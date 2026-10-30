// Lời Buddy ở khu "Làm quen tiếng Anh". Lời Buddy nói (en) CHỈ là tiếng Anh đơn giản, câu ngắn;
// nghĩa tiếng Việt (vi) được hiển thị riêng bên dưới để con hiểu, không đọc chung và không trộn vào lời Buddy.
// Lời được chọn SAU khi bộ chấm đã quyết định đúng/sai, nên không bao giờ trái với kết quả chấm.
import type { EnExercise, Line } from '../content/englishTopics';

export const EN_CORRECT: Line[] = [
  { en: 'Very good!', vi: 'Giỏi lắm!' },
  { en: 'Great job!', vi: 'Con làm tốt lắm!' },
  { en: 'Yes! That is right!', vi: 'Đúng rồi!' },
  { en: 'Excellent!', vi: 'Xuất sắc!' },
  { en: 'Super!', vi: 'Tuyệt vời!' },
];
export const EN_AFTER_RETRY: Line[] = [
  { en: 'You did it!', vi: 'Con làm được rồi!' },
  { en: 'Yes! Good trying!', vi: 'Đúng rồi! Con cố gắng giỏi lắm!' },
];
/** Lời động viên sau lần sai thứ 1, thứ 2 (còn lượt). */
export const EN_TRY_AGAIN: Record<1 | 2, Line[]> = {
  1: [
    { en: 'Try again!', vi: 'Con thử lại nhé!' },
    { en: 'Almost! Try again!', vi: 'Gần đúng rồi! Thử lại nhé!' },
  ],
  2: [
    { en: 'Good try! One more time!', vi: 'Con cố gắng lắm! Thử thêm một lần nữa nhé!' },
    { en: 'You can do it!', vi: 'Con làm được mà!' },
  ],
};
export const EN_REVEAL: Line = { en: "Good try! Let's learn it together.", vi: 'Con đã cố gắng! Cùng xem đáp án và học lại nhé.' };

/** Gợi ý sau lần sai, theo dạng bài. */
export const EN_TIP: Record<EnExercise, Line> = {
  listen_word: { en: 'Tap the speaker. Listen again.', vi: 'Bấm nút loa để nghe lại nhé.' },
  listen_picture: { en: 'Tap the speaker. Listen again.', vi: 'Bấm nút loa để nghe lại nhé.' },
  picture_word: { en: 'Look at the picture again.', vi: 'Con nhìn kỹ hình lại nhé.' },
  match: { en: 'Some pairs are not right. Try again!', vi: 'Có cặp chưa đúng. Con nối lại nhé.' },
  missing: { en: 'Read it again. What is missing?', vi: 'Con đọc lại xem còn thiếu gì nhé.' },
  sentence: { en: 'Listen to the question again.', vi: 'Con nghe lại câu hỏi nhé.' },
};

/** Lời Buddy ở phần làm quen từ mới. */
export const EN_LEARN: { first: Line; next: Line; ready: Line } = {
  first: { en: "Let's learn a new word!", vi: 'Cùng học từ mới nhé!' },
  next: { en: 'Listen and repeat!', vi: 'Nghe và nói theo Buddy nhé!' },
  ready: { en: "Let's practice!", vi: 'Cùng luyện tập nhé!' },
};

/** Phần thưởng trò chơi Bóng bay từ vựng khi trả lời đúng. */
export const EN_GAME_REWARD: Record<string, Line> = {
  'word-balloons': { en: 'Pop! A balloon flies up!', vi: 'Một quả bóng bay lên trời!' },
};

/** Lời chúc mừng khi xong bài, theo tỷ lệ đúng ngay lần đầu – luôn tích cực. */
export function enFinishLines(ratio: number): [Line, Line] {
  if (ratio >= 0.9) return [{ en: 'Fantastic! You finished!', vi: 'Tuyệt vời! Con đã học xong!' }, { en: 'You are an English star!', vi: 'Con là ngôi sao tiếng Anh!' }];
  if (ratio >= 0.7) return [{ en: 'Great job! You finished!', vi: 'Giỏi lắm! Con đã học xong!' }, { en: 'You know many words!', vi: 'Con đã biết nhiều từ rồi!' }];
  if (ratio >= 0.4) return [{ en: 'You did it! Well done!', vi: 'Con làm xong rồi! Giỏi lắm!' }, { en: 'Practice makes you stronger!', vi: 'Luyện tập nhiều, con sẽ giỏi hơn!' }];
  return [{ en: 'You finished! Good trying!', vi: 'Con đã học xong! Con cố gắng lắm!' }, { en: "Let's listen and learn again.", vi: 'Cùng nghe và học lại nhé.' }];
}

export function pickLine(list: Line[], seed: number): Line {
  return list[Math.abs(seed) % list.length];
}
