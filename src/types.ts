export type NavKey = 'dashboard' | 'reading' | 'rc' | 'mock' | 'analytics' | 'vocab'

export type QuestionType = 'Inference' | 'Tone' | 'Main Idea' | 'Vocabulary'

export type Article = {
  id: string
  title: string
  bodyText: string
  publishedAt?: string
  sectionName?: string
  url?: string
}

export type PaginatedArticles = {
  articles: Article[]
  page: number
  pages: number
}

export type RCQuestion = {
  id: number
  prompt: string
  options: string[]
  answer: number
  explanation: string
  type: QuestionType
}

export type AttemptRecord = {
  articleId: string
  articleTitle: string
  answers: Record<number, number>
  score: number
  total: number
  timeTakenSec: number
  submittedAt: string
  questionTypes: QuestionType[]
  correctByType: Record<QuestionType, { correct: number; total: number }>
  feedback?: string
  mistakeTypes?: string[]
}

export type EvaluationQuestionResult = {
  question_index: number
  is_correct: boolean
  correct_answer: string
  explanation: string
  mistake_type: string
  reasoning_feedback?: string
}

export type EvaluationResult = {
  score: number
  total: number
  feedback: string
  reasoning_feedback?: string
  mistake_types: string[]
  question_results: EvaluationQuestionResult[]
}

export type SummaryEvaluationResult = {
  what_user_got_right: string
  what_was_missed: string
  ideal_summary: string
}

export type ExplainTextResult = {
  simplified_explanation: string
  tone: string
  intent: string
}

export type AnalyticsInsightResult = {
  weak_areas: string[]
  performance_patterns: string[]
  improvement_suggestions: string[]
}

export type SaveAttemptPayload = {
  article_title: string
  score: number
  total: number
  feedback: string
  question_attempts: Array<{
    question: string
    user_answer: string
    correct_answer: string
    is_correct: boolean
    explanation: string
    mistake_type: string
  }>
}
