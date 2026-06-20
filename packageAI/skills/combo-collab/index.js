const listCombos = require('./apis/listCombos')
const getComboDetail = require('./apis/getComboDetail')
const completeSharedTodo = require('./apis/completeSharedTodo')
const listMembers = require('./apis/listMembers')

const skill = wx.modelContext.createSkill('/packageAI/skills/combo-collab')

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
    logger.warn('AI', 'AUTH', 'AI技能鉴权跳过', { name: ctx.name, msg: e.message });
  }
  await next()
})

skill.registerAPI('listCombos', listCombos)
skill.registerAPI('getComboDetail', getComboDetail)
skill.registerAPI('completeSharedTodo', completeSharedTodo)
skill.registerAPI('listMembers', listMembers)

module.exports = { skill }
