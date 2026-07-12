Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ todo: r })
        if (r.id) {
          viewCtx.setRelatedPage({ query: `id=${r.id}` })
          viewCtx.preloadDetailPage({ url: `/packagePages/todo-detail/todo-detail?id=${r.id}` })
        }
      })
    }
  },
  methods: {
    onTapDetail() {
      const todoId = this.data.todo?.id
      if (!todoId) return
      wx.modelContext.getViewContext(this).openDetailPage({
        url: `/packagePages/todo-detail/todo-detail?id=${todoId}`
      })
    },
    onTapComplete() {
      const todoId = this.data.todo?.id
      const completed = !this.data.todo?.completed
      if (!todoId) return
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [
          { type: 'text', text: completed ? '帮我完成这个待办' : '取消完成这个待办' },
          {
            type: 'api/call',
            data: {
              name: 'completeTodo',
              arguments: { todoId, completed }
            }
          }
        ]
      })
    },
    onTapDelete() {
      const todoId = this.data.todo?.id
      if (!todoId) return
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [
          { type: 'text', text: '删除这个待办' },
          {
            type: 'api/call',
            data: {
              name: 'deleteTodo',
              arguments: { todoId }
            }
          }
        ]
      })
    }
  }
})
