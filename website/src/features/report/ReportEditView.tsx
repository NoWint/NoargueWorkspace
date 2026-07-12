import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Input, message } from 'antd'
import { Button, Card, Eyebrow, StatusChip } from '@/design/primitives'
import { CheckIcon, ListIcon, RefreshIcon } from '@/design/icons'
import { cn, todayStr } from '@/lib/utils'
import { useWorkReportStore } from '@/stores/workReport'
import styles from './ReportEditView.module.css'

type ReportType = 'daily' | 'weekly'

const TYPE_LABELS: Record<ReportType, string> = {
  daily: '日报',
  weekly: '周报',
}

const DEFAULT_SECTION_TITLES: Record<string, string> = {
  completed: '已完成',
  in_progress: '进行中',
  blocked: '阻塞/问题',
  tomorrow_plan: '明日计划',
  next_plan: '下周计划',
  summary: '总结',
}

interface SectionState {
  key: string
  title: string
  text: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

interface ReportEditViewProps {
  mode: 'create' | 'edit'
}

export function ReportEditView({ mode }: ReportEditViewProps) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    templates,
    currentReport,
    fetchById,
    fetchTemplates,
    create,
    update,
  } = useWorkReportStore()

  const isEdit = mode === 'edit'

  // Parse URL params for new mode
  const urlType = (searchParams.get('type') as ReportType | null) || 'daily'
  const urlDate = searchParams.get('date') || todayStr()
  const urlComboId = Number(searchParams.get('comboId') || 0)

  const [type, setType] = useState<ReportType>(urlType)
  const [periodDate, setPeriodDate] = useState<string>(
    isEdit ? '' : urlDate,
  )
  const [comboId, setComboId] = useState<number>(isEdit ? 0 : urlComboId)
  const [sections, setSections] = useState<SectionState[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // For edit mode, fetch existing report
  useEffect(() => {
    if (!isEdit || !id) return
    const numId = Number(id)
    if (Number.isNaN(numId)) return
    fetchById(numId)
      .then(() => setLoaded(true))
      .catch((e) => {
        message.error((e as Error).message || '加载失败')
        setLoaded(true)
      })
  }, [id, isEdit, fetchById])

  // Fetch templates for the combo
  useEffect(() => {
    const targetComboId = isEdit ? currentReport?.comboId : urlComboId
    if (!targetComboId) return
    fetchTemplates(targetComboId).catch(() => {
      // ignore
    })
  }, [isEdit, currentReport?.comboId, urlComboId, fetchTemplates])

  // Prefill sections from current report (edit mode) or template (new mode)
  useEffect(() => {
    if (isEdit && currentReport && !loaded) return
    if (isEdit && !currentReport) return

    if (isEdit && currentReport) {
      setType(currentReport.type)
      setPeriodDate(currentReport.periodDate)
      setComboId(currentReport.comboId)
      const list: SectionState[] = Object.entries(
        currentReport.content || {},
      ).map(([key, lines]) => ({
        key,
        title: DEFAULT_SECTION_TITLES[key] || key,
        text: (lines || []).join('\n'),
      }))
      setSections(list)
    } else {
      // New mode: build from template
      const tpl = templates.find(
        (t) => t.comboId === urlComboId && t.type === urlType,
      )
      if (tpl && tpl.sections.length > 0) {
        setSections(
          tpl.sections
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => ({
              key: s.key,
              title: s.title || DEFAULT_SECTION_TITLES[s.key] || s.key,
              text: '',
            })),
        )
      } else {
        // Default sections
        const defaultKeys =
          urlType === 'daily'
            ? ['completed', 'in_progress', 'blocked', 'tomorrow_plan', 'summary']
            : ['completed', 'in_progress', 'blocked', 'next_plan', 'summary']
        setSections(
          defaultKeys.map((k) => ({
            key: k,
            title: DEFAULT_SECTION_TITLES[k] || k,
            text: '',
          })),
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReport, loaded, templates, urlComboId, urlType, isEdit])

  const matchedTemplate = useMemo(
    () =>
      templates.find(
        (t) => t.comboId === (isEdit ? currentReport?.comboId : urlComboId) &&
        t.type === type,
      ),
    [templates, isEdit, currentReport?.comboId, urlComboId, type],
  )

  const periodLabel = useMemo(() => {
    if (!periodDate) return '—'
    if (type === 'daily') return periodDate
    const start = startOfWeek(new Date(periodDate))
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${ymd(start)} ~ ${ymd(end)}`
  }, [periodDate, type])

  const handleSectionChange = (idx: number, text: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, text } : s)))
  }

  const handleImportTemplate = () => {
    if (!matchedTemplate) return
    const sorted = matchedTemplate.sections
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
    setSections((prev) => {
      const map = new Map(prev.map((s) => [s.key, s.text]))
      const next = sorted.map((s) => ({
        key: s.key,
        title: s.title || DEFAULT_SECTION_TITLES[s.key] || s.key,
        text: map.get(s.key) || '',
      }))
      // Preserve any existing sections not in template
      for (const s of prev) {
        if (!next.find((n) => n.key === s.key)) {
          next.push(s)
        }
      }
      return next
    })
    message.success('已导入模板段落')
  }

  const handleSave = async () => {
    if (!comboId) {
      message.error('缺少组合信息')
      return
    }
    if (!periodDate) {
      message.error('请填写报告日期')
      return
    }
    const content: Record<string, string[]> = {}
    for (const s of sections) {
      const lines = s.text
        .split('\n')
        .map((l) => l.trimEnd())
        // keep raw lines including empty middle lines but strip trailing empties handled by join
      content[s.key] = lines
    }
    setSaving(true)
    try {
      if (isEdit && currentReport) {
        await update(currentReport.id, { content })
        message.success('已更新')
        navigate(`/reports/${currentReport.id}`)
      } else {
        const created = await create({
          type,
          periodDate,
          comboId,
          content,
        })
        message.success('已创建')
        navigate(`/reports/${created.id}`)
      }
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && !currentReport && !loaded) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }

  if (isEdit && !currentReport && loaded) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <ListIcon />
          </div>
          <div className={styles.emptyTitle}>未找到该报告</div>
          <div className={styles.emptySub}>可能已被删除或不存在</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div>
              <Eyebrow>{isEdit ? 'EDIT' : 'NEW'}</Eyebrow>
              <h1 className={styles.title}>
                写 <span className={styles.song}>报告</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <StatusChip tone="acc">{TYPE_LABELS[type]}</StatusChip>
            <span className={styles.sep}>·</span>
            <span>{periodLabel}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <Button
            variant="sec"
            size="sm"
            onClick={handleImportTemplate}
            disabled={!matchedTemplate}
            icon={<RefreshIcon className={styles.btnIcon} />}
          >
            导入模板
          </Button>
          <Button
            variant="pri"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            icon={<CheckIcon className={styles.btnIcon} />}
          >
            {saving ? '保存中' : '保存'}
          </Button>
        </div>
      </div>

      {/* Type + date editor (only for create mode) */}
      {!isEdit && (
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>BASIC</Eyebrow>
                <h3 className={styles.cardTitle}>
                  基本 <span className={styles.song}>信息</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.basicRow}>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>报告类型</div>
              <div className={styles.tabs}>
                {(Object.keys(TYPE_LABELS) as ReportType[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(styles.tab, type === k && styles.tabAct)}
                    onClick={() => setType(k)}
                  >
                    {TYPE_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fieldGroup} style={{ flex: 1 }}>
              <div className={styles.fieldLabel}>
                {type === 'daily' ? '报告日期' : '本周起始日期'}
              </div>
              <Input
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className={styles.input}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Sections */}
      {sections.length === 0 && (
        <Card>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ListIcon />
            </div>
            <div className={styles.emptyTitle}>暂无段落</div>
            <div className={styles.emptySub}>
              点击"导入模板"或选择日报/周报类型
            </div>
          </div>
        </Card>
      )}

      {sections.map((sec, idx) => (
        <Card key={`${sec.key}-${idx}`}>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <span className={styles.sectionIdx}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <Eyebrow>SECTION {String(idx + 1).padStart(2, '0')}</Eyebrow>
                <h3 className={styles.cardTitle}>{sec.title}</h3>
              </div>
            </div>
            <StatusChip>
              {sec.text.split('\n').filter((l) => l.trim()).length} 行
            </StatusChip>
          </div>
          <Input.TextArea
            value={sec.text}
            onChange={(e) => handleSectionChange(idx, e.target.value)}
            autoSize={{ minRows: 4, maxRows: 16 }}
            placeholder={`请输入${sec.title}内容...`}
            className={styles.textarea}
          />
        </Card>
      ))}
    </div>
  )
}
