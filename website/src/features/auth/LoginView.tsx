import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, message } from 'antd'
import { useAuthStore } from '@/stores/auth'
import { Button, Eyebrow } from '@/design/primitives'
import styles from './LoginView.module.css'

export function LoginView() {
  const navigate = useNavigate()
  const { isLoggedIn, loginByQrCode, pollQrCodeStatus } = useAuthStore()
  const [sceneId, setSceneId] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'scanned' | 'error'>('idle')
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    if (isLoggedIn) navigate('/')
  }, [isLoggedIn, navigate])

  useEffect(() => {
    let poller: { stop: () => void; promise: Promise<void> } | null = null
    async function startLogin() {
      try {
        setStatus('loading')
        const res = await loginByQrCode()
        setSceneId(res.sceneId)
        setQrUrl(res.qrcodeUrl)
        setStatus('waiting')
        poller = pollQrCodeStatus(res.sceneId, (s) => {
          if (s === 'scanned') setStatus('scanned')
        })
        await poller.promise
        message.success('登录成功')
        navigate('/')
      } catch (err) {
        setStatus('error')
        message.error(err instanceof Error && err.message === 'expired' ? '二维码已过期' : '登录失败')
      }
    }
    startLogin()
    return () => { poller?.stop() }
  }, [])

  // sceneId kept for potential future use (e.g. manual refresh)
  void sceneId

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>绿</div>
          <div className={styles.brandText}>
            <h1 className={styles.title}>时光绿径</h1>
            <p className={styles.tagline}>清爽绿意 · 高效待办</p>
          </div>
        </div>
        <Eyebrow>扫码登录</Eyebrow>
        <p className={styles.desc}>使用微信扫描下方二维码登录</p>

        <div className={styles.qrArea}>
          {status === 'loading' && (
            <Spin tip="生成中...">
              <div style={{ width: 200, height: 200 }} />
            </Spin>
          )}
          {qrUrl && (
            <img
              src={qrUrl}
              alt="登录二维码"
              className={styles.qrImg}
              style={{ opacity: status === 'scanned' ? 0.5 : 1 }}
            />
          )}
          {status === 'scanned' && (
            <div className={styles.overlay}>请在微信上确认</div>
          )}
          {status === 'error' && (
            <div className={styles.overlay}>
              <Button variant="pri" onClick={() => window.location.reload()}>重新生成</Button>
            </div>
          )}
        </div>

        <p className={styles.hint}>扫码后请在微信小程序中确认登录</p>
      </div>
    </div>
  )
}
