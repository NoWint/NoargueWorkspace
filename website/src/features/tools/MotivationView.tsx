import { useEffect, useState } from 'react'
import { message } from 'antd'
import { Card, Eyebrow } from '@/design/primitives'
import { StarIcon, RefreshIcon } from '@/design/icons'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import styles from './MotivationView.module.css'

const QUOTES: string[] = [
  '今日事，今日毕。',
  '千里之行，始于足下。',
  '不积跬步，无以至千里。',
  '行动是治愈恐惧的良药。',
  '每一个伟大的成就，都始于一个微小的开始。',
  '你现在的努力，是未来成功的伏笔。',
  '把简单的事做到极致，就是绝招。',
  '时间不会辜负每一个认真生活的人。',
  '成功就是把平凡的事做得不平凡。',
  '坚持，是通往优秀的最短路径。',
  '与其担心未来，不如现在好好努力。',
  '今天的你，要优于昨天的你。',
  '别让明天的你，后悔今天的自己。',
  '自律，是自由的前提。',
  '种一棵树最好的时间是十年前，其次是现在。',
  '所有的不平凡，都来自平凡的坚持。',
  '生命不止，奋斗不息。',
  '把握当下，就是对未来最好的交代。',
  '慢慢来，比较快。',
  '心之所向，素履以往。',
  '愿你历尽千帆，归来仍是少年。',
  '把每一天，都当作生命中最重要的一天。',
]

function pickQuote(exclude?: string): string {
  if (QUOTES.length === 0) return ''
  let q: string = exclude || ''
  do {
    const idx = Math.floor(Math.random() * QUOTES.length)
    q = QUOTES[idx]
  } while (q === exclude && QUOTES.length > 1)
  return q
}

export function MotivationView() {
  const { user, fetchUserInfo } = useAuthStore()
  const [quote, setQuote] = useState<string>(() => pickQuote())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchUserInfo()
  }, [fetchUserInfo])

  const limit = user?.todoLimit || 100

  const refreshQuote = () => setQuote((prev) => pickQuote(prev))

  const handleIncrease = async () => {
    setBusy(true)
    try {
      const res = await authApi.increaseTodoLimit()
      if (res.success) {
        await fetchUserInfo()
        message.success('上限已增加 +10')
      } else {
        message.error('增加失败')
      }
    } catch (e) {
      message.error((e as Error).message || '增加失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}><StarIcon /></div>
            <div>
              <Eyebrow>TOOLS</Eyebrow>
              <h1 className={styles.title}>每日激励 <span className={styles.song}>前行</span></h1>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div className={styles.capHead}>
          <Eyebrow>CAPACITY</Eyebrow>
        </div>
        <div className={styles.capRow}>
          <div className={styles.capInfo}>
            <div className={styles.capVal}>{limit}<span className={styles.capMax}> / 100</span></div>
            <div className={styles.capLabel}>待办上限</div>
          </div>
          <button
            type="button"
            className={styles.increaseBtn}
            onClick={handleIncrease}
            disabled={busy}
          >
            {busy ? '处理中…' : '增加上限 +10'}
          </button>
        </div>
        <div className={styles.capBar}>
          <div className={styles.capBarFill} style={{ width: `${Math.min(100, (limit / 100) * 100)}%` }} />
        </div>
      </Card>

      <Card>
        <div className={styles.quoteBox}>
          <Eyebrow>今日激励</Eyebrow>
          <div className={styles.quoteText}>"{quote}"</div>
          <button type="button" className={styles.quoteRefresh} onClick={refreshQuote}>
            <RefreshIcon className={styles.quoteIcon} />
            换一条
          </button>
        </div>
      </Card>
    </div>
  )
}
