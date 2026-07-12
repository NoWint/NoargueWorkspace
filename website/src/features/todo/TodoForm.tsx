import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, DatePicker, TimePicker, Form, message, Button as AntButton } from 'antd'
import dayjs from 'dayjs'
import type { Todo } from '@/types'
import { useTodoStore } from '@/stores/todos'
import { useComboStore } from '@/stores/combos'
import { useTagStore } from '@/stores/tags'
import { todosApi } from '@/api/todos'
import { Button, Card, Eyebrow, Tag } from '@/design/primitives'
import { todayStr } from '@/lib/utils'
import styles from './TodoForm.module.css'

interface TodoFormProps {
  mode: 'create' | 'edit'
}

export function TodoForm({ mode }: TodoFormProps) {
  const navigate = useNavigate()
  const { id } = useParams()
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const combos = useComboStore((s) => s.combos)
  const { systemTags, userTags, fetchTags } = useTagStore()

  const [form] = Form.useForm()
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedCombo, setSelectedCombo] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)

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
          setSelectedTags(t.tags || [])
          setSelectedCombo(t.comboId)
        }
      })
    } else {
      form.setFieldsValue({ setDate: dayjs(todayStr()) })
    }
  }, [mode, id])

  const allTags = [...systemTags, ...userTags]

  const handleSubmit = async (values: {
    text: string
    remarks?: string
    setDate?: dayjs.Dayjs
    setTime?: dayjs.Dayjs
  }) => {
    setLoading(true)
    try {
      const data: Partial<Todo> = {
        text: values.text,
        remarks: values.remarks,
        setDate: values.setDate?.format('YYYY-MM-DD'),
        setTime: values.setTime?.format('HH:mm'),
        tags: selectedTags,
        comboId: selectedCombo,
      }
      if (mode === 'create') {
        await createTodo(data)
        message.success('创建成功')
      } else if (id) {
        await updateTodo(id, data)
        message.success('更新成功')
      }
      navigate('/')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <Eyebrow>{mode === 'create' ? 'NEW' : 'EDIT'}</Eyebrow>
          <h1 className={styles.title}>
            {mode === 'create' ? '新建' : '编辑'}
            <span className={styles.song}> 待办</span>
          </h1>
        </div>
        <Button variant="gh" size="sm" onClick={() => navigate(-1)}>← 返回</Button>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="内容" name="text" rules={[{ required: true, message: '请输入待办内容' }]}>
            <Input placeholder="待办内容" />
          </Form.Item>

          <div className={styles.row}>
            <Form.Item label="日期" name="setDate" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="时间" name="setTime" style={{ flex: 1 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>

          <div className={styles.section}>
            <div className={styles.secLabel}>组合</div>
            <div className={styles.tags}>
              <button
                className={[styles.comboBtn, !selectedCombo && styles.comboAct].filter(Boolean).join(' ')}
                onClick={() => setSelectedCombo(undefined)}
                type="button"
              >
                无
              </button>
              {combos.map((c) => (
                <button
                  key={c.id}
                  className={[styles.comboBtn, selectedCombo === c.id && styles.comboAct].filter(Boolean).join(' ')}
                  onClick={() => setSelectedCombo(c.id)}
                  type="button"
                >
                  <span className={styles.dot} style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.secLabel}>标签</div>
            <div className={styles.tags}>
              {allTags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.tagBtn}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                    )
                  }}
                >
                  <Tag tone={selectedTags.includes(t.id) ? 'pri' : 'default'}>{t.name}</Tag>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <AntButton type="primary" htmlType="submit" loading={loading}>
              {mode === 'create' ? '创建' : '保存'}
            </AntButton>
            <AntButton onClick={() => navigate(-1)}>取消</AntButton>
          </div>
        </Form>
      </Card>
    </div>
  )
}
