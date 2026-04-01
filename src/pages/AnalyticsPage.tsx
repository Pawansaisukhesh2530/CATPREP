import { motion } from 'framer-motion'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../components/ui/Card'
import type { AnalyticsInsightResult, AttemptRecord, QuestionType } from '../types'

type AnalyticsPageProps = {
  attempts: AttemptRecord[]
  insights: AnalyticsInsightResult | null
}

const questionTypes: QuestionType[] = ['Inference', 'Tone', 'Main Idea', 'Vocabulary']

export function AnalyticsPage({ attempts, insights }: AnalyticsPageProps) {
  const accuracyByType = useMemo(() => {
    const aggregate = questionTypes.map((type) => ({ type, correct: 0, total: 0 }))
    for (const attempt of attempts) {
      for (const item of aggregate) {
        const stats = attempt.correctByType[item.type]
        item.correct += stats?.correct ?? 0
        item.total += stats?.total ?? 0
      }
    }

    return aggregate.map((item) => ({
      type: item.type,
      accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0,
    }))
  }, [attempts])

  const rcTimeBreakdown = useMemo(
    () =>
      attempts.map((attempt, index) => ({
        rc: `RC-${index + 1}`,
        mins: Number((attempt.timeTakenSec / 60).toFixed(1)),
      })),
    [attempts],
  )

  const weakAreas = useMemo(
    () =>
      accuracyByType
        .filter((item) => item.accuracy > 0)
        .map((item) => ({ area: item.type, value: item.accuracy })),
    [accuracyByType],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-cyan-200">Accuracy by Question Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyByType.length ? accuracyByType : [{ type: 'N/A', accuracy: 0 }]}> 
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="accuracy" fill="url(#cyanGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-cyan-200">Time Spent per RC</h3>
          <div className="space-y-3">
            {(rcTimeBreakdown.length ? rcTimeBreakdown : [{ rc: 'RC-0', mins: 0 }]).map((item) => (
              <div key={item.rc} className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{item.rc}</span>
                  <span>{item.mins} min</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                    style={{ width: `${Math.min((item.mins / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-cyan-200">Weak Areas Spotlight</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(weakAreas.length ? weakAreas : [{ area: 'No attempt data', value: 0 }]).map((area) => (
            <div key={area.area} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-slate-200">{area.area}</p>
              <p className="text-lg font-semibold text-rose-200">Risk: {100 - area.value}%</p>
              <p className="text-xs text-slate-400">Recommended: timed drills + explanation reviews</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-cyan-200">AI Performance Insights</h3>
        {!insights && <p className="text-sm text-slate-400">Insights will appear after attempts are evaluated.</p>}
        {insights && (
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-cyan-200 font-semibold">Weak Areas</p>
              <ul className="space-y-1 text-slate-300">
                {insights.weak_areas.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-cyan-200 font-semibold">Patterns</p>
              <ul className="space-y-1 text-slate-300">
                {insights.performance_patterns.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-cyan-200 font-semibold">Recommendations</p>
              <ul className="space-y-1 text-slate-300">
                {insights.improvement_suggestions.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
