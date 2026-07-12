// app.js
require('./utils/logger');
const { syncOnAppStart, loginWithCode, setToken, getToken, getLocalTodos } = require('./utils/sync.js');
const { configApi } = require('./utils/api.js');

App({
  globalData: {
    changelogList: [],
    notices: [],
    configLoaded: false,

    weather: null,

    userInfo: null,
    isLoggedIn: false,
    syncStatus: 'idle',

    systemTags: [
      { id: 1, name: '工作', color: '#2196F3', icon: 'briefcase' },
      { id: 2, name: '学习', color: '#9C27B0', icon: 'book' },
      { id: 3, name: '生活', color: '#4CAF50', icon: 'home' },
      { id: 4, name: '健康', color: '#F44336', icon: 'heart' },
      { id: 5, name: '购物', color: '#FF9800', icon: 'cart' },
      { id: 6, name: '其他', color: '#607D8B', icon: 'more' }
    ],
    userTags: [],
    combos: [],
    sharedCombos: [],

    //--状态栏NEW
    navBarHeight: 0, // 导航栏高度
    menuRight: 0, // 胶囊距右方间距（方保持左、右间距一致）
    menuTop: 0, // 胶囊距底部间距（保持底部间距一致）
    menuHeight: 0, // 胶囊高度（自定义内容可与胶囊高度保证一致）
    
    editTodoImages: [], // 编辑待办时的图片数据（避免URL参数过长）
  },

  updateCalendarCache(todos) {
    const cache = {};
    todos.forEach(todo => {
      if (!todo.setDate) return;
      let date;
      if (typeof todo.setDate === 'string' && todo.setDate.includes('-')) {
        const parts = todo.setDate.split('-');
        if (parts.length === 3) {
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          date = new Date(todo.setDate);
        }
      } else {
        date = new Date(todo.setDate);
      }
      if (isNaN(date.getTime())) return;
      
      const key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
      
      if (!cache[key]) {
        cache[key] = {
          count: 0,
          sampleText: todo.text
        };
      }
      cache[key].count++;
    });
    
    this.globalData.calendarCache = cache;
  },

  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function(options){
    logger.init({ reportUrl: 'https://api.yzjtiantian.cn/log/report' });
    logger.info('APP', 'LAUNCH', '小程序启动', { scene: options ? options.scene : null });
    this.checkMiniProgramUpdate();
    this.loadAppConfig();

    this.updateCalendarCache(getLocalTodos());

    const savedToken = wx.getStorageSync('authToken');
    if (savedToken) {
      this.globalData.isLoggedIn = true;
      const savedUser = wx.getStorageSync('user');
      if (savedUser) {
        this.globalData.userInfo = savedUser;
      }
    }

    this.handleSceneParams(options);

    const that = this;
    try {
      // 获取系统信息
      const systemInfo = wx.getWindowInfo();
      // 胶囊按钮位置信息
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      
      // 提供默认值以防API返回undefined
      const safeSystemInfo = systemInfo || { statusBarHeight: 0, screenWidth: 375 };
      const safeMenuButtonInfo = menuButtonInfo || { right: 0, top: 0, height: 32, width: 87, left: 0 };
      
      // 导航栏高度 = 状态栏高度 + 44
      that.globalData.navBarHeight = safeSystemInfo.statusBarHeight + 44;
      that.globalData.menuRight = safeSystemInfo.screenWidth - safeMenuButtonInfo.right;
      that.globalData.menuTop = safeMenuButtonInfo.top;
      that.globalData.menuHeight = safeMenuButtonInfo.height;
      // 胶囊按钮宽度和左侧位置
      that.globalData.menuWidth = safeMenuButtonInfo.width;
      that.globalData.menuLeft = safeMenuButtonInfo.left;
    } catch (error) {
      logger.error('APP', 'INIT', '初始化导航栏信息失败', error);
      // 设置默认值
      that.globalData.navBarHeight = 44;
      that.globalData.menuRight = 0;
      that.globalData.menuTop = 0;
      that.globalData.menuHeight = 32;
      that.globalData.menuWidth = 87;
      that.globalData.menuLeft = 0;
    }

    wx.setInnerAudioOption({
      obeyMuteSwitch: false
    });
  },

  handleSceneParams(options) {
    if (!options) return;
    
    let scene = options.scene;
    if (!scene) return;
    
    try {
      scene = decodeURIComponent(scene);
    } catch (e) {
      logger.error('APP', 'SCENE', '解码scene参数失败', e);
      return;
    }
    
    const shareData = this.parseSceneToInvite(scene);
    if (shareData) {
      wx.setStorageSync('pendingShareData', shareData);
    }
  },

  parseSceneToInvite(scene) {
    if (!scene) return null;
    
    if (scene.includes('=')) {
      const params = {};
      const parts = scene.split('&');
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          params[key] = value;
        }
      });
      
      if (params.code) {
        return {
          type: 'combo_invite',
          code: params.code.toUpperCase().slice(0, 6),
          auto: params.auto === '1',
          timestamp: Date.now()
        };
      }
    }
    
    const inviteMatch = scene.match(/^([A-Z0-9]{6})(?:_(\d))?$/i);
    if (inviteMatch) {
      return {
        type: 'combo_invite',
        code: inviteMatch[1].toUpperCase(),
        auto: inviteMatch[2] === '1',
        timestamp: Date.now()
      };
    }
    
    return null;
  },

  async loadAppConfig() {
    try {
      const result = await configApi.getAppConfig();
      if (result.success) {
        if (result.changelogList) {
          this.globalData.changelogList = result.changelogList;
        }
        if (result.notices) {
          this.globalData.notices = result.notices;
        }
        this.globalData.configLoaded = true;
        this.processNotices();
      }
    } catch (err) {
      logger.error('APP', 'CONFIG', '加载应用配置失败', err);
    }
  },
 
  login:async function(){
    try {
      const result = await loginWithCode();
      if (result && result.token) {
        this.globalData.isLoggedIn = true;
        this.globalData.userInfo = result.user || null;
        return result;
      }
    } catch (err) {
      logger.error('AUTH', 'LOGIN', '登录失败', err);
      throw err;
    }
  },

  logout: function() {
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
    wx.removeStorageSync('authToken');
  },

  async syncData() {
    if (this.globalData.syncStatus === 'syncing') {
      return { status: 'syncing' };
    }
    
    this.globalData.syncStatus = 'syncing';
    
    try {
      const result = await syncOnAppStart();
      this.globalData.syncStatus = 'synced';
      return result;
    } catch (err) {
      this.globalData.syncStatus = 'error';
      logger.error('SYNC', 'SYNC', '同步失败', err);
      return { status: 'error', error: err.message };
    }
  },

  getAllTags() {
    return [...this.globalData.systemTags, ...this.globalData.userTags];
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
  },

  setCombos(combos) {
    this.globalData.combos = combos;
  },

  setSharedCombos(sharedCombos) {
    this.globalData.sharedCombos = sharedCombos;
  },

  // 新增公告处理方法
  processNotices() {
    const changelogList = this.globalData.changelogList || [];
    
    const processed = this.globalData.notices.map(notice => {
      if (!notice.version) return notice;
      
      const changelog = changelogList.find(
        item => item.version === notice.version
      );
      
      if (!changelog) {
        logger.warn('APP', 'VERSION', '未找到版本的更新日志', { version: notice.version });
        return null;
      }

      return {
        title: `${changelog.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日')}-更新公告（V${changelog.version}）`,
        date: changelog.date,
        content: `本次更新包含以下内容：\n${
          changelog.content
            .map((item, index) => `${index + 1}、${item}`)
            .join('\n')
        }\n\n历史更新请前往 "更多"->"更新日志" 查看。\n有问题欢迎在 右上角"···"->"反馈与投诉" 说明，谢谢！`
      };
    }).filter(Boolean);

    this.globalData.notices = processed;
  },


  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow: function (options) {
    this.checkVersionUpdate();
    
    if (options && options.scene) {
      this.handleSceneParams(options);
    }
  },

  // 新增版本检测方法
  checkVersionUpdate() {
    const changelogList = this.globalData.changelogList || [];
    if (changelogList.length === 0) {
      return;
    }
    
    const storedVersion = wx.getStorageSync('appVersion') || '3.0.2';
    const latestVersionInfo = changelogList[0];
    
    if (!latestVersionInfo || !latestVersionInfo.version) {
      return;
    }
    
    if (this.compareVersion(latestVersionInfo.version, storedVersion) > 0) {
      const updateContent = latestVersionInfo.content
        .slice(0, 3)
        .map((item, index) => `${index + 1}、${item}`)
        .join('\n');
    
      wx.showModal({
        title: `发现新版本 ${storedVersion} → ${latestVersionInfo.version}`,
        content: `更新日期：${latestVersionInfo.date}\n更新内容：\n${updateContent}${latestVersionInfo.content.length > 3 ? '\n...' : ''}`,
        confirmText: '关闭',
        cancelText: '查看详情',
        success: res => {
          if (res.confirm) {
            wx.setStorageSync('appVersion', latestVersionInfo.version);
          } else if (res.cancel) {
            wx.navigateTo({
              url: '/packagePages/changelog/changelog'
            });
          }
        }
      });
    }
  },

  // 版本比较方法
  compareVersion: function(v1, v2) {
    v1 = v1.split('.').map(Number)
    v2 = v2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const n1 = v1[i] || 0
      const n2 = v2[i] || 0
      if (n1 !== n2) return n1 > n2 ? 1 : -1
    }
    return 0
  },

  // 小程序代码包版本更新检测
  checkMiniProgramUpdate() {
    if (!wx.getUpdateManager) {
      return;
    }
    
    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        updateManager.onUpdateReady(() => {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，建议重启应用以确保正常使用。',
            confirmText: '立即重启',
            cancelText: '稍后再说',
            success: (res) => {
              if (res.confirm) {
                updateManager.applyUpdate();
              }
            }
          });
        });

        updateManager.onUpdateFailed(() => {
          wx.showModal({
            title: '更新提示',
            content: '新版本下载失败，请删除当前小程序后重新搜索打开，或稍后再试。',
            showCancel: false,
            confirmText: '我知道了'
          });
        });
      }
    });
  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide: function () {
    
  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   */
  onError: function (msg) {
    logger.error('APP', 'FATAL', '全局错误捕获', msg)
    wx.showToast({
      title: '程序开小差了，请尝试重启\n如问题持续存在，请联系客服',
      icon: 'none',
      duration: 3000
    })
  },


})
