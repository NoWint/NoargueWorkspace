Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ items: r, hasDays: r.days ? Object.keys(r.days).length > 0 : false })
        if (r.year && r.month) {
          viewCtx.setRelatedPage({ query: `year=${r.year}&month=${r.month}` })
        }
      })
    }
  },
  methods: {
    onTapDay(e) {
      const date = e.currentTarget.dataset.date
      if (!date) return
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [
          { type: 'text', text: `查看 ${date} 的待办` },
          {
            type: 'api/call',
            data: {
              name: 'listTodos',
              arguments: { date }
            }
          }
        ]
      })
    }
  }
})
