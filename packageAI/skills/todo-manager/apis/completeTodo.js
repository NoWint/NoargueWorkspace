const { request } = require('../utils')

async function completeTodo({ todoId, completed }) {
  try {
    const now = Date.now()
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    todo.completed = completed ? now : false
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = now
    await request('PUT', `/todos/${todoId}`, todo)
    wx.setStorageSync('todos', todos)
    const status = completed ? '已完成' : '标记为未完成'
    return {
      isError: false,
      content: [{ type: 'text', text: `已将「${todo.text}」${status}` }]
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '操作失败，请稍后重试' }] }
  }
}

module.exports = completeTodo
