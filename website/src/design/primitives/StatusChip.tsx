import type { ReactNode } from 'react'
import styles from './StatusChip.module.css'

type ChipTone = 'default' | 'ok' | 'warn' | 'acc'

interface StatusChipProps {
  tone?: ChipTone
  children: ReactNode
}

export function StatusChip({ tone = 'default', children }: StatusChipProps) {
  return <span className={[styles.chip, styles[tone]].join(' ')}>{children}</span>
}
