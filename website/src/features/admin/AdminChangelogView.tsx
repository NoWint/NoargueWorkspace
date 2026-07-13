import { useEffect, useMemo, useState } from 'react'
import { Input, DatePicker, Modal, Popconfirm, message } from 'antd'
import dayjs from 'dayjs'
import { Button, Card, Eyebrow } from '@/design/primitives'
import {
  CheckIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '@/design/icons'
import { useAdminStore } from '@/stores/admin'
import { cn, todayStr } from '@/lib/utils'
import type { AdminChangelog } from '@/api/admin'
import styles from './AdminChangelogView.module.css'

interface FormState {
  version: string
  date: dayjs.Dayjs | null
  content: string[]
}

const EMPTY_FORM: FormState = {
  version: '',
  date: null,
  content: [''],
}

export function AdminChangelogView() {
  const { changelog, loading, fetchChangelog, saveChangelog, deleteChangelog } =
    useAdminStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchChangelog().catch((e) => {
      message.error((e as Error).message || '加载版本日志失败')
    })
  }, [fetchChangelog])

  const sorted = useMemo(() => {
    return [...changelog].sort((a, b) => {
      const va = parseFloat(a.version?.replace(/^v/i, '') || '0')
      const vb = parseFloat(b.version?.replace(/^v/i, '') || '0')
      if (vb !== va) return vb - va
      return (b.date || '').localeCompare(a.date || '')
    })
  }, [changelog])

  const indexMap = useMemo(() => {
    // sorted 是按版本号倒序的视图，但 store 中的 index 是原始数组下标
    // 需要根据原始 changelog 数组找到对应下标
    const map = new Map<string, number>()
    changelog.forEach((item, idx) => {
      const key = `${item.version}-${item.date}`
      map.set(key, idx)
    })
    return map
  }, [changelog])

  const openCreate = () => {
    setEditingIndex(null)
    setForm({ ...EMPTY_FORM, date: dayjs(todayStr()), content: [''] })
    setModalOpen(true)
  }

  const openEdit = (item: AdminChangelog) => {
    const key = `${item.version}-${item.date}`
    const originalIndex = indexMap.get(key)
    setEditingIndex(originalIndex ?? null)
    setForm({
      version: item.version || '',
      date: item.date ? dayjs(item.date) : null,
      content: item.content && item.content.length > 0 ? [...item.content] : [''],
    })
    setModalOpen(true)
  }

  const handleContentChange = (idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      content: prev.content.map((c, i) => (i === idx ? value : c)),
    }))
  }

  const handleAddContent = () => {
    setForm((prev) => ({ ...prev, content: [...prev.content, ''] }))
  }

  const handleRemoveContent = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      content: prev.content.length > 1
        ? prev.content.filter((_, i) => i !== idx)
        : prev.content,
    }))
  }

  const handleSave = async () => {
    const version = form.version.trim()
    if (!version) {
      message.warning('请输入版本号')
      return
    }
    if (!form.date) {
      message.warning('请选择发布日期')
      return
    }
    const content = form.content.map((c) => c.trim()).filter(Boolean)
    if (content.length === 0) {
      message.warning('请至少添加一条更新内容')
      return
    }
    const data: AdminChangelog = {
      version,
      date: form.date.format('YYYY-MM-DD'),
      content,
    }
    setSaving(true)
    try {
      await saveChangelog(data, editingIndex ?? undefined)
      message.success(editingIndex === null ? '版本已创建' : '版本已更新')
      setModalOpen(false)
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: AdminChangelog) => {
    const key = `${item.version}-${item.date}`
    const originalIndex = indexMap.get(key)
    if (originalIndex === undefined) {
      message.error('未找到对应版本记录')
      return
    }
    try {
      await deleteChangelog(originalIndex)
      message.success('版本已删除')
    } catch (e) {
      message.error((e as Error).message || '删除失败')
    }
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
              <Eyebrow>CHANGELOG</Eyebrow>
              <h1 className={styles.title}>
                版本 <span className={styles.song}>日志</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>共 {changelog.length} 个版本</span>
            {sorted[0]?.version && (
              <>
                <span className={styles.sep}>·</span>
                <span>最新 v{sorted[0].version}</span>
              </>
            )}
            {loading && (
              <>
                <span className={styles.sep}>·</span>
                <span>加载中...</span>
              </>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="pri"
            size="sm"
            icon={<PlusIcon className={styles.btnIcon} />}
            onClick={openCreate}
          >
            新建版本
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <CheckIcon />
            </div>
            <div>
              <Eyebrow>TIMELINE</Eyebrow>
              <h3 className={styles.cardTitle}>
                更新 <span className={styles.song}>记录</span>
              </h3>
            </div>
          </div>
        </div>

        {sorted.length === 0 && (
          <div className={styles.empty}>
            {loading ? '加载中...' : '暂无版本日志，点击「新建版本」开始'}
          </div>
        )}

        <div className={styles.timeline}>
          {sorted.map((log, idx) => {
            const isLatest = idx === 0
            return (
              <div key={`${log.version}-${idx}`} className={styles.logItem}>
                <div className={styles.timelineL}>
                  <span
                    className={cn(
                      styles.node,
                      isLatest ? styles.nodeLatest : styles.nodeOld,
                    )}
                  />
                  {idx < sorted.length - 1 && <span className={styles.line} />}
                </div>
                <div className={styles.timelineR}>
                  <div className={styles.logHead}>
                    <span className={styles.logVer}>v{log.version}</span>
                    {log.date && (
                      <span className={styles.logDate}>{log.date}</span>
                    )}
                    {isLatest && <span className={styles.latestBadge}>最新</span>}
                    <div className={styles.logActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => openEdit(log)}
                        title="编辑"
                      >
                        <EditIcon />
                      </button>
                      <Popconfirm
                        title="删除版本"
                        description="删除后不可恢复，确认继续？"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(log)}
                      >
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.delBtn}`}
                          title="删除"
                        >
                          <TrashIcon />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                  {log.content && log.content.length > 0 && (
                    <ul className={styles.logList}>
                      {log.content.map((item, i) => (
                        <li key={i} className={styles.logEntry}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Edit/Create modal */}
      <Modal
        title={editingIndex === null ? '新建版本' : '编辑版本'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingIndex === null ? '创建' : '保存'}
        cancelText="取消"
        confirmLoading={saving}
        destroyOnClose
        width={600}
      >
        <div className={styles.formRowInline}>
          <div className={styles.formField}>
            <span className={styles.formLabel}>版本号</span>
            <Input
              className={styles.formInput}
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="如 1.2.0"
              maxLength={20}
              autoFocus
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.formLabel}>发布日期</span>
            <DatePicker
              className={styles.formPicker}
              value={form.date}
              onChange={(v) => setForm({ ...form, date: v })}
              format="YYYY-MM-DD"
              allowClear
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>更新内容</span>
          <div className={styles.contentList}>
            {form.content.map((item, idx) => (
              <div key={idx} className={styles.contentRow}>
                <Input
                  className={styles.contentInput}
                  value={item}
                  onChange={(e) => handleContentChange(idx, e.target.value)}
                  placeholder={`第 ${idx + 1} 条更新`}
                  maxLength={200}
                />
                <button
                  type="button"
                  className={styles.contentDelBtn}
                  onClick={() => handleRemoveContent(idx)}
                  title="删除此条"
                  disabled={form.content.length <= 1}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.contentAddBtn}
              onClick={handleAddContent}
            >
              <PlusIcon />
              添加一条
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
