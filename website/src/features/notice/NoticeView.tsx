import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useConfigStore } from '@/stores/config'
import { Card, Eyebrow } from '@/design/primitives'
import { BellIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './NoticeView.module.css'

/** 简易 markdown 渲染：支持 **bold**、- 列表项、### 标题、空行分段 */
function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split('\n')
  const nodes: ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return
    nodes.push(
      <ul key={key} className={styles.mdList}>
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    listBuffer = []
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    if (!line) {
      flushList(`l-${idx}`)
      return
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.slice(2))
      return
    }
    flushList(`l-${idx}`)
    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`h-${idx}`} className={styles.mdH}>
          {renderInline(line.slice(4))}
        </h4>,
      )
    } else if (line.startsWith('## ')) {
      nodes.push(
        <h4 key={`h-${idx}`} className={styles.mdH}>
          {renderInline(line.slice(3))}
        </h4>,
      )
    } else {
      nodes.push(
        <p key={`p-${idx}`} className={styles.mdP}>
          {renderInline(line)}
        </p>,
      )
    }
  })
  flushList('l-end')
  return nodes
}

/** 渲染行内 **bold** 片段 */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className={styles.mdBold}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function NoticeView() {
  const { notices, fetchConfig, loaded } = useConfigStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const sorted = useMemo(
    () => [...notices].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [notices],
  )

  const toggle = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key))
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <BellIcon />
            </div>
            <div>
              <Eyebrow>NOTICE</Eyebrow>
              <h1 className={styles.title}>
                系统 <span className={styles.song}>公告</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{sorted.length} 条公告</span>
            {sorted[0]?.date && (
              <>
                <span className={styles.sep}>·</span>
                <span>最新 {sorted[0].date}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notice list */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <BellIcon />
            </div>
            <div>
              <Eyebrow>LIST</Eyebrow>
              <h3 className={styles.cardTitle}>
                公告 <span className={styles.song}>列表</span>
              </h3>
            </div>
          </div>
        </div>

        <div className={styles.noticeList}>
          {!loaded && (
            <div className={styles.empty}>加载中...</div>
          )}
          {loaded && sorted.length === 0 && (
            <div className={styles.empty}>暂无公告</div>
          )}
          {sorted.map((notice, idx) => {
            const key = `${notice.date || ''}-${idx}`
            const isOpen = expanded === key
            return (
              <div key={key} className={styles.noticeItem}>
                <button
                  type="button"
                  className={styles.noticeHead}
                  onClick={() => toggle(key)}
                >
                  <div className={styles.noticeHeadL}>
                    <span className={styles.noticeTitle}>{notice.title}</span>
                    {notice.date && (
                      <span className={styles.noticeDate}>{notice.date}</span>
                    )}
                  </div>
                  <span className={cn(styles.chevron, isOpen && styles.chevronOpen)}>
                    ↓
                  </span>
                </button>
                {isOpen && (
                  <div className={styles.noticeBody}>
                    {renderMarkdown(notice.content)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
