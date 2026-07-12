Page({
  data: {
    mealTypes: [
      { name: '早餐', icon: '🌅' },
      { name: '午餐', icon: '☀️' },
      { name: '晚餐', icon: '🌙' },
      { name: '宵夜', icon: '🌃' }
    ],
    selectedMeal: '午餐',
    todayFood: '',
    foodList: {
      breakfast: [
        '鲜肉小笼包', '豆浆油条', '鸡蛋灌饼', '皮蛋瘦肉粥', '三明治', '茶叶蛋',
        '肠粉', '生煎包', '牛肉锅贴', '豆腐脑', '糯米鸡', '叉烧包', 
        '红糖发糕', '南瓜粥', '煎饼果子', '芝麻烧饼', '虾饺', '奶黄包',
        '菠萝包', '粢饭团', '热干面', '肉夹馍', '小面',
        '杭州小笼包', '胡辣汤', '扬州炒饭', '重庆小面', '汤圆',
        '豆皮', '沙茶面', '甜醅子', '刀削面', '糯米饭'
      ],
      lunch: [
        '红烧牛肉面', '黄焖鸡', '鱼香肉丝饭', '麻辣香锅', '豚骨拉面', '海南鸡饭',
        '卤肉饭', '冬阴功汤', '羊肉炒饭', '部队锅', '肉酱面', 
        '绿咖喱鸡', '大盘鸡', '小炒肉', '地三鲜', '过桥米线',
        '葱油拌面', '蒸饺','三杯鸡', '汽锅鸡', '剁椒鱼头', '瓦罐汤', '锅包肉',
        '手抓饭', '双皮奶', '凉皮', '佛跳墙', '冒菜', '牛肉火锅',
        '生蚝', '白勺虾', '烤冷面', '蛋炒饭', '炒米粉', '炒面', '盐焗鸡', '蒜蓉粉丝扇贝', '牛蛙'
      ],
      dinner: [
        '番茄牛腩', '清蒸鲈鱼', '黑椒牛排', '石锅拌饭', '酸菜鱼',
        '烤鸭卷饼', '红酒烩牛肉', '寿喜锅', '毛血旺', '腊味煲仔饭',
        '柠檬鱼', '海鲜饭', '剁椒鱼头', '油泼面', '辣子鸡',
        '牛肉火锅', '松鼠鱼','北京烤鸭', '腌笃鲜', '潮汕牛肉丸', '酱排骨', '盐水鸭',
        '乱炖', '百合桃胶', '姜母鸭', '藏书羊肉', '酸汤肥牛',
        '生蚝', '白勺虾', '烤冷面', '蛋炒饭', '炒米粉', '炒面', '盐焗鸡', '蒜蓉粉丝扇贝', '牛蛙'
      ],
      midnight: [
        '烧烤套餐', '小龙虾', '炒泡面', '关东煮', '养生粥', '炸鸡啤酒',
        '麻辣烫', '臭豆腐', '烤冷面', '鸡蛋汉堡', '章鱼丸子', '铁板豆腐',
        '炒年糕', '碗仔翅', '螺蛳粉', '串串香', '砂锅粥',
        '鸭血粉丝', '热干面','烤苕皮', '芝士火鸡面', '脆皮五花肉', '红糖冰粉', '芝士焗红薯',
        '炸鲜奶', '韩式辣鸡爪', '泰式芒果糯米饭', '港式碗仔翅', '台式芋圆', '牛蛙'
      ]
    },

    totalCount: 0,         // 新增菜品总数
    recentHistory: [],     // 新增最近5条历史记录
    historyList: [],        // 完整历史记录
    isLoading: false,       // 新增加载状态
    mealStats: []  // 新增餐型统计
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-今天吃什么',
      path: '/packageTools/eating/eating',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },
  
  onShareTimeline() {
    return {
      title: '时光绿径待办-今天吃什么',
      path: '/packageTools/eating/eating',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  handleMealSelect(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedMeal: this.data.mealTypes[index].name,
      todayFood: ''
    })
  },

  // 新增初始化方法
  onLoad() {
    // 计算菜品总数
    const count = Object.values(this.data.foodList).reduce((acc, cur) => acc + cur.length, 0);

    // 新增各餐型统计
    const mealStats = [
      { type: '早餐', count: this.data.foodList.breakfast.length },
      { type: '午餐', count: this.data.foodList.lunch.length },
      { type: '晚餐', count: this.data.foodList.dinner.length },
      { type: '宵夜', count: this.data.foodList.midnight.length }
    ];

    this.setData({
      totalCount: count,
      mealStats  // 新增餐型统计
    });

    // 读取历史记录
    const history = wx.getStorageSync('foodHistory') || [];
    this.setData({
      historyList: history,
      recentHistory: history.slice(0, 5)
    });
  },

  handleShowAllFoods() {
    const { foodList } = this.data;
    const allFoods = [
      "早餐：", ...foodList.breakfast,
      "午餐：", ...foodList.lunch,
      "晚餐：", ...foodList.dinner,
      "宵夜：", ...foodList.midnight
    ].join('\n');
  
    wx.showModal({
      title: `全部菜品（${this.data.totalCount}种）`,
      content: allFoods,
      confirmText: '我知道了',
      confirmColor: '#00b26a',
      showCancel: false
    });
  },

  // 优化后的随机选取方法
  async pickRandomFood() {
    if (this.data.isLoading) return;
    
    const { selectedMeal, foodList } = this.data;
    if (!selectedMeal) {
      wx.showToast({ title: '请先选择餐时', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    
    // 获取对应餐型
    const mealKey = selectedMeal === '早餐' ? 'breakfast' :
      selectedMeal === '午餐' ? 'lunch' :
      selectedMeal === '晚餐' ? 'dinner' : 'midnight';
    
    const foods = foodList[mealKey];
    const randomIndex = Math.floor(Math.random() * foods.length);
    
    // 更新历史记录
    const newHistory = [foods[randomIndex], ...this.data.historyList];
    if (newHistory.length > 500) newHistory.length = 500;
    wx.setStorageSync('foodHistory', newHistory);

    // 更新界面
    this.setData({
      todayFood: foods[randomIndex],
      historyList: newHistory,
      recentHistory: newHistory.slice(0, 5),
      isLoading: false
    });

    // 触觉反馈
    wx.vibrateShort({ type: 'heavy' });
  },

  // 新增完整历史查看
  showFullHistory() {
    wx.showModal({
      title: '历史记录',
      content: this.data.historyList.join('\n'),
      confirmText: '清空',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) this.clearHistory();
      }
    });
  },

    // 新增统计说明
  showStatsHelp() {
    wx.showModal({
      title: '数据说明',
      content: '菜品统计包含所有餐时类型，数据实时更新。历史记录最多保存30天数据。',
      showCancel: false
    });
  },

  // 新增清空历史
  clearHistory() {
    wx.setStorageSync('foodHistory', []);
    this.setData({ 
      historyList: [],
      recentHistory: [] 
    });
  }
});