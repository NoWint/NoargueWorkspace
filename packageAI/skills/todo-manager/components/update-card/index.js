Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        this.setData({ result: data.result })
        viewCtx.setRelatedPage({ path: '/pages/todo/todo' })
      })
    }
  }
})
