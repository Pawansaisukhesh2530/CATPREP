import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '../components/ui/Card'
import type { AttemptRecord } from '../types'

const colors = ['#22d3ee', '#6366f1', '#a78bfa', '#34d399']

type DashboardPageProps = {
  attempts: AttemptRecord[]
  articlesCount: number
}

export function DashboardPage({ attempts, articlesCount }: DashboardPageProps) {
  const totals = useMemo(() => {
    if (!attempts.length) {
      return { accuracy: 0, avgTime: 0, weak: 'No attempts yet' }
    }

    const correct = attempts.reduce((sum, item) => sum + item.score, 0)
    const total = attempts.reduce((sum, item) => sum + item.total, 0)
    const avgTime = attempts.reduce((sum, item) => sum + item.timeTakenSec / item.total, 0) / attempts.length

    const typeRisk = attempts.reduce<Record<string, number>>((acc, item) => {
      for (const [type, stats] of Object.entries(item.correctByType)) {
        acc[type] = (acc[type] ?? 0) + (stats.total - stats.correct)
      }
      return acc
    }, {})

    const weak = Object.entries(typeRisk).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Balanced'

    return {
      accuracy: total ? (correct / total) * 100 : 0,
      avgTime,
      weak,
    }
  }, [attempts])

  const weeklyAccuracy = useMemo(() => {
    const map = new Map<string, { day: string; accuracy: number; speed: number; count: number }>()
    for (const attempt of attempts) {
      const d = new Date(attempt.submittedAt)
      const day = d.toLocaleDateString('en-US', { weekday: 'short' })
      const current = map.get(day) ?? { day, accuracy: 0, speed: 0, count: 0 }
      current.accuracy += attempt.total ? (attempt.score / attempt.total) * 100 : 0
      current.speed += attempt.timeTakenSec / Math.max(attempt.total, 1)
      current.count += 1
      map.set(day, current)
    }

    return Array.from(map.values()).map((item) => ({
      day: item.day,
      accuracy: Math.round(item.accuracy / item.count),
      speed: Math.round(item.speed / item.count),
    }))
  }, [attempts])

  const weakAreas = useMemo(() => {
    const aggregate = attempts.reduce<Record<string, { wrong: number; total: number }>>((acc, item) => {
      for (const [type, stats] of Object.entries(item.correctByType)) {
        const current = acc[type] ?? { wrong: 0, total: 0 }
        current.wrong += stats.total - stats.correct
        current.total += stats.total
        acc[type] = current
      }
      return acc
    }, {})

    return Object.entries(aggregate).map(([area, stats]) => ({
      area,
      value: stats.total ? Math.round((stats.wrong / stats.total) * 100) : 0,
    }))
  }, [attempts])

  const todaysTasks = useMemo(() => {
    const hasAttemptToday = attempts.some((attempt) => {
      const d = new Date(attempt.submittedAt)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    })

    return [
      { id: 1, title: `Fetch and review ${articlesCount} live article(s)`, done: articlesCount > 0 },
      { id: 2, title: 'Complete one RC submission today', done: hasAttemptToday },
      { id: 3, title: 'Review explanations for incorrect answers', done: attempts.length > 0 },
    ]
  }, [articlesCount, attempts])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Accuracy', value: `${totals.accuracy.toFixed(1)}%` },
          { label: 'Avg Time / Question', value: `${Math.round(totals.avgTime)} sec` },
          { label: 'Weakest Cluster', value: totals.weak },
        ].map((item) => (
          <Card key={item.label} className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="text-2xl font-semibold text-white">{item.value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-cyan-200">Accuracy Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 12,
                  }}
                />
                <Pie
                  data={weeklyAccuracy.length ? weeklyAccuracy : [{ day: 'N/A', accuracy: 0, speed: 0 }]}
                  dataKey="accuracy"
                  nameKey="day"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {weeklyAccuracy.map((entry, index) => (
                    <Cell key={`${entry.day}-${entry.accuracy}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-cyan-200">Weak Areas</h3>
          <div className="space-y-3">
            {(weakAreas.length ? weakAreas : [{ area: 'No data yet', value: 0 }]).map((area) => (
              <div key={area.area} className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{area.area}</span>
                  <span>{area.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    style={{ width: `${area.value}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-cyan-200">Today's Tasks</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {todaysTasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-xl border p-3 text-sm ${
                task.done
                  ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100'
                  : 'border-white/15 bg-white/5 text-slate-200'
              }`}
            >
              {task.title}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
