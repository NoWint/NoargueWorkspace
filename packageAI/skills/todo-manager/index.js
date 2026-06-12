const createTodo = require('./apis/createTodo')
const listTodos = require('./apis/listTodos')
const completeTodo = require('./apis/completeTodo')
const updateTodo = require('./apis/updateTodo')
const deleteTodo = require('./apis/deleteTodo')
const searchTodos = require('./apis/searchTodos')

const skill = wx.modelContext.createSkill('/packageAI/skills/todo-manager')

skill.use(async (ctx, next) => {
  const token = wx.getStorageSync('token')
  if (!token) {
    const { code } = await wx.login()
    const res = await wx.request({
      url: 'https://api.yzjtiantian.cn/auth/login',
      method: 'POST',
      data: { code }
    })
    if (res.data && res.data.token) {
      wx.setStorageSync('token', res.data.token)
    }
  }
  console.log(`[AI Skill] Executing: ${ctx.name}`)
  await next()
})

skill.registerAPI('createTodo', createTodo)
skill.registerAPI('listTodos', listTodos)
skill.registerAPI('completeTodo', completeTodo)
skill.registerAPI('updateTodo', updateTodo)
skill.registerAPI('deleteTodo', deleteTodo)
skill.registerAPI('searchTodos', searchTodos)

module.exports = { skill }
