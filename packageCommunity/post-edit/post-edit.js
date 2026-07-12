const app = getApp();
const { communityApi, combosApi, isLoggedIn } = require('../../utils/api');
const { getLocalTodos } = require('../../utils/sync');

const { formatFriendlyDate } = require('../../utils/util');

const compressImage = (filePath) => {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath,
      success(info) {
        if (info.size > 2 * 1024 * 1024) {
          wx.compressImage({ src: filePath, quality: 80, success: (r) => resolve(r.tempFilePath) });
        } else { resolve(filePath); }
      },
      fail: () => resolve(filePath)
    });
  });
};

const uploadImage = (filePath, retryCount = 0) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: 'https://img.scdn.io/api/v1.php',
      filePath, name: 'image',
      success(res) {
        try {
          const data = JSON.parse(res.data);
          const url = data && data.data && data.data.url ? data.data.url : (data && data.url ? data.url : null);
          if (url) resolve(url);
          else reject(new Error('上传返回URL异常'));
        } catch { reject(new Error('上传返回格式异常')); }
      },
      fail(err) {
        if (retryCount < 3) {
          setTimeout(() => uploadImage(filePath, retryCount + 1).then(resolve).catch(reject), 1000 * (retryCount + 1));
        } else { reject(err); }
      }
    });
  });
};

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight || 44,
    menuRight: app.globalData.menuRight || 0,
    menuWidth: app.globalData.menuWidth || 0,
    title: '', body: '',
    fileList: [], imageUrls: [],
    imageSource: 'media',
    gridConfig: { column: 3, width: 200, height: 200 },
    uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] },
    submitting: false, editMode: false, editPostId: null,
    canPublish: false,
    selectedTodoIds: [], selectedTodoTexts: {}, selectedTodoPriorities: {},
    selectedTodosExpanded: false,
    selectedComboCode: null, selectedComboName: '',
    location: null,
    // picker state
    showPicker: false, pickerType: '',
    temporarySelectedIds: [], temporarySelectedComboId: null,
    filteredTodos: [], allTodos: [],
    todoSearchKeyword: '', comboSearchKeyword: '',
    allPickerCombos: [], filteredAllPickerCombos: [],
    selectedMap: {},
    userInfo: app.globalData.userInfo || {},
    // @提及相关
    showAtPopup: false,
    atSearchResults: [],
    atKeyword: '',
    mentionsList: [],
    mentionCount: 0,
    showMentionCard: false,
    currentMentions: [],
    showMentionListPopup: false,
    mentionIdCounter: 0,
  },

  onLoad(options) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
    this.setData({
      userInfo,
      navBarHeight: app.globalData.navBarHeight || 44,
      menuRight: app.globalData.menuRight || 0,
      menuWidth: app.globalData.menuWidth || 0
    });
    this.loadTodos();
    this.loadPickerCombos();
    if (options.postId) this.loadEditData(options.postId);

    // 从 share-config 快速分享到社区：携带 todoId
    if (options.todoId) {
      const quickTodo = app.globalData.quickShareTodo || {};
      if (quickTodo.id == options.todoId) {
        const selectedTodoTexts = {};
        const selectedTodoPriorities = {};
        selectedTodoTexts[options.todoId] = quickTodo.text || '';
        selectedTodoPriorities[options.todoId] = quickTodo.priority || 'p4';
        this.setData({
          title: quickTodo.text || '',
          canPublish: true,
          selectedTodoIds: [options.todoId],
          selectedTodoTexts, selectedTodoPriorities,
          selectedTodosExpanded: false
        });
        app.globalData.quickShareTodo = null;
      }
      return;
    }

    const draft = wx.getStorageSync('communityDraft');
    if (draft && !options.postId) {
      wx.showModal({
        title: '提示',
        content: '是否恢复上次的编辑\n上次标题：' + (draft.title || '无'),
        success: (res) => {
          if (res.confirm) {
            const todos = getLocalTodos().filter(t => !t.isDeleted && !t.parentId && !t.parent_id);
            const selectedTodoTexts = {};
            const selectedTodoPriorities = {};
            (draft.selectedTodoIds || []).forEach(id => {
              const t = todos.find(todo => String(todo.id) === String(id));
              if (t) { selectedTodoTexts[id] = t.text; selectedTodoPriorities[id] = t.priority; }
            });
            this.setData({
              title: draft.title || '', body: draft.body || '',
              canPublish: (draft.title || '').trim().length > 0,
              fileList: draft.fileList || [], imageUrls: draft.imageUrls || [],
              selectedTodoIds: draft.selectedTodoIds || [], selectedTodoTexts, selectedTodoPriorities,
              selectedComboCode: draft.selectedComboCode || null,
              selectedComboName: draft.selectedComboName || '',
              location: draft.location || null
            });
            this.updateMentionCard(draft.body || '');
          } else {
            wx.removeStorageSync('communityDraft');
          }
        }
      });
    }
  },

  loadTodos() {
    const todos = getLocalTodos().filter(t => !t.isDeleted && !t.parentId && !t.parent_id);
    const enriched = todos.map(t => ({ ...t, friendlyDate: formatFriendlyDate(t.setDate) }));
    this.setData({ allTodos: enriched, filteredTodos: enriched });
  },

  loadPickerCombos() {
    const combos = app.globalData.combos || [];
    const sharedCombos = app.globalData.sharedCombos || [];
    const shareableCombos = combos.filter(c => c.shareCode && c.isShared);
    const inviteableShared = sharedCombos.filter(c =>
      c.role === 'owner' || c.role === 'admin' || c.userRole === 'owner' || c.userRole === 'admin'
    );
    const seen = new Map();
    [...shareableCombos, ...inviteableShared].forEach(c => {
      if (!seen.has(c.id)) seen.set(c.id, c);
    });
    const allPickerCombos = Array.from(seen.values());
    this.setData({ allPickerCombos, filteredAllPickerCombos: allPickerCombos });
  },

  onUnload() {
    if (!this.data.editMode && (this.data.title || this.data.body)) {
      wx.setStorageSync('communityDraft', {
        title: this.data.title, body: this.data.body, fileList: this.data.fileList, imageUrls: this.data.imageUrls,
        selectedTodoIds: this.data.selectedTodoIds, selectedComboCode: this.data.selectedComboCode,
        selectedComboName: this.data.selectedComboName, location: this.data.location
      });
    } else if (!this.data.title && !this.data.body) { wx.removeStorageSync('communityDraft'); }
  },

  async loadEditData(postId) {
    // 优先使用 post-detail 传递的完整数据
    const cached = app.globalData.editPostData;
    if (cached && cached.postId === postId) {
      app.globalData.editPostData = null;
      const fileList = (cached.images || []).map(url => ({ url }));
      let comboName = '';
      if (cached.shareCode) {
        const allCombos = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
        const found = allCombos.find(c => c.shareCode === cached.shareCode);
        if (found) comboName = found.name;
      }
      const selectedTodoTexts = {};
      const selectedTodoPriorities = {};
      (cached.todoIds || []).forEach(id => {
        const t = this.data.allTodos.find(todo => String(todo.id) === String(id));
        if (t) { selectedTodoTexts[id] = t.text; selectedTodoPriorities[id] = t.priority; }
      });
      this.setData({
        editMode: true, editPostId: postId,
        title: cached.title || '', body: cached.body || '',
        fileList, imageUrls: cached.images || [],
        selectedTodoIds: cached.todoIds || [], selectedTodoTexts, selectedTodoPriorities,
        selectedComboCode: cached.shareCode || null,
        selectedComboName: comboName,
        location: cached.location ? { text: cached.location } : null,
        canPublish: true
      });
      // 解析 markdown body 中的 @提及，转换成 mentionsList
      this.restoreMentionsFromBody(cached.body || '');
      return;
    }
    try {
      const res = await communityApi.getPostById(postId);
      if (res.success && res.data) {
        const post = res.data;
        const fileList = (post.images || []).map(url => ({ url }));
        let comboName = '';
        if (post.shareCode) {
          const allCombos = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
          const found = allCombos.find(c => c.shareCode === post.shareCode);
          if (found) comboName = found.name;
        }
        const selectedTodoTexts = {};
        const selectedTodoPriorities = {};
        (post.todoIds || []).forEach(id => {
          const t = this.data.allTodos.find(todo => String(todo.id) === String(id));
          if (t) { selectedTodoTexts[id] = t.text; selectedTodoPriorities[id] = t.priority; }
        });
        this.setData({
          editMode: true, editPostId: postId,
          title: post.title || '', body: post.body || '',
          fileList, imageUrls: post.images || [],
          selectedTodoIds: post.todoIds || [], selectedTodoTexts, selectedTodoPriorities,
          selectedComboCode: post.shareCode || null,
          selectedComboName: comboName,
          location: post.location ? (typeof post.location === 'string' ? { text: post.location } : post.location) : null,
          canPublish: true
        });
        // 解析 markdown body 中的 @提及，转换成 mentionsList
        this.restoreMentionsFromBody(post.body || '');
      }
    } catch (err) { wx.showToast({ title: '加载失败', icon: 'none' }); }
  },

  onTitleInput(e) {
    const title = e.detail.value ?? '';
    this.setData({ title, canPublish: this.data.editMode || title.trim().length > 0 });
  },

  onBodyInput(e) {
    const body = e.detail.value ?? '';
    this.detectAtMention(body);
    this.updateMentionCard(body);
  },

  // 检测输入末尾是否输入了 @关键词
  detectAtMention(text) {
    const atRegex = /@(\S*)$/;
    const match = text.match(atRegex);
    if (match) {
      const keyword = match[1];
      this.setData({ atKeyword: keyword });
      this.searchUsers(keyword);
    } else {
      this.closeAtPopup();
    }
  },

  // 搜索用户
  async searchUsers(keyword) {
    if (!keyword.trim()) {
      this.setData({ atSearchResults: [], showAtPopup: true });
      return;
    }
    try {
      const res = await communityApi.searchUsers(keyword);
      if (res.success) {
        this.setData({ atSearchResults: res.data, showAtPopup: true });
      }
    } catch {
      this.closeAtPopup();
    }
  },

  // 关闭@弹窗
  closeAtPopup() {
    this.setData({ showAtPopup: false, atSearchResults: [], atKeyword: '' });
  },

  // 在搜索弹窗里选了一个用户
  selectMentionUser(e) {
    const userId = parseInt(e.currentTarget.dataset.id);
    const nickname = e.currentTarget.dataset.nickname;
    const avatar = e.currentTarget.dataset.avatar || '';
    const { body, mentionsList, mentionIdCounter } = this.data;

    const atMatch = body.match(/@(\S*)$/);
    if (!atMatch) { this.closeAtPopup(); return; }

    const atIndex = atMatch.index;
    const beforeAt = body.substring(0, atIndex);
    const afterAt = body.substring(atIndex + 1 + atMatch[1].length);
    const newBody = `${beforeAt}@${nickname} ${afterAt}`;

    const counter = (mentionIdCounter || 0) + 1;
    const newEntry = {
      id: `mention_${counter}_${Date.now()}`,
      nickname,
      userId,
      avatar,
    };
    const newList = [...mentionsList, newEntry];

    this.setData({
      body: newBody,
      mentionsList: newList,
      mentionIdCounter: counter,
    });
    this.closeAtPopup();
    this.updateMentionCard(newBody);
  },

  // 遍历 mentionsList，在原文中找到 @昵称 → 替换成 @[昵称](userId)
  convertMentionsInText(text) {
    const { mentionsList } = this.data;
    if (!text || !mentionsList.length) return text;
    let result = text;
    const seen = new Set();
    for (const entry of mentionsList) {
      if (seen.has(entry.userId)) continue;
      seen.add(entry.userId);
      const escaped = entry.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,;!?，。！？；：、])`, 'u');
      const newResult = result.replace(regex, `$1[@${entry.nickname}](${entry.userId})`);
      if (newResult !== result) {
        result = newResult;
      }
    }
    return result;
  },

  // 遍历 mentionsList，检测哪些 @昵称 在原文中确实存在
  detectMentionsInText(text) {
    const { mentionsList } = this.data;
    if (!text || !mentionsList.length) return [];
    const found = [];
    const seenIds = new Set();
    for (const entry of mentionsList) {
      if (seenIds.has(entry.userId)) continue;
      const escaped = entry.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,;!?，。！？；：、])`, 'u');
      if (regex.test(text)) {
        found.push({ nickname: entry.nickname, userId: entry.userId, avatar: entry.avatar || '' });
        seenIds.add(entry.userId);
      }
    }
    return found;
  },

  // 根据文本更新「提及卡片」状态
  updateMentionCard(text) {
    const mentions = this.detectMentionsInText(text);
    this.setData({
      mentionCount: mentions.length,
      showMentionCard: mentions.length > 0,
      currentMentions: mentions,
    });
  },

  // 从 body 中提取所有 @[昵称](id) 格式的提及
  parseMarkdownBody(text) {
    if (!text) return { displayBody: '', mentionsList: [] };
    const mentionsList = [];
    const seen = new Set();
    const displayBody = text.replace(/@?\[([^\]]+)\]\((\d+)\)/g, (m, nickname, userId) => {
      const cleanNick = nickname.startsWith('@') ? nickname.slice(1) : nickname;
      const uid = parseInt(userId);
      if (!seen.has(uid)) {
        seen.add(uid);
        mentionsList.push({
          id: `mention_restore_${uid}`,
          nickname: cleanNick,
          userId: uid,
        });
      }
      return nickname.startsWith('@') ? nickname : `@${nickname}`;
    });
    return { displayBody, mentionsList };
  },

  // 编辑加载时从 markdown body 恢复 mentionsList 并刷新昵称
  async restoreMentionsFromBody(text) {
    const parsed = this.parseMarkdownBody(text || '');
    if (parsed.mentionsList.length === 0) {
      this.setData({ body: parsed.displayBody });
      return;
    }
    const userIds = parsed.mentionsList.map(e => e.userId);
    try {
      const res = await communityApi.getUsersBatch(userIds);
      if (!res.success || !res.data) {
        this.setData({ mentionsList: parsed.mentionsList });
        this.updateMentionCard(parsed.displayBody);
        return;
      }
      const userMap = {};
      res.data.forEach(u => { userMap[u.id] = u; });
      const newList = parsed.mentionsList.map(e => {
        const user = userMap[e.userId];
        return {
          ...e,
          nickname: user?.nickname || e.nickname,
          avatar: user?.avatar || e.avatar || '',
        };
      });
      let updatedBody = parsed.displayBody;
      for (const e of parsed.mentionsList) {
        const newNick = userMap[e.userId]?.nickname;
        if (newNick && newNick !== e.nickname) {
          const oldEscaped = e.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          updatedBody = updatedBody.replace(
            new RegExp(`(^|\\s)@${oldEscaped}(?=\\s|$|[.,;!?，。！？；：、])`, 'u'),
            `$1@${newNick}`
          );
        }
      }
      this.setData({ body: updatedBody, mentionsList: newList });
      this.updateMentionCard(updatedBody);
    } catch {
      this.setData({ mentionsList: parsed.mentionsList });
      this.updateMentionCard(parsed.displayBody);
    }
  },

  // 点「提及卡片」→ 弹出用户列表
  openMentionListPopup() {
    const mentions = this.detectMentionsInText(this.data.body);
    this.setData({ currentMentions: mentions, showMentionListPopup: true });
  },

  closeMentionListPopup() {
    this.setData({ showMentionListPopup: false });
  },

  onMentionListClose(e) {
    if (!e.detail.visible) this.setData({ showMentionListPopup: false });
  },

  // 在提及列表 popup 中点用户 → 跳转主页
  goToMentionUser(e) {
    const userId = e.currentTarget.dataset.userid;
    wx.navigateTo({ url: `/packageProfile/user-home/user-home?userId=${userId}` });
  },

  async handleImageAdd(e) {
    const { files } = e.detail;
    const currentCount = this.data.fileList.length;
    if (currentCount >= 9) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
    const filesToAdd = files.slice(0, 9 - currentCount);
    if (filesToAdd.length === 0) return;
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      wx.showLoading({ title: `上传中 ${i + 1}/${filesToAdd.length}`, mask: true });
      try {
        const compressed = await compressImage(file.url);
        const url = await uploadImage(compressed);
        const newItem = { url, name: `image_${Date.now()}_${i}`, type: 'image', status: 'done' };
        this.setData({ fileList: [...this.data.fileList, newItem], imageUrls: [...this.data.imageUrls, url] });
      } catch (err) {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    }
    wx.hideLoading();
  },

  handleImageRemove(e) {
    const { index } = e.detail;
    const list = [...this.data.fileList];
    const urls = [...this.data.imageUrls];
    list.splice(index, 1); urls.splice(index, 1);
    this.setData({ fileList: list, imageUrls: urls });
  },

  handleImageClick(e) {
    const { index } = e.detail || {};
    if (index !== undefined && this.data.imageUrls[index]) {
      wx.previewImage({ current: this.data.imageUrls[index], urls: this.data.imageUrls });
    }
  },

  toggleImageSource(e) {
    const isMessageFile = e.detail.value;
    const src = isMessageFile ? 'messageFile' : 'media';
    this.setData({
      imageSource: src,
      uploadConfig: { ...this.data.uploadConfig, sourceType: src === 'media' ? ['album', 'camera'] : ['album'] }
    });
  },

  pickLocation() {
    wx.chooseLocation({
      success: (res) => {
        const locText = res.name || res.address || '';
        this.setData({
          location: {
            name: res.name || '',
            address: res.address || '',
            latitude: res.latitude,
            longitude: res.longitude,
            text: locText
          }
        });
      }
    });
  },

  clearLocation() {
    this.setData({ location: null });
  },

  // ===== 统一选择弹窗（待办/组合共用） =====
  showPicker(e) {
    const type = e.currentTarget?.dataset?.type || e;
    if (type === 'todo') {
      const selectedMap = {};
      this.data.selectedTodoIds.forEach(id => { selectedMap[String(id)] = true; });
      this.setData({
        showPicker: true, pickerType: 'todo',
        temporarySelectedIds: this.data.selectedTodoIds.map(String),
        selectedMap,
        todoSearchKeyword: '',
        filteredTodos: this.data.allTodos
      });
    } else if (type === 'combo') {
      this.setData({
        showPicker: true, pickerType: 'combo',
        temporarySelectedComboId: this.data.selectedComboCode
          ? this.findComboIdByCode(this.data.selectedComboCode) : null,
        filteredAllPickerCombos: this.data.allPickerCombos,
        comboSearchKeyword: ''
      });
    }
  },

  hidePicker() {
    this.setData({ showPicker: false });
  },

  onPickerVisibleChange(e) {
    if (!e.detail.visible) this.setData({ showPicker: false });
  },

  onTodoSearch(e) {
    const keyword = (e.detail.value || '').trim();
    const filtered = keyword
      ? this.data.allTodos.filter(t => t.text.indexOf(keyword) > -1)
      : this.data.allTodos;
    this.setData({ todoSearchKeyword: keyword, filteredTodos: filtered });
  },

  toggleTodoSelect(e) {
    const todoId = String(e.currentTarget.dataset.id);
    const tempIds = [...this.data.temporarySelectedIds];
    const idx = tempIds.indexOf(todoId);
    const selectedMap = { ...this.data.selectedMap };
    if (idx > -1) {
      tempIds.splice(idx, 1);
      delete selectedMap[todoId];
    } else {
      tempIds.push(todoId);
      selectedMap[todoId] = true;
    }
    this.setData({ temporarySelectedIds: tempIds, selectedMap });
  },

  confirmTodoSelection() {
    const selectedIds = [...this.data.temporarySelectedIds];
    const allTodos = this.data.allTodos;
    const selectedTodoTexts = {};
    const selectedTodoPriorities = {};
    allTodos.forEach(t => {
      if (selectedIds.some(id => String(id) === String(t.id))) {
        selectedTodoTexts[t.id] = t.text;
        selectedTodoPriorities[t.id] = t.priority || 'p4';
      }
    });
    this.setData({
      selectedTodoIds: selectedIds,
      selectedTodoTexts, selectedTodoPriorities,
      selectedTodosExpanded: true,
      showPicker: false
    });
  },

  clearSelectedTodos() {
    this.setData({
      selectedTodoIds: [], selectedMap: {},
      selectedTodoTexts: {}, selectedTodoPriorities: {},
      temporarySelectedIds: []
    });
  },

  findComboIdByCode(code) {
    if (!code) return null;
    const all = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
    const found = all.find(c => c.shareCode === code);
    return found ? found.id : null;
  },

  findComboById(id) {
    const all = [...(app.globalData.combos || []), ...(app.globalData.sharedCombos || [])];
    return all.find(c => String(c.id) === String(id)) || null;
  },

  onComboSearch(e) {
    const keyword = (e.detail.value || '').trim();
    if (!keyword) {
      this.setData({ comboSearchKeyword: '', filteredAllPickerCombos: this.data.allPickerCombos });
      return;
    }
    this.setData({
      comboSearchKeyword: keyword,
      filteredAllPickerCombos: this.data.allPickerCombos.filter(c => c.name.indexOf(keyword) > -1)
    });
  },

  selectTemporaryCombo(e) {
    const comboId = e.currentTarget.dataset.id;
    this.setData({
      temporarySelectedComboId: this.data.temporarySelectedComboId === comboId ? null : comboId
    });
  },

  confirmComboSelection() {
    const id = this.data.temporarySelectedComboId;
    if (id) {
      const combo = this.findComboById(id);
      if (combo) {
        this.setData({
          selectedComboCode: combo.shareCode,
          selectedComboName: combo.name
        });
      }
    } else {
      this.setData({ selectedComboCode: null, selectedComboName: '' });
    }
    this.setData({ showPicker: false });
  },

  clearSelectedCombo() {
    this.setData({ selectedComboCode: null, selectedComboName: '' });
  },

  toggleSelectedTodosExpand() {
    this.setData({ selectedTodosExpanded: !this.data.selectedTodosExpanded });
  },

  removeSelectedTodo(e) {
    const id = e.currentTarget.dataset.id;
    const ids = this.data.selectedTodoIds.filter(i => String(i) !== String(id));
    const texts = { ...this.data.selectedTodoTexts };
    const priorities = { ...this.data.selectedTodoPriorities };
    delete texts[id];
    delete priorities[id];
    this.setData({
      selectedTodoIds: ids, selectedTodoTexts: texts, selectedTodoPriorities: priorities
    });
  },

  async handleSubmit() {
    if (!this.data.title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      const body = this.convertMentionsInText(this.data.body || '');
      const payload = {
        postId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: this.data.title, body: body || null,
        images: this.data.imageUrls.length > 0 ? this.data.imageUrls : null,
        todoIds: this.data.selectedTodoIds.length > 0 ? this.data.selectedTodoIds : null,
        shareCode: this.data.selectedComboCode || null, location: this.data.location || null
      };
      if (this.data.editMode) {
        await communityApi.updatePost(this.data.editPostId, payload);
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        await communityApi.createPost(payload);
        wx.showToast({ title: '发布成功', icon: 'success' });
        wx.removeStorageSync('communityDraft');
      }
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  goBack() {
    if (this.data.title || this.data.body) {
      wx.showModal({
        title: '提示', content: '确定放弃当前编辑吗？',
        success: (res) => { if (res.confirm) wx.navigateBack(); }
      });
    } else { wx.navigateBack(); }
  },

  onAvatarError() {
    this.setData({ userAvatarFailed: true });
  }
});
