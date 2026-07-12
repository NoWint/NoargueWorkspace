import { type ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { ConfigProvider, theme as antdTheme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'

type ThemeMode = 'dark' | 'light'

function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('noargue-theme') as ThemeMode) || 'dark',
  )
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    localStorage.setItem('noargue-theme', mode)
  }, [mode])
  return [mode, setMode]
}

export const ThemeModeContext = createContext<{
  mode: ThemeMode
  toggle: () => void
}>({ mode: 'dark', toggle: () => {} })

export function useThemeToggle() {
  return useContext(ThemeModeContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useThemeMode()

  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark')

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#01796f',
            borderRadius: 0,
            fontFamily: 'Geist, -apple-system, "PingFang SC", system-ui, sans-serif',
          },
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}
