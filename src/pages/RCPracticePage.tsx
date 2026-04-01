import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { QuestionCard } from '../components/QuestionCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { Article, EvaluationResult, RCQuestion } from '../types'

type RCPracticePageProps = {
  selectedArticle: Article | null
  questions: RCQuestion[]
  loadingQuestions: boolean
  questionsError: string | null
  onLoadQuestions: (article: Article) => Promise<void>
  onSubmitAttempt: (input: {
    answers: Record<number, number>
    reasoning?: Record<number, string>
    timeTakenSec: number
    article: Article
    questions: RCQuestion[]
  }) => Promise<EvaluationResult>
}

export function RCPracticePage({
  selectedArticle,
  questions,
  loadingQuestions,
  questionsError,
  onLoadQuestions,
  onSubmitAttempt,
}: RCPracticePageProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [marked, setMarked] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const timerStartRef = useRef<number>(Date.now())
  const [wrongReasons, setWrongReasons] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!selectedArticle) {
      return
    }

    timerStartRef.current = Date.now()
    setIndex(0)
    setAnswers({})
    setMarked({})
    setSubmitted(false)
    setEvaluation(null)
    void onLoadQuestions(selectedArticle)
  }, [onLoadQuestions, selectedArticle?.id])

  const activeQuestion = questions[index]

  const score = useMemo(() => {
    if (!submitted) {
      return null
    }

    return evaluation ? `${evaluation.score}/${evaluation.total}` : null
  }, [evaluation, submitted])

  const handleSubmit = async () => {
    if (!selectedArticle || !questions.length) {
      return
    }

    const result = await onSubmitAttempt({
      answers,
      reasoning: wrongReasons,
      timeTakenSec: Math.round((Date.now() - timerStartRef.current) / 1000),
      article: selectedArticle,
      questions,
    })

    setEvaluation(result)
    setSubmitted(true)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {loadingQuestions && <Card className="text-sm text-slate-300">Generating RC questions...</Card>}
      {questionsError && <Card className="text-sm text-rose-300">{questionsError}</Card>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="max-h-[68vh] overflow-y-auto pr-3">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-200">{selectedArticle?.title ?? 'Select an article from Reading page'}</h3>
          <p className="text-[16px] leading-8 text-slate-100 whitespace-pre-line">{selectedArticle?.bodyText ?? 'No passage selected.'}</p>
        </Card>

        {activeQuestion ? (
          <QuestionCard
            question={activeQuestion}
            selectedOption={answers[activeQuestion.id] ?? null}
            showResult={submitted}
            markedForReview={Boolean(marked[activeQuestion.id])}
            wrongReason={wrongReasons[activeQuestion.id] ?? ''}
            onOptionSelect={(option) => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: option }))}
            onMarkReview={() =>
              setMarked((prev) => ({ ...prev, [activeQuestion.id]: !prev[activeQuestion.id] }))
            }
            onReasonChange={(value) =>
              setWrongReasons((prev) => ({ ...prev, [activeQuestion.id]: value }))
            }
          />
        ) : (
          <Card className="text-sm text-slate-300">Questions will appear after article selection.</Card>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 p-3">
        <div className="text-sm text-slate-300">Question {Math.min(index + 1, Math.max(questions.length, 1))} / {questions.length || 0}</div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setIndex((i) => Math.max(i - 1, 0))}>
            Previous
          </Button>
          <Button variant="ghost" onClick={() => setIndex((i) => Math.min(i + 1, Math.max(questions.length - 1, 0)))}>
            Next
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </div>

        <div className="text-sm font-semibold text-cyan-200">{score ? `Score: ${score}` : 'Unsubmitted'}</div>
      </div>

      {evaluation?.feedback && (
        <Card className="text-sm text-slate-200">
          <p className="font-semibold text-cyan-200">Evaluator Feedback</p>
          <p className="mt-2">{evaluation.feedback}</p>
          {evaluation.reasoning_feedback && (
            <p className="mt-2 text-slate-300">Reasoning Feedback: {evaluation.reasoning_feedback}</p>
          )}
        </Card>
      )}
    </motion.div>
  )
}
