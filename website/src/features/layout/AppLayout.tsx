/**
 * 时光绿径待办 — Web 前端
 * @author  NoWint (https://github.com/NoWint)
 */
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from '@/features/cmd/CommandPalette'
import { useCmdPaletteStore } from '@/stores/cmdPalette'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { open, setOpen } = useCmdPaletteStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // 路由变化时关闭移动端侧栏
  useEffect(() => {
    const onPop = () => setMobileNavOpen(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className={styles.app} data-mobile-nav={mobileNavOpen ? 'open' : 'closed'}>
      {mobileNavOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <main className={styles.main}>
        <Topbar onToggleMobileNav={() => setMobileNavOpen((v) => !v)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
