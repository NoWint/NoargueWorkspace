const { request } = require('../utils')

async function deleteTodo({ todoId }) {
  try {
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    const now = Date.now()
    todo.isDeleted = true
    todo.deletedAt = now
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = now
    await request('DELETE', `/todos/${todoId}`)
    wx.setStorageSync('todos', todos)
    return {
      isError: false,
      content: [{ type: 'text', text: `已删除「${todo.text}」，可在回收站中找回` }]
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '删除失败，请稍后重试' }] }
  }
}

module.exports = deleteTodo
