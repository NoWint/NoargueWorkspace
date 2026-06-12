const getCalendar = require('./apis/getCalendar')
const getStats = require('./apis/getStats')
const getStarredTodos = require('./apis/getStarredTodos')
const getDeletedTodos = require('./apis/getDeletedTodos')
const restoreTodo = require('./apis/restoreTodo')
const getMotivation = require('./apis/getMotivation')
const getFoodSuggestion = require('./apis/getFoodSuggestion')

const skill = wx.modelContext.createSkill('/packageAI/skills/insights')

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
  await next()
})

skill.registerAPI('getCalendar', getCalendar)
skill.registerAPI('getStats', getStats)
skill.registerAPI('getStarredTodos', getStarredTodos)
skill.registerAPI('getDeletedTodos', getDeletedTodos)
skill.registerAPI('restoreTodo', restoreTodo)
skill.registerAPI('getMotivation', getMotivation)
skill.registerAPI('getFoodSuggestion', getFoodSuggestion)

module.exports = { skill }
