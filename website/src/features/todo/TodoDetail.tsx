import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Popconfirm, message } from 'antd'
import type { Todo } from '@/types'
import { todosApi } from '@/api/todos'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { Button, Card, Eyebrow, StatusChip, Tag } from '@/design/primitives'
import styles from './TodoDetail.module.css'

export function TodoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [todo, setTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(true)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const toggleStar = useTodoStore((s) => s.toggleStar)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const combos = useComboStore((s) => s.combos)

  useEffect(() => {
    if (!id) return
    todosApi.getById(id).then((res) => {
      if (res.success && res.todo) setTodo(res.todo)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.loading}>加载中...</div>
  if (!todo) return <div className={styles.loading}>未找到</div>

  const combo = combos.find((c) => c.id === todo.comboId)

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>DETAIL</Eyebrow>
          <h1 className={styles.title}>{todo.text}</h1>
        </div>
        <Button variant="gh" size="sm" onClick={() => navigate(-1)}>← 返回</Button>
      </div>

      <Card>
        <div className={styles.row}>
          <span className={styles.label}>状态</span>
          <StatusChip tone={todo.completed ? 'ok' : 'default'}>
            {todo.completed ? '已完成' : '待办'}
          </StatusChip>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>日期</span>
          <span>{todo.setDate || '未设置'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>时间</span>
          <span>{todo.setTime || '未设置'}</span>
        </div>
        {combo && (
          <div className={styles.row}>
            <span className={styles.label}>组合</span>
            <Tag tone="pri">{combo.name}</Tag>
          </div>
        )}
        {todo.remarks && (
          <div className={styles.row}>
            <span className={styles.label}>备注</span>
            <span className={styles.remarks}>{todo.remarks}</span>
          </div>
        )}
      </Card>

      <div className={styles.actions}>
        <Button
          variant="pri"
          onClick={() => toggleComplete(todo.id).then(() => navigate('/'))}
        >
          {todo.completed ? '标记未完成' : '标记完成'}
        </Button>
        <Button variant="sec" onClick={() => navigate(`/todos/${todo.id}/edit`)}>
          编辑
        </Button>
        <Button variant="gh" onClick={() => toggleStar(todo.id)}>
          {todo.isStar ? '取消收藏' : '收藏'}
        </Button>
        <Popconfirm
          title="确定删除此待办吗？"
          onConfirm={async () => {
            await deleteTodo(todo.id)
            message.success('已删除')
            navigate('/')
          }}
        >
          <Button variant="gh">删除</Button>
        </Popconfirm>
      </div>
    </div>
  )
}
