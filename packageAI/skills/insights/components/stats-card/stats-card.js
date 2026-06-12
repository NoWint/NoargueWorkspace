Component({
  lifetimes: {
    created() {
      wx.modelContext.getContext(this).on(wx.modelContext.NotificationType.Result, (data) => {
        this.setData(data.result.structuredContent || {})
      })
    }
  }
})
