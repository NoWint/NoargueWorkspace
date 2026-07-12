Component({
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const viewCtx = wx.modelContext.getViewContext(this)
      modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const r = data.result.structuredContent || {}
        this.setData({ items: r })
        if (r.combos && r.combos.length > 0) {
          viewCtx.setRelatedPage({ query: `id=${r.combos[0].id}` })
        }
      })
    }
  },
  methods: {
    onTapCombo(e) {
      const comboId = e.currentTarget.dataset.id
      const name = e.currentTarget.dataset.name
      if (!comboId) return
      wx.modelContext.getContext().sendFollowUpMessage({
        content: [
          { type: 'text', text: `查看组合「${name}」的详情` },
          {
            type: 'api/call',
            data: {
              name: 'getComboDetail',
              arguments: { comboId }
            }
          }
        ]
      })
    }
  }
})
