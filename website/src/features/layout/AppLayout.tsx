/**
 * 时光绿径待办 — Web 前端
 * @author  NoWint (https://github.com/NoWint)
 */
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from '@/features/cmd/CommandPalette'
import { useCmdPaletteStore } from '@/stores/cmdPalette'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { open, setOpen } = useCmdPaletteStore()
  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
