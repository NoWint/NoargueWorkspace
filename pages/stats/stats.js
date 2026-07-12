const { getLocalTodos } = require('../../utils/sync.js');
const app = getApp();
// 引入echarts
import * as echarts from '../../miniprogram_npm/ec-canvas/echarts';

Page({
  data: {
    // 导航栏相关
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,
    menuWidth: app.globalData.menuWidth,
    menuLeft: app.globalData.menuLeft,

    total: 0,
    completed: 0,
    progress: 0,
    avgCompletionTime: '0h',
    categoryStats: [],
    lastUpdated: "",
    locationStats: [],
    locationTotal: 0,
    locationMarkers: [],
    locationPoints: [],
    mapCenter: { latitude: 39.90403, longitude: 116.407526 },
    overviewChart: {
      lazyLoad: true
    },
    trendChart: {
      lazyLoad: true
    },
    timeChart: {
      lazyLoad: true
    },
    completeTimeChart: {
      lazyLoad: true
    },
    timeOfDayStats: []
  },

  onShareAppMessage() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  navigateToDailyStats() {
    wx.navigateTo({
      url: '/packagePages/daily-stats/daily-stats'
    });
  },

  onShareTimeline() {
    return {
      title: '时光绿径待办-您的每日任务足迹管家',
      path: '/pages/todo/todo',
      imageUrl: 'https://api.yzjtiantian.cn/uploads/logo/logo.png'
    }
  },

  onShow() {
    const todos = getLocalTodos();
    this.updateStats(todos);
  },

  updateStats(todos) {
    const completed = todos.filter(item => item.completed).length;
    const total = todos.length;
    const progress = total ? Math.min((completed / total * 100), 100).toFixed(0) : 0;

    // 计算平均完成时间
    const avgCompletionTime = this.calculateAvgCompletionTime(todos);

    // 分析位置数据
    const { markers, points, center } = this.analyzeMapMarkers(todos);

    // 分类统计
    const categoryStats = this.calculateCategoryStats(todos);

    // 最近更新时间
    const lastUpdated = this.getLastUpdatedTime(todos);

    // 位置统计
    const locationStats = this.analyzeLocations(todos);
    const locationTotal = locationStats.reduce((sum, item) => sum + item.count, 0);

    // 时间分布统计
    const timeOfDayStats = this.analyzeTimeOfDay(todos);
    const completeTimeOfDayStats = this.analyzeCompleteTimeOfDay(todos);

    // 准备图表数据
    this.initOverviewChart(total, completed);
    this.initTrendChart(todos);
    this.initTimeChart(timeOfDayStats);
    this.initCompleteTimeChart(completeTimeOfDayStats);

    this.setData({
      total,
      completed,
      progress,
      avgCompletionTime,
      categoryStats,
      lastUpdated,
      locationStats,
      locationTotal,
      locationMarkers: markers,
      locationPoints: points,
      mapCenter: center,
      timeOfDayStats
    });
  },

  // 计算平均完成时间
  calculateAvgCompletionTime(todos) {
    // 只筛选出已完成且包含有效时间戳的待办
    const completedTodos = todos.filter(item => {
      // 检查是否已完成且有创建时间
      if (!item.time) return false;

      // 检查 completed 字段是否为有效日期
      const completedDate = new Date(item.completed);
      const createDate = new Date(item.time);

      // 排除无效日期和布尔值 true
      return (
        item.completed &&
        item.completed !== true && // 排除布尔值 true
        !isNaN(completedDate.getTime()) && // 确保是有效日期
        !isNaN(createDate.getTime()) && // 确保创建时间有效
        completedDate.getTime() > createDate.getTime() // 完成时间应晚于创建时间
      );
    });

    if (completedTodos.length === 0) return '0h';

    const totalTimeDiff = completedTodos.reduce((sum, todo) => {
      const createTime = new Date(todo.time).getTime();
      const completeTime = new Date(todo.completed).getTime();
      return sum + (completeTime - createTime);
    }, 0);

    const avgHours = (totalTimeDiff / (completedTodos.length * 1000 * 60 * 60)).toFixed(1);
    return `${avgHours}h`;
  },

  // 分析每日待办趋势
  analyzeDailyTrend(todos) {
    const dailyMap = {};
    todos.forEach(todo => {
      const createDate = new Date(todo.time);
      if (isNaN(createDate.getTime())) return;

      const y = createDate.getFullYear();
      const m = (createDate.getMonth() + 1).toString().padStart(2, '0');
      const d = createDate.getDate().toString().padStart(2, '0');
      const date = `${y}-${m}-${d}`;
      if (!dailyMap[date]) {
        dailyMap[date] = { create: 0, complete: 0 };
      }
      dailyMap[date].create++;
      if (todo.completed) {
        dailyMap[date].complete++;
      }
    });

    // 按日期排序
    const sortedDates = Object.keys(dailyMap).sort();
    const dates = [];
    const createData = [];
    const completeData = [];

    sortedDates.forEach(date => {
      dates.push(date);
      createData.push(dailyMap[date].create);
      completeData.push(dailyMap[date].complete);
    });

    return { dates, createData, completeData };
  },

  // 分析一天中的时间分布
  analyzeTimeOfDay(todos) {
    const hourMap = {};
    // 初始化24小时
    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0;
    }

    todos.forEach(todo => {
      const date = new Date(todo.time);
      if (isNaN(date.getTime())) return;

      const hour = date.getHours();
      hourMap[hour]++;
    });

    return Object.keys(hourMap).map(hour => ({
      hour: parseInt(hour),
      count: hourMap[hour]
    }));
  },

  analyzeCompleteTimeOfDay(todos) {
    const hourMap = {};
    // 初始化24小时
    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0;
    }

    // 只统计有效完成的待办
    const completedTodos = todos.filter(item => {
      if (!item.completed) return false;

      // 排除布尔值 true 和无效日期
      const completedDate = new Date(item.completed);
      return (
        item.completed !== true &&
        !isNaN(completedDate.getTime())
      );
    });

    completedTodos.forEach(todo => {
      // 使用完成时间，而不是创建时间
      const hour = new Date(todo.completed).getHours();
      hourMap[hour]++;
    });

    return Object.keys(hourMap).map(hour => ({
      hour: parseInt(hour),
      count: hourMap[hour]
    }));
  },

  // 初始化概览图表
  initOverviewChart(total, completed) {
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: {
          fontSize: 12
        }
      },
      color: ['#00B26A', '#E8F5E9'],
      series: [
        {
          name: '待办完成情况',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: completed, name: '已完成' },
            { value: total - completed, name: '未完成' }
          ]
        }
      ]
    };

    // 使用ec-canvas组件的方式初始化图表
    this.selectComponent('#overviewChart').init((canvas, width, height) => {
      // 使用echarts.init方法初始化图表
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });

      chart.setOption(option);
      return chart;
    });
  },

  // 初始化趋势图表
  initTrendChart(todos) {
    const { dates, createData, completeData } = this.analyzeDailyTrend(todos);

    // 使用ec-canvas组件的方式初始化图表
    this.selectComponent('#trendChart').init((canvas, width, height) => {
      // 使用echarts.init方法初始化图表
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });

      const option = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['创建', '完成'],
          bottom: 0,
          textStyle: {
            fontSize: 12
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates,
          axisLabel: {
            fontSize: 10,
            rotate: 45
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '创建',
            type: 'line',
            data: createData,
            smooth: true,
            lineStyle: {
              color: '#26c6da'
            },
            // 避免使用LinearGradient，直接使用颜色字符串
            areaStyle: {
              color: 'rgba(38, 198, 218, 0.3)'
            }
          },
          {
            name: '完成',
            type: 'line',
            data: completeData,
            smooth: true,
            lineStyle: {
              color: '#00b26a'
            },
            areaStyle: {
              color: 'rgba(0, 178, 106, 0.3)'
            }
          }
        ]
      };

      chart.setOption(option);
      return chart;
    });
  },

  // 初始化时间分布图表
  initTimeChart(timeOfDayStats) {
    const hours = timeOfDayStats.map(item => item.hour + ':00');
    const counts = timeOfDayStats.map(item => item.count);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '待办数量',
          type: 'bar',
          data: counts,
          itemStyle: {
            // 避免使用LinearGradient，直接使用颜色字符串
            color: '#00B26A'
          }
        }
      ]
    };

    // 使用ec-canvas组件的方式初始化图表
    this.selectComponent('#timeChart').init((canvas, width, height) => {
      // 使用echarts.init方法初始化图表
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });

      chart.setOption(option);
      return chart;
    });
  },

  initCompleteTimeChart(completeTimeOfDayStats) {
    const hours = completeTimeOfDayStats.map(item => item.hour + ':00');
    const counts = completeTimeOfDayStats.map(item => item.count);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '完成数量',
          type: 'bar',
          data: counts,
          itemStyle: {
            // 避免使用LinearGradient，直接使用颜色字符串
            color: '#26C6DA'
          }
        }
      ]
    };

    // 使用ec-canvas组件的方式初始化图表
    this.selectComponent('#completeTimeChart').init((canvas, width, height) => {
      // 使用echarts.init方法初始化图表
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });

      chart.setOption(option);
      return chart;
    });
  },

  // 分类统计
  calculateCategoryStats(todos) {
    const categoryMap = {};
    todos.forEach(todo => {
      const category = todo.category || '';
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, completed: 0 };
      }
      categoryMap[category].total++;
      if (todo.completed) categoryMap[category].completed++;
    });
    return Object.keys(categoryMap).map(category => ({
      category,
      ...categoryMap[category],
      percent: (categoryMap[category].completed / categoryMap[category].total * 100).toFixed(0) + '%'
    }));
  },

  // 最近更新时间
  getLastUpdatedTime(todos) {
    let maxTs = 0;

    todos.forEach(todo => {
      const createDate = new Date(todo.time);
      if (!isNaN(createDate.getTime())) {
        maxTs = Math.max(maxTs, createDate.getTime());
      }

      const completedDate = new Date(todo.completed);
      if (todo.completed && todo.completed !== true && !isNaN(completedDate.getTime())) {
        maxTs = Math.max(maxTs, completedDate.getTime());
      }
    });

    const lastDate = maxTs ? new Date(maxTs) : new Date();
    return `${lastDate.getMonth() + 1}月${lastDate.getDate()}日 ${lastDate.getHours()}:${lastDate.getMinutes().toString().padStart(2, '0')}`;
  },

  // 分析位置数据
  analyzeLocations(todos) {
    const locations = todos
      .filter(t => t.location)
      .map(t => t.location.name)
      .filter(Boolean);

    return Object.entries(
      locations.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count }));
  },

  // 分析地图标记
  analyzeMapMarkers(todos) {
    const locations = todos
      .filter(t => t.location?.latitude && t.location?.longitude)
      .map(t => t.location);

    // 计算几何中心
    let center = { latitude: 39.90403, longitude: 116.407526 }; // 默认北京
    if (locations.length > 0) {
      const sum = locations.reduce((acc, cur) => ({
        lat: acc.lat + cur.latitude,
        lng: acc.lng + cur.longitude
      }), { lat: 0, lng: 0 });

      center = {
        latitude: sum.lat / locations.length,
        longitude: sum.lng / locations.length
      };
    }

    // 生成标记点
    const markers = locations.map((loc, index) => ({
      id: index,
      latitude: loc.latitude,
      longitude: loc.longitude,
      title: loc.name,
      iconPath: '/images/marker.png',
      width: 30,
      height: 30
    }));

    return {
      markers,
      points: locations,
      center
    };
  },

  // ===========================
  // Canvas 分享图片辅助方法
  // ===========================

  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  },

  // 生成分享图片
  generateShareImage() {
    wx.showLoading({ title: '生成中...' });

    wx.createSelectorQuery()
      .select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;
        const todos = getLocalTodos();
        const data = this.data;

        this._drawBackground(ctx, canvas, dpr);
        await this._drawHeader(ctx, canvas, data.lastUpdated);

        let nextY = this._drawStatsGrid(ctx, data, todos);
        nextY = this._drawLocationSection(ctx, data, nextY);
        nextY = this._drawTagSection(ctx, todos, nextY);
        nextY = this._drawTrendChart(ctx, todos, nextY);
        this._drawTimeDistribution(ctx, data, nextY);
        this._drawFooter(ctx);

        wx.canvasToTempFilePath({
          canvas,
          success: res => {
            wx.hideLoading();
            wx.showShareImageMenu({
              path: res.tempFilePath,
              success: () => {
                wx.shareFileMessage({
                  filePath: res.tempFilePath,
                  fileName: '待办统计报告.png'
                });
              }
            });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '生成失败', icon: 'none' });
          }
        });
      });
  },

  _drawBackground(ctx, canvas, dpr) {
    canvas.width = 750 * dpr;
    canvas.height = 2200 * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 750, 2200);

    const gradient = ctx.createLinearGradient(0, 0, 750, 0);
    gradient.addColorStop(0, '#00B26A');
    gradient.addColorStop(1, '#52f099');
    ctx.fillStyle = gradient;
    this.drawRoundRect(ctx, 0, 0, 750, 280, 0);
    ctx.fill();
  },

  async _drawHeader(ctx, canvas, lastUpdated) {
    const loadLogo = (imgUrl) => {
      return new Promise((resolve, reject) => {
        const logoImg = canvas.createImage();
        logoImg.onload = () => resolve(logoImg);
        logoImg.onerror = reject;
        logoImg.src = imgUrl;
      });
    };

    try {
      const logoImg = await loadLogo('https://api.yzjtiantian.cn/uploads/logo/logo.png');
      ctx.drawImage(logoImg, 50, 30, 80, 80);
    } catch (e) {
      logger.warn('UI', 'LOGO', 'Logo加载失败', e);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px "PingFang SC"';
    ctx.fillText('时光绿径待办统计', 150, 80);

    ctx.font = '26px "PingFang SC"';
    ctx.globalAlpha = 0.9;
    ctx.fillText(`生成于 ${lastUpdated}`, 150, 130);
    ctx.globalAlpha = 1.0;
  },

  _drawStatsGrid(ctx, data, todos) {
    const starCount = todos.filter(t => t.isStar && !t.isDeleted).length;
    const imageCount = todos.filter(t => {
      if (!t.images || t.isDeleted) return false;
      if (Array.isArray(t.images) && t.images.length > 0) return true;
      if (typeof t.images === 'string') {
        try {
          const parsed = JSON.parse(t.images);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch (e) { return false; }
      }
      return false;
    }).length;
    const locationCount = todos.filter(t => t.location && !t.isDeleted).length;

    const cardY = 320;

    this.drawRoundRect(ctx, 30, cardY, 690, 200, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.shadowColor = 'transparent';

    const metrics = [
      { label: '总待办', value: data.total, x: 65, color: '#2d3436' },
      { label: '已完成', value: data.completed, x: 215, color: '#00B26A' },
      { label: '完成率', value: `${data.progress}%`, x: 365, color: '#26c6da' },
      { label: '平均耗时', value: data.avgCompletionTime, x: 515, color: '#f5a623' }
    ];

    metrics.forEach(m => {
      ctx.font = '22px "PingFang SC"';
      ctx.fillStyle = '#888888';
      ctx.fillText(m.label, m.x, cardY + 55);

      ctx.font = 'bold 44px "PingFang SC"';
      ctx.fillStyle = m.color;
      ctx.fillText(String(m.value), m.x, cardY + 110);
    });

    const extraMetrics = [
      { label: '收藏', value: starCount, icon: '★', x: 65 },
      { label: '带图', value: imageCount, icon: '🖼', x: 215 },
      { label: '定位', value: locationCount, icon: '📍', x: 365 }
    ];

    extraMetrics.forEach(m => {
      ctx.font = '20px "PingFang SC"';
      ctx.fillStyle = '#888888';
      ctx.fillText(m.label, m.x, cardY + 155);

      ctx.font = 'bold 32px "PingFang SC"';
      ctx.fillStyle = '#00B26A';
      ctx.fillText(String(m.value), m.x, cardY + 190);
    });

    return cardY + 240;
  },

  _drawLocationSection(ctx, data, startY) {
    const locationSectionY = startY;
    this.drawRoundRect(ctx, 30, locationSectionY, 690, 220, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.shadowColor = 'transparent';

    ctx.font = 'bold 30px "PingFang SC"';
    ctx.fillStyle = '#2d3436';
    ctx.fillText('📍 位置分布', 50, locationSectionY + 50);

    if (data.locationStats.length > 0) {
      const maxCount = Math.max(...data.locationStats.map(s => s.count));
      const barHeight = 28;
      const startY2 = locationSectionY + 80;
      const maxItems = Math.min(data.locationStats.length, 5);
      const maxBarWidth = 560;

      for (let i = 0; i < maxItems; i++) {
        const item = data.locationStats[i];
        const barWidth = maxCount > 0 ? (item.count / maxCount) * maxBarWidth : 0;
        const itemY = startY2 + i * (barHeight + 14);

        ctx.fillStyle = '#f0f4f8';
        this.drawRoundRect(ctx, 50, itemY, maxBarWidth, barHeight, 14);
        ctx.fill();

        const barGradient = ctx.createLinearGradient(50, 0, 50 + barWidth, 0);
        barGradient.addColorStop(0, '#00B26A');
        barGradient.addColorStop(1, '#52f099');
        ctx.fillStyle = barGradient;
        this.drawRoundRect(ctx, 50, itemY, barWidth, barHeight, 14);
        ctx.fill();

        ctx.font = '20px "PingFang SC"';
        ctx.fillStyle = '#2d3436';
        const name = item.name.length > 14 ? item.name.substring(0, 14) + '...' : item.name;
        ctx.fillText(name, 65, itemY + 20);

        ctx.font = 'bold 20px "PingFang SC"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.count.toString(), 50 + maxBarWidth + 20, itemY + 20);
      }
    } else {
      ctx.font = '20px "PingFang SC"';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('暂无位置数据', 50, locationSectionY + 120);
    }

    return locationSectionY + 260;
  },

  _drawTagSection(ctx, todos, startY) {
    const tagMap = {};
    todos.filter(t => !t.isDeleted && t.tags && t.tags.length > 0).forEach(t => {
      t.tags.forEach(tagId => {
        tagMap[tagId] = (tagMap[tagId] || 0) + 1;
      });
    });
    const tagStats = Object.entries(tagMap)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const tagSectionY = startY;
    this.drawRoundRect(ctx, 30, tagSectionY, 690, 220, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.shadowColor = 'transparent';

    ctx.font = 'bold 30px "PingFang SC"';
    ctx.fillStyle = '#2d3436';
    ctx.fillText('🏷 标签分布', 50, tagSectionY + 50);

    if (tagStats.length > 0) {
      const maxCount = Math.max(...tagStats.map(s => s.count));
      const barHeight = 28;
      const startY2 = tagSectionY + 80;
      const maxBarWidth = 560;

      for (let i = 0; i < tagStats.length; i++) {
        const item = tagStats[i];
        const barWidth = maxCount > 0 ? (item.count / maxCount) * maxBarWidth : 0;
        const itemY = startY2 + i * (barHeight + 14);

        ctx.fillStyle = '#f0f4f8';
        this.drawRoundRect(ctx, 50, itemY, maxBarWidth, barHeight, 14);
        ctx.fill();

        const barGradient = ctx.createLinearGradient(50, 0, 50 + barWidth, 0);
        barGradient.addColorStop(0, '#26c6da');
        barGradient.addColorStop(1, '#00B26A');
        ctx.fillStyle = barGradient;
        this.drawRoundRect(ctx, 50, itemY, barWidth, barHeight, 14);
        ctx.fill();

        ctx.font = '20px "PingFang SC"';
        ctx.fillStyle = '#2d3436';
        const tagName = `标签 ${item.id}`;
        ctx.fillText(tagName, 65, itemY + 20);

        ctx.font = 'bold 20px "PingFang SC"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.count.toString(), 50 + maxBarWidth + 20, itemY + 20);
      }
    } else {
      ctx.font = '20px "PingFang SC"';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('暂无标签数据', 50, tagSectionY + 120);
    }

    return tagSectionY + 260;
  },

  _drawTrendChart(ctx, todos, startY) {
    const trendSectionY = startY;
    this.drawRoundRect(ctx, 30, trendSectionY, 690, 300, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.shadowColor = 'transparent';

    ctx.font = 'bold 30px "PingFang SC"';
    ctx.fillStyle = '#2d3436';
    ctx.fillText('📈 每日趋势', 50, trendSectionY + 50);

    const dailyData = this.analyzeDailyTrend(todos);

    if (dailyData.dates.length > 0) {
      const chartHeight = 180;
      const chartWidth = 610;
      const chartX = 70;
      const chartY = trendSectionY + 80;
      const maxVal = Math.max(...dailyData.createData, ...dailyData.completeData, 1);
      const showDays = Math.min(dailyData.dates.length, 7);
      const stepX = chartWidth / (showDays - 1 || 1);

      ctx.strokeStyle = '#f0f4f8';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = chartY + chartHeight - (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartWidth, y);
        ctx.stroke();
      }

      const lastDays = dailyData.dates.slice(-showDays);
      const lastCreate = dailyData.createData.slice(-showDays);
      const lastComplete = dailyData.completeData.slice(-showDays);

      ctx.strokeStyle = '#26c6da';
      ctx.lineWidth = 3;
      ctx.beginPath();
      lastCreate.forEach((val, i) => {
        const x = chartX + i * stepX;
        const y = chartY + chartHeight - (val / maxVal) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = '#00B26A';
      ctx.beginPath();
      lastComplete.forEach((val, i) => {
        const x = chartX + i * stepX;
        const y = chartY + chartHeight - (val / maxVal) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      lastDays.forEach((date, i) => {
        const shortDate = date.substring(5);
        ctx.font = '18px "PingFang SC"';
        ctx.fillStyle = '#999999';
        ctx.fillText(shortDate, chartX + i * stepX - 20, chartY + chartHeight + 30);
      });

      ctx.fillStyle = '#26c6da';
      ctx.beginPath();
      ctx.arc(chartX + (showDays - 1) * stepX, chartY + chartHeight - (lastCreate[lastCreate.length - 1] / maxVal) * chartHeight, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00B26A';
      ctx.beginPath();
      ctx.arc(chartX + (showDays - 1) * stepX, chartY + chartHeight - (lastComplete[lastComplete.length - 1] / maxVal) * chartHeight, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '18px "PingFang SC"';
      ctx.fillStyle = '#26c6da';
      ctx.fillText('● 创建', 50, trendSectionY + 265);
      ctx.fillStyle = '#00B26A';
      ctx.fillText('● 完成', 150, trendSectionY + 265);
    } else {
      ctx.font = '20px "PingFang SC"';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('暂无趋势数据', 50, trendSectionY + 150);
    }

    return trendSectionY + 340;
  },

  _drawTimeDistribution(ctx, data, startY) {
    const timeSectionY = startY;
    this.drawRoundRect(ctx, 30, timeSectionY, 690, 220, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.shadowColor = 'transparent';

    ctx.font = 'bold 30px "PingFang SC"';
    ctx.fillStyle = '#2d3436';
    ctx.fillText('⏰ 时间分布', 50, timeSectionY + 50);

    if (data.timeOfDayStats && data.timeOfDayStats.length > 0) {
      const chartHeight = 120;
      const chartWidth = 610;
      const chartX = 70;
      const chartY = timeSectionY + 80;
      const maxVal = Math.max(...data.timeOfDayStats.map(t => t.count), 1);
      const stepX = chartWidth / 24;

      ctx.strokeStyle = '#f0f4f8';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = chartY + chartHeight - (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartWidth, y);
        ctx.stroke();
      }

      data.timeOfDayStats.forEach((item, i) => {
        if (item.count > 0) {
          const x = chartX + i * stepX;
          const barHeight = (item.count / maxVal) * chartHeight;
          const y = chartY + chartHeight - barHeight;

          const gradient = ctx.createLinearGradient(0, y, 0, chartY + chartHeight);
          gradient.addColorStop(0, '#00B26A');
          gradient.addColorStop(1, '#26c6da');
          ctx.fillStyle = gradient;

          this.drawRoundRect(ctx, x, y, Math.max(stepX - 2, 4), barHeight, 2);
          ctx.fill();
        }
      });

      ctx.font = '18px "PingFang SC"';
      ctx.fillStyle = '#999999';
      ctx.fillText('0:00', chartX, chartY + chartHeight + 30);
      ctx.fillText('6:00', chartX + 6 * stepX - 10, chartY + chartHeight + 30);
      ctx.fillText('12:00', chartX + 12 * stepX - 10, chartY + chartHeight + 30);
      ctx.fillText('18:00', chartX + 18 * stepX - 10, chartY + chartHeight + 30);
      ctx.fillText('24:00', chartX + chartWidth - 25, chartY + chartHeight + 30);
    } else {
      ctx.font = '20px "PingFang SC"';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('暂无时间数据', 50, timeSectionY + 120);
    }
  },

  _drawFooter(ctx) {
    ctx.fillStyle = '#e8f5e9';
    this.drawRoundRect(ctx, 0, 2100, 750, 100, 0);
    ctx.fill();

    ctx.font = '22px "PingFang SC"';
    ctx.fillStyle = '#00B26A';
    ctx.textAlign = 'center';
    ctx.fillText('时光绿径待办 · 让每一天更有序', 375, 2150);
    ctx.textAlign = 'left';
  },

  // ===========================
  // 广告事件处理
  // ===========================

  /**
   * 广告加载失败
   */
  onAdError(err) {
    logger.error('UI', 'AD', '原生模板广告加载失败', err);
  }
});
