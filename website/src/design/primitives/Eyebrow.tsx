import type { ReactNode } from 'react'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        font: '500 10px/1 var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--mt2)',
      }}
    >
      {children}
    </span>
  )
}
