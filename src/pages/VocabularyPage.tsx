import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { explainSelectedText } from '../services/api'
import type { Article } from '../types'

type VocabularyPageProps = {
  selectedArticle: Article | null
}

export function VocabularyPage({ selectedArticle }: VocabularyPageProps) {
  const [selectedWord, setSelectedWord] = useState<string>('')
  const [explanation, setExplanation] = useState<{ simplified_explanation: string; tone: string; intent: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const words = useMemo(() => {
    if (!selectedArticle) {
      return [] as Array<{ word: string; hint: string; usage: string }>
    }

    const tokens = selectedArticle.bodyText.match(/\b[a-zA-Z]{8,}\b/g) ?? []
    const unique = Array.from(new Set(tokens.map((token) => token.toLowerCase()))).slice(0, 12)

    return unique.map((word) => ({
      word,
      hint: 'Review contextual meaning from this article passage.',
      usage: selectedArticle.bodyText
        .split(/(?<=[.!?])\s+/)
        .find((sentence) => sentence.toLowerCase().includes(word))
        ?.slice(0, 140) ?? 'Context sentence unavailable.',
    }))
  }, [selectedArticle])

  const handleExplainWord = async (word: string, usage: string) => {
    setSelectedWord(word)
    setLoading(true)
    try {
      const result = await explainSelectedText(`Word: ${word}. Context: ${usage}`)
      setExplanation(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-cyan-200">Vocabulary Lab</h3>
        <div className="grid gap-3">
          {!words.length && <p className="text-sm text-slate-400">Select an article to build a live vocabulary list.</p>}
          {words.map((item) => (
            <div key={item.word} className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-lg font-semibold text-white">{item.word}</p>
              <p className="text-sm text-cyan-200">{item.hint}</p>
              <p className="mt-1 text-sm text-slate-300">{item.usage}</p>
              <div className="mt-2">
                <Button variant="ghost" onClick={() => handleExplainWord(item.word, item.usage)}>Explain in Context</Button>
              </div>
            </div>
          ))}
        </div>

        {(loading || explanation) && (
          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
            {loading && <p>Analyzing word...</p>}
            {!loading && explanation && (
              <>
                <p className="text-cyan-200 font-semibold">{selectedWord}</p>
                <p className="mt-2">{explanation.simplified_explanation}</p>
                <p className="mt-1 text-xs text-slate-300">Tone: {explanation.tone} • Intent: {explanation.intent}</p>
              </>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
