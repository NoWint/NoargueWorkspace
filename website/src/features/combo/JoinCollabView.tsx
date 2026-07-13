import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { collabApi } from '@/api/collab'
import { Button, Card, Eyebrow } from '@/design/primitives'
import { PlusIcon, ListIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './JoinCollabView.module.css'

interface ComboInfo {
  id: number
  name: string
  memberCount?: number
  ownerName?: string
  color?: string
  icon?: string
}

type JoinMode = 'auto' | 'request'

export function JoinCollabView() {
  const navigate = useNavigate()
  const [shareCode, setShareCode] = useState('')
  const [mode, setMode] = useState<JoinMode>('auto')
  const [msg, setMsg] = useState('')
  const [combo, setCombo] = useState<ComboInfo | null>(null)
  const [querying, setQuerying] = useState(false)
  const [joining, setJoining] = useState(false)
  const [queryError, setQueryError] = useState('')

  const handleQuery = async () => {
    const code = shareCode.trim().toUpperCase()
    if (code.length < 6) {
      message.warning('请输入 6 位邀请码')
      return
    }
    setQuerying(true)
    setCombo(null)
    setQueryError('')
    try {
      const res = await collabApi.join(code)
      if (res.success) {
        if (res.isMember && res.combo?.id) {
          message.info('你已是该组合成员')
          navigate(`/combos/${res.combo.id}`)
          return
        }
        if (res.combo) {
          setCombo({
            id: res.combo.id,
            name: res.combo.name,
            memberCount: res.combo.memberCount,
            ownerName: res.combo.ownerName || res.combo.owner?.nickname,
            color: res.combo.color,
            icon: res.combo.icon,
          })
        } else {
          message.info(res.message || '查询成功')
        }
      } else {
        setQueryError(res.message || '邀请码无效')
      }
    } catch (e) {
      setQueryError((e as Error).message || '查询失败')
    } finally {
      setQuerying(false)
    }
  }

  const handleJoin = async () => {
    const code = shareCode.trim().toUpperCase()
    if (code.length < 6) {
      message.warning('请输入 6 位邀请码')
      return
    }
    setJoining(true)
    try {
      if (mode === 'auto') {
        const res = await collabApi.autoJoin(code)
        if (res.success) {
          message.success('已加入组合')
          if (combo?.id) navigate(`/combos/${combo.id}`)
          else navigate('/combos')
        } else {
          message.error(res.message || '加入失败')
        }
      } else {
        if (!combo?.id) {
          message.warning('请先查询组合信息')
          return
        }
        const res = await collabApi.sendRequest(combo.id)
        if (res.success) {
          message.success('申请已发送，等待审批')
          navigate('/combos')
        } else {
          message.error(res.message || '发送申请失败')
        }
      }
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <PlusIcon />
            </div>
            <div>
              <Eyebrow>JOIN</Eyebrow>
              <h1 className={styles.title}>
                加入 <span className={styles.song}>协作</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>输入邀请码加入共享组合</span>
            <span className={styles.sep}>·</span>
            <span>支持自动加入或申请审批</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate('/combos')}>
            ← 返回
          </Button>
        </div>
      </div>

      <div className={styles.col}>
        {/* Code input */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>SHARE CODE</Eyebrow>
                <h3 className={styles.cardTitle}>
                  邀请 <span className={styles.song}>码</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.codeInputWrap}>
            <input
              className={styles.codeInput}
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="输入 6-8 位邀请码"
              maxLength={8}
              autoFocus
            />
            <div className={styles.codeHint}>
              邀请码由组合超管分享，不区分大小写
            </div>
          </div>
          {queryError && (
            <div className={cn(styles.notice, styles.noticeErr, styles.noticeSpaced)}>
              {queryError}
            </div>
          )}
          <div className={styles.actionBar}>
            <Button
              variant="pri"
              size="sm"
              disabled={querying}
              onClick={handleQuery}
            >
              {querying ? '查询中...' : '查询组合'}
            </Button>
          </div>
        </Card>

        {/* Join mode selection */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <PlusIcon />
              </div>
              <div>
                <Eyebrow>MODE</Eyebrow>
                <h3 className={styles.cardTitle}>
                  加入 <span className={styles.song}>方式</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.modeGroup}>
            <button
              type="button"
              className={cn(styles.modeOpt, mode === 'auto' && styles.modeOptAct)}
              onClick={() => setMode('auto')}
            >
              <span className={styles.modeDot} />
              自动加入
            </button>
            <button
              type="button"
              className={cn(styles.modeOpt, mode === 'request' && styles.modeOptAct)}
              onClick={() => setMode('request')}
            >
              <span className={styles.modeDot} />
              发送申请
            </button>
          </div>
          {mode === 'request' && (
            <div className={cn(styles.formRow, styles.formRowSpaced)}>
              <span className={styles.formLabel}>申请留言</span>
              <textarea
                className={styles.msgInput}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="向组合超管介绍一下自己（可选）"
                maxLength={100}
                rows={3}
              />
            </div>
          )}
        </Card>

        {/* Combo info preview */}
        {combo && (
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <ListIcon />
                </div>
                <div>
                  <Eyebrow>COMBO</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    组合 <span className={styles.song}>信息</span>
                  </h3>
              </div>
              </div>
            </div>
            <div className={styles.infoCard}>
              <div
                className={styles.infoIcon}
                style={combo.color ? { background: combo.color } : undefined}
              >
                <ListIcon />
              </div>
              <div className={styles.infoBody}>
                <div className={styles.infoName}>{combo.name}</div>
                <div className={styles.infoMeta}>
                  {combo.ownerName && <span>创建者：{combo.ownerName}</span>}
                  {combo.memberCount != null && (
                    <>
                      <span className={styles.infoSep}>·</span>
                      <span>{combo.memberCount} 位成员</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.actionBar}>
              <Button
                variant="pri"
                size="sm"
                disabled={joining}
                onClick={handleJoin}
              >
                {joining ? '处理中...' : mode === 'auto' ? '确认加入' : '发送申请'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
