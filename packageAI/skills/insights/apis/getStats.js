async function getStats({ days }) {
  const d = days || 7
  const todos = (wx.getStorageSync('todos') || []).filter(t => !t.isDeleted)
  const now = Date.now()
  const cutoff = now - d * 86400000
  const recent = todos.filter(t => (t.time || 0) >= cutoff)
  const completed = recent.filter(t => t.completed).length
  const rate = recent.length > 0 ? Math.round(completed / recent.length * 100) : 0
  return {
    isError: false,
    content: [{ type: 'text', text: `最近 ${d} 天：共 ${recent.length} 条，完成 ${completed} 条，完成率 ${rate}%` }],
    structuredContent: { total: recent.length, completed, rate, days: d }
  }
}
module.exports = getStats
