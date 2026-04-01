import { AnimatePresence, motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Button } from './components/ui/Button'
import {
  evaluateAttempt,
  fetchArticles,
  generateRCQuestions,
  getAnalyticsInsights,
  saveAttempt,
} from './services/api'
import type {
  Article,
  AttemptRecord,
  EvaluationResult,
  NavKey,
  QuestionType,
  RCQuestion,
  AnalyticsInsightResult,
} from './types'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { MockTestPage } from './pages/MockTestPage'
import { RCPracticePage } from './pages/RCPracticePage'
import { ReadingPage } from './pages/ReadingPage'
import { VocabularyPage } from './pages/VocabularyPage'

const QUESTION_TYPES: QuestionType[] = ['Inference', 'Tone', 'Main Idea', 'Vocabulary']

function App() {
  const [activePage, setActivePage] = useState<NavKey>('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  const [topic, setTopic] = useState('economy')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [articles, setArticles] = useState<Article[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)

  const [questionsByArticle, setQuestionsByArticle] = useState<Record<string, RCQuestion[]>>({})
  const [questionLoadingByArticle, setQuestionLoadingByArticle] = useState<Record<string, boolean>>({})
  const [questionErrorByArticle, setQuestionErrorByArticle] = useState<Record<string, string | null>>({})

  const [mockTimerSec, setMockTimerSec] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<AttemptRecord[]>([])
  const [analyticsInsights, setAnalyticsInsights] = useState<AnalyticsInsightResult | null>(null)

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true)
    setArticlesError(null)

    try {
      const payload = await fetchArticles(topic, page)
      setArticles(payload.articles)
      setTotalPages(payload.pages)
      setSelectedArticleId((current) => {
        const stillExists = payload.articles.some((article) => article.id === current)
        if (stillExists) {
          return current
        }
        return payload.articles[0]?.id ?? null
      })
    } catch (error) {
      setArticlesError(error instanceof Error ? error.message : 'Failed to fetch articles')
      setArticles([])
      setSelectedArticleId(null)
      setTotalPages(1)
    } finally {
      setArticlesLoading(false)
    }
  }, [page, topic])

  useEffect(() => {
    void loadArticles()
  }, [loadArticles])

  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedArticleId) ?? null,
    [articles, selectedArticleId],
  )

  const ensureQuestions = useCallback(
    async (article: Article) => {
      if (questionsByArticle[article.id]?.length) {
        return
      }

      setQuestionLoadingByArticle((prev) => ({ ...prev, [article.id]: true }))
      setQuestionErrorByArticle((prev) => ({ ...prev, [article.id]: null }))

      try {
        const generated = await generateRCQuestions(article.bodyText, article.title)
        setQuestionsByArticle((prev) => ({ ...prev, [article.id]: generated }))
      } catch (error) {
        setQuestionErrorByArticle((prev) => ({
          ...prev,
          [article.id]: error instanceof Error ? error.message : 'Failed to generate questions',
        }))
      } finally {
        setQuestionLoadingByArticle((prev) => ({ ...prev, [article.id]: false }))
      }
    },
    [questionsByArticle],
  )

  const submitAndPersistAttempt = useCallback(
    async (input: {
      answers: Record<number, number>
      reasoning?: Record<number, string>
      timeTakenSec: number
      article: Article
      questions: RCQuestion[]
    }): Promise<EvaluationResult> => {
      const evaluation = await evaluateAttempt({
        passage: input.article.bodyText,
        questions: input.questions,
        userAnswers: input.answers,
        userReasoning: input.reasoning,
      })

      const byType = QUESTION_TYPES.reduce<Record<QuestionType, { correct: number; total: number }>>(
        (acc, type) => ({ ...acc, [type]: { correct: 0, total: 0 } }),
        {
          Inference: { correct: 0, total: 0 },
          Tone: { correct: 0, total: 0 },
          'Main Idea': { correct: 0, total: 0 },
          Vocabulary: { correct: 0, total: 0 },
        },
      )

      const questionAttempts = evaluation.question_results.map((result) => {
        const question = input.questions[result.question_index - 1]
        const questionType = question?.type ?? 'Inference'
        byType[questionType].total += 1
        if (result.is_correct) {
          byType[questionType].correct += 1
        }

        const selectedIndex = input.answers[result.question_index] ?? -1
        const selectedAnswer = question?.options?.[selectedIndex] ?? ''

        return {
          question: question?.prompt ?? `Question ${result.question_index}`,
          user_answer: selectedAnswer,
          correct_answer: result.correct_answer,
          is_correct: result.is_correct,
          explanation: result.explanation,
          mistake_type: result.mistake_type,
        }
      })

      await saveAttempt({
        article_title: input.article.title,
        score: evaluation.score,
        total: evaluation.total,
        feedback: evaluation.feedback,
        question_attempts: questionAttempts,
      })

      setAttempts((prev) => [
        {
          articleId: input.article.id,
          articleTitle: input.article.title,
          answers: input.answers,
          score: evaluation.score,
          total: evaluation.total,
          timeTakenSec: input.timeTakenSec,
          submittedAt: new Date().toISOString(),
          questionTypes: input.questions.map((question) => question.type),
          correctByType: byType,
          feedback: evaluation.feedback,
          mistakeTypes: evaluation.mistake_types,
        },
        ...prev,
      ])

      return evaluation
    },
    [],
  )

  const progress = useMemo(() => {
    if (!attempts.length) {
      return 0
    }
    const avg = attempts.reduce((sum, item) => sum + item.score / Math.max(item.total, 1), 0) / attempts.length
    return Math.round(avg * 100)
  }, [attempts])

  const streak = useMemo(() => {
    if (!attempts.length) {
      return 0
    }

    const days = new Set(attempts.map((item) => new Date(item.submittedAt).toDateString()))
    let count = 0
    const cursor = new Date()

    while (days.has(cursor.toDateString())) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [attempts])

  const timerLabel = useMemo(() => {
    if (mockTimerSec === null) {
      return '--:--'
    }
    const minutes = String(Math.floor(mockTimerSec / 60)).padStart(2, '0')
    const seconds = String(mockTimerSec % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [mockTimerSec])

  const pageTitle = useMemo(() => {
    return {
      dashboard: 'Performance Dashboard',
      reading: 'Daily Reading',
      rc: 'RC Practice Lab',
      mock: 'Mock Test Mode',
      analytics: 'Deep Analytics',
      vocab: 'Vocabulary Studio',
    }[activePage]
  }, [activePage])

  useEffect(() => {
    if (!attempts.length) {
      setAnalyticsInsights(null)
      return
    }

    let cancelled = false
    void getAnalyticsInsights(attempts).then((result) => {
      if (!cancelled) {
        setAnalyticsInsights(result)
      }
    }).catch(() => {
      if (!cancelled) {
        setAnalyticsInsights(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [attempts])

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage attempts={attempts} articlesCount={articles.length} />
      case 'reading':
        return (
          <ReadingPage
            articles={articles}
            selectedArticle={selectedArticle}
            loading={articlesLoading}
            error={articlesError}
            topic={topic}
            page={page}
            totalPages={totalPages}
            onTopicChange={(value) => {
              setTopic(value)
              setPage(1)
            }}
            onPageChange={setPage}
            onSelectArticle={setSelectedArticleId}
            onReload={loadArticles}
          />
        )
      case 'rc':
        return (
          <RCPracticePage
            selectedArticle={selectedArticle}
            questions={selectedArticle ? questionsByArticle[selectedArticle.id] ?? [] : []}
            loadingQuestions={selectedArticle ? Boolean(questionLoadingByArticle[selectedArticle.id]) : false}
            questionsError={selectedArticle ? questionErrorByArticle[selectedArticle.id] ?? null : null}
            onLoadQuestions={ensureQuestions}
            onSubmitAttempt={submitAndPersistAttempt}
          />
        )
      case 'mock':
        return (
          <MockTestPage
            selectedArticle={selectedArticle}
            questions={selectedArticle ? questionsByArticle[selectedArticle.id] ?? [] : []}
            loadingQuestions={selectedArticle ? Boolean(questionLoadingByArticle[selectedArticle.id]) : false}
            questionsError={selectedArticle ? questionErrorByArticle[selectedArticle.id] ?? null : null}
            onLoadQuestions={ensureQuestions}
            onSubmitAttempt={submitAndPersistAttempt}
            onTimerTick={setMockTimerSec}
          />
        )
      case 'analytics':
        return <AnalyticsPage attempts={attempts} insights={analyticsInsights} />
      case 'vocab':
        return <VocabularyPage selectedArticle={selectedArticle} />
      default:
        return <DashboardPage attempts={attempts} articlesCount={articles.length} />
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_75%_10%,rgba(99,102,241,0.2),transparent_35%),linear-gradient(130deg,#020617,#0b1026_45%,#111827)] text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} active={activePage} onNavigate={setActivePage} />

        <main className="w-full p-4 md:p-6">
          <Topbar timerLabel={timerLabel} progress={progress} streak={streak} />

          <section className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">VARC Workspace</p>
              <h2 className="font-heading text-2xl font-semibold text-white md:text-3xl">{pageTitle}</h2>
            </div>

            <Button variant="ghost" onClick={() => setCollapsed((value) => !value)}>
              <span className="inline-flex items-center gap-2">
                {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                {collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              </span>
            </Button>
          </section>

          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
