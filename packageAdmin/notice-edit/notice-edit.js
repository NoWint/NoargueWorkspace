const { adminApi } = require('../../utils/api');

Page({
  data: {
    index: null,
    noticeType: 'custom',
    viewMode: 'edit',
    form: {
      title: '',
      date: '',
      content: '',
      version: ''
    }
  },

  onLoad(options) {
    if (options.index !== undefined) {
      this.setData({ index: parseInt(options.index) });
      this.loadNotice(parseInt(options.index));
    } else {
      this.setDefaultDate();
    }
  },

  setDefaultDate() {
    const today = this.todayStr();
    this.setData({ 'form.date': today });
  },

  async loadNotice(index) {
    try {
      const result = await adminApi.getNotices();
      if (result.success && result.notices[index]) {
        const notice = result.notices[index];
        const noticeType = notice.version ? 'version' : 'custom';
        this.setData({ 
          noticeType,
          form: {
            title: notice.title || '',
            date: notice.date || '',
            content: notice.content || '',
            version: notice.version || ''
          }
        });
      }
    } catch (err) {
      logger.error('ADMIN', 'NOTICES', '加载公告失败', err);
    }
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      noticeType: type,
      form: {
        title: '',
        date: this.todayStr(),
        content: '',
        version: ''
      }
    });
  },

  toggleView(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  todayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  insertMd(e) {
    const type = e.currentTarget.dataset.type;
    
    const mdMap = {
      h1: '# 标题',
      h2: '## 二级标题',
      h3: '### 三级标题',
      bold: '**粗体**',
      italic: '*斜体*',
      strikethrough: '~~删除线~~',
      link: '[链接文本](url)',
      quote: '> 引用内容',
      code: '`代码`',
      ul: '- 列表项',
      ol: '1. 有序列表',
      hr: '---'
    };

    const format = mdMap[type];
    if (format) {
      wx.showToast({
        title: format,
        icon: 'none',
        duration: 2000
      });
    }
  },

  async save() {
    const { index, noticeType, form } = this.data;
    
    if (noticeType === 'custom') {
      if (!form.title || !form.content) {
        wx.showToast({ title: '标题和内容不能为空', icon: 'none' });
        return;
      }
    } else {
      if (!form.version) {
        wx.showToast({ title: '版本号不能为空', icon: 'none' });
        return;
      }
    }
    
    const saveData = noticeType === 'version'
      ? { version: form.version, date: form.date || this.todayStr() }
      : { title: form.title, date: form.date, content: form.content };
    
    try {
      let result;
      if (index !== null) {
        result = await adminApi.updateNotice(index, saveData);
      } else {
        result = await adminApi.createNotice(saveData);
      }
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: result.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      logger.error('ADMIN', 'SAVE', '保存公告失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
