import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { message } from 'antd'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import { Button, Card, Eyebrow, Stat } from '@/design/primitives'
import { ChatIcon, ClockIcon, UserCircleIcon } from '@/design/icons'
import { PostCard } from './CommunityHomeView'
import styles from './UserHomeView.module.css'

function avatarInitial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

export function UserHomeView() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { currentProfile, loading: userLoading, getProfile } = useUserStore()
  const rawUserPosts = useCommunityStore((s) => s.userPosts)
  const hasMore = useCommunityStore((s) => s.hasMore)
  const postLoading = useCommunityStore((s) => s.loading)
  const fetchUserPosts = useCommunityStore((s) => s.fetchUserPosts)
  const toggleLike = useCommunityStore((s) => s.toggleLike)
  const userPosts = rawUserPosts || []

  const uid = Number(userId)

  useEffect(() => {
    if (!userId || Number.isNaN(uid)) return
    getProfile(uid).catch((e) => {
      message.error((e as Error).message || '加载用户失败')
    })
    fetchUserPosts(uid, true).catch((e) => {
      message.error((e as Error).message || '加载帖子失败')
    })
  }, [userId, uid, getProfile, fetchUserPosts])

  const handleLoadMore = () => {
    fetchUserPosts(uid, false).catch((e) => {
      message.error((e as Error).message || '加载失败')
    })
  }

  const handleToggleLike = async (postId: string) => {
    await toggleLike(postId)
  }

  if (!userId || Number.isNaN(uid)) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <UserCircleIcon />
          </div>
          <div className={styles.emptyTitle}>无效的用户</div>
        </div>
      </div>
    )
  }

  const badges = currentProfile?.badgeTitles || []
  const badgeColors = currentProfile?.badgeColors || []

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <UserCircleIcon />
            </div>
            <div>
              <Eyebrow>USER</Eyebrow>
              <h1 className={styles.title}>
                用户 <span className={styles.song}>主页</span>
              </h1>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* Profile card */}
      {userLoading && !currentProfile && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <UserCircleIcon />
            </div>
            <div>加载中...</div>
          </div>
        </Card>
      )}

      {currentProfile && (
        <Card>
          <div className={styles.profile}>
            <div className={styles.profileAv}>
              {currentProfile.avatarUrl ? (
                <img
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.nickname}
                />
              ) : (
                avatarInitial(currentProfile.nickname)
              )}
            </div>
            <div className={styles.profileMain}>
              <div className={styles.profileName}>
                {currentProfile.nickname || '匿名'}
              </div>
              {badges.length > 0 && (
                <div className={styles.badges}>
                  {badges.map((b, i) => (
                    <span
                      key={i}
                      className={styles.badge}
                      style={{ background: badgeColors[i] || 'var(--mt3)' }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.profileSub}>
                <ClockIcon className={styles.subIcon} />
                注册 {currentProfile.registeredDays} 天
              </div>
            </div>
          </div>
          <div className={styles.stats}>
            <Stat label="发布帖子" value={currentProfile.postCount} accent />
            <Stat label="注册天数" value={currentProfile.registeredDays} />
          </div>
        </Card>
      )}

      {/* Posts */}
      <div className={styles.postsHead}>
        <Eyebrow>POSTS · 帖子</Eyebrow>
        <span className={styles.postsCount}>{userPosts.length} 条</span>
      </div>

      {userPosts.length === 0 && !postLoading && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ChatIcon />
            </div>
            <div className={styles.emptyTitle}>暂无帖子</div>
            <div className={styles.emptySub}>该用户还没有发布任何动态</div>
          </div>
        </Card>
      )}

      {userPosts.map((p) => (
        <PostCard
          key={p.postId}
          post={p}
          onToggleLike={handleToggleLike}
          onClick={(id) => navigate(`/community/${id}`)}
        />
      ))}

      {hasMore && userPosts.length > 0 && (
        <div className={styles.loadMoreRow}>
          <Button
            variant="gh"
            size="sm"
            onClick={handleLoadMore}
            disabled={postLoading}
          >
            {postLoading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}

      {!hasMore && userPosts.length > 0 && (
        <div className={styles.endHint}>— 已加载全部 —</div>
      )}
    </div>
  )
}
