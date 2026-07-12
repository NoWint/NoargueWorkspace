import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Combo } from '@/types'
import { combosApi } from '@/api/combos'
import { collabApi } from '@/api/collab'
import { useTodoStore } from '@/stores/todos'
import { Button, Card, Eyebrow, Stat, StatusChip } from '@/design/primitives'
import {
  ListIcon,
  PlusIcon,
  CheckIcon,
  BellIcon,
  ChartIcon,
  ClockIcon,
} from '@/design/icons'
import { TodoItem } from './TodoItem'
import styles from './ComboDetailView.module.css'

interface Member {
  id: number
  nickname: string
  avatarUrl: string
  role: string
  joinedAt: string
}

interface ComboDetail extends Combo {
  shareCode?: string
  todoCount?: number
  memberCount?: number
  userRole?: string | null
  members: Member[]
  sharedTodos: any[]
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: '超管',
  admin: '管理',
  member: '成员',
}

export function ComboDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { todos, fetchTodos, loading } = useTodoStore()
  const [combo, setCombo] = useState<ComboDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [pendingRequests, setPendingRequests] = useState(0)

  const fetchRequests = useCallback(async (comboId: number, userRole?: string | null) => {
    if (userRole !== 'owner' && userRole !== 'admin') {
      setPendingRequests(0)
      return
    }
    try {
      const res = await collabApi.getRequests(comboId)
      if (res.success) {
        setPendingRequests((res.requests || []).filter((r) => r.status === 'pending').length)
      }
    } catch {
      setPendingRequests(0)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
    if (!id) return
    const numId = Number(id)
    if (Number.isNaN(numId)) {
      setDetailLoading(false)
      return
    }
    combosApi
      .getById(numId)
      .then((res) => {
        if (res.success && res.combo) {
          setCombo(res.combo)
          if (res.combo.isShared) {
            fetchRequests(numId, res.combo.userRole ?? null)
          }
        }
      })
      .finally(() => setDetailLoading(false))
  }, [id, fetchTodos, fetchRequests])

  const comboTodos = useMemo(
    () =>
      todos.filter(
        (t) => !t.isDeleted && t.comboId === Number(id),
      ),
    [todos, id],
  )

  const stats = useMemo(() => {
    const total = comboTodos.length
    const completed = comboTodos.filter((t) => t.completed).length
    const uncompleted = total - completed
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, uncompleted, rate }
  }, [comboTodos])

  if (detailLoading) {
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

  if (!combo) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div className={styles.emptyTitle}>未找到该组合</div>
          <div className={styles.emptySub}>可能已被删除或不存在</div>
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
            <div className={styles.hdIcColor} style={{ background: combo.color }}>
              <ListIcon />
            </div>
            <div>
              <Eyebrow>COMBO</Eyebrow>
              <h1 className={styles.title}>
                {combo.name}
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <StatusChip tone={combo.isShared ? 'acc' : 'default'}>
              {combo.isShared ? '共享组合' : '私有组合'}
            </StatusChip>
            <span className={styles.sep}>·</span>
            <span>{stats.total} 项待办</span>
            {combo.createdAt && (
              <>
                <span className={styles.sep}>·</span>
                <span>创建于 {combo.createdAt.slice(0, 10)}</span>
              </>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate('/combos')}>
            ← 返回
          </Button>
          <Button
            variant="sec"
            size="sm"
            icon={<ChartIcon className={styles.btnIcon} />}
            onClick={() => navigate(`/combos/${combo.id}/stats`)}
          >
            组合统计
          </Button>
          {combo.isShared && (
            <Button
              variant="sec"
              size="sm"
              icon={<BellIcon className={styles.btnIcon} />}
              onClick={() => navigate(`/combos/${combo.id}/collaboration`)}
            >
              协作管理
            </Button>
          )}
          <Button
            variant="sec"
            size="sm"
            onClick={() => navigate('/combos')}
          >
            编辑
          </Button>
          <Button
            variant="pri"
            size="sm"
            icon={<PlusIcon className={styles.btnIcon} />}
            onClick={() => navigate(`/todos/new?comboId=${combo.id}`)}
          >
            添加待办
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat label="总数" value={stats.total} delta="组合内待办" />
        <Stat
          label="已完成"
          value={stats.completed}
          accent
          delta={<span className={styles.deltaUp}>已完成</span>}
        />
        <Stat label="未完成" value={stats.uncompleted} delta="进行中" />
        <Stat
          label="完成率"
          value={<>{stats.rate}<span className={styles.pctSign}>%</span></>}
          delta="目标 80%"
        />
      </div>

      <div className={styles.grid}>
        {/* Todo list */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <CheckIcon />
              </div>
              <div>
                <Eyebrow>TODOS</Eyebrow>
                <h3 className={styles.cardTitle}>
                  待办 <span className={styles.song}>列表</span>
                </h3>
              </div>
            </div>
          </div>

          <div className={styles.todoList}>
            {loading && comboTodos.length === 0 && (
              <div className={styles.empty}>加载中...</div>
            )}
            {!loading && comboTodos.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <ListIcon />
                </div>
                <div className={styles.emptyTitle}>此组合暂无待办</div>
                <div className={styles.emptySub}>
                  点击右上角"添加待办"开始
                </div>
              </div>
            )}
            {comboTodos.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </div>

          {comboTodos.length > 0 && (
            <div className={styles.cardFoot}>
              <span className={styles.footText}>共 {comboTodos.length} 项</span>
            </div>
          )}
        </Card>

        {/* Side column: info + members */}
        <div className={styles.grid} style={{ gridTemplateColumns: '1fr' }}>
          {/* Combo info */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <BellIcon />
                </div>
                <div>
                  <Eyebrow>INFO</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    组合 <span className={styles.song}>信息</span>
                  </h3>
                </div>
              </div>
            </div>
            <div className={styles.lines}>
              <div className={styles.line}>
                <span className={styles.lineLabel}>描述</span>
                <span className={styles.lineVal}>
                  {combo.description || '—'}
                </span>
              </div>
              <div className={styles.line}>
                <span className={styles.lineLabel}>待办数量</span>
                <span className={styles.lineVal}>{stats.total}</span>
              </div>
              <div className={styles.line}>
                <span className={styles.lineLabel}>类型</span>
                <span className={styles.lineVal}>
                  {combo.isShared ? '共享组合' : '私有组合'}
                </span>
              </div>
              {combo.createdAt && (
                <div className={styles.line}>
                  <span className={styles.lineLabel}>创建时间</span>
                  <span className={styles.monoVal}>
                    {combo.createdAt.slice(0, 10)}
                  </span>
                </div>
              )}
              {combo.isShared && combo.shareCode && (
                <div className={styles.line}>
                  <span className={styles.lineLabel}>邀请码</span>
                  <span className={styles.lineVal}>{combo.shareCode}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Members (shared only) */}
          {combo.isShared && combo.members && combo.members.length > 0 && (
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
                <StatusChip tone="acc">{combo.members.length} 人</StatusChip>
              </div>
              <div className={styles.memberList}>
                {combo.members.map((m) => (
                  <div key={m.id} className={styles.member}>
                    <div className={styles.memberAv}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.nickname} />
                      ) : (
                        (m.nickname?.[0] || '?')
                      )}
                    </div>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{m.nickname}</div>
                      <div className={styles.memberJoined}>
                        {ROLE_LABELS[m.role] || m.role}
                        {m.joinedAt && ` · ${m.joinedAt.slice(0, 10)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Join requests entry (shared + owner/admin only) */}
          {combo.isShared && (combo.userRole === 'owner' || combo.userRole === 'admin') && (
            <div
              className={styles.reqEntry}
              onClick={() => navigate(`/combos/${combo.id}/collaboration`)}
            >
              <div className={styles.reqEntryL}>
                <div className={styles.hdIc}>
                  <ClockIcon />
                </div>
                <div>
                  <div className={styles.reqEntryTitle}>加入申请</div>
                  <div className={styles.reqEntrySub}>
                    {pendingRequests > 0 ? `${pendingRequests} 条待处理` : '查看并管理申请'}
                  </div>
                </div>
              </div>
              {pendingRequests > 0 && (
                <span className={styles.reqBadge}>{pendingRequests}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
