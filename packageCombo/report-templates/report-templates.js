const { reportTemplateApi, combosApi } = require('../../utils/api.js');
const logger = require('../../utils/logger.js');

const PRESET_DAILY = [
  { key: 'completed', title: '今日完成', sort_order: 1, max_lines: 20 },
  { key: 'in_progress', title: '进行中', sort_order: 2, max_lines: 20 },
  { key: 'blocked', title: '遇到的问题', sort_order: 3, max_lines: 20 },
  { key: 'tomorrow_plan', title: '明日计划', sort_order: 4, max_lines: 20 },
  { key: 'summary', title: '总结与思考', sort_order: 5, max_lines: 20 },
];

const PRESET_WEEKLY = [
  { key: 'completed', title: '本周完成', sort_order: 1, max_lines: 20 },
  { key: 'in_progress', title: '进行中', sort_order: 2, max_lines: 20 },
  { key: 'blocked', title: '遇到的问题', sort_order: 3, max_lines: 20 },
  { key: 'next_plan', title: '下周计划', sort_order: 4, max_lines: 20 },
  { key: 'summary', title: '总结与思考', sort_order: 5, max_lines: 20 },
];

Page({
  data: {
    comboId: 0,
    comboName: '',
    currentType: 'daily',
    dailySections: [],
    weeklySections: [],
  },

  onLoad(options) {
    const { combo_id } = options;
    const initType = (options.type === 'daily' || options.type === 'weekly') ? options.type : 'daily';
    this.setData({
      comboId: parseInt(combo_id || 0),
      currentType: initType,
      // Start with presets immediately so the UI is never empty
      dailySections: JSON.parse(JSON.stringify(PRESET_DAILY)),
      weeklySections: JSON.parse(JSON.stringify(PRESET_WEEKLY)),
    });
    this.loadData();
  },

  async loadData() {
    const { comboId } = this.data;
    try {
      const [comboResult, templateResult] = await Promise.all([
        comboId > 0 ? combosApi.getById(comboId) : Promise.resolve(null),
        reportTemplateApi.getList({ combo_id: comboId }),
      ]);
      if (comboResult && comboResult.success) {
        this.setData({ comboName: comboResult.combo.name });
      }
      if (templateResult.success) {
        const templates = templateResult.data || [];
        const daily = templates.find(t => t.type === 'daily')?.sections;
        const weekly = templates.find(t => t.type === 'weekly')?.sections;
        // Only override presets if saved templates exist
        if (daily && daily.length > 0) {
          this.setData({ dailySections: daily });
        }
        if (weekly && weekly.length > 0) {
          this.setData({ weeklySections: weekly });
        }
      }
    } catch (err) { logger.error('TEMPLATE', 'LOAD', '加载模板失败', err); }
  },

  onTypeChange(e) { this.setData({ currentType: e.detail.value }); },

  onSectionTitleInput(e) {
    const { type, index } = e.currentTarget.dataset;
    const value = e.detail.value;
    const key = type === 'daily' ? 'dailySections' : 'weeklySections';
    const sections = [...this.data[key]];
    if (sections[index]) {
      sections[index] = { ...sections[index], title: value };
      this.setData({ [key]: sections });
    }
  },

  addSection(e) {
    const type = e.currentTarget.dataset.type;
    const key = type === 'daily' ? 'dailySections' : 'weeklySections';
    const sections = [...this.data[key]];
    let counter = 1;
    while (sections.some(s => s.key === `custom_${counter}`)) counter++;
    sections.push({ key: `custom_${counter}`, title: '新段落', sort_order: sections.length + 1, max_lines: 20 });
    this.setData({ [key]: sections });
  },

  deleteSection(e) {
    const { type, index } = e.currentTarget.dataset;
    const key = type === 'daily' ? 'dailySections' : 'weeklySections';
    let sections = [...this.data[key]];
    wx.showModal({
      title: '删除确认',
      content: `确定删除"${sections[index]?.title || '此 section'}"吗？`,
      success: (res) => {
        if (res.confirm) {
          sections.splice(index, 1);
          sections = sections.map((s, i) => ({ ...s, sort_order: i + 1 }));
          this.setData({ [key]: sections });
        }
      }
    });
  },

  async saveTemplates() {
    const { comboId, dailySections, weeklySections } = this.data;
    try {
      await Promise.all([
        reportTemplateApi.upsert({ combo_id: comboId, type: 'daily', sections: dailySections }),
        reportTemplateApi.upsert({ combo_id: comboId, type: 'weekly', sections: weeklySections }),
      ]);
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      logger.error('TEMPLATE', 'SAVE', '保存模板失败', err);
    }
  },

});
