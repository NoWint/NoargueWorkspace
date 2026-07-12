const { request } = require('../utils')
async function listCombos({ type }) {
  try {
    const res = await request('GET', '/combos/list')
    let combos = res.data || []
    if (type === 'private') combos = combos.filter(c => !c.is_shared)
    if (type === 'shared') combos = combos.filter(c => c.is_shared)
    return {
      isError: false,
      content: [{ type: 'text', text: `共有 ${combos.length} 个组合` }],
      structuredContent: { combos }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '获取组合列表失败' }] }
  }
}
module.exports = listCombos
