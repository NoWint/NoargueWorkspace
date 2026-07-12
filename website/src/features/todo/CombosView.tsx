import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Input, message, Popconfirm } from 'antd'
import type { Combo } from '@/types'
import { useComboStore } from '@/stores/combos'
import { useTodoStore } from '@/stores/todos'
import { Button, Card, Eyebrow, Stat, StatusChip } from '@/design/primitives'
import {
  ListIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './CombosView.module.css'

const PRESET_COLORS = [
  '#01796f', '#4a9eff', '#eab308', '#62d178',
  '#9c6ade', '#ff6467', '#f97316', '#a1a1a1',
]

interface FormState {
  name: string
  description: string
  color: string
  icon: string
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  color: PRESET_COLORS[0],
  icon: 'folder',
}

export function CombosView() {
  const navigate = useNavigate()
  const { combos, fetchCombos, createCombo, updateCombo, deleteCombo, loading } =
    useComboStore()
  const { todos, fetchTodos } = useTodoStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Combo | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCombos()
    fetchTodos()
  }, [fetchCombos, fetchTodos])

  const activeTodos = useMemo(() => todos.filter((t) => !t.isDeleted), [todos])
  const privateCombos = useMemo(
    () => combos.filter((c) => !c.isShared),
    [combos],
  )
  const sharedCombos = useMemo(
    () => combos.filter((c) => c.isShared),
    [combos],
  )

  const comboCount = (id: number) =>
    activeTodos.filter((t) => t.comboId === id).length

  const totalTodos = activeTodos.length
  const todosInCombos = activeTodos.filter((t) => t.comboId != null).length

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (combo: Combo) => {
    setEditing(combo)
    setForm({
      name: combo.name,
      description: combo.description || '',
      color: combo.color,
      icon: combo.icon || 'folder',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      message.warning('请输入组合名称')
      return
    }
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        icon: form.icon,
      }
      if (editing) {
        await updateCombo(editing.id, data)
        message.success('组合已更新')
      } else {
        await createCombo(data)
        message.success('组合已创建')
      }
      setModalOpen(false)
    } catch (e) {
      message.error((e as Error).message || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (combo: Combo) => {
    try {
      await deleteCombo(combo.id)
      message.success('组合已删除')
    } catch (e) {
      message.error((e as Error).message || '删除失败')
    }
  }

  const renderComboCard = (combo: Combo) => {
    const count = comboCount(combo.id)
    return (
      <div
        key={combo.id}
        className={styles.comboCard}
        onClick={() => navigate(`/combos/${combo.id}`)}
      >
        <div className={styles.comboIcon} style={{ background: combo.color }}>
          <ListIcon />
        </div>
        <div className={styles.comboMain}>
          <div className={styles.comboName}>
            {combo.name}
            <StatusChip tone={combo.isShared ? 'acc' : 'default'}>
              {combo.isShared ? '共享' : '私有'}
            </StatusChip>
          </div>
          {combo.description && (
            <div className={styles.comboDesc}>{combo.description}</div>
          )}
          <div className={styles.comboFoot}>
            <span className={styles.comboCount}>{count} 项待办</span>
            <div className={styles.comboActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  openEdit(combo)
                }}
              >
                <CheckIcon />
              </button>
              <Popconfirm
                title="删除组合"
                description="组合内的待办不会被删除，将变为未分组状态"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={(e) => {
                  e?.stopPropagation()
                  handleDelete(combo)
                }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <button
                  type="button"
                  className={cn(styles.iconBtn, styles.delBtn)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <TrashIcon />
                </button>
              </Popconfirm>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderEmpty = (label: string) => (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <ListIcon />
      </div>
      <div className={styles.emptyTitle}>暂无{label}组合</div>
      <div className={styles.emptySub}>点击右上角"新建组合"开始</div>
    </div>
  )

  return (
    <div className={styles.screen}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.hdRow}>
            <div className={styles.hdIc}>
              <ListIcon />
            </div>
            <div>
              <Eyebrow>COMBOS</Eyebrow>
              <h1 className={styles.title}>
                组合 <span className={styles.song}>管理</span>
              </h1>
            </div>
          </div>
          <div className={styles.meta}>
            <span>私有 {privateCombos.length}</span>
            <span className={styles.sep}>·</span>
            <span>共享 {sharedCombos.length}</span>
            <span className={styles.sep}>·</span>
            <span>已分组 {todosInCombos} / {totalTodos}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="pri"
            size="sm"
            icon={<PlusIcon className={styles.btnIcon} />}
            onClick={openCreate}
          >
            新建组合
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <Stat label="组合总数" value={combos.length} delta="全部组合" />
        <Stat label="私有组合" value={privateCombos.length} delta="个人使用" />
        <Stat label="共享组合" value={sharedCombos.length} accent delta="协作管理" />
        <Stat label="已分组待办" value={todosInCombos} delta={`共 ${totalTodos} 项`} />
      </div>

      {/* Two-column grid */}
      <div className={styles.grid}>
        {/* Private combos */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>PRIVATE</Eyebrow>
                <h3 className={styles.cardTitle}>
                  私有 <span className={styles.song}>组合</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.comboList}>
            {loading && privateCombos.length === 0 && (
              <div className={styles.empty}>加载中...</div>
            )}
            {!loading && privateCombos.length === 0 && renderEmpty('私有')}
            {privateCombos.map(renderComboCard)}
          </div>
        </Card>

        {/* Shared combos */}
        <Card>
          <div className={styles.cardHead}>
            <div className={styles.cardHeadL}>
              <div className={styles.hdIc}>
                <ListIcon />
              </div>
              <div>
                <Eyebrow>SHARED</Eyebrow>
                <h3 className={styles.cardTitle}>
                  共享 <span className={styles.song}>组合</span>
                </h3>
              </div>
            </div>
          </div>
          <div className={styles.comboList}>
            {loading && sharedCombos.length === 0 && (
              <div className={styles.empty}>加载中...</div>
            )}
            {!loading && sharedCombos.length === 0 && renderEmpty('共享')}
            {sharedCombos.map(renderComboCard)}
          </div>
        </Card>
      </div>

      {/* Create/Edit modal */}
      <Modal
        title={editing ? '编辑组合' : '新建组合'}
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
            placeholder="输入组合名称"
            maxLength={20}
            autoFocus
          />
        </div>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>描述</span>
          <Input.TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="可选，组合描述"
            rows={2}
            maxLength={60}
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
          <span className={styles.formLabel}>图标</span>
          <Input
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="图标名称，如 folder"
            maxLength={30}
          />
        </div>
      </Modal>
    </div>
  )
}
