const app = getApp();
const { combosApi, requireLogin, isLoggedIn } = require('../../utils/api.js');
const { getLocalTodos, saveTodo } = require('../../utils/sync.js');
const { formatFriendlyDate } = require('../../utils/util.js');

const iconCategories = {
  '常用': ['folder', 'work', 'book', 'star', 'cart', 'command', 'terminal-rectangle-1', 'verified', 'heart', 'city-1', 'tea'],
  '智能': ['ai', 'ai-1', 'ai-article', 'ai-book-open', 'ai-chart-bar', 'ai-coordinate-system', 'ai-cut', 'ai-edit', 'ai-edit-1', 'ai-education', 'ai-git-branch', 'ai-image', 'ai-image-1', 'ai-layout', 'ai-music', 'ai-screenshot', 'ai-search', 'ai-terminal', 'ai-terminal-1', 'ai-textformat-italic', 'ai-tool', 'ai-video', 'robot', 'robot-1', 'robot-2'],
  '行动': ['ability-open', 'accessibility', 'add', 'address-book', 'alarm', 'alarm-add', 'alarm-off', 'analytics', 'anchor', 'api', 'article', 'assignment', 'assignment-checked', 'assignment-code', 'assignment-error', 'assignment-user', 'backup', 'barcode', 'book', 'bookmark', 'bookmark-add', 'bookmark-checked', 'bookmark-double', 'bookmark-minus', 'browse', 'browse-gallery', 'browse-off', 'bug-report', 'calendar-1', 'calendar-2', 'calendar-3', 'calendar-edit', 'calendar-event', 'cardmembership', 'cart', 'cart-add', 'chart', 'chart-add', 'chat-bubble-help', 'check', 'check-double', 'close', 'close-rectangle', 'collection-1', 'color-invert', 'contribute', 'copyright', 'correct', 'creditcard', 'creditcard-add', 'creditcard-off', 'currency-exchange', 'dashboard-1', 'delete', 'delete-1', 'edit', 'edit-off', 'explore', 'explore-off', 'export', 'extension', 'extension-off', 'fact-check', 'file-attachment', 'file-restore', 'fingerprint', 'flag', 'flag-1', 'flag-2', 'flag-3', 'flight-landing', 'flight-takeoff', 'flip-to-back', 'flip-to-front', 'gift', 'grid-add', 'grid-view', 'heart', 'help-rectangle', 'high-level', 'history', 'history-setting', 'home', 'https', 'import', 'install-desktop', 'install-mobile', 'institution', 'institution-checked', 'internet', 'jump', 'jump-double', 'jump-off', 'key', 'leaderboard', 'lightbulb', 'lightbulb-circle', 'lighting-circle', 'location-1', 'lock-checked', 'lock-off', 'lock-on', 'lock-time', 'mark-as-unread', 'mobile-blocked', 'mobile-list', 'mobile-shortcut', 'mode-embedding', 'module', 'money', 'move', 'notification-circle', 'outbox', 'page-included', 'pending', 'percent', 'poweroff', 'print', 'radar', 'refresh', 'remove', 'rocket', 'saving-pot', 'search', 'search-error', 'secured', 'send', 'send-cancel', 'sensors', 'sensors-off', 'server', 'setting', 'setting-1', 'shop', 'star', 'sticky-note', 'store', 'support', 'task-add-1', 'task-checked-1', 'terminal-rectangle-1', 'theaters', 'thumb-down', 'thumb-up', 'tools', 'tools-circle', 'translate', 'translate-1', 'trending-down', 'trending-up', 'vehicle', 'verified', 'view-agenda', 'view-in-ar', 'wallet', 'wealth', 'wealth-1', 'work', 'work-history', 'work-off', 'zoom-in', 'zoom-out'],
  '警报': ['check-circle', 'close-circle', 'close-octagon', 'delete-time', 'error-circle', 'error-triangle', 'help-circle', 'info-circle', 'minus-circle', 'no-result', 'notification', 'notification-add', 'notification-error', 'shield-error', 'time'],
  '箭头': ['arrow-down', 'arrow-down-circle', 'arrow-down-rectangle', 'arrow-left', 'arrow-left-circle', 'arrow-left-down', 'arrow-left-down-circle', 'arrow-left-right-1', 'arrow-left-right-2', 'arrow-left-right-3', 'arrow-left-right-circle', 'arrow-left-up', 'arrow-left-up-circle', 'arrow-right', 'arrow-right-circle', 'arrow-right-down', 'arrow-right-down-circle', 'arrow-right-up', 'arrow-right-up-circle', 'arrow-triangle-down', 'arrow-triangle-up', 'arrow-up', 'arrow-up-circle', 'arrow-up-down-1', 'arrow-up-down-2', 'arrow-up-down-3', 'arrow-up-down-circle', 'backtop', 'backtop-rectangle', 'caret-down', 'caret-down-small', 'caret-left', 'caret-left-small', 'caret-right', 'caret-right-small', 'caret-up', 'caret-up-small', 'chevron-down', 'chevron-down-circle', 'chevron-down-double', 'chevron-down-double-s', 'chevron-down-rectangle', 'chevron-down-s', 'chevron-left', 'chevron-left-circle', 'chevron-left-double', 'chevron-left-double-s', 'chevron-left-rectangle', 'chevron-left-s', 'chevron-right', 'chevron-right-circle', 'chevron-right-double', 'chevron-right-double-s', 'chevron-right-rectangle', 'chevron-right-s', 'chevron-up', 'chevron-up-circle', 'chevron-up-double', 'chevron-up-double-s', 'chevron-up-rectangle', 'chevron-up-s', 'download', 'enter', 'expand-horizontal', 'expand-vertical', 'fullscreen-1', 'fullscreen-2', 'fullscreen-exit', 'fullscreen-exit-1', 'highlight', 'login', 'logout', 'move-1', 'order-adjustment-column', 'rollback', 'rollfront', 'shrink-horizontal', 'shrink-vertical', 'size-change', 'swap', 'swap-left', 'swap-right', 'unfold-less', 'unfold-more', 'upload'],
  '品牌': ['logo-adobe-illustrate', 'logo-adobe-lightroom', 'logo-adobe-photoshop', 'logo-alipay', 'logo-android', 'logo-apple', 'logo-behance', 'logo-chrome', 'logo-cinema4d', 'logo-cnb', 'logo-codepen', 'logo-codesandbox', 'logo-codesign', 'logo-dribbble', 'logo-facebook', 'logo-figma', 'logo-framer', 'logo-github', 'logo-gitlab', 'logo-hiflow', 'logo-ie', 'logo-instagram', 'logo-iwiki', 'logo-markdown', 'logo-miniprogram', 'logo-qq', 'logo-stackblitz', 'logo-tapd', 'logo-tbeacon', 'logo-tdesign', 'logo-tencentcode', 'logo-tencentmeeting', 'logo-twitter', 'logo-wechat-stroke', 'logo-wechat-workdocs', 'logo-wechatpay', 'logo-wecom', 'logo-windows', 'logo-xiaomareport', 'logo-youtube'],
  '建筑': ['architecture-hui-style', 'archway', 'archway-1', 'attic', 'attic-1', 'bridge', 'bridge-1', 'bridge-2', 'bridge-3', 'bridge-4', 'bridge-5', 'bridge-6', 'building', 'building-1', 'building-2', 'building-3', 'building-4', 'building-5', 'castle', 'castle-1', 'castle-2', 'castle-3', 'castle-4', 'castle-5', 'castle-6', 'castle-7', 'chimney', 'chimney-1', 'chimney-2', 'church', 'city', 'city-1', 'city-10', 'city-11', 'city-12', 'city-13', 'city-14', 'city-15', 'city-2', 'city-3', 'city-4', 'city-5', 'city-6', 'city-7', 'city-8', 'city-9', 'city-ancient', 'city-ancient-1', 'city-ancient-2', 'curtain', 'dam', 'dam-1', 'dam-2', 'dam-3', 'dam-4', 'dam-5', 'dam-6', 'dam-7', 'double-storey', 'ferris-wheel', 'forest', 'hospital', 'hospital-1', 'houses', 'houses-1', 'houses-2', 'lighthouse', 'lighthouse-1', 'lighthouse-2', 'monument', 'mosque', 'mosque-1', 'museum', 'museum-1', 'museum-2', 'opera', 'palace', 'palace-1', 'palace-2', 'palace-3', 'palace-4', 'patio', 'pearl-of-the-orient', 'pyramid', 'pyramid-maya', 'sailing-hotel', 'shimen', 'shop-1', 'shop-2', 'shop-3', 'shop-4', 'shop-5', 'statue-of-jesus', 'teahouse', 'temple', 'tower', 'tower-1', 'tower-2', 'tower-3', 'tower-clock', 'town', 'window', 'window-1'],
  '图表': ['activity', 'calculation', 'chart-3d', 'chart-analytics', 'chart-area', 'chart-area-multi', 'chart-bar', 'chart-bubble', 'chart-column', 'chart-combo', 'chart-draw-io', 'chart-line', 'chart-line-board', 'chart-line-data', 'chart-line-data-1', 'chart-line-multi', 'chart-maximum', 'chart-median', 'chart-minimum', 'chart-pie', 'chart-radar', 'chart-radial', 'chart-ring', 'chart-ring-1', 'chart-scatter', 'chart-stacked', 'fork', 'mind-map', 'object-storage', 'sequence', 'table', 'table-add', 'table-split', 'tree-catalog', 'tree-round-dot', 'tree-round-dot-vertical', 'tree-square-dot', 'tree-square-dot-vertical', 'usercase', 'usercase-link', 'view-gantt', 'view-image', 'view-organization'],
  '沟通': ['chat', 'chat-add', 'chat-bubble', 'chat-bubble-history', 'chat-bubble-locked', 'chat-bubble-smile', 'chat-checked', 'chat-clear', 'chat-double', 'chat-error', 'chat-heart', 'chat-message', 'chat-off', 'chat-poll', 'chat-setting', 'dialog-history', 'forum', 'mentioned', 'questionnaire', 'questionnaire-double', 'tips', 'tips-double'],
  '组件': ['button', 'calendar', 'card', 'chat-bubble-error', 'column-layout', 'component-breadcrumb', 'component-checkbox', 'component-divider-horizontal', 'component-divider-vertical', 'component-dropdown', 'component-grid', 'component-input', 'component-layout', 'component-radio', 'component-space', 'component-steps', 'component-steps-1', 'component-stickytool', 'component-switch', 'data-display', 'expand-down', 'expand-up', 'form', 'horizontal', 'icon', 'image-carousel', 'link', 'link-unlink', 'menu', 'page-head', 'page-tab', 'scroll-bar', 'slideshow', 'tab', 'table-2', 'tag', 'tag-state', 'typography', 'vertical'],
  '设计': ['anticlockwise', 'artboard', 'brush', 'clear-formatting-1', 'collage', 'contrast', 'cut', 'dividers-1', 'draft', 'drag-drop', 'drag-move', 'edit-1', 'edit-2', 'fill-color', 'focus', 'format-horizontal-align-bottom', 'format-horizontal-align-center', 'format-horizontal-align-top', 'frame-1', 'ink', 'layers', 'layout', 'measurement-2', 'mirror', 'mosaic', 'palette-1', 'pen', 'pen-ball', 'pen-brush', 'pen-fluorescence', 'pen-mark', 'pen-quill', 'placeholder', 'root-list', 'rotation', 'screenshot', 'sip', 'slice', 'table-1', 'textbox', 'transform-1', 'transform-3', 'view-column'],
  '开发': ['braces', 'brackets', 'bug', 'code', 'code-1', 'code-off', 'command', 'css3', 'cursor', 'flowchart', 'git-branch', 'git-commit', 'git-commit-1', 'git-merge', 'git-pull-request', 'git-repository', 'git-repository-commits', 'git-repository-private', 'graphviz', 'html5', 'mermaid', 'parentheses', 'plantuml', 'sitemap', 'terminal', 'terminal-rectangle', 'terminal-window'],
  '设备': ['airplay-wave', 'audio', 'automation', 'barcode-1', 'base-station', 'battery', 'battery-add', 'battery-charging', 'battery-low', 'bluetooth', 'call', 'call-1', 'call-cancel', 'call-forwarded', 'call-incoming', 'call-off', 'camera', 'camera-off', 'cast', 'cpu', 'data', 'data-base', 'data-checked', 'data-error', 'data-search', 'desktop', 'desktop-1', 'device', 'film', 'flashlight', 'gamepad', 'gps', 'hard-drive', 'hotspot-wave', 'install', 'keyboard', 'laptop', 'mobile', 'mobile-vibrate', 'mode-dark', 'mode-light', 'mode-preview', 'mouse', 'phone-locked', 'phone-search', 'precise-monitor', 'qrcode', 'remote-wave', 'rotate', 'rotate-locked', 'router-wave', 'rss', 'save', 'scan', 'sd-card', 'sensors-1', 'sim-card', 'sim-card-1', 'sim-card-2', 'tv', 'tv-1', 'tv-2', 'uninstall', 'usb', 'video-camera', 'watch', 'widget', 'wifi', 'wifi-1', 'wifi-no', 'wifi-off', 'wifi-off-1'],
  '文档': ['abstract', 'add-circle', 'align-bottom', 'align-top', 'align-vertical', 'attach', 'attachment-list', 'automatic-numbering', 'bulletpoint', 'chat-bubble-1', 'chat-bubble-add', 'chinese-rectangle', 'clear', 'clear-formatting', 'collapsible-block', 'cut-1', 'document-location', 'document-popular', 'document-update', 'english-rectangle', 'error', 'file-edit', 'filter-1', 'font-background', 'format-painter', 'format-vertical-align-center', 'format-vertical-align-left', 'format-vertical-align-right', 'frame', 'functions', 'hashtag', 'help', 'highlighted-block', 'indent-left', 'indent-right', 'japanese-rectangle', 'korean-rectangle', 'line-height', 'list-bug', 'list-demand', 'member', 'merge-cells', 'mode-text', 'order', 'order-ascending', 'order-descending', 'order-list', 'quote', 'seal', 'share-1', 'space', 'subscript', 'summary', 'superscript', 'text', 'text-drawing', 'text-style', 'textformat-bold', 'textformat-color', 'textformat-italic', 'textformat-longer', 'textformat-shorter', 'textformat-strikethrough', 'textformat-underline', 'textformat-wrap', 'view-list'],
  '表情': ['angry', 'awkward', 'bad-laugh', 'calm', 'calm-1', 'cat', 'crack', 'crooked-smile', 'cry-and-laugh', 'cry-loudly', 'depressed', 'despise', 'dissatisfaction', 'doge', 'emo-emotional', 'excited', 'excited-1', 'feel-at-ease', 'ferocious', 'flip-smiling-face', 'giggle', 'happy', 'joyful', 'look-around', 'no-expression', 'open-mouth', 'pout', 'roast', 'serenity', 'shutup', 'sinister-smile', 'sleep', 'smile', 'sneer', 'speechless', 'speechless-1', 'surprised', 'surprised-1', 'swear-1', 'swear-2', 'uncomfortable', 'uncomfortable-1', 'uncomfortable-2', 'unhappy', 'unhappy-1', 'wink', 'wry-smile'],
  '文件': ['bill', 'book-open', 'book-unknown', 'catalog', 'catalog-1', 'certificate', 'cloud-download', 'cloud-upload', 'collection', 'constraint', 'copy', 'coupon', 'course', 'discount', 'discount-list', 'download-1', 'file', 'file-1', 'file-add', 'file-add-1', 'file-blocked', 'file-code', 'file-code-1', 'file-copy', 'file-csv', 'file-download', 'file-excel', 'file-export', 'file-icon', 'file-image', 'file-import', 'file-json', 'file-locked', 'file-markdown', 'file-minus', 'file-music', 'file-onenote', 'file-outlook', 'file-paste', 'file-pdf', 'file-powerpoint', 'file-safety', 'file-search', 'file-setting', 'file-teams', 'file-transmit', 'file-transmit-double', 'file-txt', 'file-unknown', 'file-unlocked', 'file-word', 'file-yaml', 'file-zip', 'folder', 'folder-1', 'folder-add', 'folder-add-1', 'folder-blocked', 'folder-details', 'folder-export', 'folder-import', 'folder-locked', 'folder-minus', 'folder-move', 'folder-off', 'folder-open', 'folder-open-1', 'folder-search', 'folder-setting', 'folder-shared', 'folder-unlocked', 'folder-zip', 'hd', 'link-1', 'link-transform', 'media-library', 'music-1', 'music-2', 'paste', 'rename', 'screen-4k', 'subtitle', 'task', 'task-1', 'task-add', 'task-checked', 'task-double', 'task-error', 'task-location', 'task-marked', 'task-setting', 'task-time', 'task-visible', 'template', 'ticket', 'upload-1'],
  '食品': ['apple', 'bamboo-shoot', 'banana', 'barbecue', 'bean', 'beer', 'bone', 'bread', 'broccoli', 'cabbage', 'cake', 'candy', 'cheese', 'cherry', 'chicken', 'chili', 'chinese-cabbage', 'cola', 'corn', 'cucumber', 'drink', 'drumstick', 'eggplant', 'fish', 'fries', 'garlic', 'grape', 'green-onion', 'hamburger', 'ice-cream', 'lemon', 'lemon-slice', 'liquor', 'meat-pepper', 'milk', 'mushroom', 'mushroom-1', 'noodle', 'nut', 'pea', 'peach', 'pear', 'popsicle', 'pumpkin', 'radish', 'rice', 'rice-ball', 'sandwich', 'sausage', 'shrimp', 'tangerinr', 'tea', 'tomato', 'watermelon'],
  '手势': ['fingerprint-1', 'fingerprint-2', 'fingerprint-3', 'gesture-applause', 'gesture-click', 'gesture-down', 'gesture-expansion', 'gesture-left', 'gesture-left-slip', 'gesture-open', 'gesture-pray', 'gesture-press', 'gesture-ranslation', 'gesture-right', 'gesture-right-slip', 'gesture-slide-left-and-right', 'gesture-slide-up', 'gesture-typing', 'gesture-up', 'gesture-up-and-down', 'gesture-wipe-down', 'thumb-down-1', 'thumb-down-2', 'thumb-up-1', 'thumb-up-2', 'undertake', 'undertake-delivery', 'undertake-environment-protection', 'undertake-hold-up', 'undertake-transaction', 'wave-bye', 'wave-left', 'wave-right'],
  '图片': ['adjustment', 'animation', 'animation-1', 'brightness', 'brightness-1', 'center-focus-strong', 'circle', 'contrast-1', 'exposure', 'face-retouching', 'fill-color-1', 'filter-2', 'filter-3', 'highlight-1', 'image', 'image-1', 'image-add', 'image-edit', 'image-error', 'image-off', 'image-search', 'markup', 'measurement', 'measurement-1', 'palette', 'panorama-horizontal', 'panorama-vertical', 'pantone', 'portrait', 'rectangle', 'round', 'saturation', 'sharpness', 'transform', 'transform-2', 'visual-recognition'],
  '字母': ['letters-a', 'letters-b', 'letters-c', 'letters-d', 'letters-e', 'letters-f', 'letters-g', 'letters-h', 'letters-i', 'letters-j', 'letters-k', 'letters-l', 'letters-m', 'letters-n', 'letters-o', 'letters-p', 'letters-q', 'letters-r', 'letters-s', 'letters-t', 'letters-u', 'letters-v', 'letters-w', 'letters-x', 'letters-y', 'letters-z'],
  '地图': ['camera-2', 'compass', 'compass-1', 'downscale', 'earth', 'indicator', 'location', 'location-enlargement', 'location-error', 'location-parking-place', 'location-reduction', 'location-setting', 'map', 'map-3d', 'map-add', 'map-aiming', 'map-blocked', 'map-bubble', 'map-cancel', 'map-chat', 'map-checked', 'map-collection', 'map-connection', 'map-distance', 'map-double', 'map-edit', 'map-grid', 'map-information', 'map-information-1', 'map-information-2', 'map-location', 'map-locked', 'map-marked', 'map-navigation', 'map-outline', 'map-route-planning', 'map-ruler', 'map-safety', 'map-search', 'map-search-1', 'map-setting', 'map-unlocked', 'mobile-navigation', 'navigation-arrow', 'pin', 'street-road', 'street-road-1', 'subway-line', 'traffic', 'traffic-events', 'upscale'],
  '数学': ['add-and-subtract', 'alpha', 'beta', 'bifurcate', 'calculation-1', 'calculator-1', 'centimeter', 'combination', 'coordinate-system', 'curve', 'delta', 'divide', 'dividers', 'equal', 'formula', 'function-curve', 'functions-1', 'gamma', 'greater-than', 'greater-than-or-equal', 'less-than', 'less-than-or-equal', 'mathematics', 'minus', 'multiply', 'parabola', 'pi', 'plus', 'quadratic', 'relation', 'ruler', 'slash', 'sum'],
  '媒体': ['backward', 'calculator', 'camera-1', 'cd', 'dart-board', 'download-2', 'dv', 'dvd', 'earphone', 'film-1', 'forward', 'gamepad-1', 'guitar', 'ipod', 'loudspeaker', 'microphone', 'microphone-1', 'microphone-2', 'movie-clapper', 'music', 'music-rectangle-add', 'next', 'page-first', 'page-last', 'pause', 'pause-circle', 'pause-circle-stroke', 'piano', 'play', 'play-chart', 'play-circle', 'play-circle-stroke', 'play-circle-stroke-add', 'play-demo', 'play-rectangle', 'previous', 'radio-1', 'radio-2', 'replay', 'screen-mirroring', 'screencast', 'sd-card-1', 'sensors-2', 'shutter', 'sonic', 'sound', 'sound-down', 'sound-high', 'sound-low', 'sound-mute', 'sound-mute-1', 'sound-up', 'stop', 'stop-circle', 'stop-circle-stroke', 'tape', 'video', 'video-camera-1', 'video-camera-2', 'video-camera-dollar', 'video-camera-minus', 'video-camera-music', 'video-camera-off', 'video-library'],
  '数字': ['numbers-0', 'numbers-0-1', 'numbers-1', 'numbers-1-1', 'numbers-2', 'numbers-2-1', 'numbers-3', 'numbers-3-1', 'numbers-4', 'numbers-4-1', 'numbers-5', 'numbers-5-1', 'numbers-6', 'numbers-6-1', 'numbers-7', 'numbers-7-1', 'numbers-8', 'numbers-8-1', 'numbers-9', 'numbers-9-1', 'numbers-circle-1', 'numbers-circle-2', 'numbers-circle-3', 'numbers-circle-4'],
  '系统': ['add-rectangle', 'app', 'application', 'check-rectangle', 'control-platform', 'dashboard', 'ellipsis', 'filter', 'filter-clear', 'filter-off', 'filter-sort', 'hard-disk-storage', 'hourglass', 'load', 'loading', 'mail', 'menu-application', 'menu-fold', 'menu-unfold', 'minus-rectangle', 'more', 'queue', 'relativity', 'service', 'share', 'shortcut', 'system-2', 'system-3', 'system-application', 'system-blocked', 'system-code', 'system-components', 'system-coordinate', 'system-device', 'system-interface', 'system-location', 'system-locked', 'system-log', 'system-marked', 'system-messages', 'system-regulation', 'system-search', 'system-setting', 'system-storage', 'system-sum', 'system-unlocked', 'view-module', 'web'],
  '用户': ['certificate-1', 'cooperate', 'education', 'flag-4', 'gender-female', 'gender-male', 'personal-information', 'user', 'user-1', 'user-add', 'user-arrow-down', 'user-arrow-left', 'user-arrow-right', 'user-arrow-up', 'user-avatar', 'user-blocked', 'user-business', 'user-checked', 'user-checked-1', 'user-circle', 'user-clear', 'user-error-1', 'user-invisible', 'user-list', 'user-locked', 'user-marked', 'user-password', 'user-safety', 'user-search', 'user-setting', 'user-talk', 'user-talk-1', 'user-talk-off-1', 'user-time', 'user-transmit', 'user-unknown', 'user-unlocked', 'user-vip', 'user-visible', 'usergroup', 'usergroup-add', 'usergroup-circle', 'usergroup-clear', 'verify'],
  '天气': ['celsius', 'cloud', 'cloudy-day', 'cloudy-night', 'cloudy-night-rain', 'cloudy-rain', 'cloudy-sunny', 'fahrenheit-scale', 'fog', 'fog-night', 'fog-sunny', 'moon']
};

Page({
  data: {
    name: '',
    description: '',
    icon: 'folder',
    color: '#00B26A',
    isShared: false,
    memberLimit: 50,
    todoIds: [],
    
    icons: iconCategories['常用'],
    colors: ['#00B26A', '#1890FF', '#722ED1', '#FA8C16', '#C8CA4F', '#13C2C2', 'custom'],
    
    selectedTodoCount: 0,
    
    popupVisible: false,
    availableTodos: [],
    tempSelectedTodoIds: [],
    colorPickerVisible: false,
    customColor: '',
    colorPickerSelected: false,
    
    moreIconVisible: false,
    iconCategories: iconCategories,
    categoryNames: Object.keys(iconCategories),
    currentCategory: '常用',
    iconNotInCommon: false
  },

  updateIconNotInCommon() {
    const { icon } = this.data;
    const commonIcons = iconCategories['常用'];
    const iconNotInCommon = !commonIcons.includes(icon);
    this.setData({ iconNotInCommon });
  },

  onLoad(options) {
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '创建组合需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
          if (res.cancel) {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    if (options.isShared === '1') {
      this.setData({ isShared: true });
    }
    
    if (options.edit && options.id) {
      wx.setNavigationBarTitle({ title: '编辑组合' });
      this.loadComboData(options.id);
    } else {
      this.loadAvailableTodos();
    }
  },

  loadAvailableTodos() {
    const todos = getLocalTodos();
    const availableTodos = todos.filter(t => {
      const cid = t.comboId;
      return cid === undefined || cid === null || cid === '' || cid === 'null' || cid === 'undefined';
    }).map(t => {
      let images = [];
      if (t.images) {
        if (typeof t.images === 'string') {
          try {
            images = JSON.parse(t.images);
            if (!Array.isArray(images)) images = [];
          } catch (e) {
            images = [];
          }
        } else if (Array.isArray(t.images)) {
          images = t.images;
        }
      }
      return { ...t, images, friendlyDate: formatFriendlyDate(t.setDate) };
    });
    this.setData({ 
      availableTodos,
      tempSelectedTodoIds: []
    });
  },

  showTodoPopup() {
    this.loadAvailableTodos();
    const { todoIds } = this.data;
    this.setData({ 
      popupVisible: true,
      tempSelectedTodoIds: [...todoIds],
      selectedTodoCount: todoIds.length
    });
  },

  hideTodoPopup() {
    this.setData({ popupVisible: false });
  },

  onPopupVisibleChange(e) {
    if (!e.detail.visible) {
      this.setData({ popupVisible: false });
    }
  },

  toggleTodoSelection(e) {
    const todoId = String(e.currentTarget.dataset.id);
    const tempSelectedTodoIds = [...this.data.tempSelectedTodoIds];
    const index = tempSelectedTodoIds.findIndex(id => String(id) === todoId);
    
    if (index > -1) {
      tempSelectedTodoIds.splice(index, 1);
    } else {
      tempSelectedTodoIds.push(todoId);
    }
    
    this.setData({ 
      tempSelectedTodoIds,
      selectedTodoCount: tempSelectedTodoIds.length
    });
  },

  confirmTodoSelection() {
    const { tempSelectedTodoIds } = this.data;
    this.setData({ 
      todoIds: [...tempSelectedTodoIds],
      popupVisible: false
    });
  },

  async loadComboData(id) {
    try {
      const result = await combosApi.getById(id);
      const combo = result.combo || result;
      this.setData({
        name: combo.name,
        description: combo.description || '',
        icon: combo.icon || 'folder',
        color: combo.color || '#4CAF50',
        isShared: combo.isShared || combo.is_shared,
        memberLimit: combo.memberLimit || combo.member_limit || 50,
        editId: id
      });
      this.updateIconNotInCommon();
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({ icon });
    this.updateIconNotInCommon();
  },

  showMoreIcons() {
    this.setData({ moreIconVisible: true });
  },

  hideMoreIcons() {
    this.setData({ moreIconVisible: false });
  },

  onMoreIconVisibleChange(e) {
    if (!e.detail.visible) {
      this.setData({ moreIconVisible: false });
    }
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
  },

  selectMoreIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({ 
      icon,
      moreIconVisible: false
    });
    this.updateIconNotInCommon();
  },

  selectColor(e) {
    const color = e.currentTarget.dataset.color;
    if (color === 'custom') {
      this.setData({ colorPickerVisible: true });
    } else {
      this.setData({ color, colorPickerSelected: false });
    }
  },

  onColorChange(e) {
    const detail = e.detail;
    const color = typeof detail.value === 'string' ? detail.value : (detail.value?.hex || detail.value?.HEX || detail.hex || detail.HEX || detail.value);
    if (color) {
      this.setData({ customColor: color.toUpperCase() });
    }
  },

  onPaletteBarChange(e) {
    const detail = e.detail;
    const color = typeof detail === 'string' ? detail : (detail?.hex || detail?.HEX || detail?.value);
    if (color) {
      this.setData({ customColor: color.toUpperCase() });
    }
  },

  closeColorPicker() {
    this.setData({ colorPickerVisible: false });
  },

  onColorPickerClose(e) {
    if (!e.detail.visible) {
      this.setData({ colorPickerVisible: false });
    }
  },

  confirmCustomColor() {
    const { customColor } = this.data;
    if (customColor) {
      this.setData({ 
        color: customColor,
        colorPickerSelected: true,
        colorPickerVisible: false 
      });
    } else {
      this.setData({ colorPickerVisible: false });
    }
  },

  toggleShared(e) {
    this.setData({ isShared: e.detail.value });
  },

  async createCombo() {
    const { name, description, icon, color, isShared, memberLimit, todoIds, editId } = this.data;
    
    if (!name.trim()) {
      wx.showToast({ title: '请输入组合名称', icon: 'none' });
      return;
    }
    
    if (name.trim().length > 30) {
      const exceed = name.trim().length - 30;
      wx.showToast({
        title: `组合名称已超过30字上限，当前${name.trim().length}字，需删除${exceed}字`,
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    if (!editId) {
      const combos = app.globalData.combos || [];
      const sharedCombos = app.globalData.sharedCombos || [];
      const ownerSharedCombos = sharedCombos.filter(c => c.role === 'owner' || c.userRole === 'owner');
      const totalCombos = combos.length + ownerSharedCombos.length;
      const comboLimit = app.globalData?.userInfo?.comboLimit || 50;
      
      if (totalCombos >= comboLimit) {
        wx.showModal({
          title: '组合数量已达上限',
          content: `最多可创建 ${comboLimit} 个组合，请删除部分组合后再试。可在 更多-右下角 联系客服`,
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }
    }
    
    wx.showLoading({ title: editId ? '保存中...' : '创建中...' });
    
    try {
      const todoIdsNum = todoIds.map(id => Number(id));
      const comboData = {
        name: name.trim(),
        description,
        icon,
        color,
        isShared,
        memberLimit: isShared ? 50 : 0,
        todoIds: todoIdsNum
      };
      
      let result;
      if (editId) {
        result = await combosApi.update(editId, comboData);
        result.id = editId;
        result.combo = { ...comboData, id: editId };
      } else {
        result = await combosApi.create(comboData);
      }
      
      wx.hideLoading();
      
      if (editId) {
        const combos = app.globalData.combos || [];
        const index = combos.findIndex(c => c.id === editId);
        if (index > -1) {
          combos[index] = { ...combos[index], ...comboData };
          app.setCombos(combos);
        }
        
        const sharedCombos = app.globalData.sharedCombos || [];
        const sharedIndex = sharedCombos.findIndex(c => c.id === editId);
        if (sharedIndex > -1) {
          sharedCombos[sharedIndex] = { ...sharedCombos[sharedIndex], ...comboData };
          app.setSharedCombos(sharedCombos);
        }
        
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else if (result.shareCode) {
        wx.showModal({
          title: '组合创建成功',
          content: `邀请码: ${result.shareCode}\n\n您可以将邀请码分享给好友，或直接转发邀请卡片`,
          confirmText: '转发邀请',
          cancelText: '完成',
          success: (res) => {
            if (res.confirm) {
              this.shareCombo(result.id, result.shareCode);
            } else {
              this.finishAndReturn(result);
            }
          }
        });
      } else {
        wx.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => this.finishAndReturn(result), 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  shareCombo(comboId, shareCode) {
    wx.navigateTo({
      url: `/packageCombo/collaboration/collaboration?id=${comboId}`
    });
  },

  finishAndReturn(result) {
    const combo = result.combo || result;
    const { todoIds } = this.data;
    
    if (todoIds && todoIds.length > 0) {
      const todos = getLocalTodos();
      const todoIdsNum = todoIds.map(id => Number(id));
      const updatedTodos = todos.map(t => {
        if (todoIdsNum.includes(t.time)) {
          return { ...t, comboId: combo.id };
        }
        return t;
      });
      todoIdsNum.forEach(id => {
        const todo = updatedTodos.find(t => t.time === id);
        if (todo) saveTodo(todo);
      });
      getApp().updateCalendarCache(updatedTodos);
    }
    
    const comboWithCount = {
      ...combo,
      todoCount: todoIds.length
    };
    
    const combos = app.globalData.combos || [];
    combos.unshift(comboWithCount);
    app.setCombos(combos);
    
    wx.navigateBack();
  },

  preventTouchMove() {
    return false;
  },
});