async function getCalendar({ year, month }) {
  const now = new Date()
  const y = year || now.getFullYear()
  const m = month || (now.getMonth() + 1)
  const days = {}
  const todos = (wx.getStorageSync('todos') || []).filter(t => !t.isDeleted)
  const prefix = `${y}-${String(m).padStart(2, '0')}`
  for (const t of todos) {
    if (t.setDate && t.setDate.startsWith(prefix)) {
      if (!days[t.setDate]) {
        days[t.setDate] = { count: 0, sampleText: '' }
      }
      days[t.setDate].count++
      if (!days[t.setDate].sampleText) {
        days[t.setDate].sampleText = t.text
      }
    }
  }
  return {
    isError: false,
    content: [{ type: 'text', text: `已加载 ${y} 年 ${m} 月的日历数据` }],
    structuredContent: { year: y, month: m, days }
  }
}
module.exports = getCalendar
