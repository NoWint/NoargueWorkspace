Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ items: r })
        if (r.comboId) {
          viewCtx.setRelatedPage({ query: 'id=' + r.comboId })
        }
      })
    }
  }
})
