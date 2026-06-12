Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        this.setData({ items: data.result.structuredContent || {} })
      })
    }
  },
  methods: {
    onTapRestore(e) {
      const todoId = e.currentTarget.dataset.id
      const text = e.currentTarget.dataset.text
      if (!todoId) return
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [
          { type: 'text', text: `恢复待办「${text}」` },
          {
            type: 'api/call',
            data: {
              name: 'restoreTodo',
              arguments: { todoId }
            }
          }
        ]
      })
    }
  }
})
