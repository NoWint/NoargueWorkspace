const app = getApp();
const { todosApi, collabApi, combosApi, isLoggedIn } = require('../../utils/api.js');

function generateTodoId() {
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `todo_${Date.now()}_${randomStr}`;
}

Page({
  data: {
    inputValue: '',
    setDate: '',
    setTime: '',
    remarks: '',
    location: null,
    isStar: false,
    isEdit: false,
    editIndex: -1,
    sharedTodoId: null,

    tags: [],
    selectedTags: [],
    comboId: '',

    showCalendar: false,
    minDate: new Date(2025, 3, 3).getTime(),
    maxDate: new Date(new Date().getFullYear() + 5, 11, 31).getTime(),
    value: new Date().getTime(),
    
    format(day) {
      const { date } = day;
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const cache = getApp().globalData.calendarCache[key];

      if (cache) {
        day.prefix = `${cache.count}项`;
        day.suffix = cache.sampleText.substring(0, 3) + (cache.sampleText.length > 3 ? '..' : '');
        day.className = 't-calendar__day--top';
      }
      
      return day;
    },
    
    showComboPopup: false,
    combos: [],
    sharedCombos: [],
    selectedCombo: null,
    isSharedCombo: false,
    members: [],
    assignType: 'all',
    selectedMembers: [],
    userRole: '',
    excludeType: '',
    
    fileList: [],
    gridConfig: {
      column: 3,
      width: 200,
      height: 200
    },
    uploadConfig: {
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    },
    images: [],
    imageSource: 'media'
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    };
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    };
  },

  onLoad(options) {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ 
      setDate: today,
      setTime: '12:00',
      isStar: false,
      tags: app.getAllTags()
    });

    if (options.comboId) {
      this.setData({ comboId: options.comboId });
    }
    
    if (options.isShared === '1') {
      this.setData({ isSharedCombo: true });
    }

    this.loadCombos();

    if (options.voiceText) {
      this.setData({
        inputValue: decodeURIComponent(options.voiceText),
        isVoiceMode: true
      });
    }

    if (options.setDate && options.edit !== '1' && options.edit !== 1) {
      const dateStr = options.setDate;
      let parsedDate;
      if (/^\d{13,}$/.test(dateStr)) {
        parsedDate = new Date(parseInt(dateStr));
      } else {
        parsedDate = new Date(dateStr.replace(/-/g, '/'));
      }
      if (!isNaN(parsedDate.getTime())) {
        this.setData({
          setDate: this.formatDate(parsedDate),
          setTime: options.setTime || '12:00',
          value: parsedDate.getTime()
        });
      }
    }
    
    if (options.edit === '1' || options.edit === 1) {
      let parsedLocation = null;
      if (options.location && options.location !== 'false') {
        try {
          parsedLocation = JSON.parse(decodeURIComponent(options.location));
        } catch (e) {
          console.error('位置参数解析失败:', e);
        }
      }
      
      let parsedTags = [];
      if (options.tags) {
        try {
          parsedTags = JSON.parse(decodeURIComponent(options.tags));
        } catch (e) {
          console.error('标签参数解析失败:', e);
        }
      }
      
      let formattedSetDate = options.setDate || today;
      if (formattedSetDate) {
        if (/^\d{13,}$/.test(formattedSetDate)) {
          const date = new Date(parseInt(formattedSetDate));
          if (!isNaN(date.getTime())) {
            formattedSetDate = this.formatDate(date);
          }
        } else if (formattedSetDate.includes('T')) {
          const date = new Date(formattedSetDate);
          if (!isNaN(date.getTime())) {
            formattedSetDate = this.formatDate(date);
          }
        } else {
          const date = new Date(formattedSetDate);
          if (!isNaN(date.getTime())) {
            formattedSetDate = this.formatDate(date);
          }
        }
      }
      
      const formattedSetTime = this.formatTime(options.setTime);
      
      let parsedAssigneeIds = [];
      if (options.assigneeIds) {
        try {
          parsedAssigneeIds = JSON.parse(decodeURIComponent(options.assigneeIds));
        } catch (e) {
          console.error('指定成员参数解析失败:', e);
        }
      }
      
      let parsedImages = [];
      if (options.hasImages === '1') {
        parsedImages = app.globalData.editTodoImages || [];
        app.globalData.editTodoImages = [];
      } else if (options.images) {
        try {
          parsedImages = JSON.parse(decodeURIComponent(options.images));
          if (!Array.isArray(parsedImages)) parsedImages = [];
        } catch (e) {
          console.error('图片参数解析失败:', e);
          parsedImages = [];
        }
      }
      const fileList = parsedImages.map((url, index) => ({
        url: url,
        name: `image_${index}`,
        type: 'image',
        status: 'done'
      }));
      
      this.setData({
        inputValue: decodeURIComponent(options.text || ''),
        setDate: formattedSetDate,
        setTime: formattedSetTime,
        remarks: decodeURIComponent(options.remarks || ''),
        location: parsedLocation,
        isStar: options.isStar === 'true' || options.isStar === true,
        isEdit: true,
        editIndex: options.index,
        selectedTags: parsedTags,
        comboId: options.comboId || '',
        todoTime: options.time,
        sharedTodoId: options.sharedTodoId || null,
        assignType: options.assignType || 'all',
        selectedMembers: parsedAssigneeIds,
        excludeType: options.excludeType || '',
        images: parsedImages,
        fileList: fileList,
        value: new Date(formattedSetDate).getTime()
      });
    }
  },

  async loadCombos() {
    const combos = app.globalData.combos || [];
    const sharedCombos = app.globalData.sharedCombos || [];
    
    const filteredSharedCombos = sharedCombos.filter(combo => 
      combo.role === 'owner' || combo.role === 'admin' || combo.userRole === 'owner' || combo.userRole === 'admin'
    );
    
    const sharedComboIds = new Set(sharedCombos.map(c => c.id));
    const privateCombos = combos.filter(combo => 
      !sharedComboIds.has(combo.id) && combo.isShared !== 1 && combo.is_shared !== 1
    );
    
    this.setData({ combos: privateCombos, sharedCombos: filteredSharedCombos });
    
    if (this.data.comboId) {
      const allCombos = [...privateCombos, ...filteredSharedCombos];
      const selectedCombo = allCombos.find(c => String(c.id) === String(this.data.comboId));
      if (selectedCombo) {
        const isShared = selectedCombo.isShared || selectedCombo.is_shared || this.data.isSharedCombo;
        this.setData({ 
          selectedCombo,
          isSharedCombo: isShared
        });
        
        if (isShared && isLoggedIn()) {
          try {
            const result = await combosApi.getById(selectedCombo.id);
            const combo = result.combo || result;
            this.setData({ 
              members: combo.members || [],
              userRole: combo.userRole
            });
          } catch (err) {
            console.error('加载成员失败:', err);
          }
        }
      } else {
        if (this.data.isSharedCombo && isLoggedIn()) {
          try {
            const result = await combosApi.getById(this.data.comboId);
            const combo = result.combo || result;
            this.setData({ 
              selectedCombo: combo,
              members: combo.members || [],
              userRole: combo.userRole
            });
          } catch (err) {
            console.error('加载组合失败:', err);
          }
        }
      }
    }
  },

  showComboSelector() {
    this.setData({ showComboPopup: true });
  },

  hideComboPopup() {
    this.setData({ showComboPopup: false });
  },

  onComboPopupVisibleChange(e) {
    this.setData({ showComboPopup: e.detail.visible });
  },

  selectCombo(e) {
    const combo = e.currentTarget.dataset.combo;
    const isShared = e.currentTarget.dataset.shared === '1';
    
    this.setData({ 
      selectedCombo: combo,
      comboId: combo.id,
      isSharedCombo: isShared,
      showComboPopup: false,
      assignType: 'all',
      selectedMembers: [],
      members: [],
      excludeType: ''
    });
    
    if (isShared && combo.id) {
      this.loadComboMembers(combo.id);
    }
  },

  clearCombo() {
    this.setData({
      selectedCombo: null,
      comboId: '',
      isSharedCombo: false,
      members: [],
      assignType: 'all',
      selectedMembers: [],
      userRole: '',
      excludeType: ''
    });
  },

  clearLocation() {
    this.setData({
      location: null
    });
  },

  async loadComboMembers(comboId) {
    if (!isLoggedIn()) return;
    
    try {
      const result = await combosApi.getById(comboId);
      const combo = result.combo || result;
      this.setData({ 
        members: combo.members || [],
        userRole: combo.userRole
      });
    } catch (err) {
      console.error('加载成员失败:', err);
    }
  },

  setAssignType(e) {
    this.setData({ 
      assignType: e.currentTarget.dataset.type,
      excludeType: ''
    });
  },

  toggleExcludeType(e) {
    const type = e.currentTarget.dataset.type;
    if (this.data.excludeType === type) {
      this.setData({ excludeType: '' });
    } else {
      this.setData({ excludeType: type });
    }
  },

  toggleMemberSelect(e) {
    const memberId = e.currentTarget.dataset.id;
    const selectedMembers = [...this.data.selectedMembers];
    const index = selectedMembers.indexOf(memberId);
    
    if (index > -1) {
      selectedMembers.splice(index, 1);
    } else {
      selectedMembers.push(memberId);
    }
    
    this.setData({ selectedMembers });
  },

  handleInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  handleRemarksChange(e) {
    this.setData({
      remarks: e.detail.value
    });
  },

  bindDateChange(e) {
    this.setData({
      setDate: e.detail.value
    });
  },

  showCalendar() {
    wx.showLoading({ title: '加载中...' });
    this.setData({ showCalendar: true });
    wx.hideLoading();
  },

  handleCalendarClose() {
    this.setData({ showCalendar: false });
  },

  handleCalendarConfirm(e) {
    const selectedDate = this.formatDate(new Date(e.detail.value));
    this.setData({
      setDate: selectedDate,
      value: e.detail.value
    });
  },
  
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  formatTime(timeValue) {
    if (!timeValue) return '12:00';
    if (typeof timeValue === 'string' && timeValue.length <= 5) {
      const parts = timeValue.split(':');
      if (parts.length === 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    }
    const timeMatch = String(timeValue).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '12:00';
  },

  bindTimeChange(e) {
    this.setData({
      setTime: e.detail.value
    });
  },

  onRemarksInput(e) {
    this.setData({
      remarks: e.detail.value
    });
  },

  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      }
    });
  },

  toggleTag(e) {
    const tagId = e.currentTarget.dataset.id;
    const selectedTags = [...this.data.selectedTags];
    const index = selectedTags.findIndex(t => t == tagId);
    
    if (index > -1) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tagId);
    }
    
    this.setData({ selectedTags });
  },

  navigateToTagManage() {
    wx.navigateTo({
      url: '/packageTools/tag-manage/tag-manage'
    });
  },

  compressImage(filePath) {
    return new Promise((resolve) => {
      wx.compressImage({
        src: filePath,
        quality: 80,
        success: (res) => {
          resolve(res.tempFilePath);
        },
        fail: () => {
          resolve(filePath);
        }
      });
    });
  },

  async uploadImage(filePath, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = [1000, 2000, 3000];
    
    let compressedPath = filePath;
    try {
      const fileInfo = await new Promise((resolve) => {
        wx.getFileInfo({
          filePath: filePath,
          success: resolve,
          fail: () => resolve({ size: 0 })
        });
      });
      
      if (fileInfo.size > 2 * 1024 * 1024) {
        compressedPath = await this.compressImage(filePath);
      }
    } catch (e) {
      console.log('图片压缩失败，使用原图:', e);
    }
    
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: 'https://img.scdn.io/api/v1.php',
        filePath: compressedPath,
        name: 'image',
        timeout: 60000,
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.url) {
              resolve(data.url);
            } else {
              const errorMsg = data.error || '上传失败';
              if (retryCount < maxRetries) {
                console.log(`上传失败(${errorMsg})，第${retryCount + 1}次重试...`);
                setTimeout(() => {
                  this.uploadImage(filePath, retryCount + 1)
                    .then(resolve)
                    .catch(reject);
                }, retryDelay[retryCount]);
              } else {
                reject(new Error(errorMsg));
              }
            }
          } catch (e) {
            if (retryCount < maxRetries) {
              console.log(`响应解析失败，第${retryCount + 1}次重试...`);
              setTimeout(() => {
                this.uploadImage(filePath, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, retryDelay[retryCount]);
            } else {
              reject(new Error('响应解析失败'));
            }
          }
        },
        fail: (err) => {
          if (retryCount < maxRetries) {
            console.log(`网络错误，第${retryCount + 1}次重试...`);
            setTimeout(() => {
              this.uploadImage(filePath, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, retryDelay[retryCount]);
          } else {
            reject(new Error('网络错误，请检查网络连接'));
          }
        }
      });
    });
  },

  toggleImageSource(e) {
    const isMessageFile = e.detail.value;
    const newSource = isMessageFile ? 'messageFile' : 'media';
    this.setData({ imageSource: newSource });
  },

  async handleImageAdd(e) {
    const { files } = e.detail;
    const currentCount = this.data.fileList.length;
    const maxCount = 9;
    
    if (currentCount >= maxCount) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }
    
    const remainingSlots = maxCount - currentCount;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (filesToAdd.length === 0) return;
    
    const uploadedUrls = [];
    const failedFiles = [];
    
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      wx.showLoading({ title: `上传中 ${i + 1}/${filesToAdd.length}`, mask: true });
      
      try {
        const url = await this.uploadImage(file.url);
        uploadedUrls.push(url);
        
        const newFileItem = {
          url: url,
          name: `image_${this.data.fileList.length + uploadedUrls.length}`,
          type: 'image',
          status: 'done'
        };
        
        this.setData({
          images: [...this.data.images, url],
          fileList: [...this.data.fileList, newFileItem]
        });
      } catch (err) {
        console.error(`图片 ${i + 1} 上传失败:`, err);
        failedFiles.push({ index: i + 1, error: err.message });
      }
    }
    
    wx.hideLoading();
    
    if (failedFiles.length > 0) {
      const failedMsg = failedFiles.map(f => `第${f.index}张`).join('、');
      wx.showModal({
        title: '部分图片上传失败',
        content: `${failedMsg}图片上传失败，请重试`,
        showCancel: false,
        confirmText: '知道了'
      });
    } else if (uploadedUrls.length > 0) {
      wx.showToast({ title: '上传成功', icon: 'success' });
    }
  },

  handleImageRemove(e) {
    const { index } = e.detail;
    const newFileList = [...this.data.fileList];
    const newImages = [...this.data.images];
    
    newFileList.splice(index, 1);
    newImages.splice(index, 1);
    
    this.setData({
      fileList: newFileList,
      images: newImages
    });
  },

  handleImageClick(e) {
    const { file } = e.detail;
    wx.previewImage({
      current: file.url,
      urls: this.data.images
    });
  },

  handleImageDrop(e) {
    const { files } = e.detail;
    const newImages = files.map(file => file.url);
    const newFileList = files.map((file, index) => ({
      url: file.url,
      name: file.name || `image_${index}`,
      type: 'image',
      status: 'done'
    }));
    
    this.setData({
      fileList: newFileList,
      images: newImages
    });
  },

  async addTodo() {
    const text = this.data.inputValue.trim();
    const setDate = this.data.setDate;
    
    if (!text || !setDate || !this.data.setTime) {
      wx.showToast({ 
        title: !text ? '请填写事项内容' : !setDate ? '请选择日期' : '请选择时间', 
        icon: 'none' 
      });
      return;
    }
    
    if (text.length > 50) {
      const exceed = text.length - 50;
      wx.showToast({
        title: `待办内容已超过50字上限，当前${text.length}字，需删除${exceed}字`,
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    if (this.data.isEdit) {
      this.updateTodo();
      return;
    }
    
    const todos = wx.getStorageSync('todos') || [];
    const activeTodos = todos.filter(t => !t.isDeleted);
    const todoLimit = app.globalData?.userInfo?.todoLimit || 100;
    if (activeTodos.length >= todoLimit) {
      wx.showModal({
        title: '待办数量已达上限',
        content: `最多可创建 ${todoLimit} 个待办，请删除部分待办后再试。可在 更多-容量扩展 增加`,
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }
    
    if (this.data.isSharedCombo && this.data.comboId) {
      await this.createSharedTodo();
    } else {
      this.createLocalTodo();
    }
  },

  async createSharedTodo() {
    const { inputValue, setDate, setTime, remarks, comboId, assignType, selectedMembers, selectedTags, excludeType, images, location } = this.data;
    
    if (assignType === 'specific' && selectedMembers.length === 0) {
      wx.showToast({ title: '请选择完成人', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '创建中...' });
    
    try {
      await collabApi.createSharedTodo(comboId, {
        text: inputValue.trim(),
        setDate,
        setTime,
        remarks,
        location,
        tags: selectedTags,
        assignType,
        assigneeIds: assignType === 'specific' ? selectedMembers : [],
        excludeType: (assignType === 'all' || assignType === 'any') ? excludeType : '',
        images: images
      });
      
      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '创建失败', icon: 'none' });
    }
  },

  createLocalTodo() {
    const pages = getCurrentPages();
    const prevPage = pages.find(page => 
      page.route === 'pages/todo/todo' || 
      page.route === 'pages/calendar/calendar' ||
      page.route === 'pages/combo-detail/combo-detail'
    );
    
    const now = Date.now();
    const newTodo = {
      id: generateTodoId(),
      text: this.data.inputValue.trim(),
      setDate: this.data.setDate,
      setTime: this.data.setTime,
      remarks: this.data.remarks,
      location: this.data.location,
      completed: false,
      time: now,
      isStar: false,
      tags: this.data.selectedTags,
      comboId: this.data.comboId || '',
      images: this.data.images,
      version: 1,
      isDeleted: false,
      deletedAt: null,
      updatedAt: now
    };
    
    if (prevPage && prevPage.addTodoFromChild) {
      prevPage.addTodoFromChild(
        newTodo.text, 
        newTodo.setDate,
        newTodo.setTime,
        newTodo.remarks, 
        newTodo.location,
        newTodo.tags,
        newTodo.comboId,
        newTodo.images
      );
    } else {
      const todos = wx.getStorageSync('todos') || [];
      todos.unshift(newTodo);
      wx.setStorageSync('todos', todos);
      app.updateCalendarCache(todos);
      
      if (isLoggedIn()) {
        const { syncWithCloud } = require('../../utils/sync.js');
        syncWithCloud('local').catch(err => console.error('同步失败:', err));
      }
    }
    
    if (newTodo.comboId) {
      this.updateComboTodoCount(newTodo.comboId);
    }
    
    wx.navigateBack();
  },

  updateComboTodoCount(comboId) {
    const todos = wx.getStorageSync('todos') || [];
    const count = todos.filter(t => String(t.comboId) === String(comboId)).length;
    
    const combos = app.globalData.combos || [];
    const comboIndex = combos.findIndex(c => String(c.id) === String(comboId));
    if (comboIndex > -1) {
      combos[comboIndex].todoCount = count;
      app.setCombos(combos);
    }
    
    const sharedCombos = app.globalData.sharedCombos || [];
    const sharedIndex = sharedCombos.findIndex(c => String(c.id) === String(comboId));
    if (sharedIndex > -1) {
      sharedCombos[sharedIndex].todoCount = count;
      app.setSharedCombos(sharedCombos);
    }
  },

  updateTodo() {
    const { sharedTodoId, comboId } = this.data;
    
    if (sharedTodoId) {
      this.updateSharedTodo();
      return;
    }
    
    const todos = wx.getStorageSync('todos');
    const originalTodo = todos[this.data.editIndex] || {};
    const now = Date.now();
    
    todos[this.data.editIndex] = {
      ...originalTodo,
      text: this.data.inputValue,
      setDate: this.data.setDate,
      setTime: this.data.setTime,
      remarks: this.data.remarks,
      location: this.data.location,
      isStar: this.data.isStar,
      tags: this.data.selectedTags,
      comboId: comboId || originalTodo.comboId || '',
      images: this.data.images,
      version: (originalTodo.version || 1) + 1,
      updatedAt: now
    };
    
    wx.setStorageSync('todos', todos);
    app.updateCalendarCache(todos);
    
    const pages = getCurrentPages();
    const todoPage = pages.find(page => page.route === 'pages/todo/todo');
    const calendarPage = pages.find(page => page.route === 'pages/calendar/calendar');
    const comboDetailPage = pages.find(page => page.route === 'pages/combo-detail/combo-detail');
    
    if (todoPage) todoPage.setData({ todos });
    if (calendarPage) calendarPage.setData({ todos });
    if (comboDetailPage && comboDetailPage.data.comboId) {
      comboDetailPage.loadComboData(comboDetailPage.data.comboId);
    }
    
    if (isLoggedIn()) {
      const { syncWithCloud } = require('../../utils/sync.js');
      syncWithCloud('local').catch(err => console.error('同步失败:', err));
    }
    
    wx.navigateBack();
  },

  async updateSharedTodo() {
    const { sharedTodoId, comboId, inputValue, setDate, setTime, remarks, selectedTags, assignType, selectedMembers, excludeType, images, location } = this.data;
    
    if (!inputValue.trim()) {
      wx.showToast({ title: '请填写事项内容', icon: 'none' });
      return;
    }
    
    if (assignType === 'specific' && selectedMembers.length === 0) {
      wx.showToast({ title: '请选择完成人', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    try {
      await collabApi.updateSharedTodo(comboId, sharedTodoId, {
        text: inputValue.trim(),
        setDate,
        setTime,
        remarks,
        location,
        tags: selectedTags,
        assignType,
        assigneeIds: assignType === 'specific' ? selectedMembers : [],
        excludeType: (assignType === 'all' || assignType === 'any') ? excludeType : '',
        images: images
      });
      
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      
      const pages = getCurrentPages();
      const comboDetailPage = pages.find(page => page.route === 'pages/combo-detail/combo-detail');
      if (comboDetailPage && comboDetailPage.data.comboId) {
        comboDetailPage.loadComboData(comboDetailPage.data.comboId);
      }
      
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
