export type QuestionType = 'count' | 'add' | 'sub' | 'shape' | 'compare'
export type ShapeKey = 'square' | 'circle' | 'triangle' | 'rectangle'
export type ItemKey = 'apple' | 'star' | 'fish' | 'flower' | 'balloon'
export type ActivityId = 'magic-numbers' | 'math-garden' | 'shape-hunt' | 'buddy-challenge'
export type QuestionSource = 'generated' | 'bank' | 'ai' | 'teacher'
export type QuestionStatus = 'draft' | 'approved' | 'rejected'

export interface Question {
  id: string
  lessonId: string
  type: QuestionType
  prompt: string
  options: (number | string)[]
  answer: number | string
  englishWord?: string
  a?: number
  b?: number
  count?: number
  item?: ItemKey
  shape?: ShapeKey
  mode?: 'name' | 'find'
  source?: QuestionSource
  status?: QuestionStatus
  createdAt?: number
  model?: string
}

export interface Lesson {
  id: string
  title: string
  skill: string
  types: QuestionType[]
  english: string
  activity: ActivityId
}

export interface AnswerRecord {
  id: string
  kind: 'answer'
  studentCode: string
  activity: ActivityId
  lessonId: string
  questionId: string
  correctFirstTry: boolean
  attempts: number
  hintsUsed: number
  englishWord?: string
  ts: number
  synced?: boolean
}

export interface ListenRecord {
  id: string
  kind: 'listen'
  studentCode: string
  englishWord: string
  ts: number
  synced?: boolean
}

export type LearningRecord = AnswerRecord | ListenRecord

export interface RoundRecord {
  id: string
  studentCode: string
  activity: ActivityId
  total: number
  correctFirstTry: number
  stars: number
  badge: string
  ts: number
}

export type BuddyMood = 'idle' | 'happy' | 'cheer' | 'think' | 'encourage'
