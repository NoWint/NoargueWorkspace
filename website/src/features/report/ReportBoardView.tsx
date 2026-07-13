import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Select } from 'antd'
import { Button, Card, Eyebrow, StatusChip } from '@/design/primitives'
import {
  ListIcon,
  PlusIcon,
  ChartIcon,
  ChevronDownIcon,
} from '@/design/icons'
import { cn, todayStr } from '@/lib/utils'
import { useWorkReportStore } from '@/stores/workReport'
import { combosApi } from '@/api/combos'
import styles from './ReportBoardView.module.css'

type Tab = 'daily' | 'weekly'

const TAB_LABELS: Record<Tab, string> = {
  daily: '日报',
  weekly: '周报',
}

interface Member {
  id: number
  nickname: string
  avatarUrl: string
  role: string
  joinedAt: string
}

interface ComboDetail {
  id: number
  name: string
  color?: string
  isShared?: number | boolean
  userRole?: string | null
  members: Member[]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as start
  date.setDate(date.getDate() + diff)
  return date
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function reportSummary(content: Record<string, string>): {
  firstLine: string
  lineCount: number
} {
  let lineCount = 0
  let firstLine = ''
  for (const key of Object.keys(content)) {
    const text = content[key] || ''
    for (const line of text.split('\n')) {
      const trimmed = (line || '').trim()
      if (!trimmed) continue
      lineCount++
      if (!firstLine) firstLine = trimmed
    }
  }
  return { firstLine: firstLine || '（无内容）', lineCount }
}

export function ReportBoardView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { board, fetchBoard, loading } = useWorkReportStore()

  const [combo, setCombo] = useState<ComboDetail | null>(null)
  const [tab, setTab] = useState<Tab>('daily')
  const [periodDate, setPeriodDate] = useState<string>(todayStr())
  const [userId, setUserId] = useState<number | undefined>(undefined)
  const [boardError, setBoardError] = useState('')

  const comboId = Number(id)

  useEffect(() => {
    if (!id || Number.isNaN(comboId)) return
    combosApi
      .getById(comboId)
      .then((res) => {
        if (res.success && res.combo) setCombo(res.combo as ComboDetail)
      })
      .catch(() => {
        // ignore
      })
  }, [id, comboId])

  useEffect(() => {
    if (!comboId || Number.isNaN(comboId)) return
    setBoardError('')
    fetchBoard({ comboId, type: tab, reportDate: periodDate, userId }).catch((e) => {
      setBoardError((e as Error)?.message || '加载失败')
    })
  }, [comboId, tab, periodDate, userId, fetchBoard])

  const canManage = useMemo(() => {
    const role = combo?.userRole
    return role === 'owner' || role === 'admin'
  }, [combo?.userRole])

  const periodLabel = useMemo(() => {
    if (tab === 'daily') return periodDate
    const start = startOfWeek(new Date(periodDate))
    const end = addDays(start, 6)
    return `${ymd(start)} ~ ${ymd(end)}`
  }, [tab, periodDate])

  const goPrev = () => {
    const base = new Date(periodDate)
    const next = tab === 'daily' ? addDays(base, -1) : addDays(base, -7)
    setPeriodDate(ymd(next))
  }
  const goNext = () => {
    const base = new Date(periodDate)
    const next = tab === 'daily' ? addDays(base, 1) : addDays(base, 7)
    setPeriodDate(ymd(next))
  }
  const goToday = () => setPeriodDate(todayStr())

  const memberOptions = useMemo(() => {
    const list = combo?.members || []
    return list.map((m) => ({ label: m.nickname, value: m.id }))
  }, [combo?.members])

  const handleNew = () => {
    const base = tab === 'daily' ? periodDate : ymd(startOfWeek(new Date(periodDate)))
    navigate(`/reports/new?type=${tab}&date=${base}&comboId=${comboId}`)
  }

  const members = board?.members || []
  const visibleMembers = userId
    ? members.filter((m) => m.userId === userId)
    : members

  const totalReports = visibleMembers.reduce(
    (sum, m) => sum + (m.reports?.length || 0),
    0,
  )

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div
              className={styles.hdIcColor}
              style={combo?.color ? { background: combo.color } : undefined}
            >
              <ChartIcon />
            </div>
            <div>
              <Eyebrow>REPORT BOARD</Eyebrow>
              <h1 className={styles.title}>
                工作报告 <span className={styles.song}>看板</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{combo?.name || '—'}</span>
            <span className={styles.sep}>·</span>
            <span>{periodLabel}</span>
            <span className={styles.sep}>·</span>
            <span>{totalReports} 份报告</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <Button
            variant="pri"
            size="sm"
            icon={<PlusIcon className={styles.btnIcon} />}
            onClick={handleNew}
          >
            新建报告
          </Button>
        </div>
      </div>

      {boardError && (
        <div className={cn(styles.notice, styles.noticeErr)}>{boardError}</div>
      )}

      {/* Tabs */}
      <div className={styles.tabsRow}>
        <div className={styles.tabs}>
          {(Object.keys(TAB_LABELS) as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              className={cn(styles.tab, tab === k && styles.tabAct)}
              onClick={() => setTab(k)}
            >
              {TAB_LABELS[k]}
            </button>
          ))}
        </div>

        <div className={styles.navRow}>
          <button type="button" className={styles.navBtn} onClick={goPrev}>
            ← {tab === 'daily' ? '前一天' : '上一周'}
          </button>
          <button type="button" className={styles.navToday} onClick={goToday}>
            今天
          </button>
          <button type="button" className={styles.navBtn} onClick={goNext}>
            {tab === 'daily' ? '后一天' : '下一周'} →
          </button>
        </div>

        {canManage && (
          <Select
            className={styles.memberSelect}
            size="small"
            placeholder="全部成员"
            allowClear
            value={userId}
            options={memberOptions}
            onChange={(v) => setUserId(v)}
          />
        )}
      </div>

      {/* Member groups */}
      {visibleMembers.length === 0 && loading && (
        <Card>
          <div className={styles.skeleton}>
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonBar} />
          </div>
        </Card>
      )}
      {visibleMembers.length === 0 && !loading && !boardError && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ListIcon />
            </div>
            <div className={styles.emptyTitle}>本期暂无报告</div>
            <div className={styles.emptySub}>
              点击右上角"新建报告"开始
            </div>
          </div>
        </Card>
      )}

      {visibleMembers.map((m) => (
        <Card key={m.userId}>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.memberAv}>
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.nickname} />
                ) : (
                  (m.nickname?.[0] || '?')
                )}
              </div>
              <div>
                <Eyebrow>MEMBER</Eyebrow>
                <h3 className={styles.cardTitle}>{m.nickname || '匿名'}</h3>
              </div>
            </div>
            <StatusChip tone="acc">
              {m.reports?.length || 0} 份
            </StatusChip>
          </div>

          <div className={styles.reportList}>
            {(!m.reports || m.reports.length === 0) && (
              <div className={styles.noReports}>本期无报告</div>
            )}
            {m.reports?.map((r) => {
              const sum = reportSummary(r.content)
              return (
                <button
                  key={r.id}
                  type="button"
                  className={styles.reportItem}
                  onClick={() => navigate(`/reports/${r.id}`)}
                >
                  <div className={styles.reportMain}>
                    <div className={styles.reportSummary}>{sum.firstLine}</div>
                    <div className={styles.reportSub}>
                      <span>{r.periodLabel || r.reportDate}</span>
                      <span className={styles.reportSep}>·</span>
                      <span>{sum.lineCount} 行</span>
                      <span className={styles.reportSep}>·</span>
                      <span>{TAB_LABELS[r.type]}</span>
                    </div>
                  </div>
                  <ChevronDownIcon className={styles.reportArrow} />
                </button>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
