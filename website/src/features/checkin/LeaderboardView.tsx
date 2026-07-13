import { useEffect, useState } from 'react'
import { Card, Eyebrow, StatusChip } from '@/design/primitives'
import { ChartIcon, StarIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { useCheckinStore } from '@/stores/checkin'
import styles from './LeaderboardView.module.css'

type Tab = 'streak' | 'total'

const TAB_LABELS: Record<Tab, string> = {
  streak: '连续天数',
  total: '总积分',
}

function rankBadge(rank: number): string {
  if (rank === 1) return '01'
  if (rank === 2) return '02'
  if (rank === 3) return '03'
  return String(rank).padStart(2, '0')
}

export function LeaderboardView() {
  const { leaderboard, fetchLeaderboard, loading } = useCheckinStore()
  const [tab, setTab] = useState<Tab>('streak')
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    fetchLeaderboard(tab).catch((e: unknown) => {
      setError((e as Error)?.message || '加载排行榜失败')
    })
  }, [tab, fetchLeaderboard])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

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
              <Eyebrow>LEADERBOARD</Eyebrow>
              <h1 className={styles.title}>
                签到 <span className={styles.song}>排行榜</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>坚持签到，名列前茅</span>
            <span className={styles.sep}>·</span>
            <span>{leaderboard.length} 位参与者</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <StarIcon />
              </div>
              <div>
                <Eyebrow>TOP 3</Eyebrow>
                <h3 className={styles.cardTitle}>
                  领奖 <span className={styles.song}>台</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.podium}>
            {top3.map((entry, idx) => {
              const rank = idx + 1
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    styles.podiumItem,
                    rank === 1 && styles.podiumFirst,
                    rank === 2 && styles.podiumSecond,
                    rank === 3 && styles.podiumThird,
                  )}
                >
                  <div className={styles.podiumRank}>{rankBadge(rank)}</div>
                  <div className={styles.podiumAv}>
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.nickname} />
                    ) : (
                      (entry.nickname?.[0] || '?')
                    )}
                  </div>
                  <div className={styles.podiumName}>
                    {entry.nickname || '匿名'}
                  </div>
                  <div className={styles.podiumValue}>
                    {tab === 'streak' ? entry.streak : entry.totalPoints}
                    <span className={styles.podiumUnit}>
                      {tab === 'streak' ? '天' : '分'}
                    </span>
                  </div>
                  {entry.title && (
                    <StatusChip tone="acc">{entry.title}</StatusChip>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Full list */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <ChartIcon />
            </div>
            <div>
              <Eyebrow>RANKING</Eyebrow>
              <h3 className={styles.cardTitle}>
                完整 <span className={styles.song}>排名</span>
              </h3>
            </div>
          </div>
        </div>

        <div className={styles.rankList}>
          {loading && leaderboard.length === 0 && (
            <div className={styles.skeleton}>
              <div className={styles.skeletonBar} />
              <div className={styles.skeletonBar} />
              <div className={styles.skeletonBar} />
            </div>
          )}
          {!loading && error && leaderboard.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <ChartIcon />
              </div>
              <div className={styles.emptyTitle}>加载失败</div>
              <div className={styles.emptySub}>{error}</div>
            </div>
          )}
          {!loading && !error && leaderboard.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <ChartIcon />
              </div>
              <div className={styles.emptyTitle}>暂无排行数据</div>
              <div className={styles.emptySub}>签到后将自动进入排行榜</div>
            </div>
          )}

          {top3.map((entry, idx) => {
            const rank = idx + 1
            return (
              <div key={entry.userId} className={styles.rankItem}>
                <div className={cn(styles.rankNo, styles.rankNoTop)}>
                  {rankBadge(rank)}
                </div>
                <div className={styles.rankAv}>
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.nickname} />
                  ) : (
                    (entry.nickname?.[0] || '?')
                  )}
                </div>
                <div className={styles.rankMain}>
                  <div className={styles.rankName}>{entry.nickname || '匿名'}</div>
                  {entry.title && (
                    <div className={styles.rankTitle}>{entry.title}</div>
                  )}
                </div>
                <div className={styles.rankValue}>
                  {tab === 'streak' ? entry.streak : entry.totalPoints}
                  <span className={styles.rankUnit}>
                    {tab === 'streak' ? '天' : '分'}
                  </span>
                </div>
              </div>
            )
          })}

          {rest.map((entry, idx) => {
            const rank = idx + 4
            return (
              <div key={entry.userId} className={styles.rankItem}>
                <div className={styles.rankNo}>{rankBadge(rank)}</div>
                <div className={styles.rankAv}>
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.nickname} />
                  ) : (
                    (entry.nickname?.[0] || '?')
                  )}
                </div>
                <div className={styles.rankMain}>
                  <div className={styles.rankName}>{entry.nickname || '匿名'}</div>
                  {entry.title && (
                    <div className={styles.rankTitle}>{entry.title}</div>
                  )}
                </div>
                <div className={styles.rankValue}>
                  {tab === 'streak' ? entry.streak : entry.totalPoints}
                  <span className={styles.rankUnit}>
                    {tab === 'streak' ? '天' : '分'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {leaderboard.length > 0 && (
          <div className={styles.cardFoot}>
            <span className={styles.footText}>
              共 {leaderboard.length} 位 · 按 {TAB_LABELS[tab]} 排序
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
