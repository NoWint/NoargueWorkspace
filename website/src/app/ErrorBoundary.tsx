import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 全局错误边界：防止组件抛出异常时整个应用白屏崩溃。
 * 捕获后显示友好的错误界面，支持一键重试。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            background: 'var(--bg)',
            color: 'var(--fg)',
            fontFamily: 'var(--font-sans)',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '1px solid var(--border)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              color: 'var(--destructive)',
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
            页面出现异常
          </h2>
          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--mt)',
              maxWidth: '360px',
              lineHeight: 1.5,
            }}
          >
            {this.state.error?.message || '未知错误，请尝试刷新页面。'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '6px 16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
                fontSize: '12.5px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              重试
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '6px 16px',
                background: 'var(--primary)',
                border: '1px solid var(--primary)',
                color: 'var(--primary-fg)',
                fontSize: '12.5px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
