import { useNavigate } from 'react-router-dom'
import { Segmented } from 'antd'
import { BellOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useThemeToggle } from '@/app/providers'
import styles from './Topbar.module.css'

export function Topbar() {
  const navigate = useNavigate()
  const { mode, toggle } = useThemeToggle()

  return (
    <div className={styles.topbar}>
      <div
        className={styles.search}
        onClick={() => navigate('/search')}
        role="button"
        tabIndex={0}
      >
        <span className={styles.placeholder}>搜索待办、组合、标签...</span>
        <span className={styles.kbd}>⌘K</span>
      </div>

      <div className={styles.toolbar}>
        <Segmented
          size="small"
          options={['列表', '看板', '时间线']}
          defaultValue="列表"
        />
        <button className={styles.iconBtn} type="button">
          <BellOutlined />
        </button>
        <button className={styles.iconBtn} onClick={toggle} type="button">
          {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        </button>
      </div>
    </div>
  )
}
