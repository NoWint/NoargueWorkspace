import { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useComboStore } from '@/stores/combos'
import { useTodoStore } from '@/stores/todos'
import {
  CalendarIcon,
  CalendarCheckIcon,
  ListIcon,
  ChartIcon,
  StarIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChatIcon,
  TagIcon,
  UserIcon,
  CloseIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './Sidebar.module.css'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const combos = useComboStore((s) => s.combos)
  const sharedCombos = useComboStore((s) => s.sharedCombos)
  const todos = useTodoStore((s) => s.todos)

  const activeTodos = todos.filter((t) => !t.isDeleted)
  const todayCount = activeTodos.filter(
    (t) => t.setDate === new Date().toISOString().slice(0, 10),
  ).length
  const starredCount = activeTodos.filter((t) => t.isStar).length
  // 去重：sharedCombos 可能与 combos 中的共享组合重复
  const allCombos = useMemo(() => {
    const seen = new Set(combos.map((c) => c.id))
    return [...combos, ...sharedCombos.filter((c) => !seen.has(c.id))]
  }, [combos, sharedCombos])

  const comboCount = (id: number) =>
    activeTodos.filter((t) => t.comboId === id).length

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(styles.navItem, isActive && styles.act)

  const handleNav = (path: string) => {
    navigate(path)
    onCloseMobile?.()
  }

  return (
    <aside
      className={cn(styles.sb, mobileOpen && styles.sbMobileOpen)}
      data-mobile-open={mobileOpen}
    >
      <div className={styles.ws}>
        <img className={styles.wsAv} src="https://api.yzjtiantian.cn/uploads/logo/logo.png" alt="时光绿径" />
        <div className={styles.wsNm}>时光绿径</div>
        <ChevronDownIcon className={styles.wsChev} />
      </div>

      <div
        className={styles.cta}
        onClick={() => handleNav('/todos/new')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('/todos/new') } }}
        role="button"
        tabIndex={0}
      >
        <span className={styles.ctaLabel}>
          <PlusIcon className={styles.ctaIcon} />
          新建待办
        </span>
        <span className={styles.ctaKbd}>N</span>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/" end className={navClass} onClick={onCloseMobile}>
          <CalendarIcon className={styles.navIcon} />
          <span>今日</span>
          {todayCount > 0 && <span className={styles.ct}>{todayCount}</span>}
        </NavLink>
        <NavLink to="/todos" className={navClass} onClick={onCloseMobile}>
          <ListIcon className={styles.navIcon} />
          <span>全部待办</span>
          <span className={styles.ct}>{activeTodos.length}</span>
        </NavLink>
        <NavLink to="/calendar" className={navClass} onClick={onCloseMobile}>
          <CalendarIcon className={styles.navIcon} />
          <span>日历</span>
        </NavLink>
        <NavLink to="/combos" className={navClass} onClick={onCloseMobile}>
          <ListIcon className={styles.navIcon} />
          <span>组合</span>
        </NavLink>
        <NavLink to="/stats" className={navClass} onClick={onCloseMobile}>
          <ChartIcon className={styles.navIcon} />
          <span>统计</span>
        </NavLink>
        <NavLink to="/star" className={navClass} onClick={onCloseMobile}>
          <StarIcon className={styles.navIcon} />
          <span>收藏</span>
          {starredCount > 0 && <span className={styles.ct}>{starredCount}</span>}
        </NavLink>
        <NavLink to="/search" className={navClass} onClick={onCloseMobile}>
          <SearchIcon className={styles.navIcon} />
          <span>搜索</span>
        </NavLink>
      </nav>

      {/* Feature navigation */}
      <div className={styles.comboSection}>
        <div className={styles.secHead}>
          <span>功能</span>
        </div>
        <NavLink to="/checkin" className={navClass} onClick={onCloseMobile}>
          <CalendarCheckIcon className={styles.navIcon} />
          <span>签到</span>
        </NavLink>
        <NavLink to="/leaderboard" className={navClass} onClick={onCloseMobile}>
          <ChartIcon className={styles.navIcon} />
          <span>排行榜</span>
        </NavLink>
        <NavLink to="/community" className={navClass} onClick={onCloseMobile}>
          <ChatIcon className={styles.navIcon} />
          <span>社区</span>
        </NavLink>
        <NavLink to="/reports" className={navClass} onClick={onCloseMobile}>
          <ListIcon className={styles.navIcon} />
          <span>工作报告</span>
        </NavLink>
      </div>

      <div className={styles.comboSection}>
        <div className={styles.secHead}>
          <span>组合</span>
          <PlusIcon className={styles.secIcon} />
        </div>
        {allCombos.length === 0 && (
          <div className={styles.emptyCombo}>暂无组合</div>
        )}
        {allCombos.map((c) => (
          <NavLink
            key={c.id}
            to={`/combos/${c.id}`}
            className={styles.comboItem}
            onClick={onCloseMobile}
          >
            <span className={styles.dot} style={{ background: c.color }} />
            <span className={styles.comboNm}>{c.name}</span>
            <span className={styles.comboCt}>{comboCount(c.id)}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.footer}>
        <NavLink to="/trash" className={navClass} onClick={onCloseMobile}>
          <TrashIcon className={styles.navIcon} />
          <span>回收站</span>
        </NavLink>
        <NavLink to="/tags" className={navClass} onClick={onCloseMobile}>
          <TagIcon className={styles.navIcon} />
          <span>标签管理</span>
        </NavLink>
        <NavLink to="/user-center" className={navClass} onClick={onCloseMobile}>
          <UserIcon className={styles.navIcon} />
          <span>用户中心</span>
        </NavLink>

        {/* More tools */}
        <div className={styles.toolsSection}>
          <div className={styles.secHead}>
            <span>更多工具</span>
          </div>
          <NavLink to="/tools/password" className={styles.toolLink} onClick={onCloseMobile}>
            密码生成器
          </NavLink>
          <NavLink to="/tools/eating" className={styles.toolLink} onClick={onCloseMobile}>
            今天吃什么
          </NavLink>
          <NavLink to="/tools/motivation" className={styles.toolLink} onClick={onCloseMobile}>
            每日激励
          </NavLink>
          <NavLink to="/tools/data" className={styles.toolLink} onClick={onCloseMobile}>
            数据管理
          </NavLink>
          <NavLink to="/notice" className={styles.toolLink} onClick={onCloseMobile}>
            公告
          </NavLink>
          <NavLink to="/changelog" className={styles.toolLink} onClick={onCloseMobile}>
            更新日志
          </NavLink>
          <NavLink to="/guide" className={styles.toolLink} onClick={onCloseMobile}>
            使用指南
          </NavLink>
        </div>

        <div
          className={styles.userPill}
          onClick={() => handleNav('/user-center')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('/user-center') } }}
          role="button"
          tabIndex={0}
        >
          <div className={styles.userAv}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.nickname || 'avatar'} className={styles.userAvImg} />
            ) : (
              user?.nickname?.[0] || '?'
            )}
          </div>
          <span className={styles.handle}>{user?.nickname || '未登录'}</span>
          <span className={styles.badge}>
            {activeTodos.length}/{user?.todoLimit || 100}
          </span>
        </div>
      </div>

      {/* 移动端关闭按钮 */}
      {mobileOpen && (
        <button
          className={styles.mobileClose}
          onClick={onCloseMobile}
          type="button"
          aria-label="关闭菜单"
        >
          <CloseIcon />
        </button>
      )}
    </aside>
  )
}
