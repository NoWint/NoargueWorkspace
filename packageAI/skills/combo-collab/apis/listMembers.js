const { request } = require('../utils')
async function listMembers({ comboId }) {
  try {
    const res = await request('GET', `/combos/${comboId}/members`)
    return {
      isError: false,
      content: [{ type: 'text', text: `该组合共有 ${res.data?.length || 0} 位成员` }],
      structuredContent: { members: res.data || [], comboId }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取成员列表失败' }] }
  }
}
module.exports = listMembers
