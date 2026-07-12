import type { ReactNode } from 'react'
import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  accent?: boolean
  warn?: boolean
  spark?: number[]
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const w = 56
  const h = 22
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const last = data[data.length - 1]
  const first = data[0]
  const isUp = last >= first
  const color = isUp ? 'var(--success)' : 'var(--warn)'
  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Stat({ label, value, delta, accent, warn, spark }: StatProps) {
  const valueClass = [
    styles.value,
    accent && styles.acc,
    warn && styles.warn,
  ].filter(Boolean).join(' ')
  return (
    <div className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={valueClass}>{value}</div>
      {delta && <div className={styles.delta}>{delta}</div>}
      {spark && spark.length >= 2 && <Sparkline data={spark} />}
    </div>
  )
}
