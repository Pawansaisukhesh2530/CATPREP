import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'success'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.35)]',
  ghost: 'bg-white/5 text-slate-200 border border-white/20 hover:bg-white/10',
  success:
    'bg-gradient-to-r from-emerald-300 to-green-400 text-slate-900 shadow-[0_0_25px_rgba(74,222,128,0.3)]',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.16 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </motion.button>
  )
}
