import { useEffect, useMemo } from 'react'
import { useConfigStore } from '@/stores/config'
import { Card, Eyebrow } from '@/design/primitives'
import { RefreshIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './ChangelogView.module.css'

export function ChangelogView() {
  const { changelogs, fetchConfig, loaded } = useConfigStore()

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const sorted = useMemo(
    () =>
      [...changelogs].sort((a, b) => {
        // 按 version 降序，回退到 date
        const va = parseFloat(a.version?.replace(/^v/i, '') || '0')
        const vb = parseFloat(b.version?.replace(/^v/i, '') || '0')
        if (vb !== va) return vb - va
        return (b.date || '').localeCompare(a.date || '')
      }),
    [changelogs],
  )

  const latest = sorted[0]?.version

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <RefreshIcon />
            </div>
            <div>
              <Eyebrow>CHANGELOG</Eyebrow>
              <h1 className={styles.title}>
                版本 <span className={styles.song}>更新</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{sorted.length} 个版本</span>
            {latest && (
              <>
                <span className={styles.sep}>·</span>
                <span>最新 v{latest}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <RefreshIcon />
            </div>
            <div>
              <Eyebrow>TIMELINE</Eyebrow>
              <h3 className={styles.cardTitle}>
                更新 <span className={styles.song}>日志</span>
              </h3>
            </div>
          </div>
        </div>

        <div className={styles.timeline}>
          {!loaded && <div className={styles.empty}>加载中...</div>}
          {loaded && sorted.length === 0 && (
            <div className={styles.empty}>暂无更新日志</div>
          )}
          {sorted.map((log, idx) => {
            const isLatest = idx === 0
            return (
              <div key={`${log.version}-${idx}`} className={styles.logItem}>
                <div className={styles.timelineL}>
                  <span
                    className={cn(
                      styles.node,
                      isLatest ? styles.nodeLatest : styles.nodeOld,
                    )}
                  />
                  {idx < sorted.length - 1 && <span className={styles.line} />}
                </div>
                <div className={styles.timelineR}>
                  <div className={styles.logHead}>
                    <span className={styles.logVer}>v{log.version}</span>
                    {log.date && (
                      <span className={styles.logDate}>{log.date}</span>
                    )}
                    {isLatest && <span className={styles.latestBadge}>最新</span>}
                  </div>
                  {log.content && log.content.length > 0 && (
                    <ul className={styles.logList}>
                      {log.content.map((item, i) => (
                        <li key={i} className={styles.logEntry}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
