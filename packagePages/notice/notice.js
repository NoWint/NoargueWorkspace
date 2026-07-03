import ActionSheet, { ActionSheetTheme } from 'tdesign-miniprogram/action-sheet';

const app = getApp();
const { configApi } = require('../../utils/api.js');

Page({
  data: {
    notices: [],
    loading: false
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-公告',
      path: '/packagePages/notice/notice',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },
  
  onShareTimeline() {
    return {
      title: '时光绿径待办-公告',
      path: '/packagePages/notice/notice',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onLoad() {
    this.loadNotices();
  },

  async loadNotices() {
    this.setData({ loading: true });
    
    try {
      const result = await configApi.getNotices();
      if (result.success && result.notices) {
        this.setData({ notices: result.notices });
        app.globalData.notices = result.notices;
      }
    } catch (err) {
      logger.error('NOTIFY', 'NOTICES', '获取公告失败', err);
      if (app.globalData.notices) {
        this.setData({ notices: app.globalData.notices });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  async onPullDownRefresh() {
    await this.loadNotices();
    wx.stopPullDownRefresh();
  },

  onContentTap(e) {
    const href = e.detail.node?.href;
    if (!href) return;
    
    if (href.startsWith('/') || href.startsWith('pages/') ||
        href.startsWith('packageAdmin/') || href.startsWith('packageCombo/') ||
        href.startsWith('packageTools/') || href.startsWith('packagePages/')) {
      let url = href.startsWith('/') ? href : '/' + href;
      // 兼容旧路径：/pages/{非Tab页} → /packagePages/
      const tabPages = ['/pages/todo/todo', '/pages/calendar/calendar', '/pages/stats/stats', '/pages/more/more'];
      if (url.startsWith('/pages/') && !tabPages.includes(url)) {
        url = '/packagePages/' + url.slice(7);
      }
      wx.navigateTo({ url });
      return;
    }
    
    this._currentCopyLink = href;
    
    ActionSheet.show({
      theme: ActionSheetTheme.List,
      selector: '#t-action-sheet',
      context: this,
      description: href,
      cancelText: '取消',
      items: ['复制链接'],
    });
  },

  onCopyActionSheetSelect(e) {
    const { index } = e.detail;
    const href = this._currentCopyLink;
    
    if (index === 0 && href) {
      wx.setClipboardData({
        data: href,
        success: () => {
          wx.showToast({
            title: '链接已复制到剪贴板',
            icon: 'none'
          });
        }
      });
    }
  }
});
