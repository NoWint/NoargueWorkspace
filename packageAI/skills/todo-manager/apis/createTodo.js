const { request } = require('../utils')

async function createTodo({ text, setDate, setTime, remarks, tags }) {
  if (!text || text.trim() === '') {
    return {
      isError: true,
      content: [{ type: 'text', text: '待办内容不能为空，请提供待办的具体事项' }]
    }
  }
  try {
    const now = Date.now()
    const todoId = `todo_${now}_${Math.random().toString(36).slice(2, 8)}`
    const newTodo = {
      id: todoId,
      text: text.trim(),
      setDate: setDate || new Date().toISOString().slice(0, 10),
      setTime: setTime || '12:00',
      remarks: remarks || '',
      completed: false,
      isStar: false,
      time: now,
      tags: tags || [],
      version: 1,
      isDeleted: false,
      updatedAt: now
    }
    await request('POST', '/todos/create', newTodo)
    const todos = wx.getStorageSync('todos') || []
    todos.push(newTodo)
    wx.setStorageSync('todos', todos)
    return {
      isError: false,
      content: [{ type: 'text', text: `已为您创建待办「${text.trim()}」，日期 ${newTodo.setDate} ${newTodo.setTime}。请告知用户创建成功，并询问是否需要继续添加其他待办。` }],
      structuredContent: newTodo
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: '创建待办失败，可能是网络问题。请先告诉用户创建失败，引导用户稍后重试，不要再以相同数据重复调用本接口。' }]
    }
  }
}

module.exports = createTodo
