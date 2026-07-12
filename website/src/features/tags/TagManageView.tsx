import { useEffect, useState } from 'react'
import { Modal, Input, message, Popconfirm } from 'antd'
import type { Tag } from '@/types'
import { useTagStore } from '@/stores/tags'
import { Card, Eyebrow, Stat } from '@/design/primitives'
import {
  TagIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './TagManageView.module.css'

const PRESET_COLORS = [
  '#01796f', '#4a9eff', '#eab308', '#62d178',
  '#9c6ade', '#ff6467', '#f97316', '#a1a1a1',
]

interface FormState {
  name: string
  color: string
  icon: string
}

const EMPTY_FORM: FormState = {
  name: '',
  color: PRESET_COLORS[0],
  icon: 'tag',
}

export function TagManageView() {
  const { systemTags, userTags, fetchTags, createTag, updateTag, deleteTag, loading } =
    useTagStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (tag: Tag) => {
    setEditing(tag)
    setForm({
      name: tag.name,
      color: tag.color,
      icon: tag.icon || 'tag',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    if (!name) {
      message.warning('请输入标签名称')
      return
    }
    setSaving(true)
    try {
      const data = { name, color: form.color, icon: form.icon.trim() || 'tag' }
      if (editing) {
        await updateTag(editing.id, data)
        message.success('标签已更新')
      } else {
        await createTag(data)
        message.success('标签已创建')
      }
      setModalOpen(false)
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteTag(tag.id)
      message.success('标签已删除')
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
              <TagIcon />
            </div>
            <div>
              <Eyebrow>TAGS</Eyebrow>
              <h1 className={styles.title}>
                标签 <span className={styles.song}>管理</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>系统 {systemTags.length}</span>
            <span className={styles.sep}>·</span>
            <span>自定义 {userTags.length}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={cn(styles.actBtn, styles.actPri)}
            onClick={openCreate}
          >
            <PlusIcon className={styles.actIcon} />
            新建标签
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat label="标签总数" value={systemTags.length + userTags.length} delta="全部标签" />
        <Stat label="系统标签" value={systemTags.length} delta="只读" />
        <Stat label="自定义标签" value={userTags.length} accent delta="可编辑" />
        <Stat label="预设颜色" value={PRESET_COLORS.length} delta="可选色板" />
      </div>

      {/* System tags */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <TagIcon />
            </div>
            <div>
              <Eyebrow>SYSTEM</Eyebrow>
              <h3 className={styles.cardTitle}>
                系统 <span className={styles.song}>标签</span>
              </h3>
            </div>
          </div>
          <span className={styles.readonlyHint}>只读</span>
        </div>
        <div className={styles.tagList}>
          {loading && systemTags.length === 0 && (
            <div className={styles.empty}>加载中...</div>
          )}
          {!loading && systemTags.length === 0 && (
            <div className={styles.empty}>暂无系统标签</div>
          )}
          {systemTags.map((tag) => (
            <div key={tag.id} className={styles.tagItem}>
              <span className={styles.colorDot} style={{ background: tag.color }} />
              <span className={styles.tagName}>{tag.name}</span>
              {tag.icon && <span className={styles.tagIcon}>{tag.icon}</span>}
              <span className={styles.sysBadge}>系统</span>
            </div>
          ))}
        </div>
      </Card>

      {/* User tags */}
      <Card>
        <div className={styles.cardHead}>
          <div className={styles.cardHeadL}>
            <div className={styles.hdIc}>
              <TagIcon />
            </div>
            <div>
              <Eyebrow>CUSTOM</Eyebrow>
              <h3 className={styles.cardTitle}>
                自定义 <span className={styles.song}>标签</span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            className={cn(styles.actBtn, styles.actPri, styles.actSm)}
            onClick={openCreate}
          >
            <PlusIcon className={styles.actIcon} />
            新建
          </button>
        </div>
        <div className={styles.tagList}>
          {loading && userTags.length === 0 && (
            <div className={styles.empty}>加载中...</div>
          )}
          {!loading && userTags.length === 0 && (
            <div className={styles.empty}>
              暂无自定义标签，点击「新建」开始创建
            </div>
          )}
          {userTags.map((tag) => (
            <div key={tag.id} className={styles.tagItem}>
              <span className={styles.colorDot} style={{ background: tag.color }} />
              <div className={styles.tagMain}>
                <span className={styles.tagName}>{tag.name}</span>
                {tag.icon && <span className={styles.tagIcon}>{tag.icon}</span>}
              </div>
              <div className={styles.tagActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => openEdit(tag)}
                  title="编辑"
                >
                  <CheckIcon />
                </button>
                <Popconfirm
                  title="删除标签"
                  description="删除后已关联的待办将移除该标签"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(tag)}
                >
                  <button
                    type="button"
                    className={cn(styles.iconBtn, styles.delBtn)}
                    title="删除"
                  >
                    <TrashIcon />
                  </button>
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create/Edit modal */}
      <Modal
        title={editing ? '编辑标签' : '新建标签'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editing ? '保存' : '创建'}
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ style: { background: '#01796f', borderColor: '#01796f' } }}
        destroyOnClose
      >
        <div className={styles.formRow}>
          <span className={styles.formLabel}>名称</span>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="输入标签名称"
            maxLength={12}
            autoFocus
          />
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>颜色</span>
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(styles.colorSwatch, form.color === c && styles.colorAct)}
                style={{ background: c }}
                onClick={() => setForm({ ...form, color: c })}
              >
                {form.color === c && (
                  <CheckIcon strokeWidth={2.5} style={{ color: '#fff', width: 13, height: 13 }} />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>图标名称</span>
          <Input
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="如 tag、folder、briefcase"
            maxLength={30}
          />
        </div>
      </Modal>
    </div>
  )
}
