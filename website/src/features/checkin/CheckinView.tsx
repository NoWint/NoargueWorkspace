import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import { Card, Eyebrow, Stat } from '@/design/primitives'
import { CalendarCheckIcon, StarIcon, CheckIcon, ClockIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { useCheckinStore } from '@/stores/checkin'
import styles from './CheckinView.module.css'

type LoadState = 'idle' | 'loading' | 'error'

const MILESTONES = [7, 15, 30, 60]

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function todayDate(): Date {
  return new Date()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function CheckinView() {
  const {
    status,
    monthRecords,
    fetchStatus,
    fetchMonth,
    checkin,
    checkinLoading,
  } = useCheckinStore()

  const now = todayDate()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [statusState, setStatusState] = useState<LoadState>('idle')
  const [statusError, setStatusError] = useState('')
  const [monthState, setMonthState] = useState<LoadState>('idle')
  const [monthError, setMonthError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatusState('loading')
    setStatusError('')
    fetchStatus()
      .then(() => {
        if (!cancelled) setStatusState('idle')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStatusState('error')
        setStatusError((e as Error)?.message || '加载签到状态失败')
      })
    return () => {
      cancelled = true
    }
  }, [fetchStatus])

  useEffect(() => {
    let cancelled = false
    setMonthState('loading')
    setMonthError('')
    fetchMonth(year, month)
      .then(() => {
        if (!cancelled) setMonthState('idle')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setMonthState('error')
        setMonthError((e as Error)?.message || '加载月度记录失败')
      })
    return () => {
      cancelled = true
    }
  }, [year, month, fetchMonth])

  const checkedInDates = useMemo(() => {
    const set = new Set<string>()
    for (const r of monthRecords) {
      set.add(r.checkInDate)
    }
    return set
  }, [monthRecords])

  const monthMatrix = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const startWeekday = firstDay.getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  const todayStr = ymd(now)
  const todayChecked = checkedInDates.has(todayStr)

  const milestoneState = useMemo(() => {
    const streak = status?.streak || 0
    return MILESTONES.map((m) => ({
      days: m,
      reached: streak >= m,
      remaining: Math.max(0, m - streak),
    }))
  }, [status?.streak])

  const handleCheckin = async () => {
    if (status?.checkedIn || todayChecked || checkinLoading) return
    try {
      const res = await checkin()
      const badgeMsg = res.newBadges.length > 0 ? `，获得徽章：${res.newBadges.join('、')}` : ''
      message.success(`签到成功 +${res.points} 积分${badgeMsg}`)
      fetchMonth(year, month).catch(() => {})
    } catch (e) {
      message.error((e as Error).message || '签到失败')
    }
  }

  const goPrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }
  const goNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <CalendarCheckIcon />
            </div>
            <div>
              <Eyebrow>CHECKIN</Eyebrow>
              <h1 className={styles.title}>
                签到 <span className={styles.song}>打卡</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{todayStr}</span>
            <span className={styles.sep}>·</span>
            <span>每日签到积累积分</span>
          </div>
        </div>
      </div>

      {statusState === 'error' && (
        <div className={cn(styles.notice, styles.noticeErr)}>{statusError}</div>
      )}

      {/* Checkin card with big button */}
      <Card>
        {statusState === 'loading' && !status ? (
          <div className={styles.skeleton}>
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonBar} />
          </div>
        ) : (
          <div className={styles.checkinCard}>
            <div className={styles.checkinLeft}>
              <Eyebrow>TODAY</Eyebrow>
              <div className={styles.bigStreak}>
                {status?.streak ?? 0}
                <span className={styles.bigStreakUnit}>天</span>
              </div>
              <div className={styles.checkinSub}>连续签到</div>
            </div>
            <div className={styles.checkinRight}>
              <button
                type="button"
                className={cn(
                  styles.bigBtn,
                  (status?.checkedIn || todayChecked) && styles.bigBtnDone,
                )}
                onClick={handleCheckin}
                disabled={status?.checkedIn || todayChecked || checkinLoading}
              >
                {status?.checkedIn || todayChecked ? (
                  <>
                    <CheckIcon className={styles.bigBtnIcon} />
                    今日已签到
                  </>
                ) : (
                  <>
                    <StarIcon className={styles.bigBtnIcon} />
                    立即签到
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat
          label="连续签到"
          value={status?.streak ?? 0}
          accent
          delta="天"
        />
        <Stat
          label="总积分"
          value={status?.points ?? 0}
          delta="可用积分"
        />
        <Stat
          label="今日状态"
          value={
            status?.checkedIn || todayChecked ? '已签到' : '未签到'
          }
          delta={
            status?.checkedIn || todayChecked ? '今日完成' : '待签到'
          }
        />
        <Stat
          label="累计天数"
          value={status?.totalDays ?? 0}
          delta="总签到"
        />
      </div>

      {/* Milestones */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <StarIcon />
            </div>
            <div>
              <Eyebrow>MILESTONES</Eyebrow>
              <h3 className={styles.cardTitle}>
                里程碑 <span className={styles.song}>进度</span>
              </h3>
            </div>
          </div>
        </div>
        <div className={styles.milestones}>
          {milestoneState.map((m) => (
            <div
              key={m.days}
              className={cn(
                styles.milestone,
                m.reached && styles.milestoneReached,
              )}
            >
              <div className={styles.milestoneDays}>{m.days} 天</div>
              <div className={styles.milestoneStatus}>
                {m.reached ? (
                  <>
                    <CheckIcon className={styles.milestoneIcon} />
                    已达成
                  </>
                ) : (
                  <>
                    <ClockIcon className={styles.milestoneIcon} />
                    还差 {m.remaining} 天
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly calendar */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <CalendarCheckIcon />
            </div>
            <div>
              <Eyebrow>CALENDAR</Eyebrow>
              <h3 className={styles.cardTitle}>
                月度 <span className={styles.song}>签到</span>
              </h3>
            </div>
          </div>
          <div className={styles.monthNav}>
            <button
              type="button"
              className={styles.monthBtn}
              onClick={goPrevMonth}
            >
              ←
            </button>
            <span className={styles.monthLabel}>
              {year}-{pad(month)}
            </span>
            <button
              type="button"
              className={styles.monthBtn}
              onClick={goNextMonth}
            >
              →
            </button>
          </div>
        </div>

        {monthState === 'error' ? (
          <div className={cn(styles.notice, styles.noticeErr)}>{monthError}</div>
        ) : (
          <div className={styles.calendarGrid}>
            {WEEK_LABELS.map((w) => (
              <div key={w} className={styles.calWeekHead}>
                {w}
              </div>
            ))}
            {monthMatrix.map((d, idx) => {
              if (d === null) {
                return <div key={`e-${idx}`} className={styles.calCellEmpty} />
              }
              const cellDate = new Date(year, month - 1, d)
              const dateStr = ymd(cellDate)
              const checked = checkedInDates.has(dateStr)
              const isToday = dateStr === todayStr
              return (
                <div
                  key={d}
                  className={cn(
                    styles.calCell,
                    checked && styles.calCellChecked,
                    isToday && !checked && styles.calCellToday,
                  )}
                >
                  <span className={styles.calDay}>{d}</span>
                  {checked && (
                    <span className={styles.calDot}>
                      <CheckIcon />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className={styles.calLegend}>
          <span className={styles.legendItem}>
            <span className={cn(styles.legendDot, styles.legendDotChecked)} />
            已签到
          </span>
          <span className={styles.legendItem}>
            <span className={cn(styles.legendDot, styles.legendDotToday)} />
            今天
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendCount}>
              {checkedInDates.size}
            </span>
            次签到
          </span>
        </div>
      </Card>
    </div>
  )
}
