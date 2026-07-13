import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Eyebrow, Progress, Stat } from '@/design/primitives'
import {
  DashboardIcon,
  UsersIcon,
  ListIcon,
  BellIcon,
  ChartIcon,
  FlagIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@/design/icons'
import { useAdminStore } from '@/stores/admin'
import { todayStr } from '@/lib/utils'
import styles from './AdminHomeView.module.css'

interface QuickEntry {
  label: string
  sub: string
  to: string
}

const QUICK_ENTRIES: QuickEntry[] = [
  { label: '用户管理', sub: '查看与调整用户上限', to: '/admin/users' },
  { label: '公告管理', sub: '发布与维护系统公告', to: '/admin/notices' },
  { label: '版本日志', sub: '维护版本更新记录', to: '/admin/changelog' },
  { label: '举报管理', sub: '处理用户举报内容', to: '/admin/reports' },
]

export function AdminHomeView() {
  const navigate = useNavigate()
  const { stats, loading, fetchStats } = useAdminStore()

  useEffect(() => {
    fetchStats().catch(() => {
      // 错误由调用方处理
    })
  }, [fetchStats])

  const completionRate = stats?.completionRate ?? 0

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <DashboardIcon />
            </div>
            <div>
              <Eyebrow>ADMIN</Eyebrow>
              <h1 className={styles.title}>
                管理 <span className={styles.song}>后台</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{todayStr()}</span>
            <span className={styles.sep}>·</span>
            <span>系统总览</span>
            {loading && (
              <>
                <span className={styles.sep}>·</span>
                <span>加载中...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className={styles.stats}>
        <Stat label="用户数" value={stats?.userCount ?? 0} accent delta="注册总数" />
        <Stat label="待办数" value={stats?.todoCount ?? 0} delta="全部待办" />
        <Stat label="组合数" value={stats?.comboCount ?? 0} delta="全部组合" />
        <Stat label="共享待办" value={stats?.sharedTodoCount ?? 0} delta="协作待办" />
        <Stat label="帖子数" value={stats?.postCount ?? 0} delta="社区帖子" />
        <Stat label="评论数" value={stats?.commentCount ?? 0} delta="社区评论" />
        <Stat label="签到数" value={stats?.checkinCount ?? 0} delta="签到记录" />
        <Stat label="举报数" value={stats?.reportCount ?? 0} warn delta="待处理" />
        <Stat label="通知数" value={stats?.notificationCount ?? 0} delta="消息推送" />
        <Stat label="同步日志" value={stats?.syncLogCount ?? 0} delta="同步记录" />
      </div>

      {/* Completion rate */}
      <Card>
        <div className={styles.rateCard}>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ChartIcon />
              </div>
              <div>
                <Eyebrow>COMPLETION</Eyebrow>
                <h3 className={styles.cardTitle}>
                  待办 <span className={styles.song}>完成率</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.rateHead}>
            <span className={styles.rateTitle}>总体完成率</span>
            <span className={styles.rateNum}>
              {completionRate}
              <span className={styles.rateNumSign}>%</span>
            </span>
          </div>
          <Progress value={completionRate} />
          <div className={styles.rateFoot}>
            <span className={styles.rateFootText}>
              {completionRate >= 80 ? '表现优秀' : completionRate >= 50 ? '尚有提升空间' : '需关注'}
            </span>
            <span className={styles.rateFootText}>
              <CheckIcon style={{ width: 12, height: 12, verticalAlign: '-2px', marginRight: 4 }} />
              目标 80%
            </span>
          </div>
        </div>
      </Card>

      {/* Quick entries */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <FlagIcon />
            </div>
            <div>
              <Eyebrow>QUICK ACCESS</Eyebrow>
              <h3 className={styles.cardTitle}>
                快速 <span className={styles.song}>入口</span>
              </h3>
            </div>
          </div>
        </div>
        <div className={styles.quickGrid}>
          {QUICK_ENTRIES.map((entry) => (
            <button
              key={entry.to}
              type="button"
              className={styles.quickItem}
              onClick={() => navigate(entry.to)}
            >
              <div className={styles.quickMain}>
                <span className={styles.quickLabel}>{entry.label}</span>
                <span className={styles.quickSub}>{entry.sub}</span>
              </div>
              <ChevronRightIcon className={styles.quickArrow} />
            </button>
          ))}
        </div>
      </Card>

      {/* Recent summary */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <BellIcon />
            </div>
            <div>
              <Eyebrow>SUMMARY</Eyebrow>
              <h3 className={styles.cardTitle}>
                概要 <span className={styles.song}>指标</span>
              </h3>
            </div>
          </div>
        </div>
        {!stats && (
          <div className={styles.empty}>
            {loading ? '加载中...' : '暂无数据'}
          </div>
        )}
        {stats && (
          <div className={styles.quickGrid}>
            <div className={`${styles.quickItem} ${styles.quickItemStatic}`}>
              <div className={styles.quickMain}>
                <span className={styles.quickLabel}>
                  <UsersIcon style={{ width: 12, height: 12, verticalAlign: '-2px', marginRight: 4 }} />
                  用户
                </span>
                <span className={styles.quickSub}>人均待办 {(stats.userCount > 0 ? (stats.todoCount / stats.userCount) : 0).toFixed(1)}</span>
              </div>
              <span className={`${styles.rateNum} ${styles.rateNumStatic}`}>{stats.userCount}</span>
            </div>
            <div className={`${styles.quickItem} ${styles.quickItemStatic}`}>
              <div className={styles.quickMain}>
                <span className={styles.quickLabel}>
                  <ListIcon style={{ width: 12, height: 12, verticalAlign: '-2px', marginRight: 4 }} />
                  待办
                </span>
                <span className={styles.quickSub}>完成率 {completionRate}%</span>
              </div>
              <span className={`${styles.rateNum} ${styles.rateNumStatic}`}>{stats.todoCount}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
