import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, Popconfirm, message } from 'antd'
import { Button, Card, Eyebrow, StatusChip } from '@/design/primitives'
import { ListIcon, PlusIcon, TrashIcon, CheckIcon, RefreshIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import { useWorkReportStore } from '@/stores/workReport'
import { combosApi } from '@/api/combos'
import styles from './ReportTemplatesView.module.css'

type Tab = 'daily' | 'weekly'

const TAB_LABELS: Record<Tab, string> = {
  daily: '日报模板',
  weekly: '周报模板',
}

const PRESET_SECTIONS: Record<Tab, { key: string; title: string }[]> = {
  daily: [
    { key: 'completed', title: '已完成' },
    { key: 'in_progress', title: '进行中' },
    { key: 'blocked', title: '阻塞/问题' },
    { key: 'tomorrow_plan', title: '明日计划' },
    { key: 'summary', title: '总结' },
  ],
  weekly: [
    { key: 'completed', title: '已完成' },
    { key: 'in_progress', title: '进行中' },
    { key: 'blocked', title: '阻塞/问题' },
    { key: 'next_plan', title: '下周计划' },
    { key: 'summary', title: '总结' },
  ],
}

interface SectionState {
  key: string
  title: string
  sort_order: number
  max_lines: number
}

interface ComboDetail {
  id: number
  name: string
  color?: string
  isShared?: number | boolean
  userRole?: string | null
}

let sectionKeyCounter = 0
function newSectionKey(): string {
  sectionKeyCounter += 1
  return `custom_${Date.now()}_${sectionKeyCounter}`
}

export function ReportTemplatesView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    templates,
    fetchTemplates,
    upsertTemplate,
  } = useWorkReportStore()

  const comboId = Number(id)
  const [combo, setCombo] = useState<ComboDetail | null>(null)
  const [tab, setTab] = useState<Tab>('daily')
  const [sections, setSections] = useState<SectionState[]>([])
  const [saving, setSaving] = useState(false)
  const [loadedFromTemplate, setLoadedFromTemplate] = useState(false)

  useEffect(() => {
    if (!id || Number.isNaN(comboId)) return
    combosApi
      .getById(comboId)
      .then((res) => {
        if (res.success && res.combo) {
          setCombo(res.combo as ComboDetail)
        }
      })
      .catch(() => {
        // ignore
      })
  }, [id, comboId])

  useEffect(() => {
    if (!comboId || Number.isNaN(comboId)) return
    fetchTemplates(comboId).catch(() => {
      // ignore
    })
  }, [comboId, fetchTemplates])

  const matchedTemplate = useMemo(
    () => templates.find((t) => t.comboId === comboId && t.type === tab),
    [templates, comboId, tab],
  )

  // Load sections when template/tab changes
  useEffect(() => {
    if (matchedTemplate) {
      const sorted = matchedTemplate.sections
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
      setSections(sorted.map((s) => ({ ...s })))
      setLoadedFromTemplate(true)
    } else {
      // Fall back to preset
      setSections(
        PRESET_SECTIONS[tab].map((s, idx) => ({
          key: s.key,
          title: s.title,
          sort_order: idx,
          max_lines: 10,
        })),
      )
      setLoadedFromTemplate(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedTemplate, tab])

  const handleTitleChange = (idx: number, title: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, title } : s)))
  }

  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        key: newSectionKey(),
        title: '新段落',
        sort_order: prev.length,
        max_lines: 10,
      },
    ])
  }

  const handleRemoveSection = (idx: number) => {
    setSections((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, sort_order: i })),
    )
  }

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return
    setSections((prev) => {
      const next = [...prev]
      const tmp = next[idx - 1]
      next[idx - 1] = next[idx]
      next[idx] = tmp
      return next.map((s, i) => ({ ...s, sort_order: i }))
    })
  }

  const handleMoveDown = (idx: number) => {
    if (idx === sections.length - 1) return
    setSections((prev) => {
      const next = [...prev]
      const tmp = next[idx + 1]
      next[idx + 1] = next[idx]
      next[idx] = tmp
      return next.map((s, i) => ({ ...s, sort_order: i }))
    })
  }

  const handleLoadPreset = () => {
    setSections(
      PRESET_SECTIONS[tab].map((s, idx) => ({
        key: s.key,
        title: s.title,
        sort_order: idx,
        max_lines: 10,
      })),
    )
    message.success(`已载入${TAB_LABELS[tab]}预设段落`)
  }

  const handleSave = async () => {
    if (sections.length === 0) {
      message.warning('至少保留一个段落')
      return
    }
    const cleaned = sections
      .map((s, idx) => ({
        key: s.key || newSectionKey(),
        title: (s.title || '').trim() || '未命名段落',
        sort_order: idx,
        max_lines: s.max_lines || 10,
      }))
    setSaving(true)
    try {
      await upsertTemplate({
        comboId,
        type: tab,
        sections: cleaned,
      })
      message.success('模板已保存')
      await fetchTemplates(comboId)
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div
              className={styles.hdIcColor}
              style={combo?.color ? { background: combo.color } : undefined}
            >
              <ListIcon />
            </div>
            <div>
              <Eyebrow>REPORT TEMPLATES</Eyebrow>
              <h1 className={styles.title}>
                报告模板 <span className={styles.song}>编辑</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>{combo?.name || '—'}</span>
            <span className={styles.sep}>·</span>
            <span>{sections.length} 段落</span>
            <span className={styles.sep}>·</span>
            <span>{loadedFromTemplate ? '已加载自定义模板' : '预设模板'}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <Button
            variant="sec"
            size="sm"
            onClick={handleLoadPreset}
            icon={<RefreshIcon className={styles.btnIcon} />}
          >
            载入预设
          </Button>
          <Button
            variant="pri"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            icon={<CheckIcon className={styles.btnIcon} />}
          >
            {saving ? '保存中' : '保存模板'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            className={cn(styles.tab, tab === k && styles.tabAct)}
            onClick={() => setTab(k)}
          >
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Section list */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <ListIcon />
            </div>
            <div>
              <Eyebrow>SECTIONS</Eyebrow>
              <h3 className={styles.cardTitle}>
                段落 <span className={styles.song}>配置</span>
              </h3>
            </div>
          </div>
          <StatusChip tone="acc">{sections.length} 段</StatusChip>
        </div>

        <div className={styles.sectionList}>
          {sections.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <ListIcon />
              </div>
              <div className={styles.emptyTitle}>暂无段落</div>
              <div className={styles.emptySub}>点击下方"添加段落"开始</div>
            </div>
          )}

          {sections.map((sec, idx) => (
            <div key={`${sec.key}-${idx}`} className={styles.sectionItem}>
              <div className={styles.sectionIdx}>
                {String(idx + 1).padStart(2, '0')}
              </div>
              <Input
                value={sec.title}
                onChange={(e) => handleTitleChange(idx, e.target.value)}
                placeholder="段落标题"
                className={styles.sectionInput}
              />
              <div className={styles.sectionActions}>
                <button
                  type="button"
                  className={cn(styles.moveBtn, idx === 0 && styles.moveBtnDisabled)}
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={cn(
                    styles.moveBtn,
                    idx === sections.length - 1 && styles.moveBtnDisabled,
                  )}
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === sections.length - 1}
                >
                  ↓
                </button>
                <Popconfirm
                  title="删除段落"
                  description="确定删除此段落？保存后生效"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleRemoveSection(idx)}
                >
                  <button type="button" className={styles.delBtn}>
                    <TrashIcon className={styles.delIcon} />
                  </button>
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.addBtnRow}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddSection}
          >
            <PlusIcon className={styles.addIcon} />
            添加段落
          </button>
        </div>

        {sections.length > 0 && (
          <div className={styles.cardFoot}>
            <span className={styles.footText}>
              {TAB_LABELS[tab]} · 共 {sections.length} 段
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
