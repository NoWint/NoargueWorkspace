Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Input, (data) => {
        const input = data.input || {}
        const query = []
        if (input.date) query.push(`date=${input.date}`)
        if (input.tagId) query.push(`tagId=${input.tagId}`)
        if (input.keyword) query.push(`keyword=${encodeURIComponent(input.keyword)}`)
        viewCtx.setRelatedPage({ query: query.join('&') })
      })
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        this.setData({ items: data.result.structuredContent || {} })
      })
    }
  },
  methods: {
    onTapTodo(e) {
      const todoId = e.currentTarget.dataset.id
      const text = e.currentTarget.dataset.text
      if (!todoId) return
      const modelCtx = wx.modelContext.getContext()
      modelCtx.sendFollowUpMessage({
        content: [
          { type: 'text', text: `查看待办「${text}」的详情` },
          {
            type: 'api/call',
            data: {
              name: 'listTodos',
              arguments: { keyword: text }
            }
          }
        ]
      })
    },
    onTapComplete(e) {
      const todoId = e.currentTarget.dataset.id
      if (!todoId) return
      const modelCtx = wx.modelContext.getContext()
      modelCtx.sendFollowUpMessage({
        content: [
          { type: 'text', text: '帮我完成这个待办' },
          {
            type: 'api/call',
            data: {
              name: 'completeTodo',
              arguments: { todoId, completed: true }
            }
          }
        ]
      })
    }
  }
})
