import type {
  AnalyticsInsightResult,
  ExplainTextResult,
  EvaluationResult,
  PaginatedArticles,
  RCQuestion,
  SaveAttemptPayload,
  SummaryEvaluationResult,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000'

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const fallback = `Request failed (${response.status})`
    try {
      const payload = (await response.json()) as { detail?: string }
      throw new Error(payload.detail || fallback)
    } catch {
      throw new Error(fallback)
    }
  }

  return (await response.json()) as T
}

export async function fetchArticles(topic: string, page: number): Promise<PaginatedArticles> {
  const params = new URLSearchParams({ topic, page: String(page) })
  const payload = await requestJson<{
    articles: Array<{
      id: string
      title: string
      content: string
      section?: string
      published_at?: string
    }>
    page: number
    pages: number
  }>(`${API_BASE}/api/articles/?${params.toString()}`)

  return {
    articles: payload.articles.map((item) => ({
      id: item.id,
      title: item.title,
      bodyText: item.content,
      sectionName: item.section,
      publishedAt: item.published_at,
    })),
    page: payload.page,
    pages: payload.pages,
  }
}

export async function generateRCQuestions(articleText: string, title: string): Promise<RCQuestion[]> {
  const payload = await requestJson<{ questions: RCQuestion[] }>(`${API_BASE}/api/generate-rc/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_text: articleText, title }),
  })

  return payload.questions.map((question, index) => ({
    ...question,
    id: question.id ?? index + 1,
  }))
}

export async function evaluateAttempt(input: {
  passage: string
  questions: RCQuestion[]
  userAnswers: Record<number, number>
  userReasoning?: Record<number, string>
}): Promise<EvaluationResult> {
  const user_answers = Object.fromEntries(
    Object.entries(input.userAnswers).map(([key, value]) => [String(key), value]),
  )

  return requestJson<EvaluationResult>(`${API_BASE}/api/evaluate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passage: input.passage,
      questions: input.questions,
      user_answers,
      user_reasoning: input.userReasoning ?? {},
    }),
  })
}

export async function evaluateSummary(articleText: string, userSummary: string): Promise<SummaryEvaluationResult> {
  return requestJson<SummaryEvaluationResult>(`${API_BASE}/api/evaluate-summary/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_text: articleText, user_summary: userSummary }),
  })
}

export async function explainSelectedText(selectedText: string): Promise<ExplainTextResult> {
  return requestJson<ExplainTextResult>(`${API_BASE}/api/explain-text/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selected_text: selectedText }),
  })
}

export async function getAnalyticsInsights(attemptHistory: unknown[]): Promise<AnalyticsInsightResult> {
  return requestJson<AnalyticsInsightResult>(`${API_BASE}/api/analytics/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attempt_history: attemptHistory }),
  })
}

export async function saveAttempt(payload: SaveAttemptPayload): Promise<void> {
  await requestJson(`${API_BASE}/api/save-attempt/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
