const app = getApp();
const { tagsApi, isLoggedIn } = require('../../utils/api.js');

Page({
  data: {
    systemTags: [],
    userTags: [],
    showAddModal: false,
    editingTag: null,
    tagName: '',
    tagColor: '#4CAF50',
    isLoggedIn: false,
    
    colors: ['#2196F3', '#9C27B0', '#4CAF50', '#F44336', '#FF9800', '#607D8B', '#00BCD4', '#795548']
  },

  onLoad() {
    this.setData({ isLoggedIn: isLoggedIn() });
    this.loadTags();
  },

  onShow() {
    this.setData({ isLoggedIn: isLoggedIn() });
    this.loadTags();
  },

  async loadTags() {
    if (!isLoggedIn()) {
      this.setData({
        systemTags: app.globalData.systemTags || [],
        userTags: []
      });
      return;
    }
    
    try {
      const result = await tagsApi.getList();
      const tags = result.tags || result || [];
      const systemTags = tags.filter(t => t.isSystem || t.is_system);
      const userTags = tags.filter(t => !t.isSystem && !t.is_system);
      
      this.setData({ systemTags, userTags });
      app.globalData.userTags = userTags;
    } catch (err) {
      logger.error('ADMIN', 'TAGS', '加载标签失败', err);
      this.setData({
        systemTags: app.globalData.systemTags || [],
        userTags: app.globalData.userTags || []
      });
    }
  },

  showAddTag() {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '创建标签需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    
    this.setData({
      showAddModal: true,
      editingTag: null,
      tagName: '',
      tagColor: '#4CAF50'
    });
  },

  editTag(e) {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '编辑标签需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    
    const tag = e.currentTarget.dataset.tag;
    this.setData({
      showAddModal: true,
      editingTag: tag,
      tagName: tag.name,
      tagColor: tag.color
    });
  },

  onNameInput(e) {
    this.setData({ tagName: e.detail.value });
  },

  selectColor(e) {
    this.setData({ tagColor: e.currentTarget.dataset.color });
  },

  closeModal() {
    this.setData({ showAddModal: false, editingTag: null });
  },

  goLogin() {
    wx.navigateTo({ url: '/packagePages/login/login' });
  },

  async saveTag() {
    const { tagName, tagColor, editingTag } = this.data;
    
    if (!tagName.trim()) {
      wx.showToast({ title: '请输入标签名称', icon: 'none' });
      return;
    }
    
    if (tagName.trim().length > 10) {
      const exceed = tagName.trim().length - 10;
      wx.showToast({
        title: `标签名称已超过10字上限，当前${tagName.trim().length}字，需删除${exceed}字`,
        icon: 'none',
        duration: 3000
      });
      return;
    }

    try {
      if (editingTag) {
        await tagsApi.update(editingTag.id, {
          name: tagName.trim(),
          color: tagColor
        });
        wx.showToast({ title: '已保存', icon: 'success' });
      } else {
        await tagsApi.create({
          name: tagName.trim(),
          color: tagColor
        });
        wx.showToast({ title: '已添加', icon: 'success' });
      }
      
      this.closeModal();
      this.loadTags();
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  async deleteTag(e) {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '删除标签需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
        }
      });
      return;
    }
    
    const tag = e.currentTarget.dataset.tag;
    
    wx.showModal({
      title: '删除标签',
      content: `确定删除「${tag.name}」标签吗？`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await tagsApi.delete(tag.id);
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadTags();
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
