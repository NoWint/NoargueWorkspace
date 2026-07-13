import { useState } from 'react'
import { Modal, message } from 'antd'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { BatchIcon } from '@/design/icons'
import { cn } from '@/lib/utils'
import styles from './BatchMode.module.css'

interface BatchModeProps {
  selectedIds: string[]
  onDone: () => void
  onCancel: () => void
}

export function BatchMode({ selectedIds, onDone, onCancel }: BatchModeProps) {
  const batchMove = useTodoStore((s) => s.batchMove)
  const combos = useComboStore((s) => s.combos)
  const [modalOpen, setModalOpen] = useState(false)
  const [moving, setMoving] = useState(false)

  const handleMove = async (comboId: number | null) => {
    setMoving(true)
    try {
      await batchMove(selectedIds, comboId)
      message.success(`已移动 ${selectedIds.length} 项`)
      setModalOpen(false)
      onDone()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '移动失败')
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.count}>已选 {selectedIds.length} 项</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={cn(styles.btn, styles.btnPri)}
            disabled={selectedIds.length === 0}
            onClick={() => setModalOpen(true)}
          >
            <BatchIcon className={styles.btnIcon} />
            移动到组合
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>

      <Modal
        title="选择目标组合"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 420 }}
      >
        <div className={styles.targetList}>
          <button
            type="button"
            className={styles.targetBtn}
            onClick={() => handleMove(null)}
            disabled={moving}
          >
            移出组合
          </button>
          {combos.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.targetBtn}
              onClick={() => handleMove(c.id)}
              disabled={moving}
            >
              <span className={styles.targetDot} style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
