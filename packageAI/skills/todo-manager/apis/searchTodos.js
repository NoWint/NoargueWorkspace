async function searchTodos({ keyword }) {
  if (!keyword || !keyword.trim()) {
    return { isError: true, content: [{ type: 'text', text: '请提供搜索关键词' }] }
  }
  const todos = wx.getStorageSync('todos') || []
  const kw = keyword.toLowerCase()
  const results = todos.filter(t =>
    !t.isDeleted && (
      t.text.toLowerCase().includes(kw) ||
      (t.remarks || '').toLowerCase().includes(kw)
    )
  )
  return {
    isError: false,
    content: [{ type: 'text', text: `已搜索「${keyword}」，找到 ${results.length} 条匹配的待办。请向用户展示搜索结果，并告知可以输入更精确的关键词重新搜索。` }],
    structuredContent: { keyword, todos: results.slice(0, 20), total: results.length }
  }
}

module.exports = searchTodos
