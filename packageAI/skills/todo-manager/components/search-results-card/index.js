Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ items: r })
        if (r.keyword) {
          viewCtx.setRelatedPage({ query: 'keyword=' + encodeURIComponent(r.keyword) })
        }
      })
    }
  }
})
