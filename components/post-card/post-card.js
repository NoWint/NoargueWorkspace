Component({
  properties: {
    post: { type: Object, value: {} },
    showAuthor: { type: Boolean, value: true },
    compact: { type: Boolean, value: false },
    showStats: { type: Boolean, value: true },
    expanded: { type: Boolean, value: false },
    fileExpanded: { type: Boolean, value: false },
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
          displayBody: body.replace(/@?\[([^\]]+)\]\(\d+\)/g, (m, name) => {
            return name.startsWith('@') ? name : `@${name}`;
          }),
        });
      } else {
        this.setData({ displayBody: '' });
      }
    },
    'post'(post) {
      if (post && post.files && post.files.length > 0) {
        const iconMap = {};
        post.files.forEach((f, i) => {
          const icon = this.getFileIcon(f.content_type, f.filename);
          console.log('[post-card] file['+i+']:', f.filename, 'type:', f.content_type, '→ icon:', icon);
          iconMap['post.files['+i+']._icon'] = icon;
        });
        this.setData(iconMap);
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
    onTapFileExpand(e) {
      this.triggerEvent('tapFileExpand', { postId: this.data.post.postId });
    },
    onTapFile(e) {
      const index = e.currentTarget.dataset.index;
      const file = this.data.post.files[index];
      if (file && !this.isFileExpired(file.expires_at)) {
        this.triggerEvent('tapFile', { index, file });
      }
    },
    getFileIcon(contentType, filename) {
      if (!contentType && !filename) return 'file-unknown';
      const ct = (contentType || '').toLowerCase();
      const ext = filename ? filename.split('.').pop().toLowerCase() : '';
      console.log('[post-card getFileIcon] contentType:', contentType, 'ct:', ct, 'ext:', ext, 'filename:', filename);
      const FILE_ICONS = {
        'application/pdf': 'file-pdf', 'pdf': 'file-pdf',
        'application/msword': 'file-word', 'doc': 'file-word', 'docx': 'file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-word',
        'application/vnd.ms-excel': 'file-excel', 'xls': 'file-excel', 'xlsx': 'file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
        'application/vnd.ms-powerpoint': 'file-powerpoint', 'ppt': 'file-powerpoint', 'pptx': 'file-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'file-powerpoint',
        'application/json': 'file-json', 'json': 'file-json',
        'application/zip': 'file-zip', 'zip': 'file-zip', 'rar': 'file-zip',
        'application/x-rar-compressed': 'file-zip',
        'application/x-yaml': 'file-yaml', 'text/yaml': 'file-yaml', 'text/x-yaml': 'file-yaml', 'yaml': 'file-yaml', 'yml': 'file-yaml',
        'text/plain': 'file-txt', 'txt': 'file-txt', 'text': 'file-txt',
        'text/csv': 'file-csv', 'csv': 'file-csv',
        'text/html': 'file-code', 'html': 'file-code', 'htm': 'file-code',
        'application/javascript': 'file-code', 'js': 'file-code',
        'application/x-paste': 'file-paste',
        'application/vnd.ms-outlook': 'file-outlook',
        'application/onenote': 'file-onenote', 'application/vnd.ms-onenote': 'file-onenote',
        'image/': 'file-image',
      };
      const key = Object.keys(FILE_ICONS).find(k => ct.startsWith(k));
      if (key) {
        console.log('[post-card getFileIcon] matched MIME key:', key, '→', FILE_ICONS[key]);
        return FILE_ICONS[key];
      }
      if (ext) {
        const extKey = Object.keys(FILE_ICONS).find(k => ext === k);
        if (extKey) {
          console.log('[post-card getFileIcon] matched EXT key:', extKey, '→', FILE_ICONS[extKey]);
          return FILE_ICONS[extKey];
        }
      }
      console.log('[post-card getFileIcon] NO MATCH, returning file-unknown');
      return 'file-unknown';
    },
    isFileExpired(expiresAt) {
      if (!expiresAt) return false;
      return new Date(expiresAt) < new Date();
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
    noop() {},
    onAvatarError() {
      this.triggerEvent('avatarError');
    },
    onBodyMarkdownClick(e) {
      const { node } = e.detail || {};
      if (!node) return;
      const href = node.href || '';
      if (/^\d+$/.test(href)) {
        wx.navigateTo({
          url: `/packageProfile/user-home/user-home?userId=${href}`,
        });
      }
    }
  }
});
