import { useEffect, useState } from 'react'
import { Input, Modal, message } from 'antd'
import { Button, Card, Eyebrow, Tag } from '@/design/primitives'
import {
  UsersIcon,
  SearchIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
} from '@/design/icons'
import { useAdminStore } from '@/stores/admin'
import { cn, formatDate } from '@/lib/utils'
import type { AdminUser } from '@/api/admin'
import styles from './AdminUsersView.module.css'

const PAGE_SIZE = 10

interface BadgeDraft {
  title: string
  color: string
}

const DEFAULT_BADGE_COLOR = '#01796f'

function truncateOpenid(openid: string): string {
  if (!openid) return '—'
  if (openid.length <= 12) return openid
  return `${openid.slice(0, 6)}...${openid.slice(-4)}`
}

export function AdminUsersView() {
  const {
    users,
    total,
    page,
    loading,
    userDetail,
    fetchUsers,
    fetchUserDetail,
    updateUserLimits,
    updateUserNickname,
    updateUserBadges,
  } = useAdminStore()

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState<string | undefined>(undefined)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailUserId, setDetailUserId] = useState<number | null>(null)

  // 限制编辑
  const [limitTodo, setLimitTodo] = useState<string>('')
  const [limitCombo, setLimitCombo] = useState<string>('')
  const [limitCollab, setLimitCollab] = useState<string>('')
  const [savingLimits, setSavingLimits] = useState(false)

  // 昵称编辑
  const [nicknameInput, setNicknameInput] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  // 徽章编辑
  const [badgeDrafts, setBadgeDrafts] = useState<BadgeDraft[]>([])
  const [savingBadges, setSavingBadges] = useState(false)

  useEffect(() => {
    fetchUsers({ page: 1, pageSize: PAGE_SIZE, search: appliedSearch }).catch((e) => {
      message.error((e as Error).message || '加载用户列表失败')
    })
  }, [fetchUsers, appliedSearch])

  const handleSearch = () => {
    const trimmed = searchInput.trim()
    setAppliedSearch(trimmed || undefined)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  const goPrev = () => {
    if (page <= 1) return
    fetchUsers({ page: page - 1, pageSize: PAGE_SIZE, search: appliedSearch }).catch(() => {
      // ignore
    })
  }

  const goNext = () => {
    if (page * PAGE_SIZE >= total) return
    fetchUsers({ page: page + 1, pageSize: PAGE_SIZE, search: appliedSearch }).catch(() => {
      // ignore
    })
  }

  const openDetail = async (userId: number) => {
    setDetailUserId(userId)
    setDetailOpen(true)
    try {
      await fetchUserDetail(userId)
    } catch (e) {
      message.error((e as Error).message || '加载用户详情失败')
    }
  }

  // 同步 userDetail 到本地编辑状态
  useEffect(() => {
    if (!userDetail) return
    setLimitTodo(String(userDetail.todoLimit ?? 0))
    setLimitCombo(String(userDetail.comboLimit ?? 0))
    setLimitCollab(String(userDetail.collabLimit ?? 0))
    setNicknameInput(userDetail.nickname || '')
    const drafts: BadgeDraft[] = (userDetail.badgeTitles || []).map((title, i) => ({
      title,
      color: userDetail.badgeColors?.[i] || DEFAULT_BADGE_COLOR,
    }))
    setBadgeDrafts(drafts)
  }, [userDetail])

  const handleSaveLimits = async () => {
    if (detailUserId === null) return
    const todoLimit = Number(limitTodo)
    const comboLimit = Number(limitCombo)
    const collabLimit = Number(limitCollab)
    if (Number.isNaN(todoLimit) || Number.isNaN(comboLimit) || Number.isNaN(collabLimit)) {
      message.warning('上限必须为数字')
      return
    }
    setSavingLimits(true)
    try {
      await updateUserLimits(detailUserId, { todoLimit, comboLimit, collabLimit })
      message.success('上限已更新')
    } catch (e) {
      message.error((e as Error).message || '更新上限失败')
    } finally {
      setSavingLimits(false)
    }
  }

  const handleSaveNickname = async () => {
    if (detailUserId === null) return
    const name = nicknameInput.trim()
    if (!name) {
      message.warning('请输入昵称')
      return
    }
    setSavingNickname(true)
    try {
      await updateUserNickname(detailUserId, name)
      message.success('昵称已更新')
    } catch (e) {
      message.error((e as Error).message || '更新昵称失败')
    } finally {
      setSavingNickname(false)
    }
  }

  const handleAddBadge = () => {
    setBadgeDrafts((prev) => [...prev, { title: '', color: DEFAULT_BADGE_COLOR }])
  }

  const handleRemoveBadge = (idx: number) => {
    setBadgeDrafts((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleBadgeTitleChange = (idx: number, value: string) => {
    setBadgeDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, title: value } : d)),
    )
  }

  const handleBadgeColorChange = (idx: number, value: string) => {
    setBadgeDrafts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, color: value } : d)),
    )
  }

  const handleSaveBadges = async () => {
    if (detailUserId === null) return
    const titles = badgeDrafts.map((d) => d.title.trim()).filter(Boolean)
    const colors = badgeDrafts.map((d) => d.color.trim() || DEFAULT_BADGE_COLOR)
    setSavingBadges(true)
    try {
      await updateUserBadges(detailUserId, { badgeTitles: titles, badgeColors: colors })
      message.success('徽章已更新')
    } catch (e) {
      message.error((e as Error).message || '更新徽章失败')
    } finally {
      setSavingBadges(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const statsEntries = userDetail?.stats
    ? Object.entries(userDetail.stats).filter(([, v]) => typeof v === 'number')
    : []

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <UsersIcon />
            </div>
            <div>
              <Eyebrow>USERS</Eyebrow>
              <h1 className={styles.title}>
                用户 <span className={styles.song}>管理</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>共 {total} 位用户</span>
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

      {/* Search bar */}
      <div className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="搜索昵称或 openid"
          allowClear
        />
        <Button
          variant="pri"
          size="sm"
          icon={<SearchIcon className={styles.btnIcon} />}
          onClick={handleSearch}
        >
          搜索
        </Button>
      </div>

      {/* User table */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <UsersIcon />
            </div>
            <div>
              <Eyebrow>LIST</Eyebrow>
              <h3 className={styles.cardTitle}>
                用户 <span className={styles.song}>列表</span>
              </h3>
            </div>
          </div>
        </div>

        {users.length === 0 && !loading && (
          <div className={styles.empty}>暂无用户数据</div>
        )}
        {users.length === 0 && loading && (
          <div className={styles.empty}>加载中...</div>
        )}

        {users.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>待办</th>
                  <th>组合</th>
                  <th>角色</th>
                  <th>徽章</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: AdminUser) => (
                  <tr key={u.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userAv}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.nickname} />
                          ) : (
                            (u.nickname?.[0] || '?')
                          )}
                        </div>
                        <div className={styles.userMeta}>
                          <span className={styles.userName}>{u.nickname || '匿名'}</span>
                          <span className={styles.userOpenid} title={u.openid}>
                            {truncateOpenid(u.openid)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.countCell}>{u.todoCount}</span>
                      <span className={styles.countLimit}> / {u.todoLimit}</span>
                    </td>
                    <td>
                      <span className={styles.countCell}>{u.comboCount}</span>
                      <span className={styles.countLimit}> / {u.comboLimit}</span>
                    </td>
                    <td>
                      {u.isAdmin ? (
                        <Tag tone="pri">管理员</Tag>
                      ) : (
                        <Tag>普通</Tag>
                      )}
                    </td>
                    <td>
                      {u.badgeTitles && u.badgeTitles.length > 0 ? (
                        <div className={styles.badges}>
                          {u.badgeTitles.map((_, i) => (
                            <span
                              key={i}
                              className={styles.badgeDot}
                              style={{ background: u.badgeColors?.[i] || DEFAULT_BADGE_COLOR }}
                              title={u.badgeTitles[i]}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className={styles.noBadge}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.dateCell}>
                        {u.createdAt ? formatDate(u.createdAt) : '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => openDetail(u.id)}
                      >
                        <EyeIcon />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {users.length > 0 && (
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

      {/* User detail modal */}
      <Modal
        title="用户详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {!userDetail && (
          <div className={styles.empty}>加载中...</div>
        )}
        {userDetail && (
          <>
            {/* 基本信息 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>基本信息</span>
              <div className={styles.detailInfo}>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>ID</span>
                  <span className={styles.detailInfoVal}>{userDetail.id}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>昵称</span>
                  <span className={styles.detailInfoVal}>{userDetail.nickname || '—'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>OpenID</span>
                  <span className={styles.detailInfoVal}>{userDetail.openid || '—'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>角色</span>
                  <span className={styles.detailInfoVal}>
                    {userDetail.isAdmin ? '管理员' : '普通用户'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>待办数</span>
                  <span className={styles.detailInfoVal}>
                    {userDetail.todoCount} / {userDetail.todoLimit}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>组合数</span>
                  <span className={styles.detailInfoVal}>
                    {userDetail.comboCount} / {userDetail.comboLimit}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>注册时间</span>
                  <span className={styles.detailInfoVal}>
                    {userDetail.createdAt ? formatDate(userDetail.createdAt) : '—'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoKey}>更新时间</span>
                  <span className={styles.detailInfoVal}>
                    {userDetail.updatedAt ? formatDate(userDetail.updatedAt) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 调整上限 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>调整上限</span>
              <div className={styles.limitRow}>
                <div className={styles.limitField}>
                  <span className={styles.detailInfoKey}>待办上限</span>
                  <Input
                    className={styles.limitInput}
                    value={limitTodo}
                    onChange={(e) => setLimitTodo(e.target.value)}
                    type="number"
                  />
                </div>
                <div className={styles.limitField}>
                  <span className={styles.detailInfoKey}>组合上限</span>
                  <Input
                    className={styles.limitInput}
                    value={limitCombo}
                    onChange={(e) => setLimitCombo(e.target.value)}
                    type="number"
                  />
                </div>
                <div className={styles.limitField}>
                  <span className={styles.detailInfoKey}>协作上限</span>
                  <Input
                    className={styles.limitInput}
                    value={limitCollab}
                    onChange={(e) => setLimitCollab(e.target.value)}
                    type="number"
                  />
                </div>
                <Button
                  variant="pri"
                  size="sm"
                  onClick={handleSaveLimits}
                  disabled={savingLimits}
                >
                  {savingLimits ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>

            {/* 修改昵称 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>修改昵称</span>
              <div className={styles.nicknameRow}>
                <Input
                  className={styles.nicknameInput}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="输入新昵称"
                  maxLength={30}
                />
                <Button
                  variant="pri"
                  size="sm"
                  onClick={handleSaveNickname}
                  disabled={savingNickname}
                >
                  {savingNickname ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>

            {/* 管理徽章 */}
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>管理徽章</span>
              <div className={styles.badgeList}>
                {badgeDrafts.length === 0 && (
                  <div className={cn(styles.detailInfoKey)} style={{ padding: '8px 0' }}>
                    暂无徽章
                  </div>
                )}
                {badgeDrafts.map((badge, idx) => (
                  <div key={idx} className={styles.badgeRow}>
                    <input
                      type="color"
                      className={styles.badgeColorInput}
                      value={badge.color}
                      onChange={(e) => handleBadgeColorChange(idx, e.target.value)}
                      title="徽章颜色"
                    />
                    <Input
                      className={styles.badgeTitleInput}
                      value={badge.title}
                      onChange={(e) => handleBadgeTitleChange(idx, e.target.value)}
                      placeholder="徽章标题"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      className={styles.badgeDelBtn}
                      onClick={() => handleRemoveBadge(idx)}
                      title="删除徽章"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.badgeAddBtn}
                  onClick={handleAddBadge}
                >
                  <PlusIcon />
                  添加徽章
                </button>
              </div>
              <Button
                variant="pri"
                size="sm"
                onClick={handleSaveBadges}
                disabled={savingBadges}
                style={{ marginTop: 8, alignSelf: 'flex-start' }}
              >
                {savingBadges ? '保存中...' : '保存徽章'}
              </Button>
            </div>

            {/* 统计数据 */}
            {statsEntries.length > 0 && (
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>用户统计</span>
                <div className={styles.statsList}>
                  {statsEntries.map(([key, val]) => (
                    <div key={key} className={styles.statsItem}>
                      <span className={styles.statsKey}>{key}</span>
                      <span className={styles.statsVal}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
