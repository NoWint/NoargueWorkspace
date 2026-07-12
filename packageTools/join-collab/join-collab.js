const app = getApp();
const { collabApi, isLoggedIn, notifyApi } = require('../../utils/api.js');

Page({
  data: {
    codeChars: ['', '', '', '', '', ''],
    shareCode: '',
    comboInfo: null,
    isLoading: false,
    showKeyboard: false,
    isFromShare: false
  },

  onLoad(options) {
    const pages = getCurrentPages();
    const isFromShare = pages.length === 1;
    this.setData({ isFromShare });
    
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '加入协作需要登录后才能使用，是否前往登录？',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/packagePages/login/login' });
          }
          if (res.cancel) {
            if (isFromShare) {
              wx.reLaunch({ url: '/pages/todo/todo' });
            } else {
              wx.navigateBack();
            }
          }
        }
      });
      return;
    }
    
    if (options.code) {
      const code = options.code.toUpperCase().slice(0, 6);
      this.setCodeValue(code);
      if (code.length === 6) {
        if (options.autoJoin === '1') {
          this.autoJoinCombo(code);
        } else {
          this.queryCombo(code);
        }
      }
    }
    if (options.autoJoin === '1') {
      this.setData({ autoJoin: true });
    }
  },

  onShow() {
    if (this.data.isFromShare || this.data.shareCode) return;
    
    wx.getClipboardData({
      success: (res) => {
        if (!res.data) return;
        
        const text = res.data.toUpperCase();
        const pinMatch = text.match(/[A-Z0-9]{6}/);
        
        if (pinMatch) {
          const pin = pinMatch[0];
          this.setCodeValue(pin);
          wx.showToast({
            title: '已从剪贴板读取邀请码',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: () => {}
    });
  },

  onHide() {
    this.setData({ showKeyboard: false });
  },

  onPullDownRefresh() {
    if (this.data.shareCode.length === 6) {
      this.queryCombo(this.data.shareCode);
    }
    wx.stopPullDownRefresh();
  },

  setCodeValue(code) {
    const codeChars = ['', '', '', '', '', ''];
    for (let i = 0; i < Math.min(code.length, 6); i++) {
      codeChars[i] = code[i];
    }
    this.setData({ 
      codeChars, 
      shareCode: code.slice(0, 6)
    });
  },

  showKeyboardPanel() {
    this.setData({ showKeyboard: true });
  },

  hideKeyboard() {
    this.setData({ showKeyboard: false });
  },

  onKeyInput(e) {
    const key = e.currentTarget.dataset.key;
    if (this.data.shareCode.length >= 6) return;
    
    wx.vibrateShort({ type: 'heavy' });
    
    const newCode = this.data.shareCode + key;
    this.setCodeValue(newCode);
  },

  onDelete() {
    const currentCode = this.data.shareCode;
    if (currentCode.length === 0) return;
    
    wx.vibrateShort({ type: 'heavy' });
    
    const newCode = currentCode.slice(0, -1);
    this.setCodeValue(newCode);
  },

  onSearch() {
    if (this.data.shareCode.length !== 6) return;
    this.queryCombo(this.data.shareCode);
  },

  scanQrCode() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        let code = '';
        let autoJoin = false;
        
        if (res.scanType === 'WX_CODE' && res.path) {
          const pathMatch = res.path.match(/[?&]scene=([^&]*)/);
          if (pathMatch) {
            let scene = pathMatch[1];
            try {
              scene = decodeURIComponent(scene);
            } catch (e) {
              logger.error('APP', 'SCENE', '解码scene失败', e);
            }
            
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
                code = params.code.toUpperCase().slice(0, 6);
                autoJoin = params.auto === '1';
              }
            } else {
              const inviteMatch = scene.match(/^([A-Z0-9]{6})(?:_(\d))?$/i);
              if (inviteMatch) {
                code = inviteMatch[1].toUpperCase();
                autoJoin = inviteMatch[2] === '1';
              }
            }
          }
        } else {
          code = res.result || '';
          
          if (code.startsWith('TIMEGREEN:')) {
            const qrContent = code.replace('TIMEGREEN:', '');
            if (qrContent.includes('&')) {
              const parts = qrContent.split('&');
              code = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
              autoJoin = parts.some(p => p === 'auto=1');
            } else {
              code = qrContent.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            }
          } else {
            code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
          }
        }
        
        if (code.length === 6) {
          this.setCodeValue(code);
          if (autoJoin) {
            this.autoJoinCombo(code);
          } else {
            this.queryCombo(code);
          }
        } else {
          wx.showToast({ title: '无效的邀请码', icon: 'none' });
        }
      },
      fail: (err) => {
        if (!err.errMsg.includes('cancel')) {
          wx.showToast({ title: '扫码失败', icon: 'none' });
        }
      }
    });
  },

  async queryCombo(code) {
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true, showKeyboard: false });

    try {
      const result = await collabApi.join(code);
      const comboInfo = result.combo || result;
      comboInfo.isMember = result.isMember;
      comboInfo.hasPendingRequest = result.hasPendingRequest;
      comboInfo.hasRejectedRequest = result.hasRejectedRequest;
      comboInfo.rejectedRequest = result.rejectedRequest;
      comboInfo.memberFull = result.memberFull;
      
      if (result.memberFull && !result.isMember) {
        this.setData({
          comboInfo,
          isLoading: false
        });
        wx.showModal({
          title: '成员已满',
          content: '该共享组合成员已满，请联系该组合的超管或管理员。',
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }
      
      this.setData({
        comboInfo,
        isLoading: false
      });
    } catch (err) {
      this.setData({ isLoading: false });
      wx.showToast({ title: typeof err === 'string' ? err : (err.message || '操作失败'), icon: 'none' });
    }
  },

  async autoJoinCombo(code) {
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true, showKeyboard: false });

    try {
      const result = await collabApi.autoJoin(code);
      
      const comboInfo = result.combo || result;
      comboInfo.isMember = result.isMember || true;
      comboInfo.hasPendingRequest = result.hasPendingRequest;
      comboInfo.hasRejectedRequest = result.hasRejectedRequest;
      comboInfo.memberFull = result.memberFull;
      
      if (result.memberFull && !result.isMember) {
        this.setData({
          comboInfo,
          isLoading: false
        });
        wx.showModal({
          title: '成员已满',
          content: '该共享组合成员已满，请联系该组合的超管或管理员。',
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }
      
      this.setData({
        comboInfo,
        isLoading: false
      });
    } catch (err) {
      this.setData({ isLoading: false });
      
      if (err.message && err.message.includes('已是该组成员')) {
        this.queryCombo(code);
      } else if (err.message && err.message.includes('成员已满')) {
        wx.showModal({
          title: '成员已满',
          content: '该共享组合成员已满，请联系该组合的超管或管理员。',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showToast({ title: err.message || '加入失败', icon: 'none' });
      }
    }
  },

  async sendRequest() {
    const { comboInfo, shareCode } = this.data;
    
    if (!comboInfo) return;
    
    if (comboInfo.memberFull) {
      wx.showModal({
        title: '成员已满',
        content: '该共享组合成员已满，请联系该组合的超管或管理员。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      await collabApi.sendRequest(shareCode);
      wx.hideLoading();
      
      this.setData({
        'comboInfo.hasPendingRequest': true,
        'comboInfo.hasRejectedRequest': false
      });
      
      this.askSubscribeApprovalResult();
    } catch (err) {
      wx.hideLoading();
      if (err.message && err.message.includes('成员已满')) {
        wx.showModal({
          title: '成员已满',
          content: '该共享组合成员已满，请联系该组合的超管或管理员。',
          showCancel: false,
          confirmText: '我知道了'
        });
        this.setData({ 'comboInfo.memberFull': true });
      } else {
        wx.showToast({ title: err.message || '申请失败', icon: 'none' });
      }
    }
  },

  askSubscribeApprovalResult() {
    const templateId = 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA';
    
    wx.showModal({
      title: '订阅审批结果',
      content: '是否接收审批结果通知？审批通过或拒绝后，您将第一时间收到消息提醒。',
      confirmText: '订阅通知',
      cancelText: '暂不需要',
      success: async (res) => {
        if (res.confirm) {
          try {
            const subscribeRes = await wx.requestSubscribeMessage({
              tmplIds: [templateId]
            });
            
            if (subscribeRes[templateId] === 'accept') {
              await notifyApi.subscribe([templateId]);
              wx.showToast({ title: '订阅成功', icon: 'success' });
            } else {
              wx.showToast({ title: '已取消订阅', icon: 'none' });
            }
          } catch (err) {
            logger.error('NOTIFY', 'SUBSCRIBE', '订阅失败', err);
            wx.showToast({ title: '订阅失败', icon: 'none' });
          }
        }
      }
    });
  },

  navigateToCombo() {
    if (this.data.comboInfo) {
      wx.redirectTo({
        url: `/packageCombo/combo-detail/combo-detail?id=${this.data.comboInfo.id}&shared=1`
      });
    }
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/todo/todo'
    });
  },
});