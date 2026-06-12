const { request } = require('../utils')

async function updateTodo({ todoId, text, setDate, setTime, remarks }) {
  try {
    const todos = wx.getStorageSync('todos') || []
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return { isError: true, content: [{ type: 'text', text: '未找到该待办' }] }
    if (text) todo.text = text
    if (setDate) todo.setDate = setDate
    if (setTime) todo.setTime = setTime
    if (remarks !== undefined) todo.remarks = remarks
    todo.version = (todo.version || 1) + 1
    todo.updatedAt = Date.now()
    await request('PUT', `/todos/${todoId}`, todo)
    wx.setStorageSync('todos', todos)
    return {
      isError: false,
      content: [{ type: 'text', text: `已更新待办「${todo.text}」` }]
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '编辑失败，请稍后重试' }] }
  }
}

module.exports = updateTodo
