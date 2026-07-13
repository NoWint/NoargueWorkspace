import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { message } from 'antd'
import { useUserStore } from '@/stores/user'
import { useCommunityStore } from '@/stores/community'
import { Button, Card, Eyebrow, Stat } from '@/design/primitives'
import { ChatIcon, ClockIcon, RefreshIcon, UserCircleIcon } from '@/design/icons'
import { PostCard } from './CommunityHomeView'
import styles from './UserHomeView.module.css'

function avatarInitial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

/** 帖子卡片骨架（UserHomeView 列表用单列骨架） */
function PostCardSkeleton() {
  return (
    <Card>
      <div className={styles.skeleton}>
        <div className={styles.skRow}>
          <div className={styles.skLine} style={{ width: '40px', height: '40px' }} />
          <div className={styles.skMain}>
            <div className={styles.skLine} style={{ width: '40%', height: '12px' }} />
            <div className={styles.skLine} style={{ width: '60%', height: '10px' }} />
          </div>
        </div>
        <div className={styles.skLine} style={{ width: '90%', height: '16px' }} />
        <div className={styles.skLine} style={{ width: '75%' }} />
        <div className={styles.skRow}>
          <div className={styles.skLine} style={{ width: '60px', height: '12px' }} />
          <div className={styles.skLine} style={{ width: '60px', height: '12px' }} />
          <div className={styles.skLine} style={{ width: '60px', height: '12px' }} />
        </div>
      </div>
    </Card>
  )
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
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || Number.isNaN(uid)) return
    setProfileError(null)
    getProfile(uid).catch((e) => {
      const msg = (e as Error).message || '加载用户失败'
      setProfileError(msg)
      message.error(msg)
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

  const handleRetryProfile = () => {
    setProfileError(null)
    getProfile(uid).catch((e) => {
      setProfileError((e as Error).message || '加载用户失败')
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
  /** 帖子总数：来自 profile.postCount（后端统计），仅当存在时显示 */
  const totalCount = currentProfile?.postCount

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

      {/* Profile card - loading skeleton */}
      {userLoading && !currentProfile && !profileError && (
        <Card>
          <div className={styles.profile}>
            <div className={styles.skLine} style={{ width: '64px', height: '64px' }} />
            <div className={styles.profileMain}>
              <div className={styles.skLine} style={{ width: '40%', height: '18px' }} />
              <div className={styles.skLine} style={{ width: '60%', height: '12px', marginTop: '12px' }} />
            </div>
          </div>
        </Card>
      )}

      {/* Profile card - error */}
      {profileError && !currentProfile && (
        <Card>
          <div className={styles.errorBox}>
            <div className={styles.errorText}>{profileError}</div>
            <Button
              variant="gh"
              size="sm"
              icon={<RefreshIcon className={styles.btnIcon} />}
              onClick={handleRetryProfile}
            >
              重试
            </Button>
          </div>
        </Card>
      )}

      {/* Profile card - loaded */}
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
        <span className={styles.postsCount}>
          {typeof totalCount === 'number'
            ? `共 ${totalCount} 条`
            : `已加载 ${userPosts.length} 条`}
        </span>
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

      {userPosts.length === 0 && postLoading && (
        <>
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </>
      )}

      {userPosts.map((p) => (
        <PostCard
          key={p.postId}
          post={p}
          onToggleLike={handleToggleLike}
          onClick={(id) => navigate(`/community/${id}`)}
        />
      ))}

      {postLoading && userPosts.length > 0 && (
        <PostCardSkeleton />
      )}

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
