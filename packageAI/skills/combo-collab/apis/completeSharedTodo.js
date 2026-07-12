const { request } = require('../utils')
async function completeSharedTodo({ comboId, todoId, completed }) {
  try {
    await request('PUT', `/collab/shared/${comboId}/todos/${todoId}/complete`, { completed })
    const status = completed ? '已完成' : '已取消完成'
    return { isError: false, content: [{ type: 'text', text: `共享待办${status}` }] }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '操作失败' }] }
  }
}
module.exports = completeSharedTodo
