import type { EnExercise, EnOption, EnPic, EnSkill, Line } from './content/englishTopics';

export type ShapeKind = 'circle' | 'triangle' | 'square' | 'rectangle';
export type Group = { icon: string; count: number; label?: string };

export type Visual =
  | { type: 'objects'; groups: Group[]; op?: '+' }
  | { type: 'crossed'; icon: string; total: number; crossed: number }
  | { type: 'compare'; left: Group; right: Group }
  | { type: 'expression'; tokens: string[] }
  | { type: 'shapes'; shapes: { kind: ShapeKind; color: string }[]; target?: ShapeKind }
  | { type: 'sequence'; items: (number | null)[] }
  | { type: 'bars'; bars: { label: string; length: number; color: string }[]; units?: boolean }
  | { type: 'word'; text: string };

export type Option = { id: string; label?: string; shape?: ShapeKind; color?: string; icon?: string; count?: number };

export type PublicQuestion = {
  id: string;
  prompt: string;
  speak?: string;
  visual?: Visual;
  kind: 'choice' | 'number' | 'multi';
  options?: Option[];
  domain: 'math' | 'english';
  vocab?: string[];
  hintCount: number;
};

/** 0 = chưa cần gợi ý, 1 = gợi ý nhẹ, 2 = cùng đếm (hình được làm nổi bật), 3 = từng bước nhỏ. */
export type HintLevel = 0 | 1 | 2 | 3;
/** Gợi ý tiếng Anh của Buddy cho lần thử lại. */
export type BuddyHelp = { tip?: string; steps?: string[] };

export type Progress = {
  questionId: string;
  done: boolean;
  tries: number;
  firstTryCorrect: boolean;
  finalCorrect: boolean;
  hintLevel: HintLevel;
  /** Phương án đã chọn sai (câu một lựa chọn) – được gạch đi khi thử lại. */
  eliminated: string[];
  help: BuddyHelp | null;
};

export type AttemptState = {
  id: number;
  mode: 'profile' | 'trial';
  kind: 'lesson' | 'game';
  lessonId: string | null;
  gameId: string | null;
  title: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  maxTries: number;
  questions: PublicQuestion[];
  progress: Progress[];
};

export type AnswerResponse =
  | { status: 'invalid'; guide: string }
  | {
      status: 'correct' | 'wrong';
      done: boolean;
      /** Lần trả lời thứ mấy của câu này. */
      attemptCount: number;
      hintLevel: HintLevel;
      /** Lời Buddy – chỉ tiếng Anh. */
      buddy: string;
      tip?: string;
      steps?: string[];
      /** Từ tiếng Anh mới Buddy giới thiệu (không phải câu nào cũng có). */
      englishWord?: string;
      /** Phần thưởng trong trò chơi. */
      reward?: string;
      /** Chỉ có khi câu đã xong. */
      correctAnswer?: string | number | string[];
      /** Lời giải Toán bằng tiếng Việt khi con đã hết lượt (hiển thị riêng với lời Buddy). */
      explain?: string;
    };

export type LessonCard = {
  id: string;
  title: string;
  topic: string;
  icon: string;
  domain: 'math' | 'english';
  questionCount: number;
  status: 'new' | 'in_progress' | 'completed';
  inProgressAttemptId: number | null;
  answeredInProgress: number;
  last: { mathCorrect: number; mathTotal: number; vocabCorrect: number; vocabTotal: number } | null;
};

export type GameCard = { id: string; title: string; englishName: string; howTo: string; available: boolean };

export type Result = {
  attemptId: number;
  kind: 'lesson' | 'game';
  mode: 'profile' | 'trial';
  lessonId: string | null;
  gameId: string | null;
  mathCorrect: number;
  mathTotal: number;
  vocabCorrect: number;
  vocabTotal: number;
  correctAfterRetry: number;
  buddy: string;
  praise: string;
  goodSkills: string[];
  next: { lessonId: string; title: string; reason: string } | null;
  trialNotice: string | null;
};

/** className: tên lớp con tự nhập (VD "1A"); dữ liệu cũ có thể chưa có. Tên và lớp chỉ để hiển thị, không phải thông tin xác thực. */
export type Profile = { id: string; nickname: string; className?: string; avatar: string; createdAt: string };

export type Me = { mode: 'profile'; profile: Profile } | { mode: 'trial'; notice: string };

export type SkillLabel = 'mastered' | 'developing' | 'needs_practice' | 'insufficient';
export type SkillStat = { skill: string; name: string; answered: number; correct: number; accuracy: number | null; label: SkillLabel };

export type AttemptSummary = {
  id: number;
  kind: 'lesson' | 'game';
  title: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  finishedAt: string | null;
  mathCorrect: number;
  mathTotal: number;
  vocabCorrect: number;
  vocabTotal: number;
  tries: number;
  hintsUsed: number;
};

export type ProfileReport = {
  profile: Profile;
  questionsDone: number;
  correct: number;
  /** Câu Toán sai ở lần đầu. */
  wrong: number;
  accuracy: number | null;
  correctAfterRetry: number;
  lessonsCompleted: number;
  /** Số bài Toán đang mở cho học sinh (để tính tỷ lệ hoàn thành). */
  lessonsTotal: number;
  hintsUsed: number;
  /** Câu từ vựng của bản cũ (nằm trong bài Toán) – theo dõi riêng, không tính vào điểm Toán. */
  vocab: { answered: number; correct: number };
  /** Từ tiếng Anh Buddy giới thiệu trong bài Toán (và câu từ vựng bản cũ). */
  wordsMet: string[];
  /** Kết quả khu Làm quen tiếng Anh – báo cáo riêng. */
  english: EnglishReport;
  skills: SkillStat[];
  attempts: AttemptSummary[];
  lastActive: string | null;
};

// ---------- Khu "Làm quen tiếng Anh" (kết quả riêng, không gộp với Toán) ----------

export type { EnExercise, EnOption, EnPic, EnSkill, Line } from './content/englishTopics';
export type EnWordInfo = { id: string; text: string; vi: string; pic: EnPic };

/** Câu tiếng Anh gửi cho màn hình làm bài: không có đáp án. */
export type EnPublicQuestion = {
  id: string;
  kind: 'choice' | 'match';
  type: EnExercise;
  ask: Line;
  say: string;
  listen: boolean;
  pic?: EnPic;
  text?: string;
  options?: EnOption[];
  left?: EnOption[];
  right?: EnOption[];
  words: string[];
};

export type EnProgress = {
  questionId: string;
  done: boolean;
  tries: number;
  firstTryCorrect: boolean;
  finalCorrect: boolean;
  /** Phương án đã chọn sai (được gạch đi khi thử lại). */
  eliminated: string[];
  /** Câu nối: các cặp đã nối đúng ở lần trước (giữ nguyên khi thử lại). */
  lockedPairs: Record<string, string>;
};

export type EnAttemptState = {
  id: number;
  mode: 'profile' | 'trial';
  topicId: string | null;
  gameId: string | null;
  title: string;
  vi: string;
  phase: 'learn' | 'practice';
  status: 'in_progress' | 'completed' | 'abandoned';
  /** Từ mới của chủ đề (phần làm quen). */
  words: EnWordInfo[];
  seen: string[];
  /** Con đã học xong chủ đề này trước đây (được phép bỏ qua phần làm quen). */
  learnedBefore: boolean;
  maxTries: number;
  questions: EnPublicQuestion[];
  progress: EnProgress[];
};

export type EnAnswer =
  | { status: 'invalid'; guide: string }
  | {
      status: 'correct' | 'wrong';
      done: boolean;
      attemptCount: number;
      /** Lời Buddy: en đọc to (chỉ tiếng Anh), vi hiển thị riêng. */
      buddy: Line;
      tip?: Line;
      reward?: Line;
      /** Câu nối: từng cặp đúng/sai. */
      pairs?: Record<string, boolean>;
      correctAnswer?: string | Record<string, string>;
      /** Khi câu đã xong: từ và nghĩa để con xem lại. */
      reveal?: { words: EnWordInfo[]; full?: string };
    };

export type EnTopicCard = {
  id: string;
  title: string;
  vi: string;
  icon: string;
  words: string[];
  questionCount: number;
  status: 'new' | 'in_progress' | 'completed';
  inProgressAttemptId: number | null;
  last: { correct: number; total: number } | null;
};

export type EnGameCard = { id: string; title: string; englishName: string; howTo: string; available: boolean };

export type EnSuggestion = { topicId: string; title: string; vi: string; reason: string };

export type EnSummary = {
  topicsDone: number;
  topicsTotal: number;
  wordsFamiliar: number;
  wordsTotal: number;
  review: EnWordInfo[];
  suggestion: EnSuggestion | null;
};

export type Score = { correct: number; total: number };

export type EnResult = {
  attemptId: number;
  mode: 'profile' | 'trial';
  topicId: string | null;
  gameId: string | null;
  title: string;
  vi: string;
  correct: number;
  total: number;
  correctAfterRetry: number;
  skills: Record<EnSkill, Score>;
  good: EnWordInfo[];
  review: EnWordInfo[];
  buddy: Line;
  praise: Line;
  next: EnSuggestion | null;
  trialNotice: string | null;
};

/** good = nhận biết tốt, review = cần ôn lại, learning = đang làm quen (chưa đủ lượt để kết luận), new = mới xem thẻ từ. */
export type EnWordLabel = 'good' | 'learning' | 'review' | 'new';
export type EnWordStat = EnWordInfo & { topicId: string; answered: number; correct: number; label: EnWordLabel };

export type EnAttemptSummary = {
  id: number;
  kind: 'topic' | 'game';
  title: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  finishedAt: string | null;
  correct: number;
  total: number;
  tries: number;
};

export type EnglishReport = {
  topicsTotal: number;
  topicsCompleted: number;
  topics: { id: string; title: string; vi: string; status: 'new' | 'in_progress' | 'completed'; best: Score | null; times: number }[];
  wordsTotal: number;
  wordsFamiliar: number;
  words: EnWordStat[];
  answered: number;
  correct: number;
  skills: Record<EnSkill, Score>;
  suggestions: EnSuggestion[];
  attempts: EnAttemptSummary[];
  lastActive: string | null;
};
