import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { Article, EvaluationResult, RCQuestion } from '../types'

type MockTestPageProps = {
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
  onTimerTick: (remainingSec: number) => void
}

export function MockTestPage({
  selectedArticle,
  questions,
  loadingQuestions,
  questionsError,
  onLoadQuestions,
  onSubmitAttempt,
  onTimerTick,
}: MockTestPageProps) {
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(45 * 60)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')

  const activeQuestion = questions[current] ?? null

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(prev - 1, 0)
        onTimerTick(next)
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onTimerTick])

  useEffect(() => {
    if (!selectedArticle) {
      return
    }
    void onLoadQuestions(selectedArticle)
  }, [onLoadQuestions, selectedArticle?.id])

  const handleSubmit = async () => {
    if (!selectedArticle || !questions.length) {
      return
    }

    const result = await onSubmitAttempt({
      answers,
      timeTakenSec: 45 * 60 - timeLeft,
      article: selectedArticle,
      questions,
    })

    setEvaluation(result)
    setSubmitted(true)
  }

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {loadingQuestions && <Card className="text-sm text-slate-300">Preparing timed test questions...</Card>}
      {questionsError && <Card className="text-sm text-rose-300">{questionsError}</Card>}

      <div className="rounded-2xl border border-white/15 bg-slate-950/75 p-3 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl text-white">Mock Test Mode</h2>
          <p className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-100">
            {mm}:{ss}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[2.5fr_1fr]">
          <Card>
            <AnimatePresence mode="wait">
              <motion.div key={activeQuestion?.id ?? 'empty'} initial={{ x: 14, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -14, opacity: 0 }} transition={{ duration: 0.2 }}>
                {activeQuestion ? (
                  <>
                    <p className="mb-4 text-sm text-slate-400">Question {current + 1}</p>
                    <p className="mb-4 text-base leading-7 text-slate-100">{activeQuestion.prompt}</p>
                    <div className="space-y-2">
                      {activeQuestion.options.map((option, index) => {
                        const selected = answers[activeQuestion.id] === index
                        const correct = activeQuestion.answer === index
                        const wrong = submitted && selected && !correct
                        return (
                          <button
                            key={option}
                            onClick={() => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: index }))}
                            className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                              submitted
                                ? correct
                                  ? 'border-emerald-300/45 bg-emerald-300/15 text-emerald-100'
                                  : wrong
                                    ? 'border-rose-300/45 bg-rose-300/15 text-rose-100'
                                    : 'border-white/15 bg-white/5 text-slate-200'
                                : selected
                                  ? 'border-cyan-300/55 bg-cyan-300/15 text-cyan-100'
                                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-300/10'
                            }`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>

                    {submitted && (
                      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                        {activeQuestion.explanation}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-300">No questions available yet.</p>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-semibold text-cyan-200">Navigator</p>
            <div className="grid grid-cols-6 gap-2">
              {questions.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrent(idx)}
                  className={`h-8 rounded text-xs ${
                    idx === current
                      ? 'bg-cyan-300/25 text-cyan-100'
                      : answers[item.id] !== undefined
                        ? 'bg-emerald-300/20 text-emerald-100'
                          : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCurrent((q) => Math.max(0, q - 1))}>
            Previous
          </Button>
          <Button variant="ghost" onClick={() => setCurrent((q) => Math.min(questions.length - 1, q + 1))}>Next</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </div>

        {submitted && evaluation && (
          <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
            Score: {evaluation.score}/{evaluation.total} • {evaluation.feedback}
            {evaluation.reasoning_feedback && (
              <p className="mt-2 text-slate-300">Reasoning: {evaluation.reasoning_feedback}</p>
            )}
            {!!evaluation.mistake_types?.length && (
              <p className="mt-2 text-slate-300">Mistake Patterns: {evaluation.mistake_types.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </motion.section>
  )
}
