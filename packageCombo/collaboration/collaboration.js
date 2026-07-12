const app = getApp();
const { combosApi, collabApi, isLoggedIn, notifyApi, adminApi } = require('../../utils/api.js');
const { formatDateTime } = require('../../utils/util.js');

Page({
  data: {
    comboId: '',
    combo: null,
    members: [],
    requests: [],
    userRole: 'member',
    shareCode: '',
    qrCodeValue: '',
    qrCodeUrl: '',
    qrCodeLoading: false,
    showDescription: true,
    isLeaving: false,
    shareMode: 'approval',
    adminView: false
  },

  onLoad(options) {
    if (options.adminView === '1') {
      this.setData({ adminView: true, comboId: options.id });
      this.loadDataForAdmin(options.id);
      return;
    }
    
    if (!isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '协作管理需要登录后才能使用，是否前往登录？',
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
    
    if (options.id) {
      this.setData({ comboId: options.id });
      this.loadData(options.id);
    }
    if (options.share === '1') {
      this.setData({ isShareMode: true });
    }
    if (options.shareCode) {
      this.setData({ shareCode: options.shareCode });
    }
  },

  onShow() {
    if (this.data.adminView || this.data.isLeaving) {
      return;
    }
    if (this.data.comboId) {
      this.loadData(this.data.comboId);
    }
  },

  async onPullDownRefresh() {
    if (this.data.comboId) {
      await this.loadData(this.data.comboId);
      wx.stopPullDownRefresh();
    }
  },

  checkMembership() {
    if (!this.data.userRole) {
      wx.showModal({
        title: '提示',
        content: '您已不是该协作组成员',
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }
    return true;
  },

  async loadData(id) {
    try {
      const comboResult = await combosApi.getById(id);
      const combo = comboResult.combo || comboResult;
      
      if (!combo.userRole) {
        wx.showModal({
          title: '提示',
          content: '您已不是该协作组成员',
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }
      
      const membersResult = await combosApi.getMembers(id);
      const members = membersResult.members || membersResult || [];
      
      let requests = [];
      if (combo.userRole === 'owner' || combo.userRole === 'admin') {
        const requestsResult = await collabApi.getRequests(id);
        const rawRequests = requestsResult.requests || requestsResult || [];
        requests = rawRequests.map(req => ({
          ...req,
          formattedTime: formatDateTime(req.createdAt || req.created_at)
        }));
      }
      
      const shareCode = combo.shareCode || this.data.shareCode;
      const isAuto = this.data.shareMode === 'auto';
      const qrCodeUrl = collabApi.getQrCode(shareCode, isAuto);
      
      this.setData({
        combo,
        members,
        requests,
        userRole: combo.userRole || 'member',
        shareCode: shareCode,
        qrCodeValue: `TIMEGREEN:${shareCode}${isAuto ? '&auto=1' : ''}`,
        qrCodeUrl: qrCodeUrl
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadDataForAdmin(id) {
    try {
      const comboResult = await combosApi.getById(id);
      const combo = comboResult.combo || comboResult;
      
      const membersResult = await combosApi.getMembers(id);
      const members = membersResult.members || membersResult || [];
      
      const shareCode = combo.shareCode || '';
      const qrCodeUrl = collabApi.getQrCode(shareCode, false);
      
      this.setData({
        combo,
        members,
        requests: [],
        userRole: 'admin',
        shareCode: shareCode,
        qrCodeValue: `TIMEGREEN:${shareCode}`,
        qrCodeUrl: qrCodeUrl
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  toggleDescription() {
    this.setData({ showDescription: !this.data.showDescription });
  },

  copyShareCode() {
    wx.setClipboardData({
      data: this.data.shareCode,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' });
      }
    });
  },

  saveQrCode() {
    if (!this.data.qrCodeUrl) {
      wx.showToast({ title: '二维码不存在', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    wx.downloadFile({
      url: this.data.qrCodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '已保存到相册', icon: 'success' });
            },
            fail: (err) => {
              wx.hideLoading();
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要授权保存图片权限',
                  confirmText: '去授权',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  async approveRequest(e) {
    if (!this.checkMembership()) return;
    
    const requestId = e.currentTarget.dataset.id;
    const { combo, requests } = this.data;
    const request = requests.find(r => r.id === requestId);
    
    try {
      await collabApi.approveRequest(requestId);
      wx.showToast({ title: '已通过', icon: 'success' });
      
      this.sendApprovalNotification({
        comboName: combo?.name,
        comboId: combo?.id,
        shareCode: combo?.share_code || combo?.shareCode,
        applicantId: request?.userId || request?.user_id,
        requestTime: request?.createdAt || request?.created_at,
        approved: true
      });
      
      this.loadData(this.data.comboId);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async rejectRequest(e) {
    if (!this.checkMembership()) return;
    
    const requestId = e.currentTarget.dataset.id;
    const { combo, requests } = this.data;
    const request = requests.find(r => r.id === requestId);
    
    try {
      await collabApi.rejectRequest(requestId);
      wx.showToast({ title: '已拒绝', icon: 'success' });
      
      this.sendApprovalNotification({
        comboName: combo?.name,
        comboId: combo?.id,
        shareCode: combo?.share_code || combo?.shareCode,
        applicantId: request?.userId || request?.user_id,
        requestTime: request?.createdAt || request?.created_at,
        approved: false
      });
      
      this.loadData(this.data.comboId);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  async sendApprovalNotification({ comboName, comboId, shareCode, applicantId, requestTime, approved }) {
    if (!applicantId) return;
    
    try {
      const userInfo = app.globalData.userInfo || wx.getStorageSync('user') || {};
      const now = new Date();
      
      const formatTime = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}年${m}月${d}日 ${h}:${min}`;
      };
      
      await notifyApi.sendApprovalResult({
        templateId: 'LenG38LPKm6kK4ymXx4Ftoc9LoN2f7xXh7qJ-U-myxA',
        toUserId: applicantId,
        comboId: comboId,
        shareCode: shareCode,
        approved: approved,
        data: {
          thing28: { value: `申请加入「${comboName || '协作组'}」` },
          time52: { value: formatTime(new Date(requestTime)) },
          time26: { value: formatTime(now) },
          phrase1: { value: approved ? '已通过' : '未通过' },
          name2: { value: userInfo.nickname || '管理员' }
        }
      });
    } catch (err) {
      logger.error('NOTIFY', 'APPROVAL', '发送审批通知失败', err);
    }
  },

  async setRole(e) {
    const { id, role } = e.currentTarget.dataset;
    const targetMember = this.data.members.find(m => m.id === id);
    const targetRoleName = role === 'owner' ? '超管' : (role === 'admin' ? '管理员' : '成员');
    const currentRoleName = targetMember?.role === 'owner' ? '超管' : (targetMember?.role === 'admin' ? '管理员' : '成员');
    
    let title = '';
    let content = '';
    
    if (role === 'owner') {
      title = '转让超管';
      content = `确定将超管权限转让给「${targetMember?.nickname || '该成员'}」吗？转让后您将成为管理员。`;
    } else if (role === 'admin') {
      title = '设为管理员';
      content = `确定将「${targetMember?.nickname || '该成员'}」设为管理员吗？`;
    } else {
      title = '移除管理';
      content = `确定移除「${targetMember?.nickname || '该成员'}」的管理员权限吗？`;
    }
    
    wx.showModal({
      title,
      content,
      confirmColor: role === 'owner' ? '#ff4d4f' : '#00b26a',
      success: async (res) => {
        if (res.confirm) {
          try {
            await combosApi.setMemberRole(this.data.comboId, id, role);
            wx.showToast({ title: role === 'owner' ? '已转让' : (role === 'admin' ? '已设为管理员' : '已移除管理'), icon: 'success' });
            this.loadData(this.data.comboId);
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  async removeMember(e) {
    if (!this.checkMembership()) return;
    
    const memberId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '移除成员',
      content: '确定将该成员从协作组移除吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            await collabApi.removeMember(this.data.comboId, memberId);
            wx.showToast({ title: '已移除', icon: 'success' });
            this.loadData(this.data.comboId);
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  showTransferOwner() {
    const { members } = this.data;
    const nonOwners = members.filter(m => m.role !== 'owner');
    
    if (nonOwners.length === 0) {
      wx.showToast({ title: '没有可转让的成员', icon: 'none' });
      return;
    }
    
    wx.showActionSheet({
      itemList: nonOwners.map(m => m.nickname || '用户'),
      success: (res) => {
        const targetMember = nonOwners[res.tapIndex];
        this.setRole({
          currentTarget: {
            dataset: { id: targetMember.id, role: 'owner' }
          }
        });
      }
    });
  },

  dissolveCombo() {
    const { userRole, members } = this.data;
    
    if (userRole !== 'owner') {
      wx.showToast({ title: '仅超管可解散组合', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '解散协作组',
      content: '确定要解散该协作组吗？此操作不可恢复！',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ isLeaving: true });
            await collabApi.leaveCombo(this.data.comboId);
            wx.showToast({ title: '已解散', icon: 'success' });
            
            const sharedCombos = app.globalData.sharedCombos || [];
            const newSharedCombos = sharedCombos.filter(c => String(c.id) !== String(this.data.comboId));
            app.setSharedCombos(newSharedCombos);
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (err) {
            this.setData({ isLeaving: false });
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  leaveCombo() {
    if (!this.checkMembership()) return;
    
    const { userRole, members, comboId } = this.data;
    
    if (userRole === 'owner') {
      const otherMembers = members.filter(m => m.role !== 'owner');
      
      if (otherMembers.length === 0) {
        wx.showModal({
          title: '退出组合',
          content: '您是唯一的成员，退出将解散该组合。确定要退出吗？',
          confirmText: '确定退出',
          confirmColor: '#ff4d4f',
          success: async (res) => {
            if (res.confirm) {
              try {
                this.setData({ isLeaving: true });
                await collabApi.leaveCombo(comboId);
                wx.showToast({ title: '组合已解散', icon: 'success' });
                
                const sharedCombos = app.globalData.sharedCombos || [];
                const newSharedCombos = sharedCombos.filter(c => String(c.id) !== String(comboId));
                app.setSharedCombos(newSharedCombos);
                
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
              } catch (err) {
                this.setData({ isLeaving: false });
                wx.showToast({ title: err.message || '操作失败', icon: 'none' });
              }
            }
          }
        });
        return;
      }
      
      wx.showActionSheet({
        itemList: ['选择新超管并退出', '直接退出（自动转让给其他成员）'],
        success: (actionRes) => {
          if (actionRes.tapIndex === 0) {
            this.showTransferOwnerAndLeave();
          } else {
            this.confirmLeaveWithAutoTransfer();
          }
        }
      });
    } else {
      wx.showModal({
        title: '退出组合',
        content: '确定要退出该协作组吗？',
        confirmText: '确定退出',
        confirmColor: '#ff4d4f',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.setData({ isLeaving: true });
              await collabApi.leaveCombo(comboId);
              wx.showToast({ title: '已退出组合', icon: 'success' });
              
              const sharedCombos = app.globalData.sharedCombos || [];
              const newSharedCombos = sharedCombos.filter(c => String(c.id) !== String(comboId));
              app.setSharedCombos(newSharedCombos);
              
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } catch (err) {
              this.setData({ isLeaving: false });
              wx.showToast({ title: err.message || '操作失败', icon: 'none' });
            }
          }
        }
      });
    }
  },

  showTransferOwnerAndLeave() {
    const { members } = this.data;
    const nonOwners = members.filter(m => m.role !== 'owner');
    
    if (nonOwners.length === 0) {
      wx.showToast({ title: '没有可转让的成员', icon: 'none' });
      return;
    }
    
    wx.showActionSheet({
      itemList: nonOwners.map(m => m.nickname || '用户'),
      success: (res) => {
        const targetMember = nonOwners[res.tapIndex];
        this.confirmLeaveWithTransfer(targetMember.id);
      }
    });
  },

  async confirmLeaveWithTransfer(targetUserId) {
    wx.showModal({
      title: '转让并退出',
      content: '确定将超管权限转让给该成员并退出吗？',
      confirmText: '确定',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ isLeaving: true });
            await collabApi.leaveCombo(this.data.comboId, targetUserId);
            wx.showToast({ title: '已退出组合', icon: 'success' });
            
            const sharedCombos = app.globalData.sharedCombos || [];
            const newSharedCombos = sharedCombos.filter(c => String(c.id) !== String(this.data.comboId));
            app.setSharedCombos(newSharedCombos);
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (err) {
            this.setData({ isLeaving: false });
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  async confirmLeaveWithAutoTransfer() {
    wx.showModal({
      title: '退出组合',
      content: '退出后超管权限将自动转让给其他成员，确定要退出吗？',
      confirmText: '确定退出',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ isLeaving: true });
            await collabApi.leaveCombo(this.data.comboId);
            wx.showToast({ title: '已退出组合', icon: 'success' });
            
            const sharedCombos = app.globalData.sharedCombos || [];
            const newSharedCombos = sharedCombos.filter(c => String(c.id) !== String(this.data.comboId));
            app.setSharedCombos(newSharedCombos);
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (err) {
            this.setData({ isLeaving: false });
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  onShareModeChange(e) {
    const mode = e.detail.value;
    const { shareCode } = this.data;
    const isAuto = mode === 'auto';
    const qrCodeUrl = collabApi.getQrCode(shareCode, isAuto);
    
    this.setData({ 
      shareMode: mode,
      qrCodeValue: `TIMEGREEN:${shareCode}${isAuto ? '&auto=1' : ''}`,
      qrCodeUrl: qrCodeUrl
    });
  },

  onShareAppMessage() {
    const { combo, shareCode, shareMode } = this.data;
    const autoParam = shareMode === 'auto' ? '&auto=1' : '';
    return {
      title: `邀请你加入「${combo?.name || '协作组'}」`,
      path: `/pages/todo/todo?type=combo_invite&code=${shareCode}${autoParam}`,
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    };
  }
});
