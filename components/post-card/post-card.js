Component({
  properties: {
    post: { type: Object, value: {} },
    showAuthor: { type: Boolean, value: true },
    compact: { type: Boolean, value: false },
    showStats: { type: Boolean, value: true },
    expanded: { type: Boolean, value: false },
    todoItems: { type: Array, value: [] },
    renderMarkdown: { type: Boolean, value: false }
  },
  data: {
    displayBody: ''
  },
  observers: {
    'post.body'(body) {
      if (body) {
        this.setData({
          displayBody: body.replace(/\[([^\]]+)\]\(\d+\)/g, '$1'),
        });
      } else {
        this.setData({ displayBody: '' });
      }
    },
  },
  methods: {
    onTapAuthor(e) {
      this.triggerEvent('tapAuthor', { userId: this.data.post.user.id, post: this.data.post });
    },
    onTapCard(e) {
      this.triggerEvent('tapCard', { postId: this.data.post.postId });
    },
    onTapDetail(e) {
      this.triggerEvent('tapDetail', { postId: this.data.post.postId });
    },
    onTapImage(e) {
      const url = e.currentTarget.dataset.url;
      this.triggerEvent('tapImage', { url, images: this.data.post.images });
    },
    onTapTodoExpand(e) {
      this.triggerEvent('tapTodoExpand', { postId: this.data.post.postId });
    },
    onTapTodo(e) {
      const { todoId, creatorName, creatorAvatar, creatorId, postId } = e.currentTarget.dataset;
      this.triggerEvent('tapTodo', { todoId, creatorName, creatorAvatar, creatorId, postId });
    },
    onTapCombo(e) {
      const code = e.currentTarget.dataset.code;
      this.triggerEvent('tapCombo', { shareCode: code });
    },
    onTapLocation(e) {
      const { lat, lng, name } = e.currentTarget.dataset;
      this.triggerEvent('tapLocation', { lat, lng, name });
    },
    onToggleLike(e) {
      const postId = e.currentTarget.dataset.postId;
      this.triggerEvent('toggleLike', { postId });
    },
    onAvatarError() {
      this.triggerEvent('avatarError');
    },
    onBodyMarkdownClick(e) {
      const { node } = e.detail || {};
      if (!node) return;
      const href = node.href || '';
      if (/^\d+$/.test(href)) {
        wx.navigateTo({
          url: `/packagePages/user-center/user-center?userId=${href}`,
        });
      }
    }
  }
});
