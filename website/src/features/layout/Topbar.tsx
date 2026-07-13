import { useEffect, useRef, useState } from 'react'
import { Tooltip, Popover } from 'antd'
import dayjs from 'dayjs'
import { useThemeToggle } from '@/app/providers'
import { SearchIcon, BellIcon, MoonIcon, SunIcon, RefreshIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { useCmdPaletteStore } from '@/stores/cmdPalette'
import { useSyncStore } from '@/stores/sync'
import { useNotifyStore } from '@/stores/notify'
import styles from './Topbar.module.css'

const VIEWS = ['列表', '看板', '时间线'] as const
type View = (typeof VIEWS)[number]

export function Topbar() {
  const { mode, toggle } = useThemeToggle()
  const [view, setView] = useState<View>('列表')
  const searchRef = useRef<HTMLInputElement>(null)
  const setCmdOpen = useCmdPaletteStore((s) => s.setOpen)
  const { status, pendingChanges, errorMsg, syncNow } = useSyncStore()
  const notifications = useNotifyStore((s) => s.notifications)
  const fetchNotifyList = useNotifyStore((s) => s.fetchList)

  useEffect(() => {
    fetchNotifyList()
  }, [fetchNotifyList])

  const syncLabel =
    status === 'syncing' ? '同步中...'
    : status === 'success' ? '同步成功'
    : status === 'error' ? `同步失败：${errorMsg || '未知错误'}`
    : pendingChanges ? '有未同步变更，点击同步'
    : '点击同步'

  const hasUnsent = notifications.some((n) => !n.isSent)

  const notifyContent = (
    <div className={styles.notifyPanel}>
      {notifications.length === 0 && (
        <div className={styles.notifyEmpty}>暂无通知</div>
      )}
      {notifications.slice(0, 5).map((n) => (
        <div key={n.id} className={styles.notifyRow}>
          <span className={styles.notifyTodoId}>{String(n.todoId).slice(0, 10)}</span>
          <span className={styles.notifyTime}>
            {dayjs(n.notifyAt).format('MM-DD HH:mm')}
          </span>
          <span className={cn(styles.notifyStatus, n.isSent && styles.notifySentTag)}>
            {n.isSent ? '已发送' : '待发送'}
          </span>
        </div>
      ))}
      <div className={styles.notifyFooter}>查看全部</div>
    </div>
  )

  return (
    <div className={styles.topbar}>
      <div className={styles.search}>
        <SearchIcon className={styles.searchIcon} />
        <input
          ref={searchRef}
          className={styles.input}
          placeholder="搜索待办、组合、标签..."
          onClick={() => setCmdOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') searchRef.current?.blur()
          }}
          readOnly
        />
        <span className={styles.kbd}>⌘K</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.seg}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={cn(styles.pill, view === v && styles.pillAct)}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <Tooltip title={syncLabel} placement="bottom">
          <button
            className={cn(
              styles.syncBtn,
              status === 'syncing' && styles.syncSpinning,
              status === 'success' && styles.syncOk,
              status === 'error' && styles.syncErr,
            )}
            onClick={() => syncNow()}
            disabled={status === 'syncing'}
            type="button"
          >
            <RefreshIcon />
            {pendingChanges && status === 'idle' && (
              <span className={styles.syncDot} />
            )}
          </button>
        </Tooltip>
        <Popover
          content={notifyContent}
          title="通知"
          placement="bottomRight"
          trigger="click"
          overlayClassName={styles.notifyPopover}
        >
          <button className={styles.iconBtn} type="button" title="通知">
            <BellIcon />
            {hasUnsent && <span className={styles.notifyDot} />}
          </button>
        </Popover>
        <button
          className={styles.iconBtn}
          onClick={toggle}
          type="button"
          title="主题"
        >
          {mode === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </div>
  )
}
