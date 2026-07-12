import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import { Card, Eyebrow } from '@/design/primitives'
import { LockIcon, RefreshIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './PasswordGeneratorView.module.css'

const DIGITS = '0123456789'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const SYMBOLS = '!@#$%^&*()-=+[]{};:,.<>?/'
const UNDERSCORE = '_'

type CharSetKey = 'digits' | 'lower' | 'upper' | 'symbols' | 'underscore'

interface CharSet {
  key: CharSetKey
  label: string
  chars: string
}

const CHARSETS: CharSet[] = [
  { key: 'digits', label: '数字', chars: DIGITS },
  { key: 'lower', label: '小写', chars: LOWER },
  { key: 'upper', label: '大写', chars: UPPER },
  { key: 'symbols', label: '符号', chars: SYMBOLS },
  { key: 'underscore', label: '下划线', chars: UNDERSCORE },
]

function secureRandomInt(max: number): number {
  const range = 2 ** 32
  const limit = range - (range % max)
  const buf = new Uint32Array(1)
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

type Strength = 'weak' | 'medium' | 'strong'

function calcStrength(pw: string, enabledCount: number): Strength {
  if (!pw) return 'weak'
  let pool = 0
  if (/[0-9]/.test(pw)) pool += 10
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/[^0-9a-zA-Z_]/.test(pw)) pool += 28
  if (/_/.test(pw)) pool += 1
  const entropy = pw.length * Math.log2(pool || 1)
  if (entropy < 40 || enabledCount < 2) return 'weak'
  if (entropy < 70) return 'medium'
  return 'strong'
}

const STRENGTH_LABEL: Record<Strength, string> = {
  weak: '弱',
  medium: '中',
  strong: '强',
}

export function PasswordGeneratorView() {
  const [length, setLength] = useState(16)
  const [enabled, setEnabled] = useState<Record<CharSetKey, boolean>>({
    digits: true,
    lower: true,
    upper: true,
    symbols: true,
    underscore: false,
  })
  const [password, setPassword] = useState('')

  const activeSets = useMemo(
    () => CHARSETS.filter((s) => enabled[s.key]),
    [enabled],
  )
  const pool = useMemo(() => activeSets.map((s) => s.chars).join(''), [activeSets])

  const generate = useCallback(() => {
    if (activeSets.length === 0 || pool.length === 0) {
      message.warning('请至少选择一种字符类型')
      return
    }
    let out = ''
    for (let i = 0; i < length; i++) {
      out += pool[secureRandomInt(pool.length)]
    }
    setPassword(out)
  }, [activeSets, length, pool])

  useEffect(() => {
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generate])

  const toggle = (key: CharSetKey) => {
    setEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (Object.values(next).every((v) => !v)) return prev
      return next
    })
  }

  const handleCopy = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }

  const strength = calcStrength(password, activeSets.length)

  return (
    <div className={styles.screen}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}><LockIcon /></div>
            <div>
              <Eyebrow>TOOLS</Eyebrow>
              <h1 className={styles.title}>密码生成器 <span className={styles.song}>随机</span></h1>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div className={styles.pwHead}>
          <Eyebrow>GENERATED</Eyebrow>
          <button type="button" className={styles.copyBtn} onClick={handleCopy}>复制</button>
        </div>
        <div className={styles.pwBox}>
          <code className={styles.pwText}>{password || '—'}</code>
        </div>
        <div className={styles.strengthRow}>
          <span className={styles.strengthLabel}>强度</span>
          <div className={styles.strengthBar}>
            <div className={cn(styles.strengthFill, styles[strength])} />
          </div>
          <span className={cn(styles.strengthTag, styles[strength])}>{STRENGTH_LABEL[strength]}</span>
        </div>
        <button type="button" className={styles.genBtn} onClick={generate}>
          <RefreshIcon className={styles.genIcon} />
          重新生成
        </button>
      </Card>

      <Card>
        <div className={styles.optHead}>
          <Eyebrow>OPTIONS</Eyebrow>
        </div>
        <div className={styles.sliderRow}>
          <div className={styles.sliderLabel}>
            <span>长度</span>
            <span className={styles.sliderVal}>{length}</span>
          </div>
          <input
            type="range"
            min={4}
            max={32}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className={styles.slider}
          />
        </div>
        <div className={styles.charGrid}>
          {CHARSETS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={cn(styles.charChip, enabled[s.key] && styles.charChipOn)}
              onClick={() => toggle(s.key)}
            >
              <span className={styles.charDot} />
              {s.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
