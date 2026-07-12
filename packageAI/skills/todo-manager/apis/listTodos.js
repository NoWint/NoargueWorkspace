async function listTodos({ date, completed, tagId, isStar, keyword }) {
  let todos = wx.getStorageSync('todos') || []
  todos = todos.filter(t => !t.isDeleted)
  if (date) todos = todos.filter(t => t.setDate === date)
  if (completed !== undefined) todos = todos.filter(t => t.completed === completed)
  if (tagId) todos = todos.filter(t => (t.tags || []).includes(tagId))
  if (isStar) todos = todos.filter(t => t.isStar)
  if (keyword) {
    const kw = keyword.toLowerCase()
    todos = todos.filter(t => t.text.toLowerCase().includes(kw) || (t.remarks || '').toLowerCase().includes(kw))
  }
  todos.sort((a, b) => (b.time || 0) - (a.time || 0))
  const total = todos.length
  const completedCount = todos.filter(t => t.completed).length
  return {
    isError: false,
    content: [{ type: 'text', text: `当前共有 ${total} 条待办，已完成 ${completedCount} 条。请向用户展示待办列表卡片，并引导用户选择需要操作的待办。` }],
    structuredContent: { todos: todos.slice(0, 20), total, completedCount }
  }
}

module.exports = listTodos
