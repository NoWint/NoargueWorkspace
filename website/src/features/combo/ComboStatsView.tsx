import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { combosApi } from '@/api/combos'
import { useTodoStore } from '@/stores/todos'
import { Button, Card, Eyebrow, Stat, StatusChip } from '@/design/primitives'
import {
  ChartIcon,
  ListIcon,
  CheckIcon,
  ClockIcon,
} from '@/design/icons'
import { cn, todayStr } from '@/lib/utils'
import styles from './ComboStatsView.module.css'

interface Member {
  id: number
  nickname: string
  avatarUrl: string
  role: string
  joinedAt: string
}

interface SharedTodo {
  id: number
  text: string
  set_date?: string
  set_time?: string
  completed_at: number
  is_deleted: boolean
  assign_type?: string
  assignments?: Array<{
    user_id: number
    nickname: string
    avatar_url: string
    completed_at: number
  }>
}

interface ComboDetail {
  id: number
  name: string
  isShared: boolean
  color: string
  userRole?: string | null
  members: Member[]
  sharedTodos: SharedTodo[]
  createdAt: string
}

type Tab = 'personal' | 'global'

export function ComboStatsView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { todos, fetchTodos } = useTodoStore()

  const [combo, setCombo] = useState<ComboDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('personal')

  const comboId = Number(id)
  const today = todayStr()

  useEffect(() => {
    fetchTodos()
    if (!id || Number.isNaN(comboId)) {
      setLoading(false)
      return
    }
    combosApi
      .getById(comboId)
      .then((res) => {
        if (res.success && res.combo) {
          const c = res.combo
          setCombo({
            id: c.id,
            name: c.name,
            isShared: c.isShared,
            color: c.color,
            userRole: c.userRole ?? null,
            members: c.members || [],
            sharedTodos: c.sharedTodos || [],
            createdAt: c.createdAt,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id, comboId, fetchTodos])

  const canViewGlobal = combo?.userRole === 'owner' || combo?.userRole === 'admin'

  // Personal stats: current user's todos in this combo
  const personalStats = useMemo(() => {
    const comboTodos = todos.filter(
      (t) => !t.isDeleted && t.comboId === comboId,
    )
    const total = comboTodos.length
    const completed = comboTodos.filter((t) => t.completed).length
    const overdue = comboTodos.filter(
      (t) => !t.completed && t.setDate && t.setDate < today,
    ).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, overdue, rate, uncompleted: total - completed }
  }, [todos, comboId, today])

  // Global stats: shared todos across all members
  const globalStats = useMemo(() => {
    if (!combo?.sharedTodos) return { total: 0, completed: 0, overdue: 0, rate: 0, uncompleted: 0 }
    const active = combo.sharedTodos.filter((t) => !t.is_deleted)
    const total = active.length
    const completed = active.filter((t) => t.completed_at > 0).length
    const overdue = active.filter(
      (t) => !t.completed_at && t.set_date && t.set_date < today,
    ).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, overdue, rate, uncompleted: total - completed }
  }, [combo, today])

  // Member progress (global view)
  const memberProgress = useMemo(() => {
    if (!combo?.sharedTodos || !combo?.members) return []
    const activeTodos = combo.sharedTodos.filter((t) => !t.is_deleted)
    return combo.members.map((m) => {
      let assigned = 0
      let done = 0
      activeTodos.forEach((t) => {
        if (t.assign_type === 'all' || !t.assignments) {
          assigned += 1
          if (t.completed_at > 0) done += 1
        } else {
          const a = t.assignments.find((x) => x.user_id === m.id)
          if (a) {
            assigned += 1
            if (a.completed_at > 0) done += 1
          }
        }
      })
      return {
        member: m,
        assigned,
        done,
        rate: assigned > 0 ? Math.round((done / assigned) * 100) : 0,
      }
    })
  }, [combo])

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>
          <div className={styles.emptyIcon}>
            <ChartIcon />
          </div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }

  if (!combo) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ChartIcon />
          </div>
          <div className={styles.emptyTitle}>未找到该组合</div>
          <div className={styles.emptySub}>可能已被删除或不存在</div>
        </div>
      </div>
    )
  }

  const stats = tab === 'personal' ? personalStats : globalStats
  const pct = (part: number) =>
    stats.total > 0 ? String((part / stats.total) * 100) : '0'

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <ChartIcon />
            </div>
            <div>
              <Eyebrow>STATS</Eyebrow>
              <h1 className={styles.title}>
                组合 <span className={styles.song}>统计</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{combo.name}</span>
            <span className={styles.sep}>·</span>
            <StatusChip tone={combo.isShared ? 'acc' : 'default'}>
              {combo.isShared ? '共享组合' : '私有组合'}
            </StatusChip>
            {combo.userRole && (
              <>
                <span className={styles.sep}>·</span>
                <span>你的角色：{combo.userRole}</span>
              </>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(`/combos/${combo.id}`)}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {combo.isShared && (
        <div className={styles.tabs}>
          <button
            type="button"
            className={cn(styles.tab, tab === 'personal' && styles.tabAct)}
            onClick={() => setTab('personal')}
          >
            个人统计
          </button>
          <button
            type="button"
            className={cn(styles.tab, tab === 'global' && styles.tabAct)}
            onClick={() => setTab('global')}
            disabled={!canViewGlobal}
            style={!canViewGlobal ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            全局统计 {!canViewGlobal && '（需管理权限）'}
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className={styles.stats}>
        <Stat label={tab === 'personal' ? '我的待办' : '共享待办'} value={stats.total} delta="总数" />
        <Stat
          label="已完成"
          value={stats.completed}
          accent
          delta={<span className={styles.deltaUp}>已完成</span>}
        />
        <Stat
          label="完成率"
          value={<>{stats.rate}<span className={styles.pctSign}>%</span></>}
          delta={'未完成 ' + (stats.uncompleted ?? stats.total - stats.completed)}
        />
        <Stat
          label="逾期数"
          value={stats.overdue}
          warn={stats.overdue > 0}
          delta={stats.overdue > 0 ? <span className={styles.deltaDown}>需关注</span> : '正常'}
        />
      </div>

      {/* Detail grid */}
      <div className={styles.grid}>
        {/* Distribution */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <CheckIcon />
              </div>
              <div>
                <Eyebrow>DISTRIBUTION</Eyebrow>
                <h3 className={styles.cardTitle}>
                  完成 <span className={styles.song}>分布</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.dist}>
            <div className={styles.distRow}>
              <span className={styles.distLabel}>已完成</span>
              <div className={styles.distTrack}>
                <div
                  className={styles.distFill}
                  style={{ width: pct(stats.completed) + '%', background: 'var(--success)' }}
                />
              </div>
              <span className={styles.distVal}>{stats.completed}</span>
            </div>
            <div className={styles.distRow}>
              <span className={styles.distLabel}>未完成</span>
              <div className={styles.distTrack}>
                <div
                  className={styles.distFill}
                  style={{ width: pct(stats.total - stats.completed) + '%', background: 'var(--warn)' }}
                />
              </div>
              <span className={styles.distVal}>{stats.total - stats.completed}</span>
            </div>
            <div className={styles.distRow}>
              <span className={styles.distLabel}>已逾期</span>
              <div className={styles.distTrack}>
                <div
                  className={styles.distFill}
                  style={{ width: pct(stats.overdue) + '%', background: 'var(--destructive)' }}
                />
              </div>
              <span className={styles.distVal}>{stats.overdue}</span>
            </div>
          </div>
        </Card>

        {/* Member progress (global only) */}
        {tab === 'global' ? (
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ClockIcon />
                </div>
                <div>
                  <Eyebrow>MEMBERS</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    成员 <span className={styles.song}>进度</span>
                  </h3>
                </div>
              </div>
              <StatusChip tone="acc">{memberProgress.length} 人</StatusChip>
            </div>
            <div className={styles.memList}>
              {memberProgress.length === 0 && (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>暂无成员数据</div>
                </div>
              )}
              {memberProgress.map(({ member, assigned, done, rate }) => (
                <div key={member.id} className={styles.memItem}>
                  <div className={styles.memAv}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.nickname} />
                    ) : (
                      (member.nickname?.[0] || '?')
                    )}
                  </div>
                  <div className={styles.memBody}>
                    <div className={styles.memName}>{member.nickname}</div>
                    <div className={styles.memProgress}>
                      <div className={styles.memProgressFill} style={{ width: rate + '%' }} />
                    </div>
                    <div className={styles.memStat}>
                      {done} / {assigned} · {rate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ListIcon />
                </div>
                <div>
                  <Eyebrow>SUMMARY</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    概要 <span className={styles.song}>信息</span>
                  </h3>
                </div>
              </div>
            </div>
            <div className={styles.dist}>
              <div className={styles.distRow}>
                <span className={styles.distLabel}>完成率</span>
                <div className={styles.distTrack}>
                  <div className={styles.distFill} style={{ width: stats.rate + '%' }} />
                </div>
                <span className={styles.distVal}>{stats.rate}%</span>
              </div>
              <div className={styles.distRow}>
                <span className={styles.distLabel}>目标</span>
                <div className={styles.distTrack}>
                  <div
                    className={styles.distFill}
                    style={{ width: '80%', background: 'var(--mt3)' }}
                  />
                </div>
                <span className={styles.distVal}>80%</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
