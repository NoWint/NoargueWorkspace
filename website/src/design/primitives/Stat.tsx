import type { ReactNode } from 'react'
import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  accent?: boolean
}

export function Stat({ label, value, delta, accent }: StatProps) {
  return (
    <div className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={[styles.value, accent && styles.acc].filter(Boolean).join(' ')}>{value}</div>
      {delta && <div className={styles.delta}>{delta}</div>}
    </div>
  )
}
