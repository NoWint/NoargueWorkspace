import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'pri' | 'sec' | 'gh' | 'icon'
type Size = 'default' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'sec',
  size = 'default',
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[`v-${variant}`],
    size === 'sm' && styles.sm,
    variant === 'icon' && styles.iconOnly,
    className,
  ].filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  )
}
