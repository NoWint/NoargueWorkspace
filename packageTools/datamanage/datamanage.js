const app = getApp();
const { isLoggedIn } = require('../../utils/api.js');
const { syncWithCloud } = require('../../utils/sync.js');

Page({
  data: {
    exportData: "",
    importData: "",
    qrcodePath: "",
    isShare: 0,
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  onShareAppMessage() {
    const dateStr = this.formatDate(new Date())
    return {
      title: `${dateStr} 待办数据导出`,
      path: `/packageTools/datamanage/datamanage?isShare=1&data=${encodeURIComponent(this.data.exportData)}`,
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onLoad(options) {
    if (options.isShare === '1') {
      wx.setNavigationBarTitle({
        title: `待办数据备份`
      })
      this.setData({
        importData: decodeURIComponent(options.data || ''),
        isShare: options.isShare,
      })
    }
  },

  generateExport() {
    const todos = wx.getStorageSync('todos') || []
    const activeTodos = todos.filter(t => !t.isDeleted)
    const compressed = activeTodos.map(t => [
      t.id,
      t.text,
      t.setDate,
      t.setTime || '12:00',
      t.completed,
      t.remarks || null,
      t.location || null,
      t.isStar || false,
      t.time || null,
      t.tags || [],
      t.comboId || null,
      t.version || 1,
      t.updatedAt || null,
      t.isDeleted || false,
      t.deletedAt || null,
      t.images || []
    ])
    this.setData({ exportData: JSON.stringify(compressed) })
  },

  // 新增复制方法
  copyData() {
    wx.setClipboardData({
      data: this.data.exportData,
      success: () => wx.showToast({ title: '已复制' })
    })
  },

  handleImport(e) {
    if (!this.data.importData) {
      wx.showToast({ title: '请输入数据', icon: 'none' });
      return;
    }
    const mode = e.currentTarget.dataset.mode;
    
    wx.showModal({
      title: '操作确认',
      content: `确定要${mode === 'overwrite' ? '覆盖' : '合并'}数据吗？该操作不可撤销`,
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            const compressedData = JSON.parse(this.data.importData)
            const now = Date.now();
            const newData = compressedData.map(arr => {
              const hasFullFields = arr.length > 8;
              
              if (hasFullFields) {
                const originalUpdatedAt = arr[12] || now;
                return {
                  id: arr[0] || `todo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                  text: arr[1] || '',
                  setDate: arr[2],
                  setTime: arr[3] || '12:00',
                  completed: arr[4],
                  remarks: arr[5] || '',
                  location: arr[6] || null,
                  isStar: arr[7] || false,
                  time: arr[8] || now,
                  tags: arr[9] || [],
                  comboId: arr[10] || null,
                  version: (arr[11] || 1) + 1,
                  updatedAt: originalUpdatedAt,
                  isDeleted: arr[13] || false,
                  deletedAt: arr[14] || null,
                  images: arr[15] || []
                };
              } else {
                return {
                  id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                  text: arr[0] || '',
                  setDate: arr[1],
                  setTime: arr[2] || '12:00',
                  completed: arr[3],
                  remarks: arr[4] || '',
                  location: arr[5] || null,
                  isStar: arr[6] || false,
                  time: arr[7] || now,
                  tags: [],
                  comboId: null,
                  version: 2,
                  updatedAt: now,
                  isDeleted: false,
                  deletedAt: null,
                  images: []
                };
              }
            })
            
            const oldData = wx.getStorageSync('todos') || []
            
            let finalData;
            if (mode === 'overwrite') {
              finalData = newData;
            } else {
              const oldDataMap = new Map();
              oldData.forEach(item => {
                oldDataMap.set(item.id, item);
              });
              
              newData.forEach(newItem => {
                const existingItem = oldDataMap.get(newItem.id);
                
                if (!existingItem) {
                  oldDataMap.set(newItem.id, newItem);
                } else {
                  const existingVersion = existingItem.version || 1;
                  const existingUpdatedAt = existingItem.updatedAt || existingItem.time || 0;
                  const newVersion = newItem.version || 1;
                  const newUpdatedAt = newItem.updatedAt || newItem.time || 0;
                  
                  if (newVersion > existingVersion || newUpdatedAt > existingUpdatedAt) {
                    oldDataMap.set(newItem.id, newItem);
                  }
                }
              });
              
              finalData = Array.from(oldDataMap.values());
            }

            wx.setStorageSync('todos', finalData);
            app.updateCalendarCache(finalData.filter(t => !t.isDeleted));
            
            if (isLoggedIn()) {
              wx.showLoading({ title: '同步中...', mask: true });
              try {
                await syncWithCloud('merge');
                wx.hideLoading();
                wx.showToast({ title: `已${mode === 'overwrite' ? '覆盖' : '合并'}并同步`, icon: 'success' });
              } catch (syncErr) {
                wx.hideLoading();
                logger.error('SYNC', 'SYNC', '数据导入同步失败', syncErr);
                wx.showToast({ title: '同步失败，请手动刷新', icon: 'none', duration: 2000 });
              }
            } else {
              wx.showToast({ title: `已${mode === 'overwrite' ? '覆盖' : '合并'}${newData.length}条`, icon: 'success' });
            }
          } catch (e) {
            logger.error('STORAGE', 'IMPORT', '导入数据解析失败', e);
            wx.showToast({ title: '数据格式错误', icon: 'error' });
          }
        }
      }
    })
  },

  // 新增输入处理方法
  handleInput(e) {
    this.setData({
      importData: e.detail.value
    })
  },
})
