import ActionSheet, { ActionSheetTheme } from 'tdesign-miniprogram/action-sheet';
const { configApi } = require('../../utils/api.js');

Page({
  data: {
    drawerVisible: false,
    drawerItems: [],
    currentCategory: {
      id: '',
      label: '',
      content: ''
    },
    scrollTop: 0,
    loading: true,
    guides: []
  },

  onLoad() {
    this.loadGuides();
  },

  async loadGuides() {
    try {
      const cachedGuides = wx.getStorageSync('cachedGuides');
      if (cachedGuides && cachedGuides.length > 0) {
        this.initGuides(cachedGuides);
      }

      const res = await configApi.getGuides();
      if (res.success && res.guides) {
        wx.setStorageSync('cachedGuides', res.guides);
        this.initGuides(res.guides);
      }
    } catch (err) {
      logger.error('APP', 'GUIDE', '加载指南失败', err);
      const cachedGuides = wx.getStorageSync('cachedGuides');
      if (cachedGuides && cachedGuides.length > 0) {
        this.initGuides(cachedGuides);
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败，请检查网络',
          icon: 'none'
        });
      }
    }
  },

  initGuides(guides) {
    const sortedGuides = guides.sort((a, b) => a.order - b.order);
    const drawerItems = sortedGuides.map(item => ({
      title: item.title
    }));

    this.setData({
      guides: sortedGuides,
      drawerItems,
      loading: false
    });

    if (sortedGuides.length > 0) {
      this.loadCategoryContent(sortedGuides[0].id);
    }
  },

  loadCategoryContent(categoryId) {
    const guide = this.data.guides.find(g => g.id === categoryId);
    if (!guide) return;

    this.setData({
      currentCategory: {
        id: categoryId,
        label: guide.title,
        content: guide.content
      }
    });
  },

  openDrawer() {
    this.setData({ drawerVisible: true });
  },

  onOverlayClick() {
    this.setData({ drawerVisible: false });
  },

  onDrawerClose() {
    this.setData({ drawerVisible: false });
  },

  onItemClick(e) {
    const index = e.detail.index;
    const guide = this.data.guides[index];
    
    if (guide) {
      this.loadCategoryContent(guide.id);
    }
    
    this.setData({ 
      drawerVisible: false,
      scrollTop: 0
    });
  },

  scrollToTop() {
    this.setData({ 
      scrollTop: 1
    }, () => {
      this.setData({ scrollTop: 0 });
    });
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
