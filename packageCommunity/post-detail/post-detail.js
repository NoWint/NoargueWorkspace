const app = getApp();
const { communityApi, todosApi } = require('../../utils/api');

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
    postId: null, post: {}, isDeleted: false, isOwner: false,
    todoId: null, todoData: null,
    comments: [], commentCursor: null, hasMoreComments: true, loadingComments: false,
    commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
    showVisitorsPopup: false,
    visitors: [],
    refreshing: false,
    todoExpanded: false, todoItems: [],
    reportReasons: ['垃圾广告', '色情低俗', '人身攻击', '违法信息', '其他'],
    commentFiles: [],
    commentImageUrls: [],
    inputFocused: false,
    gridConfig: { column: 5, width: 120, height: 120 },
    uploadConfig: { count: 9, sizeType: ['compressed'], sourceType: ['album', 'camera'] },
    // @提及相关
    commentAtPopup: false,
    commentAtResults: [],
    commentAtKeyword: '',
    commentMentionsList: [],
    commentMentionIdCounter: 0
  },

  onLoad(options) {
    const postId = options.postId;
    const todoId = options.todoId;
    if (postId) {
      this.setData({ postId });
      this.loadPost();
    } else if (todoId) {
      this.setData({ todoId });
      this.loadTodoPost(todoId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  // 从 todoId 加载：获取待办数据，预填标题并跳转发布页
  async loadTodoPost(todoId) {
    try {
      const res = await todosApi.getById(todoId);
      if (res.success && res.data) {
        const todo = res.data;
        // 存储到全局用于 post-edit 读取
        app.globalData.quickShareTodo = todo;
        wx.showModal({
          title: '基于待办发布',
          content: '是否以「' + todo.text + '」为标题发布到社区？',
          success: (r) => {
            if (r.confirm) {
              // 携带 todoId 跳转发布页，post-edit 自动填入标题
              wx.redirectTo({
                url: '/packageCommunity/post-edit/post-edit?todoId=' + todoId
              });
            } else {
              wx.navigateBack();
            }
          }
        });
      } else {
        wx.showToast({ title: '待办不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: '加载待办失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onShow() {
    if (this.data.postId) this.loadPost();
  },

  async loadPost() {
    try {
      const res = await communityApi.getPostById(this.data.postId);
      if (res.success && res.data) {
        const post = res.data;
        post._createdAtDisplay = this.formatTime(post.createdAt);
        post.createdAtDisplay = post._createdAtDisplay; // post-card component compatibility
        post._updatedAtDisplay = this.formatTime(post.updatedAt);
        post.updatedAtDisplay = post._updatedAtDisplay; // post-card component compatibility
        const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
        this.setData({ post, isDeleted: post.isDeleted, isOwner: post.userId === userInfo.id });
        this.loadComments(true);
      } else { this.setData({ isDeleted: true }); }
    } catch (err) { wx.showToast({ title: '加载失败', icon: 'none' }); }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.loadPost().then(() => this.setData({ refreshing: false }));
  },

  async loadComments(reset = false) {
    if (this.data.loadingComments) return;
    if (!reset && !this.data.hasMoreComments) return;
    this.setData({ loadingComments: true });
    try {
      const params = { limit: 20 };
      if (!reset && this.data.commentCursor) params.cursor = this.data.commentCursor;
      const res = await communityApi.getComments(this.data.postId, params);
      if (res.success) {
        const mapItem = c => { const item = { ...c, _createdDisplay: this.formatTime(c.createdAt) }; if (item.replies) item.replies = item.replies.map(r => mapItem(r)); return item; };
        const list = (res.data.list || []).map(mapItem);
        this.setData({
          comments: reset ? list : [...this.data.comments, ...list],
          commentCursor: res.data.nextCursor, hasMoreComments: res.data.hasMore, loadingComments: false
        });
      }
    } catch (err) { this.setData({ loadingComments: false }); wx.showToast({ title: '评论加载失败', icon: 'none' }); }
  },

  onLoadMoreComments() { this.loadComments(false); },
  onCommentInput(e) {
    const commentText = e.detail.value ?? '';
    this.setData({ commentText });
    this.detectCommentAt(commentText);
  },

  detectCommentAt(text) {
    const atRegex = /@(\S*)$/;
    const match = text.match(atRegex);
    if (match) {
      const keyword = match[1];
      this.setData({ commentAtKeyword: keyword });
      this.searchCommentUsers(keyword);
    } else {
      this.closeCommentAtPopup();
    }
  },

  async searchCommentUsers(keyword) {
    if (!keyword.trim()) {
      this.setData({ commentAtResults: [], commentAtPopup: true });
      return;
    }
    try {
      const res = await communityApi.searchUsers(keyword);
      if (res.success) {
        this.setData({ commentAtResults: res.data, commentAtPopup: true });
      }
    } catch {
      this.closeCommentAtPopup();
    }
  },

  closeCommentAtPopup() {
    this.setData({ commentAtPopup: false, commentAtResults: [], commentAtKeyword: '' });
  },

  selectCommentMention(e) {
    const userId = parseInt(e.currentTarget.dataset.id);
    const nickname = e.currentTarget.dataset.nickname;
    const avatar = e.currentTarget.dataset.avatar || '';
    const { commentText, commentMentionsList, commentMentionIdCounter } = this.data;

    const atMatch = commentText.match(/@(\S*)$/);
    if (!atMatch) { this.closeCommentAtPopup(); return; }

    const atIndex = atMatch.index;
    const beforeAt = commentText.substring(0, atIndex);
    const afterAt = commentText.substring(atIndex + 1 + atMatch[1].length);
    const newText = `${beforeAt}@${nickname} ${afterAt}`;

    const counter = (commentMentionIdCounter || 0) + 1;
    const newEntry = {
      id: `comment_mention_${counter}_${Date.now()}`,
      nickname,
      userId,
      avatar,
    };

    this.setData({
      commentText: newText,
      commentMentionsList: [...commentMentionsList, newEntry],
      commentMentionIdCounter: counter,
    });
    this.closeCommentAtPopup();
  },

  convertCommentMentions(text) {
    const { commentMentionsList } = this.data;
    if (!text || !commentMentionsList.length) return text;
    let result = text;
    const seen = new Set();
    for (const entry of commentMentionsList) {
      if (seen.has(entry.userId)) continue;
      seen.add(entry.userId);
      const escaped = entry.nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,;!?，。！？；：、])`, 'u');
      const newResult = result.replace(regex, `$1[@${entry.nickname}](${entry.userId})`);
      if (newResult !== result) result = newResult;
    }
    return result;
  },

  onInputFocus() { this.setData({ inputFocused: true }); },
  onInputBlur() { this.setData({ inputFocused: false }); },

  replyComment(e) {
    const { id, user, userid } = e.currentTarget.dataset;
    this.setData({ replyTarget: user, replyParentId: id, replyToUserId: userid || null, inputFocused: true });
  },

  cancelReply() { this.setData({ replyTarget: null, replyParentId: null, replyToUserId: null }); },

  async submitComment() {
    const rawText = this.data.commentText.trim();
    const text = this.convertCommentMentions(rawText);
    if (!text && this.data.commentImageUrls.length === 0) return;
    try {
      await communityApi.createComment(this.data.postId, {
        content: text,
        images: this.data.commentImageUrls.length > 0 ? this.data.commentImageUrls : null,
        parentId: this.data.replyParentId || null,
        replyToUserId: this.data.replyToUserId || null
      });
      this.setData({
        commentText: '', replyTarget: null, replyParentId: null, replyToUserId: null,
        commentFiles: [], commentImageUrls: [], inputFocused: false,
        commentMentionsList: [], commentMentionIdCounter: 0
      });
      wx.showToast({ title: '发送成功', icon: 'success' });
      this.loadComments(true);
    } catch (err) { wx.showToast({ title: err.message || '发送失败', icon: 'none' }); }
  },

  async deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await communityApi.deleteComment(commentId);
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadComments(true);
          } catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); }
        }
      }
    });
  },

  reportComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: [...this.data.reportReasons, '取消'],
      success: async (res) => {
        if (res.tapIndex >= this.data.reportReasons.length) return;
        const reason = this.data.reportReasons[res.tapIndex];
        if (!reason) return;
        try {
          await new Promise((resolve, reject) => {
            wx.requestSubscribeMessage({
              tmplIds: ['yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE'],
              success: resolve, fail: reject
            });
          });
        } catch (err) { /* user declined, continue anyway */ }
        try {
          await communityApi.createReport({ targetType: 'comment', targetId: commentId, reason, detail: '' });
          wx.showToast({ title: '举报已提交', icon: 'success' });
        } catch (err) { wx.showToast({ title: err.message || '提交失败', icon: 'none' }); }
      }
    });
  },

  async toggleCommentLike(e) {
    const commentId = e.currentTarget.dataset.id;
    try {
      const res = await communityApi.toggleCommentLike(commentId);
      if (res.success) {
        const updateItem = (items) => items.map(c => {
          if (c.id === commentId) {
            c.isLiked = res.data.liked;
            c.likesCount = res.data.likesCount;
          }
          if (c.replies) c.replies = updateItem(c.replies);
          return c;
        });
        this.setData({ comments: updateItem(this.data.comments) });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async handleCommentImageAdd(e) {
    const { files } = e.detail;
    const currentCount = this.data.commentFiles.length;
    if (currentCount >= 9) { wx.showToast({ title: '最多上传9张图片', icon: 'none' }); return; }
    const filesToAdd = files.slice(0, 9 - currentCount);
    if (filesToAdd.length === 0) return;
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      wx.showLoading({ title: `上传中 ${i + 1}/${filesToAdd.length}`, mask: true });
      try {
        const compressed = await compressImage(file.url);
        const url = await uploadImage(compressed);
        const newItem = { url, name: `comment_img_${Date.now()}_${i}`, type: 'image', status: 'done' };
        this.setData({
          commentFiles: [...this.data.commentFiles, newItem],
          commentImageUrls: [...this.data.commentImageUrls, url]
        });
      } catch (err) {
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    }
    wx.hideLoading();
  },

  handleCommentImageRemove(e) {
    const { index } = e.detail;
    const files = [...this.data.commentFiles];
    const urls = [...this.data.commentImageUrls];
    files.splice(index, 1);
    urls.splice(index, 1);
    this.setData({ commentFiles: files, commentImageUrls: urls });
  },

  handleCommentImageClick(e) {
    const { index } = e.detail;
    wx.previewImage({ current: this.data.commentImageUrls[index], urls: this.data.commentImageUrls });
  },

  goToTodoDetail(e) {
    const { todoId, creatorName, creatorAvatar, postId } = e.detail || e.currentTarget.dataset;
    if (!todoId) return;
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?communityTodoId=${todoId}&creatorName=${encodeURIComponent(creatorName || '')}&creatorAvatar=${encodeURIComponent(creatorAvatar || '')}&postId=${postId || ''}`
    });
  },

  openLocation(e) {
    const { lat, lng, name } = e.detail || e.currentTarget.dataset;
    if (!lat || !lng) return;
    wx.openLocation({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      name: name || '目标位置',
      scale: 18
    });
  },

  async toggleTodoExpand() {
    const post = this.data.post;
    if (!post || !post.todoIds || post.todoIds.length === 0) return;
    if (this.data.todoExpanded) { this.setData({ todoExpanded: false }); return; }
    if (this.data.todoItems.length === 0) {
      try {
        const res = await todosApi.getTodosBatch(post.todoIds);
        if (res.success && res.data) {
          this.setData({ todoItems: res.data, todoExpanded: true });
          return;
        }
      } catch (err) {
        console.error('[toggleTodoExpand] batch error:', err);
        wx.showToast({ title: '加载待办失败', icon: 'none' });
        return;
      }
    }
    this.setData({ todoExpanded: true });
  },

  handleComboTap() {
    const code = this.data.post.shareCode;
    if (!code) return;
    wx.setStorageSync('pendingShareData', { type: 'combo_invite', code, auto: false, timestamp: Date.now() });
    wx.switchTab({ url: '/pages/todo/todo' });
  },

  onPostTapAuthor(e) {
    const { userId } = e.detail;
    if (!userId) return;
    wx.navigateTo({ url: `/packageProfile/user-home/user-home?userId=${userId}` });
  },

  onCommentTapAuthor(e) {
    const userId = e.currentTarget.dataset.userId;
    if (!userId) return;
    wx.navigateTo({ url: `/packageProfile/user-home/user-home?userId=${userId}` });
  },

  onMore() {
    const itemList = this.data.isOwner ? ['编辑帖子', '删除帖子'] : ['举报'];
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (this.data.isOwner) {
          if (res.tapIndex === 0) this.editPost();
          else if (res.tapIndex === 1) this.deletePost();
        } else {
          if (res.tapIndex === 0) this.showReportSheet();
        }
      }
    });
  },

  editPost() {
    app.globalData.editPostData = this.data.post;
    wx.navigateTo({ url: '/packageCommunity/post-edit/post-edit?postId=' + this.data.postId });
  },

  deletePost() {
    wx.showModal({
      title: '确认删除', content: '确定要删除这篇帖子吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await communityApi.deletePost(this.data.postId);
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); }
        }
      }
    });
  },

  showReportSheet() {
    wx.showActionSheet({
      itemList: [...this.data.reportReasons, '取消'],
      success: async (res) => {
        if (res.tapIndex >= this.data.reportReasons.length) return;
        const reason = this.data.reportReasons[res.tapIndex];
        try {
          await new Promise((resolve, reject) => {
            wx.requestSubscribeMessage({
              tmplIds: ['yXtj85psFqKHQsAbcjxFo5wYX8SdU4acoYiENIRpiAE'],
              success: resolve, fail: reject
            });
          });
        } catch (err) { /* user declined, continue anyway */ }
        try {
          await communityApi.createReport({ targetType: 'post', targetId: this.data.postId, reason, detail: '' });
          wx.showToast({ title: '举报已提交', icon: 'success' });
        } catch (err) { wx.showToast({ title: err.message || '提交失败', icon: 'none' }); }
      }
    });
  },

  async showVisitors() {
    this.setData({ showVisitorsPopup: true });
    try {
      const res = await communityApi.getVisitors(this.data.postId);
      if (res.success) {
        const visitors = (res.data.list || []).map(v => { v._viewedDisplay = this.formatTime(v.viewedAt); return v; });
        this.setData({ visitors });
      }
    } catch (err) { console.error('获取访客记录失败', err); wx.showToast({ title: '加载失败', icon: 'none' }); this.setData({ showVisitorsPopup: false, visitors: [] }); }
  },

  closeVisitors() { this.setData({ showVisitorsPopup: false, visitors: [] }); },
  onVisitorsClose(e) { if (!e.detail.visible) this.setData({ showVisitorsPopup: false, visitors: [] }); },

  async toggleLike(e) {
    try {
      const res = await communityApi.toggleLike({ postId: this.data.postId });
      if (res.success) {
        const post = { ...this.data.post };
        post.isLiked = res.data.liked;
        post.likesCount += res.data.liked ? 1 : -1;
        this.setData({ post });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onMarkdownClick(e) {
    const { node } = e.detail || {};
    if (!node) return;
    const href = node.href || '';
    if (/^\d+$/.test(href)) {
      wx.navigateTo({
        url: `/packageProfile/user-home/user-home?userId=${href}`,
      });
    }
  },

  previewImage(e) {
    const url = e.detail?.url || e.currentTarget?.dataset?.url;
    const allImages = [...(this.data.post.images || [])];
    const collectImages = (items) => {
      (items || []).forEach(c => {
        (c.images || []).forEach(img => { if (!allImages.includes(img)) allImages.push(img); });
        collectImages(c.replies);
      });
    };
    collectImages(this.data.comments);
    wx.previewImage({ current: url, urls: allImages.length > 0 ? allImages : [url] });
  },

  getFileIcon(contentType) {
    const FILE_ICONS = {
      'application/pdf': 'file-pdf',
      'application/msword': 'file-word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-word',
      'application/vnd.ms-excel': 'file-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
      'application/zip': 'file-zip',
      'application/x-rar-compressed': 'file-zip',
      'text/plain': 'file-txt',
      'text/csv': 'file-csv',
      'image/': 'file-image',
    };
    const key = Object.keys(FILE_ICONS).find(k => contentType && contentType.startsWith(k));
    return FILE_ICONS[key] || 'file-unknown';
  },

  isFileExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  },

  getFileRemainingDays(expiresAt) {
    if (!expiresAt) return null;
    const remaining = (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24);
    return Math.ceil(remaining);
  },

  openFile(e) {
    const index = e.currentTarget.dataset.index;
    const file = this.data.post.files[index];
    if (!file || this.isFileExpired(file.expires_at)) return;

    wx.showLoading({ title: '下载中...' });
    wx.downloadFile({
      url: file.raw_url || file.url,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            success: () => {},
            fail: () => {
              wx.showToast({ title: '打开文件失败', icon: 'none' });
            }
          });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '下载文件失败', icon: 'none' });
      }
    });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      let date;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
        date = new Date(dateStr);
      } else if (typeof dateStr === 'string') {
        const s = dateStr.replace('T', ' ').replace(/\.\d+Z$/, '');
        const p = s.split(/[- :]/);
        date = new Date(+p[0], +p[1] - 1, +p[2], +(p[3]||0), +(p[4]||0), +(p[5]||0));
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) { console.warn('[post-detail formatTime] Invalid date:', dateStr); return ''; }
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return date.getFullYear() + '年' + m + '月' + d + '日 ' + h + ':' + min;
    } catch (e) { console.warn('[post-detail formatTime] error:', e, dateStr); return ''; }
  }
});
