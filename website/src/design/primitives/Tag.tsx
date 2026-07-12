import type { ReactNode } from 'react'
import styles from './Tag.module.css'

type TagTone = 'default' | 'pri' | 'warn' | 'err' | 'info'

interface TagProps {
  tone?: TagTone
  children: ReactNode
}

export function Tag({ tone = 'default', children }: TagProps) {
  return <span className={[styles.tag, styles[tone]].join(' ')}>{children}</span>
}
