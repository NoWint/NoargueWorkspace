Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Input, (data) => {
        this.setData({ input: data.input || {} })
      })
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ todo: r })
        if (r.setDate) {
          viewCtx.setRelatedPage({ query: `setDate=${r.setDate}&text=${encodeURIComponent(r.text || '')}` })
        }
      })
    }
  },
  methods: {
    onTapEdit() {
      const input = this.data.input || {}
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [{ type: 'text', text: `修改待办内容，把 ${input.text || ''} 改为...` }]
      })
    }
  }
})
