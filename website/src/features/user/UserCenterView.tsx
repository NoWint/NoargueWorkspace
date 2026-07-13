/**
 * 时光绿径待办 — 用户中心
 * @author  NoWint (https://github.com/NoWint)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { uploadApi } from '@/api/upload'
import { Card, Eyebrow, Stat } from '@/design/primitives'
import {
  CheckIcon,
  BellIcon,
  ListIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './UserCenterView.module.css'

const DAILY_QUOTES = [
  '一日之计在于晨，一年之计在于春。',
  '不积跬步，无以至千里；不积小流，无以成江海。',
  '千里之行，始于足下。',
  '业精于勤，荒于嬉；行成于思，毁于随。',
  '路漫漫其修远兮，吾将上下而求索。',
  '今天比昨天好，就是希望。',
  '把每一件简单的事做好，就是不简单。',
  '种一棵树最好的时间是十年前，其次是现在。',
]

function pickDailyQuote(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
}

export function UserCenterView() {
  const navigate = useNavigate()
  const { user, isLoggedIn, fetchUserInfo, logout, updateProfile } = useAuthStore()
  const { todos, fetchTodos } = useTodoStore()
  const { combos, sharedCombos, fetchCombos } = useComboStore()

  const [editingName, setEditingName] = useState(false)
  const [nickname, setNickname] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const dailyQuote = useMemo(pickDailyQuote, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserInfo()
      fetchTodos()
      fetchCombos()
    }
  }, [isLoggedIn, fetchUserInfo, fetchTodos, fetchCombos])

  useEffect(() => {
    if (user) setNickname(user.nickname || '')
  }, [user])

  const todoCount = useMemo(() => todos.filter((t) => !t.isDeleted).length, [todos])
  const comboCount = combos.length
  const collabCount = sharedCombos.length

  const todoLimit = user?.todoLimit ?? 100
  const comboLimit = user?.comboLimit ?? 10
  const collabLimit = user?.collabLimit ?? 5

  const handleSaveName = async () => {
    const name = nickname.trim()
    if (!name) {
      message.warning('请输入昵称')
      return
    }
    setSavingName(true)
    try {
      await updateProfile({ nickname: name })
      message.success('昵称已更新')
      setEditingName(false)
    } catch (e) {
      message.error((e as Error).message || '更新失败')
    } finally {
      setSavingName(false)
    }
  }

  const handleAvatarClick = () => {
    if (!isLoggedIn) return
    fileRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.warning('请选择图片文件')
      return
    }
    setUploadingAvatar(true)
    try {
      const res = await uploadApi.uploadAvatar(file)
      const url = (res as { url: string }).url
      await updateProfile({ avatarUrl: url })
      message.success('头像已更新')
    } catch (err) {
      message.error((err as Error).message || '头像上传失败')
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleLogout = () => {
    logout()
  }

  const handleLogin = () => {
    navigate('/login')
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
              <Eyebrow>ACCOUNT</Eyebrow>
              <h1 className={styles.title}>
                用户 <span className={styles.song}>中心</span>
              </h1>
            </div>
          </div>
          <div className={styles.quoteBox}>
            <span className={styles.quoteLabel}>每日一言</span>
            <span className={styles.quoteText}>{dailyQuote}</span>
          </div>
        </div>
      </div>

      {/* Profile card */}
      <Card>
        <div className={styles.profile}>
          <button
            type="button"
            className={cn(styles.avatar, !isLoggedIn && styles.avatarLocked)}
            onClick={handleAvatarClick}
            disabled={!isLoggedIn || uploadingAvatar}
            title={isLoggedIn ? '点击上传头像' : '请先登录'}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarText}>
                {isLoggedIn && user?.nickname ? user.nickname.slice(0, 1).toUpperCase() : '?'}
              </span>
            )}
            {isLoggedIn && (
              <span className={styles.avatarMask}>
                {uploadingAvatar ? '上传中' : '更换'}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleAvatarChange}
          />

          <div className={styles.profileMain}>
            {!isLoggedIn ? (
              <>
                <div className={styles.profileName}>未登录</div>
                <div className={styles.profileSub}>登录后可同步数据并协作</div>
                <button
                  type="button"
                  className={cn(styles.actBtn, styles.actPri)}
                  onClick={handleLogin}
                >
                  登录
                </button>
              </>
            ) : editingName ? (
              <>
                <div className={styles.nameEditRow}>
                  <input
                    className={styles.nameInput}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') {
                        setEditingName(false)
                        setNickname(user?.nickname || '')
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={cn(styles.actBtn, styles.actPri)}
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    <CheckIcon className={styles.actIcon} />
                    保存
                  </button>
                  <button
                    type="button"
                    className={styles.actBtn}
                    onClick={() => {
                      setEditingName(false)
                      setNickname(user?.nickname || '')
                    }}
                  >
                    取消
                  </button>
                </div>
                <div className={styles.profileSub}>回车保存，Esc 取消</div>
              </>
            ) : (
              <>
                <div className={styles.profileName}>
                  {user?.nickname || '用户'}
                  <button
                    type="button"
                    className={styles.nameEditBtn}
                    onClick={() => setEditingName(true)}
                  >
                    编辑
                  </button>
                </div>
                <div className={styles.profileSub}>
                  {user?.badgeTitles && user.badgeTitles.length > 0
                    ? user.badgeTitles.join(' · ')
                    : '时光绿径用户'}
                </div>
                <button
                  type="button"
                  className={cn(styles.actBtn, styles.actDel)}
                  onClick={handleLogout}
                >
                  退出登录
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Capacity stats */}
      <div className={styles.stats}>
        <Stat
          label="待办容量"
          value={`${todoCount}/${todoLimit}`}
          delta={todoCount >= todoLimit ? '已达上限' : `还可添加 ${todoLimit - todoCount} 个`}
          warn={todoCount >= todoLimit}
        />
        <Stat
          label="组合容量"
          value={`${comboCount}/${comboLimit}`}
          delta={comboCount >= comboLimit ? '已达上限' : `还可创建 ${comboLimit - comboCount} 个`}
          warn={comboCount >= comboLimit}
        />
        <Stat
          label="协作容量"
          value={`${collabCount}/${collabLimit}`}
          accent
          delta={collabCount >= collabLimit ? '已达上限' : `还可加入 ${collabLimit - collabCount} 个`}
          warn={collabCount >= collabLimit}
        />
      </div>

      {/* Account meta */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <ListIcon />
            </div>
            <div>
              <Eyebrow>META</Eyebrow>
              <h3 className={styles.cardTitle}>
                账户 <span className={styles.song}>信息</span>
              </h3>
            </div>
          </div>
        </div>
        <div className={styles.metaList}>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>登录状态</span>
            <span className={styles.metaVal}>
              <span className={cn(styles.dot, isLoggedIn ? styles.dotOk : styles.dotOff)} />
              {isLoggedIn ? '已登录' : '未登录'}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>用户 ID</span>
            <span className={styles.metaVal}>{user?.id ?? '—'}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>注册时间</span>
            <span className={styles.metaVal}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>管理员</span>
            <span className={styles.metaVal}>{user?.isAdmin ? '是' : '否'}</span>
          </div>
        </div>
      </Card>

      {/* Author credit */}
      <div className={styles.authorCredit}>
        <span className={styles.authorLabel}>Web 前端</span>
        <a
          href="https://github.com/NoWint"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.authorLink}
        >
          GitHub: NoWint
        </a>
      </div>
    </div>
  )
}
