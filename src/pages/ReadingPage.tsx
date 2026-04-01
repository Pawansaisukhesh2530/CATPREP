import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { evaluateSummary, explainSelectedText } from '../services/api'
import type { Article, ExplainTextResult, SummaryEvaluationResult } from '../types'

type ReadingPageProps = {
  articles: Article[]
  selectedArticle: Article | null
  loading: boolean
  error: string | null
  topic: string
  page: number
  totalPages: number
  onTopicChange: (topic: string) => void
  onPageChange: (nextPage: number) => void
  onSelectArticle: (articleId: string) => void
  onReload: () => void
}

function extractDifficultWords(text: string) {
  const words = text.match(/\b[a-zA-Z]{9,}\b/g) ?? []
  return Array.from(new Set(words.map((word) => word.toLowerCase()))).slice(0, 20)
}

export function ReadingPage({
  articles,
  selectedArticle,
  loading,
  error,
  topic,
  page,
  totalPages,
  onTopicChange,
  onPageChange,
  onSelectArticle,
  onReload,
}: ReadingPageProps) {
  const [fontSize, setFontSize] = useState(17)
  const [summary, setSummary] = useState('')
  const [tone, setTone] = useState('Neutral-Analytical')
  const [selectionText, setSelectionText] = useState('')
  const [explanation, setExplanation] = useState<ExplainTextResult | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [summaryEvaluation, setSummaryEvaluation] = useState<SummaryEvaluationResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [cachedExplanations, setCachedExplanations] = useState<Record<string, ExplainTextResult>>({})
  const [showExplainDrawer, setShowExplainDrawer] = useState(false)

  const paragraphs = useMemo(
    () => selectedArticle?.bodyText.split(/\n+/).filter(Boolean) ?? [],
    [selectedArticle],
  )
  const difficultWords = useMemo(
    () => new Set(extractDifficultWords(selectedArticle?.bodyText ?? '')),
    [selectedArticle],
  )
  const totalWords = useMemo(() => (selectedArticle?.bodyText.split(/\s+/).length ?? 0), [selectedArticle])
  const readProgress = Math.min(100, Math.round((summary.length / 180) * 100 + 35))

  const renderParagraph = (text: string) => {
    return text.split(' ').map((word, idx) => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '')
      const isDifficult = difficultWords.has(clean)

      if (!isDifficult) {
        return <span key={`${clean}-${idx}`}> {word}</span>
      }

      return (
        <span
          key={`${clean}-${idx}`}
          title="Likely difficult word. Review meaning from context."
          className="rounded px-1 text-cyan-200 underline decoration-dotted decoration-cyan-400/70"
        >
          {' '}
          {word}
        </span>
      )
    })
  }

  const handleExplainSelection = async () => {
    const selected = window.getSelection()?.toString().trim() ?? ''
    if (!selected) {
      return
    }

    setSelectionText(selected)
    setShowExplainDrawer(true)
    if (cachedExplanations[selected]) {
      setExplanation(cachedExplanations[selected])
      return
    }

    setExplainLoading(true)
    try {
      const result = await explainSelectedText(selected)
      setExplanation(result)
      setCachedExplanations((prev) => ({ ...prev, [selected]: result }))
    } finally {
      setExplainLoading(false)
    }
  }

  const handleEvaluateSummary = async () => {
    if (!selectedArticle || !summary.trim()) {
      return
    }
    setSummaryLoading(true)
    try {
      const result = await evaluateSummary(selectedArticle.bodyText, summary)
      setSummaryEvaluation(result)
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-24 lg:pb-0">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-cyan-200 md:text-base">Live Articles</h3>
          <select
            value={topic}
            onChange={(event) => onTopicChange(event.target.value)}
            className="rounded-lg border border-white/20 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          >
            <option value="economy">Economy</option>
            <option value="science">Science</option>
            <option value="technology">Technology</option>
            <option value="politics">Politics</option>
            <option value="culture">Culture</option>
          </select>
          <Button variant="ghost" onClick={onReload}>Reload</Button>
          {loading && <span className="text-xs text-slate-400">Loading articles...</span>}
          {error && <span className="text-xs text-rose-300">{error}</span>}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => onSelectArticle(article.id)}
              className={`rounded-xl border p-3 text-left text-sm transition ${selectedArticle?.id === article.id
                  ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/35'
                }`}
            >
              <p className="font-semibold">{article.title}</p>
              <p className="mt-1 text-xs text-slate-400">{article.sectionName ?? 'General'} • {article.publishedAt?.slice(0, 10) ?? 'Unknown date'}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onPageChange(Math.max(page - 1, 1))}>
            Prev Page
          </Button>
          <span className="text-xs text-slate-400">Page {page} / {Math.max(totalPages, 1)}</span>
          <Button variant="ghost" onClick={() => onPageChange(Math.min(page + 1, Math.max(totalPages, 1)))}>
            Next Page
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="w-full lg:w-2/3">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl text-white md:text-2xl">{selectedArticle?.title ?? 'Select an article'}</h2>
              <p className="text-sm text-slate-400 md:text-base">Live Guardian content • {Math.max(1, Math.round(totalWords / 220))} min read • {totalWords} words</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-200">
              <span>Font</span>
              <Button variant="ghost" onClick={() => setFontSize((size) => Math.max(15, size - 1))}>A-</Button>
              <Button variant="ghost" onClick={() => setFontSize((size) => Math.min(21, size + 1))}>A+</Button>
            </div>
          </div>

          <div className="mb-4 h-2 rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readProgress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
            />
          </div>

          <article className="max-h-[55vh] space-y-6 overflow-y-auto pr-2 text-sm text-slate-100 md:text-base" style={{ fontSize, lineHeight: 1.9 }}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 20)}>{renderParagraph(paragraph)}</p>
            ))}
            {!paragraphs.length && <p className="text-slate-400">No article selected yet.</p>}
          </article>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={handleExplainSelection}>Explain Selected Text</Button>
            {explainLoading && <span className="text-xs text-slate-400">Analyzing selection...</span>}
          </div>

          {explanation && (
            <div className="mt-3 hidden rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200 lg:block">
              <p><span className="text-cyan-200">Selected:</span> {selectionText.slice(0, 180)}</p>
              <p className="mt-2"><span className="text-cyan-200">Simplified:</span> {explanation.simplified_explanation}</p>
              <p className="mt-1 text-xs text-slate-300">Tone: {explanation.tone} • Intent: {explanation.intent}</p>
            </div>
          )}
        </Card>

        <Card className="w-full space-y-4 lg:w-1/3">
          <h3 className="text-sm font-semibold text-cyan-200 md:text-base">Reflection Panel</h3>

          <label className="block space-y-2">
            <span className="text-xs text-slate-400">Summarize in 2 lines</span>
            <textarea
              rows={5}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="w-full resize-none rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-100 outline-none ring-cyan-300/45 transition focus:ring"
            />
            <div className="pt-1">
              <Button variant="ghost" onClick={handleEvaluateSummary}>Evaluate Summary</Button>
              {summaryLoading && <span className="ml-2 text-xs text-slate-400">Evaluating summary...</span>}
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs text-slate-400">Select tone</span>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              <option>Neutral-Analytical</option>
              <option>Critical</option>
              <option>Persuasive</option>
              <option>Reflective</option>
            </select>
          </label>

          <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-slate-300">
            Your selected tone: <span className="font-semibold text-cyan-200">{tone}</span>
          </div>

          {summaryEvaluation && (
            <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-slate-200 space-y-2">
              <p><span className="text-cyan-200">Got right:</span> {summaryEvaluation.what_user_got_right}</p>
              <p><span className="text-cyan-200">Missed:</span> {summaryEvaluation.what_was_missed}</p>
              <p><span className="text-cyan-200">Ideal summary:</span> {summaryEvaluation.ideal_summary}</p>
            </div>
          )}
        </Card>
      </div>

      {explanation && (
        <div className={`fixed inset-x-3 bottom-3 z-30 rounded-xl border border-white/15 bg-slate-950/95 p-3 text-sm text-slate-200 backdrop-blur lg:hidden ${showExplainDrawer ? 'block' : 'hidden'}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Explain Text</p>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setShowExplainDrawer(false)}>Close</Button>
          </div>
          <p><span className="text-cyan-200">Selected:</span> {selectionText.slice(0, 160)}</p>
          <p className="mt-2"><span className="text-cyan-200">Simplified:</span> {explanation.simplified_explanation}</p>
          <p className="mt-1 text-xs text-slate-300">Tone: {explanation.tone} • Intent: {explanation.intent}</p>
        </div>
      )}

      {explanation && !showExplainDrawer && (
        <Button className="fixed bottom-4 right-4 z-30 lg:hidden" onClick={() => setShowExplainDrawer(true)}>
          Show Explanation
        </Button>
      )}
    </motion.div>
  )
}
