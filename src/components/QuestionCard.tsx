import { motion } from 'framer-motion'
import { CircleCheck, Flag } from 'lucide-react'
import type { RCQuestion } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

type QuestionCardProps = {
  question: RCQuestion
  selectedOption: number | null
  showResult: boolean
  markedForReview: boolean
  wrongReason: string
  onOptionSelect: (index: number) => void
  onMarkReview: () => void
  onReasonChange: (value: string) => void
}

export function QuestionCard({
  question,
  selectedOption,
  showResult,
  markedForReview,
  wrongReason,
  onOptionSelect,
  onMarkReview,
  onReasonChange,
}: QuestionCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold tracking-wide text-cyan-200">Q{question.id}</p>
        <Button variant={markedForReview ? 'success' : 'ghost'} onClick={onMarkReview}>
          <span className="inline-flex items-center gap-1">
            <Flag size={14} />
            {markedForReview ? 'Marked' : 'Mark for review'}
          </span>
        </Button>
      </div>

      <p className="text-sm leading-7 text-slate-100">{question.prompt}</p>

      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = selectedOption === index
          const isCorrect = question.answer === index
          const wrongSelected = showResult && isSelected && !isCorrect

          return (
            <motion.button
              key={option}
              whileHover={{ scale: 1.01 }}
              onClick={() => onOptionSelect(index)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition-all ${
                showResult
                  ? isCorrect
                    ? 'border-emerald-300/45 bg-emerald-300/15 text-emerald-100'
                    : wrongSelected
                      ? 'border-rose-300/55 bg-rose-300/15 text-rose-100'
                      : 'border-white/15 bg-white/5 text-slate-200'
                  : isSelected
                    ? 'border-cyan-300/55 bg-cyan-300/15 text-cyan-100'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/30 hover:bg-cyan-300/10'
              }`}
            >
              {option}
            </motion.button>
          )
        })}
      </div>

      {showResult && (
        <div className="space-y-3 rounded-xl border border-white/15 bg-slate-900/55 p-3">
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-200">
            <CircleCheck size={15} />
            Correct Answer: {question.options[question.answer]}
          </p>
          <p className="text-xs leading-6 text-slate-300">{question.explanation}</p>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-slate-400">Why I got this wrong</span>
            <textarea
              value={wrongReason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={3}
              placeholder="e.g. I rushed and ignored qualifier words in option C."
              className="w-full resize-none rounded-lg border border-white/15 bg-white/5 p-2 text-sm text-slate-100 outline-none ring-cyan-300/40 transition focus:ring"
            />
          </label>
        </div>
      )}
    </Card>
  )
}
