Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ items: r })
        if (r.id) viewCtx.setRelatedPage({ query: `id=${r.id}` })
      })
    }
  },
  methods: {
    onTapCompleteSharedTodo(e) {
      const todoId = e.currentTarget.dataset.id
      const comboId = e.currentTarget.dataset.comboid
      if (!todoId || !comboId) return
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [
          { type: 'text', text: '完成共享待办' },
          {
            type: 'api/call',
            data: {
              name: 'completeSharedTodo',
              arguments: { comboId, todoId, completed: true }
            }
          }
        ]
      })
    }
  }
})
