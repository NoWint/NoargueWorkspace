async function getDeletedTodos() {
  const todos = (wx.getStorageSync('todos') || []).filter(t => t.isDeleted)
  return {
    isError: false,
    content: [{ type: 'text', text: `回收站中有 ${todos.length} 条待办` }],
    structuredContent: { todos: todos.slice(0, 20), total: todos.length }
  }
}
module.exports = getDeletedTodos
