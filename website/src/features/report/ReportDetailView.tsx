import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Popconfirm, message } from 'antd'
import { Button, Card, Eyebrow, StatusChip } from '@/design/primitives'
import { ListIcon, TrashIcon, BellIcon } from '@/design/icons'
import { useWorkReportStore } from '@/stores/workReport'
import { useComboStore } from '@/stores/combos'
import styles from './ReportDetailView.module.css'

const TYPE_LABELS: Record<'daily' | 'weekly', string> = {
  daily: '日报',
  weekly: '周报',
}

const DEFAULT_SECTION_TITLES: Record<string, string> = {
  completed: '已完成',
  in_progress: '进行中',
  blocked: '阻塞/问题',
  tomorrow_plan: '明日计划',
  next_plan: '下周计划',
  summary: '总结',
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export function ReportDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentReport,
    templates,
    fetchById,
    fetchTemplates,
    remove,
    loading,
  } = useWorkReportStore()
  const { combos } = useComboStore()

  const [removing, setRemoving] = useState(false)

  const reportId = Number(id)

  useEffect(() => {
    if (!id || Number.isNaN(reportId)) return
    fetchById(reportId).catch((e) => {
      message.error((e as Error).message || '加载失败')
    })
  }, [id, reportId, fetchById])

  useEffect(() => {
    if (currentReport?.comboId) {
      fetchTemplates(currentReport.comboId).catch(() => {
        // ignore
      })
    }
  }, [currentReport?.comboId, fetchTemplates])

  const matchedTemplate = useMemo(() => {
    if (!currentReport) return null
    return templates.find(
      (t) =>
        t.comboId === currentReport.comboId && t.type === currentReport.type,
    )
  }, [currentReport, templates])

  const sectionTitle = (key: string, idx: number): string => {
    if (matchedTemplate) {
      const sec = matchedTemplate.sections.find((s) => s.key === key)
      if (sec) return sec.title
    }
    return DEFAULT_SECTION_TITLES[key] || `段落 ${idx + 1}`
  }

  const sections = useMemo(() => {
    if (!currentReport) return []
    return Object.entries(currentReport.content || {}).map(([key, text], idx) => ({
      key,
      title: sectionTitle(key, idx),
      lines: (text || '').split('\n'),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReport, matchedTemplate])

  const combo = useMemo(
    () => combos.find((c) => c.id === currentReport?.comboId),
    [combos, currentReport?.comboId],
  )

  const handleDelete = async () => {
    if (!currentReport) return
    setRemoving(true)
    try {
      await remove(currentReport.id)
      message.success('已删除')
      navigate(-1)
    } catch (e) {
      message.error((e as Error).message || '删除失败')
    } finally {
      setRemoving(false)
    }
  }

  if (loading && !currentReport) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }

  if (!currentReport) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div className={styles.emptyTitle}>未找到该报告</div>
          <div className={styles.emptySub}>可能已被删除或不存在</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <ListIcon />
            </div>
            <div>
              <Eyebrow>REPORT</Eyebrow>
              <h1 className={styles.title}>
                报告 <span className={styles.song}>详情</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <StatusChip tone="acc">
              {TYPE_LABELS[currentReport.type]}
            </StatusChip>
            <span className={styles.sep}>·</span>
            <span>{currentReport.periodLabel || currentReport.reportDate}</span>
            {combo && (
              <>
                <span className={styles.sep}>·</span>
                <span>{combo.name}</span>
              </>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <Button
            variant="sec"
            size="sm"
            onClick={() => navigate(`/reports/${currentReport.id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除报告"
            description="此操作不可恢复，报告将被彻底删除"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={handleDelete}
            disabled={removing}
          >
            <Button variant="sec" size="sm" disabled={removing}>
              <TrashIcon className={styles.btnIcon} />
              删除
            </Button>
          </Popconfirm>
        </div>
      </div>

      {/* Section list */}
      {sections.length === 0 && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ListIcon />
            </div>
            <div className={styles.emptyTitle}>报告内容为空</div>
            <div className={styles.emptySub}>点击"编辑"添加内容</div>
          </div>
        </Card>
      )}

      {sections.map((sec, idx) => {
        const nonEmpty = sec.lines.filter((l) => (l || '').trim())
        return (
          <Card key={sec.key}>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <span className={styles.sectionIdx}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <Eyebrow>SECTION {String(idx + 1).padStart(2, '0')}</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    {sec.title}
                  </h3>
                </div>
              </div>
              <StatusChip>
                {nonEmpty.length} 行
              </StatusChip>
            </div>

            <div className={styles.sectionBody}>
              {nonEmpty.length === 0 ? (
                <div className={styles.sectionEmpty}>— 无内容 —</div>
              ) : (
                <ul className={styles.lineList}>
                  {nonEmpty.map((line, i) => (
                    <li key={i} className={styles.line}>
                      <span className={styles.lineDot} />
                      <span className={styles.lineText}>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )
      })}

      {/* Footer info */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <BellIcon />
            </div>
            <div>
              <Eyebrow>META</Eyebrow>
              <h3 className={styles.cardTitle}>
                元 <span className={styles.song}>信息</span>
              </h3>
            </div>
          </div>
        </div>
        <div className={styles.lines}>
          <div className={styles.line}>
            <span className={styles.lineLabel}>报告类型</span>
            <span className={styles.lineVal}>
              {TYPE_LABELS[currentReport.type]}
            </span>
          </div>
          <div className={styles.line}>
            <span className={styles.lineLabel}>报告周期</span>
            <span className={styles.monoVal}>
              {currentReport.periodLabel || currentReport.reportDate}
            </span>
          </div>
          <div className={styles.line}>
            <span className={styles.lineLabel}>所属组合</span>
            <span className={styles.lineVal}>
              {combo?.name || `#${currentReport.comboId}`}
            </span>
          </div>
          <div className={styles.line}>
            <span className={styles.lineLabel}>创建时间</span>
            <span className={styles.monoVal}>
              {formatTimestamp(currentReport.createdAt)}
            </span>
          </div>
          <div className={styles.line}>
            <span className={styles.lineLabel}>更新时间</span>
            <span className={styles.monoVal}>
              {formatTimestamp(currentReport.updatedAt)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
