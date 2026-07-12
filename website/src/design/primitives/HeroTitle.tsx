import type { ReactNode } from 'react'

interface HeroTitleProps {
  children: ReactNode
  accent?: ReactNode
}

export function HeroTitle({ children, accent }: HeroTitleProps) {
  return (
    <h1
      style={{
        margin: '8px 0 6px',
        font: '600 24px/1.15 var(--font-sans)',
        letterSpacing: '-0.01em',
        color: 'var(--fg)',
      }}
    >
      {children}
      {accent && (
        <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-song)', fontWeight: 600 }}>
          {accent}
        </span>
      )}
    </h1>
  )
}
