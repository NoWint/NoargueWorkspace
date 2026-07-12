const { request } = require('../utils')
async function getComboDetail({ comboId }) {
  try {
    const res = await request('GET', `/combos/${comboId}`)
    return {
      isError: false,
      content: [{ type: 'text', text: `组合「${res.data.name}」有 ${res.data.shared_todos?.length || 0} 条共享待办` }],
      structuredContent: res.data
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取组合详情失败' }] }
  }
}
module.exports = getComboDetail
