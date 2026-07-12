import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useComboStore } from '@/stores/combos'
import { useTodoStore } from '@/stores/todos'
import {
  CalendarIcon,
  ListIcon,
  ChartIcon,
  StarIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './Sidebar.module.css'

export function Sidebar() {
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
  const allCombos = [...combos, ...sharedCombos]

  const comboCount = (id: number) =>
    activeTodos.filter((t) => t.comboId === id).length

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(styles.navItem, isActive && styles.act)

  return (
    <aside className={styles.sb}>
      <div className={styles.ws}>
        <div className={styles.wsAv}>绿</div>
        <div className={styles.wsNm}>时光绿径</div>
        <ChevronDownIcon className={styles.wsChev} />
      </div>

      <div
        className={styles.cta}
        onClick={() => navigate('/todos/new')}
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
        <NavLink to="/" end className={navClass}>
          <CalendarIcon className={styles.navIcon} />
          <span>今日</span>
          {todayCount > 0 && <span className={styles.ct}>{todayCount}</span>}
        </NavLink>
        <NavLink to="/todos" className={navClass}>
          <ListIcon className={styles.navIcon} />
          <span>全部待办</span>
          <span className={styles.ct}>{activeTodos.length}</span>
        </NavLink>
        <NavLink to="/calendar" className={navClass}>
          <CalendarIcon className={styles.navIcon} />
          <span>日历</span>
        </NavLink>
        <NavLink to="/combos" className={navClass}>
          <ListIcon className={styles.navIcon} />
          <span>组合</span>
        </NavLink>
        <NavLink to="/stats" className={navClass}>
          <ChartIcon className={styles.navIcon} />
          <span>统计</span>
        </NavLink>
        <div className={styles.navItem}>
          <StarIcon className={styles.navIcon} />
          <span>收藏</span>
          {starredCount > 0 && <span className={styles.ct}>{starredCount}</span>}
        </div>
        <NavLink to="/search" className={navClass}>
          <SearchIcon className={styles.navIcon} />
          <span>搜索</span>
        </NavLink>
      </nav>

      <div className={styles.comboSection}>
        <div className={styles.secHead}>
          <span>组合</span>
          <PlusIcon className={styles.secIcon} />
        </div>
        {allCombos.map((c) => (
          <div key={c.id} className={styles.comboItem}>
            <span className={styles.dot} style={{ background: c.color }} />
            <span className={styles.comboNm}>{c.name}</span>
            <span className={styles.comboCt}>{comboCount(c.id)}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <NavLink to="/trash" className={navClass}>
          <TrashIcon className={styles.navIcon} />
          <span>回收站</span>
        </NavLink>
        <div className={styles.userPill}>
          <div className={styles.userAv}>
            {user?.nickname?.[0] || '?'}
          </div>
          <span className={styles.handle}>{user?.nickname || '未登录'}</span>
          <span className={styles.badge}>
            {activeTodos.length}/{user?.todoLimit || 100}
          </span>
        </div>
      </div>
    </aside>
  )
}
