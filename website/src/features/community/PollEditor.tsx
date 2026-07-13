import { useEffect, useMemo, useState } from 'react'
import { DatePicker, Input } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { CreatePollRequest } from '@/api/posts'
import { Toggle } from '@/design/primitives'
import { CheckIcon, PlusIcon, TrashIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './PollEditor.module.css'

interface PollEditorProps {
  /** 数据变化时通知父组件，null 表示数据不完整 */
  onChange: (data: CreatePollRequest | null) => void
}

const MIN_OPTIONS = 2
const MAX_OPTIONS = 20
const POLL_TYPE_SINGLE = 1
const POLL_TYPE_MULTI = 2

interface OptionItem {
  id: string
  text: string
}

function makeOption(text = ''): OptionItem {
  return { id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text }
}

export function PollEditor({ onChange }: PollEditorProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<number>(POLL_TYPE_SINGLE)
  const [options, setOptions] = useState<OptionItem[]>([makeOption(), makeOption()])
  const [allowOther, setAllowOther] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [endTime, setEndTime] = useState<Dayjs | null>(null)

  // 计算输出数据
  const output = useMemo<CreatePollRequest | null>(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return null
    const validOptions = options.filter((o) => o.text.trim())
    if (validOptions.length < MIN_OPTIONS) return null
    const payload: CreatePollRequest = {
      title: trimmedTitle,
      type,
      allowOther,
      isAnonymous,
      options: validOptions.map((o) => ({ text: o.text.trim(), isOther: false })),
    }
    if (endTime) {
      payload.endTime = endTime.toISOString()
    }
    return payload
  }, [title, type, options, allowOther, isAnonymous, endTime])

  // 同步给父组件
  useEffect(() => {
    onChange(output)
  }, [output, onChange])

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) return
    setOptions((prev) => [...prev, makeOption()])
  }

  const handleRemoveOption = (id: string) => {
    if (options.length <= MIN_OPTIONS) return
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  const handleOptionTextChange = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)))
  }

  return (
    <div className={styles.wrap}>
      {/* 标题 */}
      <div className={styles.field}>
        <div className={styles.label}>投票标题</div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入投票问题..."
          maxLength={200}
          className={styles.input}
        />
      </div>

      {/* 类型 */}
      <div className={styles.field}>
        <div className={styles.label}>投票类型</div>
        <div className={styles.segmented}>
          <button
            type="button"
            className={cn(
              styles.segBtn,
              type === POLL_TYPE_SINGLE && styles.segAct,
            )}
            onClick={() => setType(POLL_TYPE_SINGLE)}
          >
            单选
          </button>
          <button
            type="button"
            className={cn(
              styles.segBtn,
              type === POLL_TYPE_MULTI && styles.segAct,
            )}
            onClick={() => setType(POLL_TYPE_MULTI)}
          >
            多选
          </button>
        </div>
      </div>

      {/* 选项列表 */}
      <div className={styles.field}>
        <div className={styles.label}>
          选项（{options.length}/{MAX_OPTIONS}）
        </div>
        <div className={styles.optionList}>
          {options.map((opt, idx) => (
            <div key={opt.id} className={styles.optionRow}>
              <span className={styles.optionIdx}>{idx + 1}</span>
              <Input
                value={opt.text}
                onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                placeholder={`选项 ${idx + 1}`}
                maxLength={100}
                className={styles.input}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemoveOption(opt.id)}
                disabled={options.length <= MIN_OPTIONS}
                title="删除选项"
              >
                <TrashIcon className={styles.removeIcon} />
              </button>
            </div>
          ))}
        </div>
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddOption}
          >
            <PlusIcon className={styles.addIcon} />
            添加选项
          </button>
        )}
      </div>

      {/* 开关组 */}
      <div className={styles.field}>
        <div className={styles.switchRow}>
          <div className={styles.switchMain}>
            <div className={styles.switchLabel}>允许"其他"选项</div>
            <div className={styles.switchHint}>
              用户可输入自定义答案
            </div>
          </div>
          <Toggle on={allowOther} onChange={setAllowOther} />
        </div>
        <div className={styles.switchRow}>
          <div className={styles.switchMain}>
            <div className={styles.switchLabel}>匿名投票</div>
            <div className={styles.switchHint}>不公开投票人信息</div>
          </div>
          <Toggle on={isAnonymous} onChange={setIsAnonymous} />
        </div>
      </div>

      {/* 截止时间 */}
      <div className={styles.field}>
        <div className={styles.label}>截止时间（选填）</div>
        <DatePicker
          value={endTime}
          onChange={(v) => setEndTime(v)}
          format="YYYY-MM-DD HH:mm"
          showTime={{ format: 'HH:mm' }}
          allowClear
          disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
          className={styles.input}
          placeholder="不设置则长期有效"
        />
      </div>

      {/* 简单预览 */}
      {output && (
        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <CheckIcon className={styles.previewIcon} />
            <span>预览有效</span>
          </div>
          <div className={styles.previewTitle}>{output.title}</div>
          <div className={styles.previewMeta}>
            {type === POLL_TYPE_SINGLE ? '单选' : '多选'}
            {allowOther ? ' · 允许其他' : ''}
            {isAnonymous ? ' · 匿名' : ''}
            {endTime ? ` · 截止 ${endTime.format('YYYY-MM-DD HH:mm')}` : ''}
            {` · ${output.options.length} 个选项`}
          </div>
        </div>
      )}
    </div>
  )
}
