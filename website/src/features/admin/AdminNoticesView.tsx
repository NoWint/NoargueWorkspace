import { useEffect, useState } from 'react'
import { Input, DatePicker, Modal, Popconfirm, message } from 'antd'
import dayjs from 'dayjs'
import { Button, Card, Eyebrow } from '@/design/primitives'
import {
  BellIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '@/design/icons'
import { useAdminStore } from '@/stores/admin'
import { todayStr } from '@/lib/utils'
import type { AdminNotice } from '@/api/admin'
import styles from './AdminNoticesView.module.css'

interface FormState {
  title: string
  date: dayjs.Dayjs | null
  version: string
  content: string
}

const EMPTY_FORM: FormState = {
  title: '',
  date: null,
  version: '',
  content: '',
}

export function AdminNoticesView() {
  const { notices, loading, fetchNotices, saveNotice, deleteNotice } = useAdminStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchNotices().catch((e) => {
      message.error((e as Error).message || '加载公告失败')
    })
  }, [fetchNotices])

  const openCreate = () => {
    setEditingIndex(null)
    setForm({ ...EMPTY_FORM, date: dayjs(todayStr()) })
    setModalOpen(true)
  }

  const openEdit = (notice: AdminNotice, index: number) => {
    setEditingIndex(index)
    setForm({
      title: notice.title || '',
      date: notice.date ? dayjs(notice.date) : null,
      version: notice.version || '',
      content: notice.content || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const title = form.title.trim()
    if (!title) {
      message.warning('请输入公告标题')
      return
    }
    if (!form.date) {
      message.warning('请选择公告日期')
      return
    }
    const content = form.content.trim()
    if (!content) {
      message.warning('请输入公告内容')
      return
    }
    const data: AdminNotice = {
      title,
      date: form.date.format('YYYY-MM-DD'),
      content,
      version: form.version.trim() || undefined,
    }
    setSaving(true)
    try {
      await saveNotice(data, editingIndex ?? undefined)
      message.success(editingIndex === null ? '公告已创建' : '公告已更新')
      setModalOpen(false)
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (index: number) => {
    try {
      await deleteNotice(index)
      message.success('公告已删除')
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
              <BellIcon />
            </div>
            <div>
              <Eyebrow>NOTICES</Eyebrow>
              <h1 className={styles.title}>
                公告 <span className={styles.song}>管理</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>共 {notices.length} 条公告</span>
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
            新建公告
          </Button>
        </div>
      </div>

      {/* Notice list */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <BellIcon />
            </div>
            <div>
              <Eyebrow>LIST</Eyebrow>
              <h3 className={styles.cardTitle}>
                公告 <span className={styles.song}>列表</span>
              </h3>
            </div>
          </div>
        </div>

        {notices.length === 0 && (
          <div className={styles.empty}>
            {loading ? '加载中...' : '暂无公告，点击「新建公告」开始'}
          </div>
        )}

        <div className={styles.noticeList}>
          {notices.map((notice, idx) => (
            <div key={idx} className={styles.noticeCard}>
              <div className={styles.noticeHead}>
                <div className={styles.noticeHeadL}>
                  <span className={styles.noticeTitle}>{notice.title}</span>
                  <div className={styles.noticeMeta}>
                    {notice.date && <span>{notice.date}</span>}
                    {notice.version && (
                      <>
                        <span className={styles.noticeMetaSep}>·</span>
                        <span>v{notice.version}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.noticeActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => openEdit(notice, idx)}
                    title="编辑"
                  >
                    <EditIcon />
                  </button>
                  <Popconfirm
                    title="删除公告"
                    description="删除后不可恢复，确认继续？"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(idx)}
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
              {notice.content && (
                <div className={styles.noticeContent}>{notice.content}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Edit/Create modal */}
      <Modal
        title={editingIndex === null ? '新建公告' : '编辑公告'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingIndex === null ? '创建' : '保存'}
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ style: { background: '#01796f', borderColor: '#01796f' } }}
        destroyOnClose
      >
        <div className={styles.formRow}>
          <span className={styles.formLabel}>标题</span>
          <Input
            className={styles.formInput}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="输入公告标题"
            maxLength={60}
            autoFocus
          />
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>日期</span>
          <DatePicker
            className={styles.formPicker}
            value={form.date}
            onChange={(v) => setForm({ ...form, date: v })}
            format="YYYY-MM-DD"
            allowClear
          />
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>版本（可选）</span>
          <Input
            className={styles.formInput}
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            placeholder="如 v1.2.0"
            maxLength={20}
          />
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>内容</span>
          <Input.TextArea
            className={styles.formTextArea}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="输入公告内容，支持 Markdown"
            autoSize={{ minRows: 4, maxRows: 12 }}
          />
        </div>
      </Modal>
    </div>
  )
}
