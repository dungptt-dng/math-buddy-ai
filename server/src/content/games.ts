import type { SkillId } from './types.js';

export type Game = {
  id: string;
  title: string;
  englishName: string;
  howTo: string;
  skills: SkillId[];
  size: number;
};

/** Trò chơi lấy câu hỏi từ các bài ĐÃ DUYỆT mà người học được phép truy cập. */
export const GAMES: Game[] = [
  {
    id: 'magic-numbers',
    title: 'Số kỳ diệu',
    englishName: 'Magic Numbers',
    howTo: 'Đếm và chọn số đúng. Mỗi câu đúng thắp sáng một ngôi sao!',
    skills: ['count', 'read_number', 'number_order'],
    size: 8,
  },
  {
    id: 'math-garden',
    title: 'Vườn Toán',
    englishName: 'Math Garden',
    howTo: 'Mỗi câu trả lời đúng làm nở một bông hoa trong vườn của con.',
    skills: ['add', 'sub', 'compare'],
    size: 8,
  },
  {
    id: 'shape-hunt',
    title: 'Săn hình',
    englishName: 'Shape Hunt',
    howTo: 'Tìm và chạm đúng hình mà Buddy gọi tên.',
    skills: ['shapes'],
    size: 6,
  },
];

export const MIN_GAME_QUESTIONS = 4;
