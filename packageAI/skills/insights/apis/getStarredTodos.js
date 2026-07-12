async function getStarredTodos() {
  const todos = (wx.getStorageSync('todos') || []).filter(t => !t.isDeleted && t.isStar)
  return {
    isError: false,
    content: [{ type: 'text', text: `共有 ${todos.length} 条收藏待办` }],
    structuredContent: { todos: todos.slice(0, 20), total: todos.length }
  }
}
module.exports = getStarredTodos
