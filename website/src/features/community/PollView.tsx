import { useEffect, useMemo, useState } from 'react'
import { Input, Popconfirm, message } from 'antd'
import type { PollSummary } from '@/api/posts'
import { postsApi } from '@/api/posts'
import { Button } from '@/design/primitives'
import { CheckIcon, ClockIcon, CloseIcon, LockIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './PollView.module.css'

interface PollViewProps {
  poll: PollSummary
  postId: string
  isOwner?: boolean
}

/** 投票类型：1=单选，2=多选 */
const POLL_TYPE_SINGLE = 1

function formatEndTime(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export function PollView({ poll, postId, isOwner }: PollViewProps) {
  const [currentPoll, setCurrentPoll] = useState<PollSummary>(poll)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [otherText, setOtherText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [voting, setVoting] = useState(false)
  const [closing, setClosing] = useState(false)

  // 当父组件传入的 poll 变化时同步本地状态
  useEffect(() => {
    setCurrentPoll(poll)
  }, [poll])

  // 当 poll 更新时，重置选择状态
  useEffect(() => {
    setIsEditing(false)
    setSelectedIds(currentPoll.userVotedOptionIds || [])
    // 若用户曾投过"其他"，无法恢复 customText，留空让用户在改票时重输
    setOtherText('')
  }, [currentPoll])

  const isSingle = currentPoll.type === POLL_TYPE_SINGLE
  const hasVoted = currentPoll.isVoted && !isEditing
  // 投票已结束或用户已投票（非改票中）时展示结果
  const showResults = currentPoll.isEnded || hasVoted
  const otherOption = useMemo(
    () => currentPoll.options.find((o) => o.isOther),
    [currentPoll.options],
  )
  const selectedOther = !!otherOption && selectedIds.includes(otherOption.optionId)
  const totalVotes = currentPoll.totalVotes || 0

  const canSubmit = useMemo(() => {
    if (selectedIds.length === 0) return false
    if (selectedOther && !otherText.trim()) return false
    return true
  }, [selectedIds.length, selectedOther, otherText])

  const handleToggleOption = (optionId: number) => {
    if (isSingle) {
      setSelectedIds([optionId])
    } else {
      setSelectedIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((x) => x !== optionId)
          : [...prev, optionId],
      )
    }
  }

  const handleVote = async () => {
    if (!canSubmit || !postId) return
    setVoting(true)
    try {
      const payload: { optionIds: number[]; otherTexts?: Record<string, string> } = {
        optionIds: selectedIds,
      }
      if (selectedOther && otherText.trim() && otherOption) {
        payload.otherTexts = { [String(otherOption.optionId)]: otherText.trim() }
      }
      const res = await postsApi.votePoll(postId, payload)
      const data = (res as unknown as Record<string, unknown>).data as
        | { poll: PollSummary }
        | undefined
      const nextPoll = data?.poll
      if (nextPoll) {
        setCurrentPoll(nextPoll)
        message.success('投票已提交')
      } else {
        message.success('投票已提交')
      }
    } catch (e) {
      message.error((e as Error).message || '投票失败')
    } finally {
      setVoting(false)
    }
  }

  const handleChangeVote = () => {
    setIsEditing(true)
    setSelectedIds(currentPoll.userVotedOptionIds || [])
    setOtherText('')
  }

  const handleCancelChange = () => {
    setIsEditing(false)
    setSelectedIds(currentPoll.userVotedOptionIds || [])
    setOtherText('')
  }

  const handleClosePoll = async () => {
    if (!postId) return
    setClosing(true)
    try {
      const res = await postsApi.closePoll(postId)
      const data = (res as unknown as Record<string, unknown>).data as
        | { poll: PollSummary }
        | undefined
      if (data?.poll) {
        setCurrentPoll(data.poll)
      } else {
        setCurrentPoll((p) => ({ ...p, isEnded: true }))
      }
      message.success('投票已关闭')
    } catch (e) {
      message.error((e as Error).message || '关闭失败')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className={styles.wrap}>
      {/* 头部：标题 + 标签 */}
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{currentPoll.title}</h3>
          <div className={styles.tags}>
            <span className={cn(styles.tag, styles.tagPri)}>
              {isSingle ? '单选' : '多选'}
            </span>
            {currentPoll.isAnonymous && (
              <span className={styles.tag}>
                <LockIcon className={styles.tagIcon} />
                匿名
              </span>
            )}
            {currentPoll.isEnded && (
              <span className={cn(styles.tag, styles.tagWarn)}>已结束</span>
            )}
            {!currentPoll.isEnded && hasVoted && (
              <span className={cn(styles.tag, styles.tagOk)}>已投票</span>
            )}
          </div>
        </div>
      </div>

      {/* 选项列表 */}
      <div className={styles.optionList}>
        {currentPoll.options.map((opt) => {
          const checked = selectedIds.includes(opt.optionId)
          const percent =
            totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
          const isVotedOption =
            currentPoll.userVotedOptionIds?.includes(opt.optionId) ?? false

          if (showResults) {
            // 已投票或已结束：展示结果
            return (
              <div
                key={opt.optionId}
                className={cn(
                  styles.resultItem,
                  isVotedOption && styles.resultVoted,
                )}
              >
                <div className={styles.resultHead}>
                  <span className={styles.resultText}>
                    {opt.isOther ? '其他' : opt.text}
                  </span>
                  <span className={styles.resultCount}>
                    {opt.voteCount} · {percent}%
                  </span>
                </div>
                <div className={styles.bar}>
                  <span
                    className={cn(
                      styles.barFill,
                      isVotedOption && styles.barFillVoted,
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          }

          // 未投票或改票中：可点击
          return (
            <div key={opt.optionId}>
              <button
                type="button"
                className={cn(styles.optionBtn, checked && styles.optionAct)}
                onClick={() => handleToggleOption(opt.optionId)}
                disabled={currentPoll.isEnded}
              >
                <span
                  className={cn(
                    styles.indicator,
                    isSingle ? styles.radio : styles.checkbox,
                    checked && styles.indicatorAct,
                  )}
                >
                  {checked && <CheckIcon className={styles.indicatorIcon} />}
                </span>
                <span className={styles.optionText}>
                  {opt.isOther ? '其他' : opt.text}
                </span>
              </button>
              {opt.isOther && checked && !currentPoll.isEnded && (
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="请输入你的选项..."
                  maxLength={100}
                  className={styles.otherInput}
                  autoFocus
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 操作区 */}
      {!currentPoll.isEnded && (
        <div className={styles.actions}>
          {hasVoted ? (
            <Button
              variant="gh"
              size="sm"
              onClick={handleChangeVote}
              disabled={voting || closing}
            >
              改票
            </Button>
          ) : (
            <>
              {isEditing && currentPoll.isVoted && (
                <Button
                  variant="gh"
                  size="sm"
                  onClick={handleCancelChange}
                  disabled={voting}
                >
                  取消
                </Button>
              )}
              <Button
                variant="pri"
                size="sm"
                onClick={handleVote}
                disabled={!canSubmit || voting}
              >
                {voting ? '提交中...' : '投票'}
              </Button>
            </>
          )}
          {isOwner && !currentPoll.isEnded && (
            <Popconfirm
              title="关闭投票"
              description="关闭后无法再投票，确定关闭吗？"
              okText="关闭"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={handleClosePoll}
              disabled={closing}
            >
              <Button variant="sec" size="sm" disabled={closing}>
                {closing ? '关闭中...' : '关闭投票'}
              </Button>
            </Popconfirm>
          )}
        </div>
      )}

      {/* 底部信息 */}
      <div className={styles.foot}>
        <span className={styles.footItem}>
          <CheckIcon className={styles.footIcon} />
          {totalVotes} 人参与
        </span>
        {currentPoll.endTime && (
          <span className={styles.footItem}>
            <ClockIcon className={styles.footIcon} />
            截止 {formatEndTime(currentPoll.endTime)}
          </span>
        )}
        {currentPoll.isEnded && (
          <span className={cn(styles.footItem, styles.footEnded)}>
            <CloseIcon className={styles.footIcon} />
            投票已结束
          </span>
        )}
      </div>
    </div>
  )
}
