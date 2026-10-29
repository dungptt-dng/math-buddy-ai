export type ShapeKind = 'circle' | 'triangle' | 'square' | 'rectangle';
export type Group = { icon: string; count: number; label?: string };

export type Visual =
  | { type: 'objects'; groups: Group[]; op?: '+' }
  | { type: 'crossed'; icon: string; total: number; crossed: number }
  | { type: 'compare'; left: Group; right: Group }
  | { type: 'expression'; tokens: string[] }
  | { type: 'shapes'; shapes: { kind: ShapeKind; color: string }[] }
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

export type Progress = { questionId: string; done: boolean; tries: number; firstTryCorrect: boolean; finalCorrect: boolean };

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
      buddy: string;
      guide?: string;
      done: boolean;
      triesLeft?: number;
      correctAnswer?: string | number | string[];
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

export type Profile = { id: string; nickname: string; avatar: string; createdAt: string };

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
};

export type ProfileReport = {
  profile: Profile;
  questionsDone: number;
  correct: number;
  accuracy: number | null;
  correctAfterRetry: number;
  lessonsCompleted: number;
  vocab: { answered: number; correct: number };
  skills: SkillStat[];
  attempts: AttemptSummary[];
  lastActive: string | null;
};
