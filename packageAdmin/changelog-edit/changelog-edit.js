const { adminApi } = require('../../utils/api');

Page({
  data: {
    index: null,
    form: {
      version: '',
      date: '',
      content: []
    }
  },

  onLoad(options) {
    if (options.index !== undefined) {
      this.setData({ index: parseInt(options.index) });
      this.loadChangelog(parseInt(options.index));
    } else {
      this.setDefaultDate();
      this.setData({ 'form.content': [''] });
    }
  },

  setDefaultDate() {
    const today = this.todayStr();
    this.setData({ 'form.date': today });
  },

  todayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  async loadChangelog(index) {
    try {
      const result = await adminApi.getChangelog();
      if (result.success && result.changelog[index]) {
        const changelog = result.changelog[index];
        this.setData({ 
          form: {
            version: changelog.version || '',
            date: changelog.date || '',
            content: changelog.content && changelog.content.length > 0 ? changelog.content : ['']
          }
        });
      }
    } catch (err) {
      logger.error('ADMIN', 'CHANGELOG', '加载更新日志失败', err);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  showDatePicker() {
    this.selectComponent('#datePicker')?.onTap?.();
  },

  onContentInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ [`form.content[${index}]`]: e.detail.value });
  },

  addContentItem() {
    const content = [...this.data.form.content, ''];
    this.setData({ 'form.content': content });
  },

  removeContentItem(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.form.content.length <= 1) {
      wx.showToast({ title: '至少保留一条', icon: 'none' });
      return;
    }
    const content = this.data.form.content.filter((_, i) => i !== index);
    this.setData({ 'form.content': content });
  },

  async save() {
    const { index, form } = this.data;
    
    if (!form.version) {
      wx.showToast({ title: '请输入版本号', icon: 'none' });
      return;
    }
    
    const content = form.content.filter(c => c.trim());
    if (content.length === 0) {
      wx.showToast({ title: '请至少添加一条更新内容', icon: 'none' });
      return;
    }
    
    try {
      let result;
      if (index !== null) {
        result = await adminApi.updateChangelog(index, { ...form, content });
      } else {
        result = await adminApi.createChangelog({ ...form, content });
      }
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
