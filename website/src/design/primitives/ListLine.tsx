import type { ReactNode } from 'react'
import styles from './ListLine.module.css'

interface ListLineProps {
  left: ReactNode
  right?: ReactNode
}

export function ListLine({ left, right }: ListLineProps) {
  return (
    <div className={styles.line}>
      <div>{left}</div>
      {right && <div>{right}</div>}
    </div>
  )
}
