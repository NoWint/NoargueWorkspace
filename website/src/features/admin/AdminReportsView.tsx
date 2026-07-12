import { useEffect, useState } from 'react'
import { Input, Modal, message } from 'antd'
import { Card, Eyebrow, Tag, StatusChip } from '@/design/primitives'
import { FlagIcon, CheckIcon } from '@/design/icons'
import { reportsApi, type Report } from '@/api/reports'
import { cn, formatDate } from '@/lib/utils'
import styles from './AdminReportsView.module.css'

const PAGE_SIZE = 10

type StatusTab = 'all' | 0 | 1 | 2

interface TabDef {
  key: StatusTab
  label: string
}

const TABS: TabDef[] = [
  { key: 'all', label: '全部' },
  { key: 0, label: '待处理' },
  { key: 1, label: '已处理' },
  { key: 2, label: '已驳回' },
]

const STATUS_LABELS: Record<number, string> = {
  0: '待处理',
  1: '已处理',
  2: '已驳回',
}

function statusTone(status: number): 'warn' | 'ok' | 'default' {
  if (status === 0) return 'warn'
  if (status === 1) return 'ok'
  return 'default'
}

function targetTypeTone(targetType: string): 'pri' | 'info' {
  return targetType === 'post' ? 'pri' : 'info'
}

function targetTypeLabel(targetType: string): string {
  return targetType === 'post' ? '帖子' : '评论'
}

function truncate(text: string, max: number): string {
  if (!text) return '—'
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

interface ProcessAction {
  action: 'delete' | 'reject'
  title: string
  sub: string
}

const PROCESS_ACTIONS: ProcessAction[] = [
  { action: 'delete', title: '删除内容', sub: '删除被举报的帖子或评论' },
  { action: 'reject', title: '驳回举报', sub: '举报不成立，保留原内容' },
]

export function AdminReportsView() {
  const [tab, setTab] = useState<StatusTab>('all')
  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [processOpen, setProcessOpen] = useState(false)
  const [processReport, setProcessReport] = useState<Report | null>(null)
  const [processAction, setProcessAction] = useState<'delete' | 'reject'>('delete')
  const [resultNote, setResultNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchList = async (targetPage: number, status: StatusTab) => {
    setLoading(true)
    try {
      const params: { status?: number; page?: number; pageSize?: number } = {
        page: targetPage,
        pageSize: PAGE_SIZE,
      }
      if (status !== 'all') params.status = status
      const res = await reportsApi.getList(params)
      setReports(res.reports || [])
      setTotal(res.total || 0)
      setPage(targetPage)
    } catch (e) {
      message.error((e as Error).message || '加载举报列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList(1, tab)
  }, [tab])

  const handleTabChange = (next: StatusTab) => {
    setTab(next)
  }

  const goPrev = () => {
    if (page <= 1) return
    fetchList(page - 1, tab)
  }

  const goNext = () => {
    if (page * PAGE_SIZE >= total) return
    fetchList(page + 1, tab)
  }

  const openProcess = (report: Report) => {
    setProcessReport(report)
    setProcessAction('delete')
    setResultNote('')
    setProcessOpen(true)
  }

  const handleProcess = async () => {
    if (!processReport) return
    const note = resultNote.trim()
    if (!note) {
      message.warning('请填写处理备注')
      return
    }
    setProcessing(true)
    try {
      await reportsApi.process(processReport.id, { action: processAction, resultNote: note })
      message.success(processAction === 'delete' ? '已删除内容' : '已驳回举报')
      setProcessOpen(false)
      fetchList(page, tab)
    } catch (e) {
      message.error((e as Error).message || '处理失败')
    } finally {
      setProcessing(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <FlagIcon />
            </div>
            <div>
              <Eyebrow>REPORTS</Eyebrow>
              <h1 className={styles.title}>
                举报 <span className={styles.song}>管理</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>共 {total} 条举报</span>
            <span className={styles.sep}>·</span>
            <span>第 {page} / {totalPages} 页</span>
            {loading && (
              <>
                <span className={styles.sep}>·</span>
                <span>加载中...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className={styles.tabsRow}>
        <div className={styles.tabs}>
          {TABS.map((t) => {
            const isActive = tab === t.key
            const count = t.key === 'all'
              ? total
              : reports.filter((r) => r.status === t.key).length
            return (
              <button
                key={String(t.key)}
                type="button"
                className={cn(styles.tab, isActive && styles.tabAct)}
                onClick={() => handleTabChange(t.key)}
              >
                {t.label}
                {count > 0 && (
                  <span className={styles.tabCount}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Report list */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <FlagIcon />
            </div>
            <div>
              <Eyebrow>LIST</Eyebrow>
              <h3 className={styles.cardTitle}>
                举报 <span className={styles.song}>列表</span>
              </h3>
            </div>
          </div>
        </div>

        {reports.length === 0 && (
          <div className={styles.empty}>
            {loading ? '加载中...' : '暂无举报记录'}
          </div>
        )}

        <div className={styles.reportList}>
          {reports.map((r) => (
            <div key={r.id} className={styles.reportCard}>
              <div className={styles.reportHead}>
                <div className={styles.reportHeadL}>
                  <div className={styles.reportRow1}>
                    <Tag tone={targetTypeTone(r.targetType)}>
                      {targetTypeLabel(r.targetType)}
                    </Tag>
                    <span className={styles.reportTarget} title={r.targetContent}>
                      {truncate(r.targetContent, 60)}
                    </span>
                  </div>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportReason}>{r.reason}</span>
                    <span className={styles.reportMetaSep}>·</span>
                    <span>举报人 #{r.userId}</span>
                    <span className={styles.reportMetaSep}>·</span>
                    <span>{r.createdAt ? formatDate(r.createdAt) : '—'}</span>
                    {r.processedAt && (
                      <>
                        <span className={styles.reportMetaSep}>·</span>
                        <span>处理于 {formatDate(r.processedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.reportActions}>
                  <StatusChip tone={statusTone(r.status)}>
                    {STATUS_LABELS[r.status]}
                  </StatusChip>
                  {r.status === 0 && (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionPri}`}
                      onClick={() => openProcess(r)}
                    >
                      <CheckIcon />
                      处理
                    </button>
                  )}
                </div>
              </div>

              {(r.detail || r.resultNote) && (
                <div className={styles.reportBody}>
                  {r.detail && (
                    <div>
                      <div className={styles.reportDetailLabel}>举报详情</div>
                      <div className={styles.reportDetail}>{r.detail}</div>
                    </div>
                  )}
                  {r.resultNote && (
                    <div>
                      <div className={styles.reportResultLabel}>处理备注</div>
                      <div className={styles.reportResult}>{r.resultNote}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {reports.length > 0 && (
          <div className={styles.pager}>
            <span className={styles.pagerInfo}>
              共 {total} 条 · 每页 {PAGE_SIZE} 条
            </span>
            <div className={styles.pagerBtns}>
              <button
                type="button"
                className={styles.pagerBtn}
                onClick={goPrev}
                disabled={page <= 1}
              >
                上一页
              </button>
              <span className={styles.pagerCur}>{page}</span>
              <button
                type="button"
                className={styles.pagerBtn}
                onClick={goNext}
                disabled={page * PAGE_SIZE >= total}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Process modal */}
      <Modal
        title="处理举报"
        open={processOpen}
        onCancel={() => setProcessOpen(false)}
        onOk={handleProcess}
        okText="确认处理"
        cancelText="取消"
        confirmLoading={processing}
        okButtonProps={{ style: { background: '#01796f', borderColor: '#01796f' } }}
        destroyOnClose
        width={600}
      >
        {processReport && (
          <>
            {/* 举报详情 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>举报详情</span>
              <div className={styles.detailInfo}>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>举报 ID</span>
                  <span className={styles.detailInfoVal}>{processReport.id}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>类型</span>
                  <span className={styles.detailInfoVal}>
                    {targetTypeLabel(processReport.targetType)}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>目标 ID</span>
                  <span className={styles.detailInfoVal}>{processReport.targetId}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>举报人</span>
                  <span className={styles.detailInfoVal}>#{processReport.userId}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>举报原因</span>
                  <span className={styles.detailInfoVal}>{processReport.reason}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>举报时间</span>
                  <span className={styles.detailInfoVal}>
                    {processReport.createdAt ? formatDate(processReport.createdAt) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 目标内容 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>目标内容</span>
              <div className={styles.detailBlock}>{processReport.targetContent}</div>
            </div>

            {/* 举报详情描述 */}
            {processReport.detail && (
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>举报详情</span>
                <div className={styles.detailBlock}>{processReport.detail}</div>
              </div>
            )}

            {/* 处理方式 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>处理方式</span>
              <div className={styles.actionOptions}>
                {PROCESS_ACTIONS.map((opt) => {
                  const active = processAction === opt.action
                  return (
                    <button
                      key={opt.action}
                      type="button"
                      className={cn(styles.actionOption, active && styles.actionOptionAct)}
                      onClick={() => setProcessAction(opt.action)}
                    >
                      <span className={styles.actionOptionRadio}>
                        <span className={styles.actionOptionRadioInner} />
                      </span>
                      <span className={styles.actionOptionMain}>
                        <span className={styles.actionOptionTitle}>{opt.title}</span>
                        <span className={styles.actionOptionSub}>{opt.sub}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 处理备注 */}
            <div className={styles.formRow}>
              <span className={styles.formLabel}>处理备注</span>
              <Input.TextArea
                className={styles.formTextArea}
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                placeholder="请填写处理说明，将记录到处理日志"
                autoSize={{ minRows: 3, maxRows: 8 }}
                maxLength={500}
                showCount
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
