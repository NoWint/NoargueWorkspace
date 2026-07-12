import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useComboStore } from '@/stores/combos'
import { useTodoStore } from '@/stores/todos'
import { Button } from '@/design/primitives'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const combos = useComboStore((s) => s.combos)
  const sharedCombos = useComboStore((s) => s.sharedCombos)
  const todos = useTodoStore((s) => s.todos)

  const activeTodos = todos.filter((t) => !t.isDeleted)
  const todayCount = activeTodos.filter((t) => t.setDate === new Date().toISOString().slice(0, 10)).length
  const starredCount = activeTodos.filter((t) => t.isStar).length

  return (
    <aside className={styles.sb}>
      <div className={styles.brand}>
        <div className={styles.logo}>N</div>
        <span className={styles.name}>NoArgue</span>
      </div>

      <Button variant="pri" onClick={() => navigate('/todos/new')} style={{ width: '100%' }}>
        + 新建待办
      </Button>

      <nav className={styles.nav}>
        <NavLink to="/" end className={({ isActive }) => isActive ? styles.act : ''}>
          <span>今日</span>
          {todayCount > 0 && <span className={styles.ct}>{todayCount}</span>}
        </NavLink>
        <NavLink to="/todos" className={({ isActive }) => isActive ? styles.act : ''}>
          <span>全部待办</span>
          <span className={styles.ct}>{activeTodos.length}</span>
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => isActive ? styles.act : ''}>
          <span>日历</span>
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => isActive ? styles.act : ''}>
          <span>统计</span>
        </NavLink>
        <div className={styles.navItem}>
          <span>收藏</span>
          {starredCount > 0 && <span className={styles.ct}>{starredCount}</span>}
        </div>
        <div className={styles.navItem}>
          <span>搜索</span>
        </div>
      </nav>

      <div className={styles.comboSection}>
        <div className={styles.secHead}>组合</div>
        {[...combos, ...sharedCombos].map((c) => (
          <div key={c.id} className={styles.comboItem}>
            <span className={styles.dot} style={{ background: c.color }} />
            <span className={styles.comboName}>{c.name}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.navItem}>
          <span>回收站</span>
        </div>
        <div className={styles.userPill}>
          <div className={styles.avatar}>
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
