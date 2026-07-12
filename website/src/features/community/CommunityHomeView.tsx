import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import type { Post } from '@/api/posts'
import { useCommunityStore } from '@/stores/community'
import { Button, Card, Eyebrow } from '@/design/primitives'
import {
  ChatIcon,
  ClockIcon,
  EyeIcon,
  FileIcon,
  HeartIcon,
  MapPinIcon,
  PlusIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './CommunityHomeView.module.css'

function formatPostTime(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function avatarInitial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

interface PostCardProps {
  post: Post
  onToggleLike?: (postId: string) => Promise<void> | void
  onClick?: (postId: string) => void
}

/** Reusable post card. Shared by CommunityHomeView and UserHomeView. */
export function PostCard({ post, onToggleLike, onClick }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.likesCount)

  useEffect(() => {
    setLiked(post.isLiked)
    setLikeCount(post.likesCount)
  }, [post.isLiked, post.likesCount])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((c) => c + (nextLiked ? 1 : -1))
    try {
      await onToggleLike?.(post.postId)
    } catch {
      setLiked(!nextLiked)
      setLikeCount((c) => c + (nextLiked ? -1 : 1))
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(post.postId)
    }
  }

  const images = post.images || []
  const files = post.files || []
  const badges = post.user.badgeTitles || []
  const badgeColors = post.user.badgeColors || []

  return (
    <Card>
      <div
        className={styles.postCard}
        onClick={() => onClick?.(post.postId)}
        onKeyDown={handleKey}
        role="button"
        tabIndex={0}
      >
        <div className={styles.postHead}>
          <div className={styles.postAv}>
            {post.user.avatar ? (
              <img src={post.user.avatar} alt={post.user.nickname} />
            ) : (
              avatarInitial(post.user.nickname)
            )}
          </div>
          <div className={styles.postHeadMain}>
            <div className={styles.postName}>{post.user.nickname || '匿名'}</div>
            {badges.length > 0 && (
              <div className={styles.badges}>
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className={styles.badge}
                    style={{ background: badgeColors[i] || 'var(--mt3)' }}
                    title={b}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={styles.postTime}>
            <ClockIcon className={styles.timeIcon} />
            {formatPostTime(post.createdAt)}
          </div>
        </div>

        <div className={styles.postTitle}>{post.title || '无标题'}</div>
        {post.body && <div className={styles.postBody}>{post.body}</div>}

        {images.length > 0 && (
          <div className={styles.imgGrid}>
            {images.slice(0, 4).map((url, i) => (
              <div key={i} className={styles.imgCell}>
                <img src={url} alt="" className={styles.img} loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {(files.length > 0 || post.location || post.ipProvince) && (
          <div className={styles.postMetaRow}>
            {files.length > 0 && (
              <span className={styles.metaChip}>
                <FileIcon className={styles.metaIcon} />
                {files.length} 个文件
              </span>
            )}
            {post.location && (
              <span className={styles.metaChip}>
                <MapPinIcon className={styles.metaIcon} />
                {post.location.name}
              </span>
            )}
            {post.ipProvince && (
              <span className={styles.metaChip}>IP {post.ipProvince}</span>
            )}
          </div>
        )}

        <div className={styles.postFooter}>
          <button
            type="button"
            className={cn(styles.actBtn, liked && styles.actLiked)}
            onClick={handleLike}
          >
            <HeartIcon className={styles.actIcon} />
            {likeCount}
          </button>
          <span className={styles.actStatic}>
            <ChatIcon className={styles.actIcon} />
            {post.commentsCount}
          </span>
          <span className={styles.actStatic}>
            <EyeIcon className={styles.actIcon} />
            {post.viewsCount}
          </span>
        </div>
      </div>
    </Card>
  )
}

export function CommunityHomeView() {
  const navigate = useNavigate()
  const { posts, hasMore, loading, fetchPosts, toggleLike } = useCommunityStore()

  useEffect(() => {
    fetchPosts(true).catch((e) => {
      message.error((e as Error).message || '加载失败')
    })
  }, [fetchPosts])

  const handleToggleLike = async (postId: string) => {
    await toggleLike(postId)
  }

  const handleLoadMore = () => {
    fetchPosts(false).catch((e) => {
      message.error((e as Error).message || '加载失败')
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <ChatIcon />
            </div>
            <div>
              <Eyebrow>COMMUNITY</Eyebrow>
              <h1 className={styles.title}>
                社区 <span className={styles.song}>动态</span>
              </h1>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="pri"
            size="sm"
            icon={<PlusIcon className={styles.btnIcon} />}
            onClick={() => navigate('/community/new')}
          >
            发帖
          </Button>
        </div>
      </div>

      {posts.length === 0 && !loading && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ChatIcon />
            </div>
            <div className={styles.emptyTitle}>暂无社区动态</div>
            <div className={styles.emptySub}>点击右上角"发帖"分享你的想法</div>
          </div>
        </Card>
      )}

      {posts.length === 0 && loading && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ChatIcon />
            </div>
            <div>加载中...</div>
          </div>
        </Card>
      )}

      {posts.map((p) => (
        <PostCard
          key={p.postId}
          post={p}
          onToggleLike={handleToggleLike}
          onClick={(id) => navigate(`/community/${id}`)}
        />
      ))}

      {hasMore && posts.length > 0 && (
        <div className={styles.loadMoreRow}>
          <Button
            variant="gh"
            size="sm"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className={styles.endHint}>— 已加载全部 —</div>
      )}
    </div>
  )
}
