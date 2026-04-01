import { motion } from 'framer-motion'
import { Clock4, Flame, Trophy } from 'lucide-react'

type TopbarProps = {
  timerLabel: string
  progress: number
  streak: number
}

export function Topbar({ timerLabel, progress, streak }: TopbarProps) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100">
        <Clock4 size={16} className="text-cyan-300" />
        Test Timer
        <span className="font-semibold text-cyan-200">{timerLabel}</span>
      </div>

      <div className="min-w-[220px] flex-1">
        <div className="mb-2 flex justify-between text-xs text-slate-300">
          <span>Weekly Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7 }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-sm text-amber-100">
        <Flame size={15} className="text-amber-300" />
        {streak}-Day Streak
        <Trophy size={15} className="text-amber-300" />
      </div>
    </header>
  )
}
