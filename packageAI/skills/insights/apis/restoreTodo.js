const { request } = require('../utils')
async function restoreTodo({ todoId }) {
  try {
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    todo.isDeleted = false
    todo.deletedAt = null
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = Date.now()
    await request('POST', `/todos/restore/${todoId}`)
    wx.setStorageSync('todos', todos)
    return { isError: false, content: [{ type: 'text', text: `已恢复「${todo.text}」` }] }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '恢复失败' }] }
  }
}
module.exports = restoreTodo
