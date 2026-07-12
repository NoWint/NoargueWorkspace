import styles from './AvatarGroup.module.css'

export interface AvatarMember {
  id: number
  nickname: string
  avatarUrl?: string
}

interface AvatarGroupProps {
  members: AvatarMember[]
  max?: number
  size?: number
}

const AVATAR_COLORS = [
  '#5b8def', '#d97757', '#62d178', '#eab308',
  '#a78bfa', '#f87171', '#06b6d4', '#ec4899',
]

function colorFor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function initial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

export function AvatarGroup({ members, max = 3 }: AvatarGroupProps) {
  if (!members || members.length === 0) return null
  const visible = members.slice(0, max)
  const overflow = members.length - visible.length

  return (
    <div className={styles.group}>
      {visible.map((m) => (
        <div
          key={m.id}
          className={styles.av}
          style={{
            background: m.avatarUrl ? 'transparent' : colorFor(m.id),
            color: m.avatarUrl ? 'transparent' : 'var(--fg)',
          }}
          title={m.nickname}
        >
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt={m.nickname} />
          ) : (
            initial(m.nickname)
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className={`${styles.av} ${styles.more}`}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
