import styles from './Progress.module.css'

interface ProgressProps {
  value: number
  max?: number
}

export function Progress({ value, max = 100 }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={styles.progress}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
