const skill = wx.modelContext.createSkill('/packageAI/skills/combo-collab')

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

module.exports = { skill }
