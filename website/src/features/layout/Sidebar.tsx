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
        <img className={styles.wsAv} src="https://api.yzjtiantian.cn/uploads/logo/logo.png" alt="时光绿径" />
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
        <NavLink to="/star" className={navClass}>
          <StarIcon className={styles.navIcon} />
          <span>收藏</span>
          {starredCount > 0 && <span className={styles.ct}>{starredCount}</span>}
        </NavLink>
        <NavLink to="/search" className={navClass}>
          <SearchIcon className={styles.navIcon} />
          <span>搜索</span>
        </NavLink>
      </nav>

      {/* Feature navigation */}
      <div className={styles.comboSection}>
        <div className={styles.secHead}>
          <span>功能</span>
        </div>
        <NavLink to="/checkin" className={navClass}>
          <CalendarCheckIcon className={styles.navIcon} />
          <span>签到</span>
        </NavLink>
        <NavLink to="/leaderboard" className={navClass}>
          <ChartIcon className={styles.navIcon} />
          <span>排行榜</span>
        </NavLink>
        <NavLink to="/community" className={navClass}>
          <ChatIcon className={styles.navIcon} />
          <span>社区</span>
        </NavLink>
        <NavLink to="/reports" className={navClass}>
          <ListIcon className={styles.navIcon} />
          <span>工作报告</span>
        </NavLink>
      </div>

      <div className={styles.comboSection}>
        <div className={styles.secHead}>
          <span>组合</span>
          <PlusIcon className={styles.secIcon} />
        </div>
        {allCombos.map((c) => (
          <NavLink key={c.id} to={`/combos/${c.id}`} className={styles.comboItem}>
            <span className={styles.dot} style={{ background: c.color }} />
            <span className={styles.comboNm}>{c.name}</span>
            <span className={styles.comboCt}>{comboCount(c.id)}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.footer}>
        <NavLink to="/trash" className={navClass}>
          <TrashIcon className={styles.navIcon} />
          <span>回收站</span>
        </NavLink>
        <NavLink to="/tags" className={navClass}>
          <TagIcon className={styles.navIcon} />
          <span>标签管理</span>
        </NavLink>
        <NavLink to="/user-center" className={navClass}>
          <UserIcon className={styles.navIcon} />
          <span>用户中心</span>
        </NavLink>

        {/* More tools */}
        <div className={styles.toolsSection}>
          <div className={styles.secHead}>
            <span>更多工具</span>
          </div>
          <NavLink to="/password-generator" className={styles.toolLink}>
            密码生成器
          </NavLink>
          <NavLink to="/eating" className={styles.toolLink}>
            今天吃什么
          </NavLink>
          <NavLink to="/motivation" className={styles.toolLink}>
            每日激励
          </NavLink>
          <NavLink to="/datamanage" className={styles.toolLink}>
            数据管理
          </NavLink>
          <NavLink to="/notice" className={styles.toolLink}>
            公告
          </NavLink>
          <NavLink to="/changelog" className={styles.toolLink}>
            更新日志
          </NavLink>
          <NavLink to="/guide" className={styles.toolLink}>
            使用指南
          </NavLink>
        </div>

        <div
          className={styles.userPill}
          onClick={() => navigate('/user-center')}
          role="button"
          tabIndex={0}
        >
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
