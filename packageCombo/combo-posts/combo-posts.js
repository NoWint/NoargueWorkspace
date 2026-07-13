const { communityApi } = require('../../utils/api.js');

function getDocFileType(contentType, ext) {
  if (contentType.includes('pdf') || ext === 'pdf') return 'pdf';
  if (contentType.includes('word') || ['doc', 'docx'].includes(ext)) return 'doc';
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
  if (contentType.includes('powerpoint') || contentType.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return 'ppt';
  return null;
}

Page({
  data: {
    comboId: '',
    comboPosts: [],
    comboPostsCursor: null,
    comboPostsHasMore: false,
    loadingPosts: false,
    expandedFilePostId: null,
    showBackTop: false,
  },

  onLoad(options) {
    this.setData({ comboId: options.comboId });
    this.loadComboPosts();
  },

  onPullDownRefresh() {
    this.setData({ comboPosts: [], comboPostsCursor: null, comboPostsHasMore: false });
    this.loadComboPosts().then(() => wx.stopPullDownRefresh());
  },

  async loadComboPosts() {
    if (this.data.loadingPosts) return;
    this.setData({ loadingPosts: true });
    try {
      const res = await communityApi.getComboPosts(this.data.comboId, {
        cursor: this.data.comboPostsCursor,
      });
      if (res.success && res.data) {
        const posts = (res.data.list || []).map(p => ({
          ...p,
          user: p.user || { nickname: '匿名' },
        }));
        this.setData({
          comboPosts: this.data.comboPostsCursor
            ? [...this.data.comboPosts, ...posts]
            : posts,
          comboPostsCursor: res.data.nextCursor,
          comboPostsHasMore: res.data.hasMore,
          loadingPosts: false,
        });
      } else {
        this.setData({ loadingPosts: false });
      }
    } catch (err) {
      this.setData({ loadingPosts: false });
    }
  },

  loadMoreComboPosts() {
    if (this.data.comboPostsHasMore && !this.data.loadingPosts) {
      this.loadComboPosts();
    }
  },

  navigateToCreatePost() {
    wx.navigateTo({
      url: `/packageCommunity/post-edit/post-edit?comboId=${this.data.comboId}`,
    });
  },

  navigateToPostDetail(e) {
    const postId = e.detail?.postId || e.currentTarget?.dataset?.postid;
    if (!postId) return;
    wx.navigateTo({
      url: `/packageCommunity/post-detail/post-detail?postId=${postId}`,
    });
  },

  toggleFileExpand(e) {
    const postId = e.detail?.postId;
    this.setData({
      expandedFilePostId: this.data.expandedFilePostId === postId ? null : postId,
    });
  },

  openFile(e) {
    const { file } = e.detail || {};
    if (!file) return;
    const url = file.raw_url || file.url;
    if (!url) { wx.showToast({ title: '文件地址无效', icon: 'none' }); return; }

    const ext = file.filename ? file.filename.split('.').pop().toLowerCase() : '';
    const ct = (file.content_type || '').toLowerCase();

    if (ct.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
      wx.previewImage({ urls: [url] });
      return;
    }

    wx.showLoading({ title: '下载中...' });
    wx.downloadFile({
      url,
      success(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: getDocFileType(ct, ext),
            showMenu: true,
            success: () => {},
            fail: () => { wx.showToast({ title: '打开文件失败', icon: 'none' }); },
          });
        }
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '下载文件失败', icon: 'none' });
      },
    });
  },

  onPageScroll(e) {
    const show = e.scrollTop > 300;
    if (this.data.showBackTop !== show) {
      this.setData({ showBackTop: show });
    }
  },

  onToTop() {
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },
});
