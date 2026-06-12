async function getCalendar({ year, month }) {
  const now = new Date()
  const y = year || now.getFullYear()
  const m = month || (now.getMonth() + 1)
  const app = getApp()
  const cache = app.globalData.calendarCache || {}
  const prefix = `${y}-${String(m).padStart(2, '0')}`
  const days = {}
  for (const [date, info] of Object.entries(cache)) {
    if (date.startsWith(prefix)) {
      days[date] = info
    }
  }
  return {
    isError: false,
    content: [{ type: 'text', text: `已加载 ${y} 年 ${m} 月的日历数据` }],
    structuredContent: { year: y, month: m, days }
  }
}
module.exports = getCalendar
