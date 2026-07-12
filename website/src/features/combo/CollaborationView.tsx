import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { message, Popconfirm } from 'antd'
import { combosApi } from '@/api/combos'
import { collabApi } from '@/api/collab'
import { Button, Card, Eyebrow, StatusChip, Toggle } from '@/design/primitives'
import {
  ListIcon,
  BellIcon,
  CheckIcon,
  TrashIcon,
  ClockIcon,
} from '@/design/icons'
import styles from './CollaborationView.module.css'

interface Member {
  id: number
  userId: number
  role: 'owner' | 'admin' | 'member'
  nickname: string
  avatarUrl: string
  joinedAt: string
}

interface JoinRequest {
  id: number
  userId: number
  nickname: string
  avatarUrl: string
  message: string
  status: string
  createdAt: string
}

interface ComboInfo {
  id: number
  name: string
  isShared: boolean
  shareCode?: string
  userRole?: string | null
  memberCount?: number
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: '超管',
  admin: '管理',
  member: '成员',
}

export function CollaborationView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [combo, setCombo] = useState<ComboInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [autoMode, setAutoMode] = useState(false)
  const [acting, setActing] = useState(false)

  const comboId = Number(id)

  const loadAll = useCallback(async () => {
    if (!id || Number.isNaN(comboId)) {
      setLoading(false)
      return
    }
    try {
      const [comboRes, membersRes, reqRes] = await Promise.all([
        combosApi.getById(comboId),
        collabApi.getMembers(comboId).catch(() => ({ success: false, members: [] })),
        collabApi.getRequests(comboId).catch(() => ({ success: false, requests: [] })),
      ])
      if (comboRes.success && comboRes.combo) {
        const c = comboRes.combo
        setCombo({
          id: c.id,
          name: c.name,
          isShared: c.isShared,
          shareCode: c.shareCode,
          userRole: c.userRole ?? null,
          memberCount: c.memberCount,
          createdAt: c.createdAt,
        })
        if (c.shareCode) {
          collabApi
            .getQrCode(c.shareCode, false)
            .then((r) => {
              if (r.success && r.qrcode) setQrCode(r.qrcode)
            })
            .catch(() => {})
        }
      }
      if (membersRes.success) setMembers(membersRes.members || [])
      if (reqRes.success) setRequests((reqRes.requests || []).filter((r) => r.status === 'pending'))
    } finally {
      setLoading(false)
    }
  }, [id, comboId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const isOwner = combo?.userRole === 'owner'
  const canManage = combo?.userRole === 'owner' || combo?.userRole === 'admin'

  const handleCopyCode = () => {
    if (!combo?.shareCode) return
    navigator.clipboard
      .writeText(combo.shareCode)
      .then(() => message.success('邀请码已复制'))
      .catch(() => message.error('复制失败'))
  }

  const handleApprove = async (reqId: number) => {
    setActing(true)
    try {
      const res = await collabApi.approveRequest(reqId)
      if (res.success) {
        message.success('已批准申请')
        setRequests((rs) => rs.filter((r) => r.id !== reqId))
        await loadAll()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async (reqId: number) => {
    setActing(true)
    try {
      const res = await collabApi.rejectRequest(reqId)
      if (res.success) {
        message.success('已拒绝申请')
        setRequests((rs) => rs.filter((r) => r.id !== reqId))
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    } finally {
      setActing(false)
    }
  }

  const handleRoleChange = async (m: Member, role: 'owner' | 'admin' | 'member') => {
    if (role === 'owner') {
      message.warning('转让超管请在小程序内操作')
      return
    }
    try {
      const res = await collabApi.setMemberRole(comboId, m.userId, role)
      if (res.success) {
        message.success('角色已更新')
        setMembers((ms) =>
          ms.map((x) => (x.id === m.id ? { ...x, role } : x)),
        )
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    }
  }

  const handleRemoveMember = async (m: Member) => {
    try {
      const res = await collabApi.removeMember(comboId, m.userId)
      if (res.success) {
        message.success('成员已移除')
        setMembers((ms) => ms.filter((x) => x.id !== m.id))
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    }
  }

  const handleLeave = async () => {
    try {
      const res = await collabApi.leave(comboId)
      if (res.success) {
        message.success('已退出组合')
        navigate('/combos')
      } else {
        message.error(res.message || '退出失败')
      }
    } catch (e) {
      message.error((e as Error).message || '退出失败')
    }
  }

  const refreshQr = async (isAuto: boolean) => {
    if (!combo?.shareCode) return
    try {
      const res = await collabApi.getQrCode(combo.shareCode, isAuto)
      if (res.success && res.qrcode) setQrCode(res.qrcode)
    } catch {
      /* ignore */
    }
  }

  const handleModeToggle = (on: boolean) => {
    setAutoMode(on)
    refreshQr(on)
  }

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }

  if (!combo || !combo.isShared) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div className={styles.emptyTitle}>无法访问协作管理</div>
          <div className={styles.emptySub}>该组合不存在或不是共享组合</div>
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
              <BellIcon />
            </div>
            <div>
              <Eyebrow>COLLABORATION</Eyebrow>
              <h1 className={styles.title}>
                协作 <span className={styles.song}>管理</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{combo.name}</span>
            <span className={styles.sep}>·</span>
            <span>{members.length} 位成员</span>
            {combo.userRole && (
              <>
                <span className={styles.sep}>·</span>
                <span>你的角色：{ROLE_LABELS[combo.userRole] || combo.userRole}</span>
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

      <div className={styles.grid}>
        {/* Invite section */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <CheckIcon />
              </div>
              <div>
                <Eyebrow>INVITE</Eyebrow>
                <h3 className={styles.cardTitle}>
                  邀请 <span className={styles.song}>成员</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.inviteBody}>
            {combo.shareCode && (
              <div className={styles.inviteRow}>
                <div className={styles.codeBox}>
                  <span className={styles.code}>{combo.shareCode}</span>
                </div>
                <button type="button" className={styles.copyBtn} onClick={handleCopyCode}>
                  复制邀请码
                </button>
              </div>
            )}

            {qrCode && (
              <div className={styles.qrWrap}>
                <img className={styles.qrImg} src={qrCode} alt="邀请二维码" />
                <div className={styles.qrTip}>扫描二维码加入组合</div>
              </div>
            )}

            {canManage && (
              <div className={styles.modeRow}>
                <div>
                  <div className={styles.modeLabel}>自动加入模式</div>
                  <div className={styles.modeDesc}>
                    {autoMode ? '新成员可直接加入，无需审批' : '新成员需发送申请，审批后加入'}
                  </div>
                </div>
                <div className={styles.modeControl}>
                  <Toggle on={autoMode} onChange={handleModeToggle} />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Members list */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>MEMBERS</Eyebrow>
                <h3 className={styles.cardTitle}>
                  成员 <span className={styles.song}>列表</span>
                </h3>
              </div>
            </div>
            <StatusChip tone="acc">{members.length} 人</StatusChip>
          </div>
          <div className={styles.memberList}>
            {members.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>暂无成员</div>
              </div>
            )}
            {members.map((m) => (
              <div key={m.id} className={styles.member}>
                <div className={styles.memberAv}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.nickname} />
                  ) : (
                    (m.nickname?.[0] || '?')
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>
                    {m.nickname}
                    <StatusChip
                      tone={m.role === 'owner' ? 'acc' : m.role === 'admin' ? 'ok' : 'default'}
                    >
                      {ROLE_LABELS[m.role] || m.role}
                    </StatusChip>
                  </div>
                  <div className={styles.memberJoined}>
                    {m.joinedAt ? `加入于 ${m.joinedAt.slice(0, 10)}` : ''}
                  </div>
                </div>
                {canManage && m.role !== 'owner' && (
                  <div className={styles.memberActions}>
                    <select
                      className={styles.roleSel}
                      value={m.role}
                      onChange={(e) =>
                        handleRoleChange(m, e.target.value as 'admin' | 'member')
                      }
                    >
                      <option value="member">成员</option>
                      <option value="admin">管理</option>
                    </select>
                    <Popconfirm
                      title="移除成员"
                      description={`确定移除 ${m.nickname} 吗？`}
                      okText="移除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleRemoveMember(m)}
                    >
                      <button type="button" className={styles.removeBtn}>
                        <TrashIcon />
                      </button>
                    </Popconfirm>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Join requests (only for owner/admin) */}
      {canManage && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ClockIcon />
              </div>
              <div>
                <Eyebrow>REQUESTS</Eyebrow>
                <h3 className={styles.cardTitle}>
                  加入 <span className={styles.song}>申请</span>
                </h3>
              </div>
            </div>
            {requests.length > 0 && <span className={styles.badge}>{requests.length}</span>}
          </div>
          <div className={styles.memberList}>
            {requests.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>暂无待处理申请</div>
              </div>
            )}
            {requests.map((r) => (
              <div key={r.id} className={styles.reqItem}>
                <div className={styles.reqAv}>
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt={r.nickname} />
                  ) : (
                    (r.nickname?.[0] || '?')
                  )}
                </div>
                <div className={styles.reqBody}>
                  <div className={styles.reqName}>{r.nickname}</div>
                  {r.message && <div className={styles.reqMsg}>{r.message}</div>}
                  <div className={styles.reqTime}>
                    {r.createdAt ? r.createdAt.slice(0, 16).replace('T', ' ') : ''}
                  </div>
                </div>
                <div className={styles.reqActions}>
                  <Button
                    variant="pri"
                    size="sm"
                    disabled={acting}
                    onClick={() => handleApprove(r.id)}
                  >
                    批准
                  </Button>
                  <Button
                    variant="gh"
                    size="sm"
                    disabled={acting}
                    onClick={() => handleReject(r.id)}
                  >
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Danger zone */}
      <div className={styles.dangerZone}>
        <Popconfirm
          title={isOwner ? '解散组合' : '退出组合'}
          description={
            isOwner
              ? '解散后所有成员将被移除，组合数据不可恢复'
              : '退出后你将无法访问该共享组合'
          }
          okText={isOwner ? '解散' : '退出'}
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={handleLeave}
        >
          <Button variant="gh" size="sm" disabled={acting}>
            {isOwner ? '解散组合' : '退出组合'}
          </Button>
        </Popconfirm>
      </div>
    </div>
  )
}
