const { authApi, setToken, getToken, clearToken } = require('../../utils/api.js');

const userAgreementContent = `
**生效日期：2026年3月15日**

欢迎使用"时光绿径待办"小程序（以下简称"本服务"）。在使用本服务前，请您仔细阅读以下用户协议。

## 一、服务内容

本服务为用户提供待办事项管理及相关辅助功能，包括但不限于：
- 待办事项的创建、编辑、删除、完成状态管理
- 待办事项分类、标签管理与组合归档
- 待办事项提醒与通知功能
- 数据云端同步与备份
- 回收站与数据恢复
- 日历视图与数据分析
- 位置信息与导航
- 语音识别创建待办
- **协作功能**：创建共享组合、邀请成员协作、共享待办管理
- **评论功能**：在共享待办下发表评论与回复
- **AI助手（暂时停止服务）**：智能对话与建议功能
- 小工具集：密码生成器、文本加密解密等实用工具

## 二、用户账号

1. 您需要通过微信授权登录使用本服务的完整功能。
2. 您应妥善保管账号信息，因账号泄露造成的损失由您自行承担。
3. 您不得将账号转让、出借给他人使用。
4. 您的昵称和头像应遵守法律法规，不得使用违法违规内容。

## 三、用户行为规范

您承诺在使用本服务时不会：
1. 发布、传播违法、违规内容，包括但不限于：
   - 反对宪法所确定的基本原则的
   - 危害国家安全，泄露国家秘密，颠覆国家政权的
   - 损害国家荣誉和利益的
   - 煽动民族仇恨、民族歧视，破坏民族团结的
   - 破坏国家宗教政策，宣扬邪教和封建迷信的
   - 散布谣言，扰乱社会秩序，破坏社会稳定的
   - 散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的
   - 侮辱或者诽谤他人，侵害他人合法权益的
   - 含有法律、行政法规禁止的其他内容的
2. 在协作组合、评论、待办内容中侵犯他人合法权益
3. 利用漏洞恶意干扰或破坏服务的正常运行
4. 利用本服务进行任何未经授权的商业活动
5. 恶意刷评、骚扰其他用户或进行网络暴力

## 四、内容审查与管理

1. **开发者和管理员有权对用户发布的内容进行审查**，包括但不限于待办事项、评论、协作组合内容等。
2. 对于违反法律法规或本协议的内容，开发者和管理员有权采取以下措施：
   - 删除违规内容
   - 警告违规用户
   - 限制或禁止用户使用部分功能
   - 封禁违规账号
3. 开发者和管理员有义务配合司法机关或监管部门依法进行调查。
4. 如您发现其他用户发布违规内容，可通过客服功能进行举报。

## 五、协作功能特别说明

1. 协作组合的创建者（超管）和管理员有权管理组合成员和内容。
2. 加入协作组合即表示您同意遵守该组合的管理规则。
3. 协作组合内的待办和评论内容对所有成员可见，请勿发布敏感或私密信息。
4. 如在协作过程中遇到纠纷，可通过客服寻求帮助。

## 六、知识产权

1. 本服务的所有内容（包括但不限于软件、技术、程序、网页、文字、图片等）的知识产权归开发者所有。
2. 您创建的待办事项内容的知识产权归您所有。
3. 本服务的图标来源于TDesign和阿里巴巴矢量图标库，如有侵权请联系删除。

## 七、免责声明

1. 本服务按现状提供，不提供任何形式的担保。
2. 对于因不可抗力或非开发者原因导致的服务中断，开发者不承担责任。
3. 用户因违反本协议或法律法规而产生的任何后果，由用户自行承担。

## 八、协议修改

开发者有权随时修改本协议，修改后的协议将在小程序内公布。继续使用本服务即视为您同意修改后的协议。

## 九、联系我们

如有任何问题，请通过小程序内的联系客服功能（更多-右下角）联系我们。`;

const privacyPolicyContent = `
**生效日期：2026年3月15日**

"时光绿径待办"小程序（以下简称"我们"）非常重视用户的隐私保护。本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。

## 一、信息收集

我们可能收集以下信息：
1. **账号信息**：微信昵称、头像（您授权后）、用户ID、OpenID
2. **使用数据**：待办事项内容、时间、提醒设置、标签、组合信息
3. **协作数据**：共享组合信息、成员关系、评论内容
4. **设备信息**：设备型号、操作系统版本
5. **位置信息**：仅在您主动添加位置信息时收集
6. **语音数据**：仅在您使用语音识别功能时临时处理，不存储原始语音

## 二、信息使用

我们使用收集的信息用于：
1. 提供、维护和改进服务
2. 发送待办提醒通知
3. 数据同步和备份
4. 多人协作功能
5. AI助手智能对话（暂时停止服务）
6. 改善用户体验
7. 内容安全审查与合规管理

## 三、信息存储

1. 您的数据存储在安全的服务器上（实例运行于阿里云，已配置SSL安全证书）
2. 我们采用加密技术保护您的数据安全
3. 您可以随时向客服（更多-右下角）要求删除您的数据
4. 已删除的数据将在回收站保留30天，之后永久删除

## 四、信息共享

我们不会将您的个人信息出售或出租给第三方。仅在以下情况下可能共享：
1. 获得您的明确同意
2. **协作功能**：您加入的共享组合内的待办和评论内容对组合成员可见
3. 法律法规要求或配合司法机关、监管部门调查
4. 保护我们或用户的合法权益

## 五、AI助手说明（暂时停止服务）

1. AI助手功能使用第三方AI服务提供智能对话。
2. 您与AI助手的对话内容会被发送至AI服务提供商进行处理。
3. 我们不会将您的对话内容用于其他目的。
4. 请勿在AI对话中输入敏感个人信息。

## 六、您的权利

您有权：
1. 访问您的个人数据
2. 更正不准确的数据
3. 删除您的数据（包括退出协作组合）
4. 撤回授权同意
5. 导出您的数据

## 七、数据安全

1. 我们采用业界标准的安全措施保护您的数据
2. 定期进行安全检查和漏洞修复
3. 对敏感数据进行加密存储和传输
4. 但请理解，互联网传输并非100%安全，请勿存储高度敏感信息

## 八、未成年人保护

我们不会故意收集未成年人的个人信息。如果您发现我们无意中收集了未成年人的信息，请联系我们删除。

## 九、政策更新

我们可能会更新本隐私政策，更新后将在小程序内公布。继续使用本服务即视为您同意更新的政策。

## 十、联系我们

如有任何隐私相关问题，请通过小程序内的客服功能联系我们。`;

Page({
  data: {
    loading: false,
    agreed: false,
    showUserAgreement: false,
    showPrivacyPolicy: false,
    userAgreementContent,
    privacyPolicyContent,

    isQrCodeMode: false, //
    sceneId: '',
    qrStatus: 'waiting',
    qrStep: 'detect', //detect, need_login, setup_profile, confirm, success
    authConfirmed: false,
    showProfileModal: false,
    profileNickname: '',
    profileAvatarUrl: '',
    currentUserInfo: null,
    isNewUser: false
  },

  onLoad(options) {
    const token = getToken();

    if (options && options.scene) {
      this.setData({
        isQrCodeMode: true,
        sceneId: decodeURIComponent(options.scene),
        qrStep: 'detect'
      });

      if (token) {
        this.handleAlreadyLoggedIn();
      } else {
        this.setData({ qrStep: 'need_login' });
      }

      this.reportScanned();
    } else if (token) {
      wx.switchTab({ url: '/pages/todo/todo' });
    }
  },

  onShow() {
    if (!this.data.isQrCodeMode) return;

    const token = getToken();
    if (this.data.qrStep === 'need_login' && token) {
      this.handleLoginSuccessForAuth();
    }
  },

  reportScanned() {
    if (!this.data.sceneId) return;
    authApi.markQrCodeScanned(this.data.sceneId).catch(() => {});
  },

  handleAlreadyLoggedIn() {
    authApi.getUserInfo().then((res) => {
      if (res.success && res.user) {
        this.setData({
          qrStep: 'confirm',
          currentUserInfo: res.user,
          agreed: true
        });
      } else {
        this.setData({
          qrStep: 'need_login'
        });
      }
    }).catch(() => {
      this.setData({
        qrStep: 'need_login'
      });
    });
  },

  handleLoginSuccessForAuth() {
    const user = wx.getStorageSync('user') || {};
    const nickname = user.nickname || '';

    if (nickname === '时光绿径用户') {
      this.setData({
        isNewUser: true,
        qrStep: 'setup_profile',
        profileNickname: '',
        profileAvatarUrl: ''
      });
    } else {
      this.setData({
        qrStep: 'confirm',
        currentUserInfo: user,
        agreed: true
      });
    }
  },

  async handleConfirmAuth() {
    if (!this.data.sceneId) return;

    this.setData({ loading: true });

    try {
      const result = await authApi.confirmQrCodeLogin(this.data.sceneId);

      if (result.success) {
        this.setData({
          authConfirmed: true,
          qrStep: 'success',
          loading: false
        });

        wx.showToast({ title: '授权成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.message || '授权失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('确认授权失败:', err);
      wx.showToast({ title: err.message || '授权失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      this.setData({ profileAvatarUrl: avatarUrl });
    }
  },

  onInputNickname(e) {
    this.setData({ profileNickname: e.detail.value.trim() });
  },

  onNicknameReview(e) {
    if (e.detail && e.detail.value) {
      this.setData({ profileNickname: e.detail.value });
    }
  },

  async handleSaveProfile() {
    let nickname = this.data.profileNickname.trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      let avatarUrl = this.data.profileAvatarUrl;

      if (avatarUrl && (avatarUrl.startsWith('http://tmp') || avatarUrl.startsWith('wxfile://'))) {
        try {
          const uploadRes = await authApi.uploadAvatar(avatarUrl);
          if (uploadRes.success && uploadRes.avatarUrl) {
            avatarUrl = uploadRes.avatarUrl;
          }
        } catch (uploadErr) {
          console.error('头像上传失败:', uploadErr);
        }
      }

      await authApi.updateUserInfo({ nickname, avatarUrl });

      const app = getApp();
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickname = nickname;
        app.globalData.userInfo.avatarUrl = avatarUrl;
      }
      wx.setStorageSync('user', { ...(wx.getStorageSync('user') || {}), nickname, avatarUrl });

      if (this.data.isQrCodeMode) {
        this.setData({
          showProfileModal: false,
          loading: false,
          isNewUser: false,
          qrStep: 'confirm',
          currentUserInfo: { ...(this.data.currentUserInfo || {}), nickname, avatarUrl },
          profileNickname: '',
          profileAvatarUrl: ''
        });
      } else {
        this.setData({ loading: false });
        const pendingShareData = wx.getStorageSync('pendingShareData');
        const hasPendingShare = pendingShareData && (Date.now() - pendingShareData.timestamp < 10 * 60 * 1000);
        if (hasPendingShare) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/todo/todo' });
        }
      }

      wx.showToast({ title: '设置成功', icon: 'success' });
    } catch (err) {
      console.error('保存资料失败:', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  skipProfileSetup() {
    if (this.data.isQrCodeMode) {
      this.setData({
        showProfileModal: false,
        isNewUser: false,
        qrStep: 'confirm',
        currentUserInfo: wx.getStorageSync('user') || {}
      });
    } else {
      const pendingShareData = wx.getStorageSync('pendingShareData');
      const hasPendingShare = pendingShareData && (Date.now() - pendingShareData.timestamp < 10 * 60 * 1000);
      if (hasPendingShare) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/todo/todo' });
      }
    }
  },

  onAgreeChange(e) {
    this.setData({
      agreed: e.detail.checked !== undefined ? e.detail.checked : e.detail.value
    });
  },

  onTapAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  showUserAgreement() {
    this.setData({ showUserAgreement: true });
  },

  hideUserAgreement() {
    this.setData({ showUserAgreement: false });
  },

  showPrivacyPolicy() {
    this.setData({ showPrivacyPolicy: true });
  },

  hidePrivacyPolicy() {
    this.setData({ showPrivacyPolicy: false });
  },

  async handleLogin() {
    if (!this.data.agreed && !this.data.isQrCodeMode) {
      wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
      return;
    }

    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      const code = loginRes.code;
      if (!code) {
        wx.showToast({ title: '获取code失败', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      const result = await authApi.login(code);

      if (result.success && result.token) {
        setToken(result.token);
        wx.setStorageSync('user', result.user || {});

        const app = getApp();
        app.globalData.isLoggedIn = true;
        app.globalData.userInfo = result.user || {};

        const nickname = result.user?.nickname || '';
        const isDefaultName = nickname === '时光绿径用户';

        if (this.data.isQrCodeMode) {
          if (isDefaultName) {
            this.setData({
              isNewUser: true,
              qrStep: 'setup_profile',
              profileNickname: '',
              profileAvatarUrl: '',
              loading: false
            });
          } else {
            this.setData({
              qrStep: 'confirm',
              currentUserInfo: result.user,
              loading: false,
              agreed: true
            });
            wx.showToast({ title: '登录成功，请确认授权', icon: 'none' });
          }
        } else {
          if (isDefaultName) {
            this.setData({
              isNewUser: true,
              qrStep: 'setup_profile',
              profileNickname: '',
              profileAvatarUrl: '',
              loading: false
            });
          } else {
            wx.showToast({ title: '登录成功', icon: 'success' });

            const pendingShareData = wx.getStorageSync('pendingShareData');
            const hasPendingShare = pendingShareData && (Date.now() - pendingShareData.timestamp < 10 * 60 * 1000);

            setTimeout(() => {
              if (hasPendingShare) {
                wx.navigateBack();
              } else {
                wx.switchTab({ url: '/pages/todo/todo' });
              }
            }, 1500);
            this.setData({ loading: false });
          }
        }
      } else {
        wx.showToast({ title: result.message || '登录失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('登录错误:', err);
      wx.showToast({ title: err.message || '网络异常', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  goBackToApp() {
    wx.navigateBack({ delta: 1 }).catch(() => {
      wx.switchTab({ url: '/pages/todo/todo' });
    });
  }
});
