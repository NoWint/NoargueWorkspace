const createTodo = require('./apis/createTodo')
const listTodos = require('./apis/listTodos')
const completeTodo = require('./apis/completeTodo')
const updateTodo = require('./apis/updateTodo')
const deleteTodo = require('./apis/deleteTodo')
const searchTodos = require('./apis/searchTodos')

const skill = wx.modelContext.createSkill('/packageAI/skills/todo-manager')

skill.use(async (ctx, next) => {
  const start = Date.now()
  try {
    const token = wx.getStorageSync('token')
    if (!token) {
      const loginRes = await wx.login()
      if (loginRes && loginRes.code) {
        const res = await wx.request({
          url: 'https://api.yzjtiantian.cn/auth/login',
          method: 'POST',
          data: { code: loginRes.code }
        })
        if (res.data && res.data.token) {
          wx.setStorageSync('token', res.data.token)
        }
      }
    }
  } catch (e) {
    logger.warn('AI', 'AUTH', 'AI技能鉴权跳过', { name: ctx.name, msg: e.message });
  }
  try {
    await next()
    logger.info('AI', 'SKILL', 'AI技能执行成功', { name: ctx.name, ms: Date.now() - start });
  } catch (err) {
    logger.error('AI', 'SKILL', 'AI技能执行失败', { name: ctx.name, ms: Date.now() - start, err: err.message });
    throw err
  }
})

skill.registerAPI('createTodo', createTodo)
skill.registerAPI('listTodos', listTodos)
skill.registerAPI('completeTodo', completeTodo)
skill.registerAPI('updateTodo', updateTodo)
skill.registerAPI('deleteTodo', deleteTodo)
skill.registerAPI('searchTodos', searchTodos)

module.exports = { skill }
