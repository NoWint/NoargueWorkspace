import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, DatePicker, TimePicker, Form, message } from 'antd'
import dayjs from 'dayjs'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { todosApi } from '@/api/todos'
import { Button, Card, Eyebrow, Tag } from '@/design/primitives'
import { PlusIcon, CheckIcon, ClockIcon, TagIcon } from '@/design/icons'
import { todayStr, cn } from '@/lib/utils'
import styles from './TodoForm.module.css'
import { ImageUploader } from './ImageUploader'

interface TodoFormProps {
  mode: 'create' | 'edit'
}

interface FormValues {
  text: string
  remarks?: string
  setDate?: dayjs.Dayjs | null
  setTime?: dayjs.Dayjs | null
}

export function TodoForm({ mode }: TodoFormProps) {
  const navigate = useNavigate()
  const { id } = useParams()
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const combos = useComboStore((s) => s.combos)
  const { systemTags, userTags, fetchTags } = useTagStore()

  const [form] = Form.useForm<FormValues>()
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedCombo, setSelectedCombo] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const [textValue, setTextValue] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('low')
  const [subtasks, setSubtasks] = useState<{ id?: string; text: string }[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const fetchSubtodos = useTodoStore((s) => s.fetchSubtodos)

  useEffect(() => {
    fetchTags()
    if (mode === 'edit' && id) {
      todosApi.getById(id).then((res) => {
        if (res.success && res.todo) {
          const t = res.todo
          form.setFieldsValue({
            text: t.text,
            remarks: t.remarks,
            setDate: t.setDate ? dayjs(t.setDate) : null,
            setTime: t.setTime ? dayjs(t.setTime, 'HH:mm') : null,
          })
          setTextValue(t.text || '')
          setSelectedTags(t.tags || [])
          setSelectedCombo(t.comboId)
          setPriority((t.priority as 'high' | 'medium' | 'low') || 'low')
          setImages(t.images || [])
          setLocationName(t.locationText || '')
          fetchSubtodos(id).then(() => {
            const subs = useTodoStore.getState().subtaskMap[id] || []
            setSubtasks(subs.map((s) => ({ id: s.id, text: s.text })))
          })
        }
      })
    } else {
      form.setFieldsValue({ setDate: dayjs(todayStr()) })
    }
  }, [mode, id, form])

  const allTags = useMemo(() => [...systemTags, ...userTags], [systemTags, userTags])

  const selectedComboObj = useMemo(
    () => combos.find((c) => c.id === selectedCombo),
    [combos, selectedCombo],
  )

  const handleSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const data: Partial<Todo> = {
        text: values.text,
        remarks: values.remarks,
        setDate: values.setDate?.format('YYYY-MM-DD'),
        setTime: values.setTime?.format('HH:mm'),
        tags: selectedTags,
        comboId: selectedCombo,
        priority,
        images,
        locationText: locationName
          ? locationAddress
            ? `${locationName}（${locationAddress}）`
            : locationName
          : undefined,
      }
      let mainTodoId: string | undefined
      if (mode === 'create') {
        const created = await createTodo(data)
        mainTodoId = created.id
        message.success('创建成功')
      } else if (id) {
        await updateTodo(id, data)
        mainTodoId = id
        message.success('更新成功')
      }
      // Handle subtasks
      if (mainTodoId) {
        if (mode === 'edit') {
          await fetchSubtodos(mainTodoId)
          const existing = useTodoStore.getState().subtaskMap[mainTodoId] || []
          const keptIds = new Set(subtasks.filter((s) => s.id).map((s) => s.id))
          for (const ex of existing) {
            if (!keptIds.has(ex.id)) {
              await useTodoStore.getState().deleteTodo(ex.id)
            }
          }
          for (const sub of subtasks) {
            if (sub.id) {
              const orig = existing.find((s) => s.id === sub.id)
              if (orig && orig.text !== sub.text) {
                await useTodoStore.getState().updateTodo(sub.id, { text: sub.text })
              }
            }
          }
        }
        for (const sub of subtasks) {
          if (!sub.id) {
            await createTodo({ text: sub.text, parentId: mainTodoId })
          }
        }
      }
      navigate('/')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const isEdit = mode === 'edit'

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <PlusIcon />
            </div>
            <div>
              <Eyebrow>{isEdit ? 'EDIT' : 'NEW'}</Eyebrow>
              <h1 className={styles.title}>
                {isEdit ? '编辑' : '新建'}
                <span className={styles.song}> 待办</span>
              </h1>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="gh" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.grid}>
        {/* Form card */}
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className={styles.form}
            requiredMark={false}
          >
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>内容</div>
              <Form.Item
                name="text"
                rules={[{ required: true, message: '请输入待办内容' }]}
                className={styles.formItem}
              >
                <Input
                  placeholder="待办内容"
                  className={styles.input}
                  onChange={(e) => setTextValue(e.target.value)}
                />
              </Form.Item>
            </div>

            <div className={styles.row}>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <div className={styles.fieldLabel}>日期</div>
                <Form.Item name="setDate" className={styles.formItem}>
                  <DatePicker
                    style={{ width: '100%' }}
                    className={styles.picker}
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </div>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <div className={styles.fieldLabel}>时间</div>
                <Form.Item name="setTime" className={styles.formItem}>
                  <TimePicker
                    format="HH:mm"
                    style={{ width: '100%' }}
                    className={styles.picker}
                  />
                </Form.Item>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>备注</div>
              <Form.Item name="remarks" className={styles.formItem}>
                <Input.TextArea
                  rows={3}
                  placeholder="备注信息"
                  className={styles.textarea}
                />
              </Form.Item>
            </div>

            {/* Combo selection (chip-style buttons) */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>组合</div>
              <div className={styles.chips}>
                <button
                  type="button"
                  className={cn(
                    styles.chipBtn,
                    !selectedCombo && styles.chipAct,
                  )}
                  onClick={() => setSelectedCombo(undefined)}
                >
                  <span className={styles.chipDotAll} />
                  无
                </button>
                {combos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      styles.chipBtn,
                      selectedCombo === c.id && styles.chipAct,
                    )}
                    onClick={() => setSelectedCombo(c.id)}
                  >
                    <span
                      className={styles.chipDot}
                      style={{ background: c.color }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority selection */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>优先级</div>
              <div className={styles.priBtns}>
                <button
                  type="button"
                  className={cn(
                    styles.priBtn,
                    priority === 'high' && styles.priAct,
                    priority === 'high' && styles.priActHigh,
                  )}
                  onClick={() => setPriority('high')}
                >
                  <span className={styles.priDot} style={{ background: 'var(--destructive)' }} />
                  高
                </button>
                <button
                  type="button"
                  className={cn(
                    styles.priBtn,
                    priority === 'medium' && styles.priAct,
                    priority === 'medium' && styles.priActMed,
                  )}
                  onClick={() => setPriority('medium')}
                >
                  <span className={styles.priDot} style={{ background: 'var(--warn)' }} />
                  中
                </button>
                <button
                  type="button"
                  className={cn(
                    styles.priBtn,
                    priority === 'low' && styles.priAct,
                    priority === 'low' && styles.priActLow,
                  )}
                  onClick={() => setPriority('low')}
                >
                  <span className={styles.priDot} style={{ background: 'var(--mt3)' }} />
                  低
                </button>
              </div>
            </div>

            {/* Tag selection (Tag primitive with toggle) */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>标签</div>
              <div className={styles.chips}>
                {allTags.map((t) => {
                  const active = selectedTags.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.tagBtn}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(t.id)
                            ? prev.filter((x) => x !== t.id)
                            : [...prev, t.id],
                        )
                      }}
                    >
                      <Tag tone={active ? 'pri' : 'default'}>{t.name}</Tag>
                    </button>
                  )
                })}
                {allTags.length === 0 && (
                  <span className={styles.emptyHint}>暂无标签</span>
                )}
              </div>
            </div>

            {/* Location */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>位置</div>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="位置名称"
                className={styles.input}
              />
              <Input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="详细地址（可选）"
                className={styles.input}
              />
            </div>

            {/* Image attachments */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>图片附件</div>
              <ImageUploader images={images} onChange={setImages} />
            </div>

            {/* Subtasks */}
            <div className={styles.section}>
              <div className={styles.fieldLabel}>子任务</div>
              <div className={styles.subtaskList}>
                {subtasks.map((s, i) => (
                  <div key={i} className={styles.subtaskItem}>
                    <span className={styles.subtaskText}>{s.text}</span>
                    <button
                      type="button"
                      className={styles.subtaskRemove}
                      onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <input
                  className={styles.subtaskInput}
                  placeholder="添加子任务，回车确认"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const text = subtaskInput.trim()
                      if (text) {
                        setSubtasks([...subtasks, { text }])
                        setSubtaskInput('')
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Submit / cancel (primitive Button) */}
            <div className={styles.formActions}>
              <Button
                variant="pri"
                type="submit"
                disabled={loading}
                icon={<CheckIcon className={styles.btnIcon} />}
              >
                {loading ? '保存中...' : isEdit ? '保存' : '创建'}
              </Button>
              <Button variant="sec" onClick={() => navigate(-1)}>
                取消
              </Button>
            </div>
          </Form>
        </Card>

        {/* Aside: preview + tips */}
        <div className={styles.aside}>
          {/* Preview card */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <CheckIcon />
                </div>
                <div>
                  <Eyebrow>PREVIEW</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    实时 <span className={styles.song}>预览</span>
                  </h3>
                </div>
              </div>
            </div>

            <div className={styles.preview}>
              <div className={styles.previewCheck} />
              <div className={styles.previewMain}>
                <div className={styles.previewTitle}>
                  {textValue || '待办内容预览'}
                </div>
                <div className={styles.previewSub}>
                  {selectedComboObj && (
                    <span
                      className={styles.previewCombo}
                      style={{ color: selectedComboObj.color }}
                    >
                      {selectedComboObj.name}
                    </span>
                  )}
                  {selectedTags.length > 0 && (
                    <span className={styles.previewTag}>
                      {selectedTags.length} 个标签
                    </span>
                  )}
                  <span className={styles.previewHint}>未设时间</span>
                </div>
              </div>
            </div>

            <div className={styles.previewMeta}>
              <div className={styles.previewMetaRow}>
                <span className={styles.previewMetaLabel}>状态</span>
                <span className={styles.previewMetaVal}>待开始</span>
              </div>
              <div className={styles.previewMetaRow}>
                <span className={styles.previewMetaLabel}>模式</span>
                <span className={styles.previewMetaVal}>
                  {isEdit ? '编辑' : '新建'}
                </span>
              </div>
            </div>
          </Card>

          {/* Tips card */}
          <Card>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadL}>
                <div className={styles.hdIc}>
                  <TagIcon />
                </div>
                <div>
                  <Eyebrow>TIPS</Eyebrow>
                  <h3 className={styles.cardTitle}>
                    快捷 <span className={styles.song}>提示</span>
                  </h3>
                </div>
              </div>
            </div>
            <ul className={styles.tips}>
              <li>
                <ClockIcon className={styles.tipIcon} />
                <span>设置日期与时间后，待办会在日历中显示标记</span>
              </li>
              <li>
                <TagIcon className={styles.tipIcon} />
                <span>标签用于分类，可多选；组合用于归类文件夹</span>
              </li>
              <li>
                <PlusIcon className={styles.tipIcon} />
                <span>备注支持多行文本，可写入详情或上下文</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
