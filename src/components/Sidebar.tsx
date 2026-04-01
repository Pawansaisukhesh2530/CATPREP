import { motion } from 'framer-motion'
import {
  BookOpen,
  ChartNoAxesCombined,
  Gauge,
  LayoutDashboard,
  PanelsTopLeft,
  SpellCheck,
} from 'lucide-react'
import type { ElementType } from 'react'
import type { NavKey } from '../types'

type SidebarProps = {
  collapsed: boolean
  active: NavKey
  onNavigate: (key: NavKey) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

const links: { key: NavKey; label: string; icon: ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'reading', label: 'Daily Reading', icon: BookOpen },
  { key: 'rc', label: 'RC Practice', icon: PanelsTopLeft },
  { key: 'mock', label: 'Sectional Tests', icon: Gauge },
  { key: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { key: 'vocab', label: 'Vocabulary', icon: SpellCheck },
]

export function Sidebar({ collapsed, active, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  const navItems = (
    <nav className="space-y-1">
      {links.map((item, index) => {
        const Icon = item.icon
        const selected = active === item.key

        return (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => {
              onNavigate(item.key)
              onCloseMobile()
            }}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-300 ${
              selected
                ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100 shadow-[0_0_20px_rgba(56,189,248,0.28)]'
                : 'border-transparent text-slate-300 hover:border-white/15 hover:bg-white/5'
            }`}
          >
            <Icon size={18} />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </motion.button>
        )
      })}
    </nav>
  )

  return (
    <>
      <aside
        className={`hidden h-screen flex-col border-r border-white/10 bg-slate-950/50 p-4 backdrop-blur lg:flex ${collapsed ? 'w-20' : 'w-72'} transition-all duration-300`}
      >
        <div className="mb-8 mt-2 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-300 to-indigo-500 shadow-[0_0_30px_rgba(56,189,248,0.55)]" />
          {!collapsed && (
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">CAT VARC</p>
              <h1 className="font-heading text-xl font-semibold text-white">NeonPrep AI</h1>
            </div>
          )}
        </div>

        {navItems}
      </aside>

      <div
        className={`fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950/95 p-4 backdrop-blur transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 mt-2 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-300 to-indigo-500 shadow-[0_0_30px_rgba(56,189,248,0.55)]" />
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">CAT VARC</p>
            <h1 className="font-heading text-xl font-semibold text-white">NeonPrep AI</h1>
          </div>
        </div>

        {navItems}
      </aside>
    </>
  )
}
