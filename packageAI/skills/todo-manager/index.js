const createTodo = require('./apis/createTodo')
const listTodos = require('./apis/listTodos')
const completeTodo = require('./apis/completeTodo')
const updateTodo = require('./apis/updateTodo')
const deleteTodo = require('./apis/deleteTodo')
const searchTodos = require('./apis/searchTodos')

const skill = wx.modelContext.createSkill('/packageAI/skills/todo-manager')

skill.use(async (ctx, next) => {
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
    console.warn(`[AI Skill] Auth skipped for ${ctx.name}: ${e.message}`)
  }
  await next()
})

skill.registerAPI('createTodo', createTodo)
skill.registerAPI('listTodos', listTodos)
skill.registerAPI('completeTodo', completeTodo)
skill.registerAPI('updateTodo', updateTodo)
skill.registerAPI('deleteTodo', deleteTodo)
skill.registerAPI('searchTodos', searchTodos)

module.exports = { skill }
