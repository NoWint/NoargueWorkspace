import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Image, Input, Modal, Popconfirm, message } from 'antd'
import type { PostComment } from '@/api/comments'
import { commentsApi } from '@/api/comments'
import { postsApi, type PostFile, type PostVisitor } from '@/api/posts'
import { likesApi } from '@/api/likes'
import { useCommunityStore } from '@/stores/community'
import { useAuthStore } from '@/stores/auth'
import { Button, Card, Eyebrow, StatusChip } from '@/design/primitives'
import {
  ChatIcon,
  ClockIcon,
  EditIcon,
  EyeIcon,
  FileIcon,
  HeartIcon,
  ListIcon,
  LocationIcon,
  SendIcon,
  TrashIcon,
  UserIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import { PollView } from './PollView'
import styles from './PostDetailView.module.css'

function formatTime(ts: string): string {
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

function avatarInitial(name: string): string {
  return (name || '?').slice(0, 1).toUpperCase()
}

interface LikeUser {
  id: number
  nickname: string
  avatarUrl: string
}

export function PostDetailView() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentPost, loading, fetchById, toggleLike, remove } =
    useCommunityStore()

  const [comments, setComments] = useState<PostComment[]>([])
  const [commentCursor, setCommentCursor] = useState<string | null>(null)
  const [commentHasMore, setCommentHasMore] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<PostComment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [likeModalOpen, setLikeModalOpen] = useState(false)
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([])
  const [likeLoading, setLikeLoading] = useState(false)

  const [visitorModalOpen, setVisitorModalOpen] = useState(false)
  const [visitors, setVisitors] = useState<PostVisitor[]>([])
  const [visitorLoading, setVisitorLoading] = useState(false)

  useEffect(() => {
    if (!postId) return
    fetchById(postId).catch((e) => {
      message.error((e as Error).message || '加载失败')
    })
  }, [postId, fetchById])

  // Initial comment load
  useEffect(() => {
    if (!postId) return
    setCommentLoading(true)
    commentsApi
      .getList(postId, {})
      .then((res) => {
        const d = (res as unknown as Record<string, unknown>).data as Record<string, unknown> | undefined
        const list = (d?.list as PostComment[]) || (res as unknown as Record<string, unknown>).comments as PostComment[] || []
        setComments(list)
        setCommentCursor((d?.nextCursor as string | null) ?? (res as unknown as Record<string, unknown>).nextCursor as string | null ?? null)
        setCommentHasMore((d?.hasMore as boolean) ?? (res as unknown as Record<string, unknown>).hasMore as boolean ?? false)
      })
      .catch((e) => {
        message.error((e as Error).message || '评论加载失败')
      })
      .finally(() => setCommentLoading(false))
  }, [postId])

  const reloadComments = async () => {
    if (!postId) return
    setCommentLoading(true)
    try {
      const res = await commentsApi.getList(postId, {})
      const d = (res as unknown as Record<string, unknown>).data as Record<string, unknown> | undefined
      const list = (d?.list as PostComment[]) || (res as unknown as Record<string, unknown>).comments as PostComment[] || []
      setComments(list)
      setCommentCursor((d?.nextCursor as string | null) ?? (res as unknown as Record<string, unknown>).nextCursor as string | null ?? null)
      setCommentHasMore((d?.hasMore as boolean) ?? (res as unknown as Record<string, unknown>).hasMore as boolean ?? false)
    } catch (e) {
      message.error((e as Error).message || '评论加载失败')
    } finally {
      setCommentLoading(false)
    }
  }

  const loadMoreComments = async () => {
    if (!postId || !commentCursor) return
    setCommentLoading(true)
    try {
      const res = await commentsApi.getList(postId, { cursor: commentCursor })
      const d = (res as unknown as Record<string, unknown>).data as Record<string, unknown> | undefined
      const list = (d?.list as PostComment[]) || (res as unknown as Record<string, unknown>).comments as PostComment[] || []
      setComments((prev) => [...prev, ...list])
      setCommentCursor((d?.nextCursor as string | null) ?? (res as unknown as Record<string, unknown>).nextCursor as string | null ?? null)
      setCommentHasMore((d?.hasMore as boolean) ?? (res as unknown as Record<string, unknown>).hasMore as boolean ?? false)
    } catch (e) {
      message.error((e as Error).message || '评论加载失败')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    const text = commentText.trim()
    if (!text || !postId) return
    setSubmitting(true)
    try {
      await commentsApi.create(postId, {
        content: text,
        parentId: replyTo?.id,
        replyToUserId: replyTo?.userId,
      })
      setCommentText('')
      setReplyTo(null)
      message.success('评论已发布')
      await reloadComments()
    } catch (e) {
      message.error((e as Error).message || '评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentsApi.delete(commentId)
      message.success('已删除')
      await reloadComments()
    } catch (e) {
      message.error((e as Error).message || '删除失败')
    }
  }

  const handleToggleCommentLike = async (commentId: number) => {
    const apply = (list: PostComment[]): PostComment[] =>
      list.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.isLiked
          return {
            ...c,
            isLiked: nextLiked,
            likesCount: c.likesCount + (nextLiked ? 1 : -1),
          }
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: apply(c.replies) }
        }
        return c
      })
    setComments((prev) => apply(prev))
    try {
      await commentsApi.toggleLike(commentId)
    } catch {
      await reloadComments()
    }
  }

  const handleLikePost = async () => {
    if (!postId) return
    try {
      await toggleLike(postId)
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    }
  }

  const handleShowLikeUsers = async () => {
    if (!postId) return
    setLikeModalOpen(true)
    setLikeLoading(true)
    try {
      const res = await likesApi.getUsers(postId)
      const r = res as unknown as Record<string, unknown>
      const d = r.data as Record<string, unknown> | undefined
      setLikeUsers((d?.users as LikeUser[]) || r.users as LikeUser[] || [])
    } catch (e) {
      message.error((e as Error).message || '加载失败')
    } finally {
      setLikeLoading(false)
    }
  }

  const handleShowVisitors = async () => {
    if (!postId) return
    setVisitorModalOpen(true)
    setVisitorLoading(true)
    try {
      const res = await postsApi.getVisitors(postId)
      const d = (res as unknown as Record<string, unknown>).data as Record<string, unknown> | undefined
      setVisitors((d?.visitors as PostVisitor[]) || (res as unknown as Record<string, unknown>).visitors as PostVisitor[] || [])
    } catch (e) {
      message.error((e as Error).message || '加载失败')
    } finally {
      setVisitorLoading(false)
    }
  }

  const handleDeletePost = async () => {
    if (!postId) return
    setRemoving(true)
    try {
      await remove(postId)
      message.success('已删除')
      navigate(-1)
    } catch (e) {
      message.error((e as Error).message || '删除失败')
    } finally {
      setRemoving(false)
    }
  }

  const isAuthor = !!user && !!currentPost && user.id === currentPost.userId

  if (loading && !currentPost) {
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

  if (!currentPost) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div className={styles.emptyTitle}>未找到该帖子</div>
          <div className={styles.emptySub}>可能已被删除或不存在</div>
        </div>
      </div>
    )
  }

  const post = currentPost
  const images = post.images || []
  const files: PostFile[] = post.files || []
  const badges = post.user.badgeTitles || []
  const badgeColors = post.user.badgeColors || []

  const renderComment = (c: PostComment, isReply = false): React.ReactNode => {
    const cBadges = c.user.badgeTitles || []
    const cBadgeColors = c.user.badgeColors || []
    return (
      <div
        key={c.id}
        className={cn(styles.commentItem, isReply && styles.commentReply)}
      >
        <div className={styles.commentAv}>
          {c.user.avatar ? (
            <img src={c.user.avatar} alt={c.user.nickname} />
          ) : (
            avatarInitial(c.user.nickname)
          )}
        </div>
        <div className={styles.commentMain}>
          <div className={styles.commentHead}>
            <span className={styles.commentName}>{c.user.nickname || '匿名'}</span>
            {cBadges.map((b, i) => (
              <span
                key={i}
                className={styles.badge}
                style={{ background: cBadgeColors[i] || 'var(--mt3)' }}
              >
                {b}
              </span>
            ))}
            {c.replyToContent && (
              <span className={styles.replyHint}>回复：{c.replyToContent}</span>
            )}
          </div>
          <div className={styles.commentBody}>{c.content}</div>
          {c.images && c.images.length > 0 && (
            <Image.PreviewGroup>
              <div className={styles.commentImgs}>
                {c.images.map((url, i) => (
                  <Image key={i} src={url} alt="" className={styles.commentImg} />
                ))}
              </div>
            </Image.PreviewGroup>
          )}
          <div className={styles.commentFoot}>
            <span className={styles.footText}>
              <ClockIcon className={styles.footIcon} />
              {formatTime(c.createdAt)}
            </span>
            <button
              type="button"
              className={cn(styles.footBtn, c.isLiked && styles.footLiked)}
              onClick={() => handleToggleCommentLike(c.id)}
            >
              <HeartIcon className={styles.footIcon} />
              {c.likesCount}
            </button>
            {!isReply && (
              <button
                type="button"
                className={styles.footBtn}
                onClick={() => setReplyTo(c)}
              >
                <ChatIcon className={styles.footIcon} />
                回复
              </button>
            )}
            {user?.id === c.userId && (
              <Popconfirm
                title="删除评论"
                description="确定删除这条评论吗？"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteComment(c.id)}
              >
                <button type="button" className={styles.footBtn}>
                  <TrashIcon className={styles.footIcon} />
                  删除
                </button>
              </Popconfirm>
            )}
          </div>
          {c.replies && c.replies.length > 0 && (
            <div className={styles.replyList}>
              {c.replies.map((r) => renderComment(r, true))}
            </div>
          )}
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
              <ChatIcon />
            </div>
            <div>
              <Eyebrow>POST</Eyebrow>
              <h1 className={styles.title}>
                帖子 <span className={styles.song}>详情</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{post.user.nickname || '匿名'}</span>
            <span className={styles.sep}>·</span>
            <span>{formatTime(post.createdAt)}</span>
            {post.isEdited && (
              <>
                <span className={styles.sep}>·</span>
                <span>已编辑</span>
              </>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          {isAuthor && (
            <>
              <Button
                variant="sec"
                size="sm"
                icon={<EditIcon className={styles.btnIcon} />}
                onClick={() => navigate(`/community/${post.postId}/edit`)}
              >
                编辑
              </Button>
              <Popconfirm
                title="删除帖子"
                description="此操作不可恢复"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={handleDeletePost}
                disabled={removing}
              >
                <Button variant="sec" size="sm" disabled={removing}>
                  <TrashIcon className={styles.btnIcon} />
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      </div>

      {/* Post content */}
      <Card>
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
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <h2 className={styles.postTitle}>{post.title || '无标题'}</h2>
        {post.body && <div className={styles.postBody}>{post.body}</div>}

        {images.length > 0 && (
          <Image.PreviewGroup>
            <div className={styles.imgGrid}>
              {images.map((url, i) => (
                <div key={i} className={styles.imgCell}>
                  <Image src={url} alt="" className={styles.img} />
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        )}

        {files.length > 0 && (
          <div className={styles.fileList}>
            {files.map((f) => (
              <a
                key={f.id}
                className={styles.fileItem}
                href={f.url || f.raw_url}
                target="_blank"
                rel="noreferrer"
              >
                <FileIcon className={styles.fileIcon} />
                <div className={styles.fileMain}>
                  <div className={styles.fileName}>{f.filename}</div>
                  <div className={styles.fileSize}>
                    {f.human_size || `${f.size} B`}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className={styles.metaRow}>
          {post.location && (
            <span className={styles.metaChip}>
              <LocationIcon className={styles.metaIcon} />
              {post.location.name}
              {post.location.address ? ` · ${post.location.address}` : ''}
            </span>
          )}
          {post.ipProvince && (
            <span className={styles.metaChip}>IP {post.ipProvince}</span>
          )}
        </div>
      </Card>

      {/* Poll */}
      {post.poll && (
        <Card>
          <PollView
            poll={post.poll}
            postId={post.postId}
            isOwner={isAuthor}
          />
        </Card>
      )}

      {/* Like + stats */}
      <Card>
        <div className={styles.statRow}>
          <button
            type="button"
            className={cn(styles.likeBtn, post.isLiked && styles.likeBtnAct)}
            onClick={handleLikePost}
          >
            <HeartIcon className={styles.likeIcon} />
            {post.isLiked ? '已赞' : '点赞'}
            <span className={styles.likeCount}>{post.likesCount}</span>
          </button>
          <button
            type="button"
            className={styles.statBtn}
            onClick={handleShowLikeUsers}
          >
            <HeartIcon className={styles.footIcon} />
            查看点赞
          </button>
          <span className={styles.statStatic}>
            <ChatIcon className={styles.footIcon} />
            {post.commentsCount} 评论
          </span>
          <button
            type="button"
            className={styles.statBtn}
            onClick={handleShowVisitors}
          >
            <EyeIcon className={styles.footIcon} />
            {post.viewsCount} 浏览
          </button>
        </div>
      </Card>

      {/* Comments */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <ChatIcon />
            </div>
            <div>
              <Eyebrow>COMMENTS</Eyebrow>
              <h3 className={styles.cardTitle}>
                评论 <span className={styles.song}>列表</span>
              </h3>
            </div>
          </div>
          <StatusChip>{comments.length} 条</StatusChip>
        </div>

        <div className={styles.commentList}>
          {comments.length === 0 && !commentLoading && (
            <div className={styles.commentEmpty}>暂无评论，快来抢沙发</div>
          )}
          {comments.map((c) => renderComment(c))}
        </div>

        {commentHasMore && (
          <div className={styles.loadMoreRow}>
            <Button
              variant="gh"
              size="sm"
              onClick={loadMoreComments}
              disabled={commentLoading}
            >
              {commentLoading ? '加载中...' : '加载更多评论'}
            </Button>
          </div>
        )}
      </Card>

      {/* Comment input */}
      <Card>
        <div className={styles.commentInputWrap}>
          {replyTo && (
            <div className={styles.replyBar}>
              <UserIcon className={styles.footIcon} />
              <span>回复 @{replyTo.user.nickname || '匿名'}</span>
              <button
                type="button"
                className={styles.replyCancel}
                onClick={() => setReplyTo(null)}
              >
                取消
              </button>
            </div>
          )}
          <Input.TextArea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              replyTo
                ? `回复 @${replyTo.user.nickname || '匿名'}...`
                : '写下你的评论...'
            }
            autoSize={{ minRows: 2, maxRows: 6 }}
            className={styles.textarea}
          />
          <div className={styles.inputActions}>
            <Button
              variant="pri"
              size="sm"
              icon={<SendIcon className={styles.btnIcon} />}
              onClick={handleSubmitComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? '发送中' : '发送'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Like users modal */}
      <Modal
        title="点赞用户"
        open={likeModalOpen}
        onCancel={() => setLikeModalOpen(false)}
        footer={null}
      >
        {likeLoading ? (
          <div className={styles.modalLoading}>加载中...</div>
        ) : likeUsers.length === 0 ? (
          <div className={styles.modalLoading}>暂无点赞</div>
        ) : (
          <div className={styles.userList}>
            {likeUsers.map((u) => (
              <div
                key={u.id}
                className={styles.userRow}
                onClick={() => {
                  setLikeModalOpen(false)
                  navigate(`/community/user/${u.id}`)
                }}
              >
                <div className={styles.userAv}>
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.nickname} />
                  ) : (
                    avatarInitial(u.nickname)
                  )}
                </div>
                <span className={styles.userName}>{u.nickname || '匿名'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Visitors modal */}
      <Modal
        title="浏览记录"
        open={visitorModalOpen}
        onCancel={() => setVisitorModalOpen(false)}
        footer={null}
      >
        {visitorLoading ? (
          <div className={styles.modalLoading}>加载中...</div>
        ) : visitors.length === 0 ? (
          <div className={styles.modalLoading}>暂无浏览记录</div>
        ) : (
          <div className={styles.userList}>
            {visitors.map((v) => (
              <div key={v.id} className={styles.userRow}>
                <div className={styles.userAv}>
                  {v.user?.avatarUrl ? (
                    <img src={v.user.avatarUrl} alt={v.user.nickname} />
                  ) : (
                    avatarInitial(v.user?.nickname || '?')
                  )}
                </div>
                <span className={styles.userName}>
                  {v.user?.nickname || `访客 ${v.visitorIp || ''}`}
                </span>
                <span className={styles.userTime}>{formatTime(v.viewedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
