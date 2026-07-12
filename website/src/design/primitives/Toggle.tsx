import styles from './Toggle.module.css'

interface ToggleProps {
  on: boolean
  onChange: (on: boolean) => void
}

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      className={[styles.toggle, on && styles.on].filter(Boolean).join(' ')}
      onClick={() => onChange(!on)}
      type="button"
    >
      <span className={styles.core}>
        <span className={styles.knob} />
      </span>
    </button>
  )
}
