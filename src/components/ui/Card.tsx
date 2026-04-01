import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl shadow-[0_12px_40px_rgba(15,23,42,0.35)] ${className}`}
    >
      {children}
    </div>
  )
}
