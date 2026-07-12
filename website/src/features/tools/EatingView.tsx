import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Eyebrow } from '@/design/primitives'
import { RefreshIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './EatingView.module.css'

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'night'

const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'night', label: '宵夜' },
]

const DISHES: Record<Meal, string[]> = {
  breakfast: ['豆浆油条', '小笼包', '煎饼果子', '白粥咸菜', '肠粉', '鸡蛋灌饼', '馄饨', '烧麦', '三明治', '燕麦牛奶', '茶叶蛋', '肉包子', '手抓饼', '牛肉面', '炒米粉', '春卷', '蛋挞', '红豆粥'],
  lunch: ['黄焖鸡米饭', '麻辣香锅', '兰州拉面', '酸菜鱼', '咖喱饭', '盖浇饭', '寿司', '蛋炒饭', '螺蛳粉', '汉堡', '披萨', '牛排', '烤肉饭', '冒菜', '日式拉面', '越南粉', '煲仔饭', '石锅拌饭', '炸鸡', '轻食沙拉'],
  dinner: ['火锅', '烤鱼', '串串香', '饺子', '羊肉泡馍', '小炒肉', '红烧肉', '清蒸鱼', '宫保鸡丁', '麻婆豆腐', '回锅肉', '糖醋排骨', '番茄炒蛋', '青椒肉丝', '干锅花菜', '蒜蓉西兰花', '酸辣土豆丝', '水煮肉片', '铁板烧', '寿喜烧'],
  night: ['烤串', '小龙虾', '炒粉', '泡面', '关东煮', '炸鸡', '烤冷面', '臭豆腐', '章鱼小丸子', '煎饺', '麻辣烫', '肉夹馍', '凉皮', '烤生蚝', '炒酸奶', '蛋炒饭', '卤味', '牛杂', '烤面筋', '锅贴'],
}

interface HistoryItem {
  meal: Meal
  dish: string
  at: number
}

export function EatingView() {
  const [meal, setMeal] = useState<Meal>('lunch')
  const [result, setResult] = useState<string>('')
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dishes = useMemo(() => DISHES[meal], [meal])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const switchMeal = (m: Meal) => {
    if (spinning) return
    setMeal(m)
    setResult('')
  }

  const pick = () => {
    if (spinning) return
    setSpinning(true)
    let ticks = 0
    timerRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * dishes.length)
      setResult(dishes[idx])
      ticks++
      if (ticks > 14) {
        if (timerRef.current) clearInterval(timerRef.current)
        const final = dishes[Math.floor(Math.random() * dishes.length)]
        setResult(final)
        setSpinning(false)
        setHistory((prev) => [{ meal, dish: final, at: Date.now() }, ...prev].slice(0, 10))
      }
    }, 70)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}><RefreshIcon /></div>
            <div>
              <Eyebrow>TOOLS</Eyebrow>
              <h1 className={styles.title}>今天吃什么 <span className={styles.song}>随机</span></h1>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mealTabs}>
        {MEALS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={cn(styles.mealTab, meal === m.key && styles.mealTabOn)}
            onClick={() => switchMeal(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Card>
        <div className={styles.resultBox}>
          <Eyebrow>今日推荐</Eyebrow>
          <div className={cn(styles.resultText, spinning && styles.resultSpin)}>
            {result || '点击下方按钮抽取'}
          </div>
        </div>
        <button
          type="button"
          className={cn(styles.pickBtn, spinning && styles.pickBtnBusy)}
          onClick={pick}
          disabled={spinning}
        >
          <RefreshIcon className={cn(styles.pickIcon, spinning && styles.pickIconSpin)} />
          {spinning ? '抽取中…' : '随机选一个'}
        </button>
      </Card>

      <Card>
        <div className={styles.histHead}>
          <Eyebrow>HISTORY</Eyebrow>
          <span className={styles.histCount}>{history.length} 条记录</span>
        </div>
        <div className={styles.histList}>
          {history.length === 0 && (
            <div className={styles.histEmpty}>还没有记录，快来抽一个吧</div>
          )}
          {history.map((h, i) => (
            <div key={i} className={styles.histItem}>
              <span className={styles.histMeal}>{MEALS.find((m) => m.key === h.meal)?.label}</span>
              <span className={styles.histDish}>{h.dish}</span>
              <span className={styles.histTime}>
                {new Date(h.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
