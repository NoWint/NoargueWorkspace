const { workReportApi, reportTemplateApi, combosApi } = require('../../utils/api.js');
const { getLocalTodos } = require('../../utils/sync.js');
const logger = require('../../utils/logger.js');

const DEFAULT_SECTIONS = [
  { key: 'completed', title: '今日完成', color: '#00b26a', lines: [''] },
  { key: 'in_progress', title: '进行中', color: '#2196F3', lines: [''] },
  { key: 'blocked', title: '遇到的问题', color: '#ff9800', lines: [''] },
  { key: 'tomorrow_plan', title: '明日计划', color: '#7c4dff', lines: [''] },
  { key: 'summary', title: '总结与思考', color: '#e91e63', lines: [''] }
];

const SECTION_LABELS = {
  daily: {
    completed: '今日完成',
    in_progress: '进行中',
    blocked: '遇到的问题',
    tomorrow_plan: '明日计划',
    summary: '总结与思考'
  },
  weekly: {
    completed: '本周完成',
    in_progress: '进行中',
    blocked: '遇到的问题',
    next_plan: '下周计划',
    summary: '总结与思考'
  }
};

const SECTION_COLORS = {
  completed: '#00b26a',
  in_progress: '#2196F3',
  blocked: '#ff9800',
  tomorrow_plan: '#7c4dff',
  next_plan: '#7c4dff',
  summary: '#e91e63'
};

// 行对象生成器（稳定 ID 用于 wx:key）
let _lineSeq = Date.now();
function _makeLine(text) {
  return { id: _lineSeq++, text: String(text || '') };
}
function _makeLines(texts) {
  return (texts || ['']).map(t => _makeLine(t));
}

const app = getApp();

Page({
  data: {
    reportId: null,
    reportType: 'daily',
    reportDate: '',
    reportWeek: '',
    navTitle: '写日报',
    targetDateHint: '',

    showCalendar: false,
    calendarValue: new Date().getTime(),
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date(new Date().getFullYear() + 5, 11, 31).getTime(),
    weekOptions: [],
    weekIndex: 0,

    sections: [],
    sharedCombos: [],
    selectedComboId: null,
    selectedComboName: '私人',
    isSharedCombo: false,

    showComboPicker: false,

    showImportPopup: false,
    importTargetSection: 0,
    importTodos: { completed: [], uncompleted: [] },
    selectedImportTodos: [],
    importSearchKeyword: ''
  },

  onLoad(options) {
    _lineSeq = Date.now();

    const reportType = options.type || 'daily';
    const reportDate = options.date || this.getTodayStr();
    const comboId = options.combo_id ? Number(options.combo_id) : null;
    const reportId = options.id ? Number(options.id) : null;

    const navTitles = { daily: '写日报', weekly: '写周报' };
    wx.setNavigationBarTitle({ title: navTitles[reportType] });
    const fullDateLabel = this.formatDateWithWeekday(reportDate);
    const reportWeek = this.getWeekNumber(reportDate);
    const dateLabels = {
      daily: '日报 · ' + fullDateLabel,
      weekly: reportDate ? (() => {
        const endDate = this.addDays(reportDate, 6);
        const sm = reportDate.substring(5, 7);
        const sd = reportDate.substring(8, 10);
        const em = endDate.substring(5, 7);
        const ed = endDate.substring(8, 10);
        return `周报 · 第${reportWeek}周`;
      })() : ''
    };

    const isEdit = !!reportId;
    if (isEdit) {
      navTitles.daily = '编辑报告';
      navTitles.weekly = '编辑报告';
    }

    this.setData({
      reportType,
      reportDate,
      reportId,
      reportWeek,
      navTitle: isEdit ? navTitles[reportType] : navTitles[reportType],
      targetDateHint: dateLabels[reportType] || dateLabels.daily,
      selectedComboId: comboId,
      selectedComboName: comboId ? '加载中...' : '私人'
    });

    // 初始化周数选择器选项 & 日历预设值；reportWeek 优先级：buildWeekOptions 返回值 > 默认
    let computedWeek = reportWeek;
    if (reportType === 'weekly') {
      computedWeek = this.buildWeekOptions(reportDate);
    } else {
      const d = new Date(reportDate.replace(/-/g, '/'));
      this.setData({ calendarValue: d.getTime() });
    }
    if (computedWeek !== reportWeek) {
      this.setData({ reportWeek: computedWeek });
    }

    // 关键：先加载模板/报告，再检查草稿，避免草稿覆盖模板的时序问题
    if (isEdit) {
      this.loadReport(reportId);
    } else {
      this.loadTemplates().then(() => this.checkDraft());
    }

    this.loadCombos();
    if (isEdit) this.checkDraft(); // 编辑态不需要等 loadReport（不涉及模板覆盖）
  },

  onUnload() {
    this.saveDraft();
  },

  // ========== Draft System ==========

  getDraftKey() {
    const { reportType, reportDate, selectedComboId } = this.data;
    return `reportDraft_${reportType}_${reportDate}_${selectedComboId || 'private'}`;
  },

  saveDraft() {
    const { sections, reportType, reportDate, selectedComboId } = this.data;
    const hasContent = sections.some(s => s.lines.some(l => l && l.text && l.text.trim()));
    if (!hasContent) return;

    try {
      const draftKey = this.getDraftKey();
      const draft = {
        sections: JSON.parse(JSON.stringify(sections)),
        updatedAt: Date.now()
      };
      wx.setStorageSync(draftKey, draft);
    } catch (e) {
      logger.warn('REPORT', 'DRAFT', '保存草稿失败', e);
    }
  },

  checkDraft() {
    if (this.data.reportId) return; // 编辑态不恢复草稿
    try {
      const draftKey = this.getDraftKey();
      const draft = wx.getStorageSync(draftKey);
      if (draft && draft.sections && draft.sections.length > 0) {
        wx.showModal({
          title: '恢复草稿',
          content: '检测到上次未完成的编辑，是否恢复？',
          confirmText: '恢复',
          cancelText: '丢弃',
          success: (res) => {
            if (res.confirm) {
              const sections = (draft.sections || []).map((s, i) => ({
                ...s,
                lines: (s.lines || []).map(l => typeof l === 'string' ? _makeLine(l) : l),
                _rk: i
              }));
              this.setData({ sections });
            } else {
              this.clearDraft();
            }
          }
        });
      }
    } catch (e) {
      logger.warn('REPORT', 'DRAFT', '检查草稿失败', e);
    }
  },

  clearDraft() {
    try {
      wx.removeStorageSync(this.getDraftKey());
    } catch (e) {
      logger.warn('REPORT', 'DRAFT', '清除草稿失败', e);
    }
  },

  // ========== 日期/周数选择器 ==========

  buildWeekOptions(dateStr) {
    const d = dateStr ? new Date(dateStr.replace(/-/g, '/')) : new Date();
    const year = d.getFullYear();
    const options = [];
    // 从年首找第一个周日（可能在上一年）
    const cursor = new Date(year, 0, 1);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    const yearEnd = new Date(year, 11, 31);
    let weekNum = 1;
    while (cursor <= yearEnd) {
      const endDate = new Date(cursor);
      endDate.setDate(cursor.getDate() + 6);
      const sm = cursor.getMonth() + 1;
      const sd = cursor.getDate();
      const em = endDate.getMonth() + 1;
      const ed = endDate.getDate();
      options.push({
        label: `第${weekNum}周（${sm}月${sd}日 - ${em}月${ed}日）`,
        date: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
        weekNum
      });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
      if (weekNum > 54) break;
    }
    // 再补一周：上一周年末周日后的第一周，属于下一年的第一周
    if (options.length > 0) {
      const last = options[options.length - 1];
      const lastDate = new Date(last.date);
      lastDate.setDate(lastDate.getDate() + 7);
      if (lastDate.getFullYear() === year) {
        const endDate = new Date(lastDate);
        endDate.setDate(lastDate.getDate() + 6);
        const sm = lastDate.getMonth() + 1;
        const sd = lastDate.getDate();
        const em = endDate.getMonth() + 1;
        const ed = endDate.getDate();
        options.push({
          label: `第${weekNum}周（${sm}月${sd}日 - ${em}月${ed}日）`,
          date: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`,
          weekNum
        });
      }
    }

    // 找到当前日期对应的周索引
    let weekIndex = 0;
    const targetStr = dateStr || this.getTodayStr();
    const targetDate = new Date(targetStr.replace(/-/g, '/'));
    const targetDay = targetDate.getDay();
    const targetSunday = new Date(targetDate);
    targetSunday.setDate(targetDate.getDate() - targetDay);
    const targetSundayStr = `${targetSunday.getFullYear()}-${String(targetSunday.getMonth() + 1).padStart(2, '0')}-${String(targetSunday.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < options.length; i++) {
      if (options[i].date === targetSundayStr) {
        weekIndex = i;
        break;
      }
    }

    this.setData({
      weekOptions: options.map(o => o.label),
      _weekData: options,
      weekIndex
    });
    // 返回当前选中周的周数，供 onLoad 使用（避免 getWeekNumber 跨年错误）
    return options[weekIndex] ? options[weekIndex].weekNum : 1;
  },

  onWeekChange(e) {
    const idx = e.detail.value;
    const weekData = this.data._weekData || [];
    if (!weekData[idx]) return;
    const { date, weekNum } = weekData[idx];
    const endDate = this.addDays(date, 6);
    const sm = date.substring(5, 7);
    const sd = date.substring(8, 10);
    const em = endDate.substring(5, 7);
    const ed = endDate.substring(8, 10);
    this.setData({
      reportDate: date,
      reportWeek: weekNum,
      weekIndex: idx,
      targetDateHint: `周报 · 第${weekNum}周`
    });
    this.clearDraft();
  },

  showCalendar() {
    this.setData({ showCalendar: true });
  },

  handleCalendarConfirm(e) {
    const detail = e.detail;
    const date = new Date(detail.value || detail);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const fullDateLabel = this.formatDateWithWeekday(dateStr);
    this.setData({
      reportDate: dateStr,
      showCalendar: false,
      targetDateHint: '日报 · ' + fullDateLabel
    });
    this.clearDraft();
  },

  handleCalendarClose() {
    this.setData({ showCalendar: false });
  },

  // ========== Data Loading ==========

  async loadReport(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await workReportApi.getById(id);
      const report = res.data || res;
      if (report && report.id) {
        const sections = this.buildSectionsFromReport(report);
        const actualDate = report.periodDate || this.data.reportDate;
        const actualType = report.type || this.data.reportType;
        const reportWeek = this.getWeekNumber(actualDate);
        const fullDateLabel = this.formatDateWithWeekday(actualDate);
        const dateLabels = {
          daily: '日报 · ' + fullDateLabel,
          weekly: actualDate ? (() => {
            const endDate = this.addDays(actualDate, 6);
            const sm = actualDate.substring(5, 7);
            const sd = actualDate.substring(8, 10);
            const em = endDate.substring(5, 7);
            const ed = endDate.substring(8, 10);
            return `周报 · 第${reportWeek}周 · ${parseInt(sm)}月${parseInt(sd)}日-${parseInt(em)}月${parseInt(ed)}日`;
          })() : ''
        };
        this.setData({
          sections,
          reportType: actualType,
          reportDate: actualDate,
          reportWeek,
          targetDateHint: dateLabels[actualType] || dateLabels.daily,
          selectedComboId: report.comboId || null,
          isSharedCombo: !!report.comboId
        });
        // Look up combo name from already-loaded shared combos
        if (report.comboId) {
          const combos = this.data.sharedCombos.length > 0
            ? this.data.sharedCombos
            : (getApp().globalData.sharedCombos || []);
          const selected = combos.find(c => String(c.id) === String(report.comboId));
          this.setData({ selectedComboName: selected ? selected.name : '组合' });
        } else {
          this.setData({ selectedComboName: '私人' });
        }
      }
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      logger.error('REPORT', 'LOAD', '加载报告失败', err);
      this.setData({ sections: this.copyDefaultSections() });
    }
  },

  async loadTemplates(comboIdOverride) {
    const comboId = comboIdOverride !== undefined ? comboIdOverride : this.data.selectedComboId;
    if (!comboId) {
      // For private (no combo), still try to load from API for per-user templates
      try {
        const res = await reportTemplateApi.getList({
          combo_id: 0,
          type: this.data.reportType
        });
        const templates = res.templates || res.data || [];
        // 客户端按 type 过滤作为兜底
        const matched = templates.filter(t => t.type === this.data.reportType);
        const template = matched.length > 0 ? matched[0] : (templates.length > 0 ? templates[0] : null);
        if (template) {
          const sections = this.buildSectionsFromTemplate(template);
          this.setData({ sections });
          return;
        }
        // API 返回了空数组 — 没有模板，静默使用默认（用户可能在模板页看到预设但没有保存）
      } catch (err) {
        logger.warn('REPORT', 'TEMPLATE', '加载私人模板失败，使用默认', err);
      }
      this.setData({ sections: this.copyDefaultSections() });
      return;
    }

    wx.showLoading({ title: '加载模板...' });
    try {
      const res = await reportTemplateApi.getList({
        combo_id: comboId,
        type: this.data.reportType
      });
      const templates = res.templates || res.data || [];
      // Filter by type on client side for safety
      const matched = templates.filter(t => t.type === this.data.reportType);
      const template = matched.length > 0 ? matched[0] : (templates.length > 0 ? templates[0] : null);
      if (template) {
        const sections = this.buildSectionsFromTemplate(template);
        this.setData({ sections });
      } else {
        this.setData({ sections: this.copyDefaultSections() });
      }
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      logger.warn('REPORT', 'TEMPLATE', '加载模板失败，使用默认', err);
      this.setData({ sections: this.copyDefaultSections() });
    }
  },

  buildSectionsFromReport(report) {
    const type = this.data.reportType;
    const content = report.content || {};
    const labels = SECTION_LABELS[type] || SECTION_LABELS.daily;
    const colors = SECTION_COLORS;

    // Use the report's actual content keys to preserve custom template sections,
    // fall back to default labels only if content is empty
    const keys = Object.keys(content).length > 0
      ? Object.keys(content)
      : Object.keys(labels);

    return keys.map((key, i) => ({
      key,
      title: labels[key] || key,
      color: colors[key] || '#00b26a',
      lines: content[key] && Array.isArray(content[key]) ? _makeLines(content[key]) : _makeLines(['']),
      _rk: i
    }));
  },

  buildSectionsFromTemplate(template) {
    const type = this.data.reportType;
    const labels = SECTION_LABELS[type] || SECTION_LABELS.daily;

    // 从模板提取 sections（支持数组对象、字符串数组、对象三种格式）
    // 保留模板中的 title，使自定义段落显示正确的标题而非 key 原名
    if (template.sections) {
      if (Array.isArray(template.sections) && template.sections.length > 0) {
        return template.sections.map((s, i) => {
          const key = typeof s === 'string' ? s : s.key;
          return {
            key,
            title: typeof s === 'object' && s.title ? s.title : (labels[key] || key),
            color: SECTION_COLORS[key] || '#00b26a',
            lines: _makeLines(['']),
            _rk: i
          };
        });
      }
      if (typeof template.sections === 'object') {
        const keys = Object.keys(template.sections);
        if (keys.length > 0) {
          return keys.map((key, i) => ({
            key,
            title: template.sections[key]?.title || labels[key] || key,
            color: SECTION_COLORS[key] || '#00b26a',
            lines: _makeLines(['']),
            _rk: i
          }));
        }
      }
    }

    // 无模板时使用默认 labels
    return Object.keys(labels).map((key, i) => ({
      key,
      title: labels[key],
      color: SECTION_COLORS[key] || '#00b26a',
      lines: _makeLines(['']),
      _rk: i
    }));
  },

  copyDefaultSections() {
    const type = this.data.reportType;
    const keys = Object.keys(SECTION_LABELS[type] || SECTION_LABELS.daily);
    return keys.map((key, i) => ({
      key,
      title: (SECTION_LABELS[type] || SECTION_LABELS.daily)[key],
      color: SECTION_COLORS[key],
      lines: _makeLines(['']),
      _rk: i
    }));
  },

  async loadCombos() {
    try {
      const sharedCombos = app.globalData.sharedCombos || [];
      this.setData({ sharedCombos });

      // If combo_id was passed from URL, find its name
      if (this.data.selectedComboId) {
        const selected = sharedCombos.find(c => String(c.id) === String(this.data.selectedComboId));
        if (selected) {
          this.setData({
            selectedComboName: selected.name,
            isSharedCombo: true
          });
        }
      }
    } catch (err) {
      logger.error('REPORT', 'COMBOS', '加载组合失败', err);
    }
  },

  selectPrivateCombo() {
    this.setData({
      selectedComboId: null,
      selectedComboName: '私人',
      isSharedCombo: false,
      showComboPicker: false
    });
    this.clearDraft();
    this.loadTemplates();
  },

  // ========== Line Editing ==========

  onLineInput(e) {
    const sectionIdx = Number(e.currentTarget.dataset.section);
    const lineIdx = Number(e.currentTarget.dataset.line);
    const value = e.detail.value;
    this.setData({
      [`sections[${sectionIdx}].lines[${lineIdx}].text`]: value
    });
  },

  addLine(e) {
    const sectionIdx = Number(e.currentTarget.dataset.section);
    const sections = JSON.parse(JSON.stringify(this.data.sections));
    sections[sectionIdx].lines.push(_makeLine(''));
    this.setData({ sections });
  },

  deleteLine(e) {
    const sectionIdx = Number(e.currentTarget.dataset.section);
    const lineIdx = Number(e.currentTarget.dataset.line);
    const sections = JSON.parse(JSON.stringify(this.data.sections));
    const lines = sections[sectionIdx].lines;

    lines.splice(lineIdx, 1);
    if (lines.length === 0) {
      lines.push(_makeLine(''));
    }
    this.setData({ sections });
  },

  isPlanSection(key) {
    return key === 'tomorrow_plan' || key === 'next_plan';
  },

  // ========== Combo Picker ==========

  async showComboPicker() {
    const isEdit = !!this.data.reportId;
    if (isEdit) {
      wx.showLoading({ title: '检查兼容组合...' });
      const { compatibleIds, privateCompatible } = await this._checkComboCompatibility();
      wx.hideLoading();
      this.setData({
        _compatibleComboIds: compatibleIds,
        _filteredComboCount: compatibleIds.length,
        _privateCompatible: privateCompatible,
        showComboPicker: true,
      });
    } else {
      this.setData({ showComboPicker: true });
    }
  },

  /**
   * 编辑态下检查哪些组合的模板结构与当前报告一致（日报/周报共用）
   */
  async _checkComboCompatibility() {
    const currentKeys = this.getSectionKeys(this.data.sections);
    const reportType = this.data.reportType;
    const combos = this.data.sharedCombos || [];
    const compatibleIds = [];

    const results = await Promise.all(combos.map(async (combo) => {
      // 当前已选的组合始终兼容
      if (String(combo.id) === String(this.data.selectedComboId)) {
        return { id: combo.id, compatible: true };
      }
      try {
        const res = await reportTemplateApi.getList({
          combo_id: combo.id,
          type: reportType
        });
        const templates = res.templates || res.data || [];
        const matched = templates.filter(t => t.type === reportType);
        const template = matched.length > 0 ? matched[0] : (templates.length > 0 ? templates[0] : null);
        let targetKeys;
        if (template) {
          targetKeys = this.getSectionKeys(this.buildSectionsFromTemplate(template));
        } else {
          targetKeys = this.getSectionKeys(this.copyDefaultSections());
        }
        return { id: combo.id, compatible: targetKeys === currentKeys };
      } catch (err) {
        logger.warn('REPORT', 'COMBO_CHECK', `检查组合 ${combo.id} 失败`, err);
        return { id: combo.id, compatible: false };
      }
    }));

    results.forEach(r => { if (r.compatible) compatibleIds.push(r.id); });

    // 检查私人选项 — 加载用户私人模板对比
    let privateCompatible = false;
    try {
      const res = await reportTemplateApi.getList({
        combo_id: 0,
        type: reportType
      });
      const templates = res.templates || res.data || [];
      const matched = templates.filter(t => t.type === reportType);
      const template = matched.length > 0 ? matched[0] : (templates.length > 0 ? templates[0] : null);
      let privateKeys;
      if (template) {
        privateKeys = this.getSectionKeys(this.buildSectionsFromTemplate(template));
      } else {
        privateKeys = this.getSectionKeys(this.copyDefaultSections());
      }
      privateCompatible = privateKeys === currentKeys;
    } catch (err) {
      logger.warn('REPORT', 'COMBO_CHECK', '检查私人模板失败', err);
      const defaultKeys = this.getSectionKeys(this.copyDefaultSections());
      privateCompatible = defaultKeys === currentKeys;
    }

    return { compatibleIds, privateCompatible };
  },

  getSectionKeys(sections) {
    return sections.map(s => s.key).sort().join(',');
  },

  hideComboPicker() {
    this.setData({ showComboPicker: false });
  },

  onComboPickerVisibleChange(e) {
    this.setData({ showComboPicker: e.detail.visible });
  },

  async selectCombo(e) {
    const { id, name, shared } = e.currentTarget.dataset;
    const newComboId = id !== undefined ? Number(id) : null;

    // 编辑态下检查目标组合模板是否兼容
    if (this.data.reportId) {
      const currentKeys = this.getSectionKeys(this.data.sections);
      let targetKeys;

      try {
        const res = await reportTemplateApi.getList({
          combo_id: newComboId || 0,
          type: this.data.reportType
        });
        const templates = res.templates || res.data || [];
        const matched = templates.filter(t => t.type === this.data.reportType);
        const template = matched.length > 0 ? matched[0] : (templates.length > 0 ? templates[0] : null);
        targetKeys = template
          ? this.getSectionKeys(this.buildSectionsFromTemplate(template))
          : this.getSectionKeys(this.copyDefaultSections());
      } catch {
        targetKeys = this.getSectionKeys(this.copyDefaultSections());
      }

      if (targetKeys !== currentKeys) {
        const proceed = await new Promise(resolve => {
          wx.showModal({
            title: '切换确认',
            content: '目标组合的模板结构与当前内容不一致，切换后将重置区块布局，已填写内容可能丢失。是否继续？',
            confirmText: '继续切换',
            cancelText: '取消',
            success: r => resolve(r.confirm)
          });
        });
        if (!proceed) return;
      }
    }

    this.setData({
      selectedComboId: newComboId,
      selectedComboName: name,
      isSharedCombo: shared === '1',
      showComboPicker: false
    });
    this.clearDraft();
    await this.loadTemplates();
  },


  // ========== Todo Import ==========

  importFromTodos(e) {
    const sectionIdx = Number(e.currentTarget.dataset.section);
    const todos = getLocalTodos();

    const allTodos = todos.filter(todo => {
      if (todo.isDeleted || todo.parent_id) return false;
      return true;
    });
    this._allImportTodos = allTodos;

    const completed = allTodos.filter(t => t.completed).map(t => ({
      ...t,
      _key: 'completed_' + (t.id || t.time)
    }));
    const uncompleted = allTodos.filter(t => !t.completed).map(t => ({
      ...t,
      _key: 'uncompleted_' + (t.id || t.time)
    }));

    // Build lookup map for confirmImport
    this._importKeyMap = {};
    [...completed, ...uncompleted].forEach(t => { this._importKeyMap[t._key] = t; });

    this.setData({
      showImportPopup: true,
      importTargetSection: sectionIdx,
      importTodos: { completed, uncompleted },
      selectedImportTodos: [],
      importSearchKeyword: ''
    });
  },

  onImportSearchInput(e) {
    const keyword = (e.detail.value || '').trim().toLowerCase();
    this.setData({ importSearchKeyword: keyword });

    const allTodos = this._allImportTodos || [];
    const filtered = allTodos.filter(todo => {
      if (keyword && todo.text.toLowerCase().indexOf(keyword) === -1) return false;
      return true;
    });

    const completed = filtered.filter(t => t.completed).map(t => ({
      ...t,
      _key: 'completed_' + (t.id || t.time)
    }));
    const uncompleted = filtered.filter(t => !t.completed).map(t => ({
      ...t,
      _key: 'uncompleted_' + (t.id || t.time)
    }));

    // Keep _importKeyMap in sync with current filtered results
    this._importKeyMap = {};
    [...completed, ...uncompleted].forEach(t => { this._importKeyMap[t._key] = t; });

    // Preserve selections that still exist in filtered results
    const validKeys = new Set(Object.keys(this._importKeyMap));
    const preserved = this.data.selectedImportTodos.filter(key => validKeys.has(key));

    this.setData({
      importTodos: { completed, uncompleted },
      selectedImportTodos: preserved
    });
  },

  hideImportPopup() {
    this.setData({ showImportPopup: false });
  },

  onImportPopupVisibleChange(e) {
    this.setData({ showImportPopup: e.detail.visible });
  },

  toggleImportTodo(e) {
    const key = e.currentTarget.dataset.key;
    const selected = [...this.data.selectedImportTodos];
    const idx = selected.indexOf(key);

    if (idx > -1) {
      selected.splice(idx, 1);
    } else {
      selected.push(key);
    }

    this.setData({ selectedImportTodos: selected });
  },

  confirmImport() {
    const { selectedImportTodos, importTargetSection } = this.data;
    if (selectedImportTodos.length === 0) {
      wx.showToast({ title: '请选择待办', icon: 'none' });
      return;
    }

    const sections = JSON.parse(JSON.stringify(this.data.sections));
    const todoMap = this._importKeyMap || {};
    let importedCount = 0;

    selectedImportTodos.forEach(key => {
      const todo = todoMap[key];
      if (todo && todo.text && todo.text.trim()) {
        sections[importTargetSection].lines.push(_makeLine(todo.text.trim()));
        importedCount++;
      }
    });

    // 导入后移除开头的空占位行，避免第一个条目留空
    const targetLines = sections[importTargetSection].lines;
    while (targetLines.length > 0 && (!targetLines[0].text || !targetLines[0].text.trim())) {
      targetLines.shift();
    }
    if (targetLines.length === 0) {
      targetLines.push(_makeLine(''));
    }

    this.setData({
      sections,
      showImportPopup: false,
      selectedImportTodos: []
    });

    wx.showToast({ title: `已导入 ${importedCount} 条`, icon: importedCount > 0 ? 'success' : 'none' });
  },

  // ========== Add Line to Todo ==========

  addLineToTodo(e) {
    const sectionIdx = Number(e.currentTarget.dataset.section);
    const lineIdx = Number(e.currentTarget.dataset.line);
    const line = this.data.sections[sectionIdx].lines[lineIdx];
    const text = line && line.text;
    if (!text || !text.trim()) {
      wx.showToast({ title: '请先输入内容', icon: 'none' });
      return;
    }

    const setDate = this.data.reportDate;
    const comboId = this.data.selectedComboId || '';
    const isShared = this.data.isSharedCombo ? '1' : '0';

    wx.navigateTo({
      url: `/packagePages/add-todo/add-todo?text=${encodeURIComponent(text.trim())}&setDate=${setDate}&comboId=${comboId}&isShared=${isShared}&fromReport=1`
    });
  },

  // ========== Save ==========

  saveReport() {
    // Build clean sections: filter trailing empty lines, extract text
    const cleanSections = this.data.sections.map(s => ({
      key: s.key,
      lines: this.trimTrailingEmpty(s.lines.filter(l => l !== null).map(l => l.text))
    }));

    // Check if report has any content
    const hasContent = cleanSections.some(s => s.lines.length > 0);
    if (!hasContent) {
      wx.showToast({ title: '请填写报告内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    const reportData = {
      type: this.data.reportType,
      period_date: this.data.reportDate,
      combo_id: this.data.selectedComboId || null,
      period_label: this.data.reportType === 'weekly' ? '第' + this.data.reportWeek + '周' : undefined,
      content: {}
    };

    cleanSections.forEach(s => {
      reportData.content[s.key] = s.lines;
    });

    const apiCall = this.data.reportId
      ? workReportApi.update(this.data.reportId, reportData)
      : workReportApi.create(reportData);

    apiCall.then(() => {
      wx.hideLoading();
      this.clearDraft();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    }).catch(err => {
      wx.hideLoading();
      logger.error('REPORT', 'SAVE', '保存失败', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  // ========== Date Helpers ==========

  getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getWeekday(dateStr) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(dateStr.replace(/-/g, '/'));
    return days[date.getDay()] || '';
  },

  formatDateWithWeekday(dateStr) {
    if (!dateStr) return '';
    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    const weekday = this.getWeekday(dateStr);
    return `${parseInt(month)}月${parseInt(day)}日 ${weekday}`;
  },

  formatDateStr(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal.substring(0, 10);
    const d = new Date(dateVal);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatDateObj(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getFriendlyDate(dateStr) {
    if (!dateStr) return '';
    const today = this.getTodayStr();
    if (dateStr === today) return '今天';

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = this.formatDateObj(yesterdayDate);
    if (dateStr === yesterday) return '昨天';

    const month = dateStr.substring(5, 7);
    const day = dateStr.substring(8, 10);
    return `${parseInt(month)}月${parseInt(day)}日`;
  },

  addDays(dateStr, days) {
    const d = new Date(dateStr.replace(/-/g, '/'));
    d.setDate(d.getDate() + days);
    return this.formatDateObj(d);
  },

  getWeekNumber(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return '';
    // 以周日为周起始
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const firstSunday = new Date(startOfYear);
    firstSunday.setDate(1 - startOfYear.getDay());
    const diff = d - firstSunday + (startOfYear.getTimezoneOffset() - firstSunday.getTimezoneOffset()) * 60000;
    const oneWeek = 604800000;
    const weekNum = Math.floor(diff / oneWeek) + 1;
    return weekNum > 0 ? weekNum : 1;
  },

  trimTrailingEmpty(lines) {
    let end = lines.length;
    while (end > 0 && lines[end - 1].trim() === '') {
      end--;
    }
    return end > 0 ? lines.slice(0, end) : [];
  },

  // ========== Navigation ==========

  goBack() {
    wx.navigateBack();
  }
});
