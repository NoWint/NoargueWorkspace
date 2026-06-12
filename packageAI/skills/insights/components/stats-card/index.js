Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        this.setData({ items: data.result.structuredContent || {} })
      })
    }
  }
})
