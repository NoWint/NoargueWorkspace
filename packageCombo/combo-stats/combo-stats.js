const app = getApp();
const { combosApi } = require('../../utils/api.js');
const { getLocalTodos } = require('../../utils/sync.js');
import * as echarts from '../../miniprogram_npm/ec-canvas/echarts';

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,
    menuWidth: app.globalData.menuWidth,
    
    comboId: '',
    comboName: '',
    isShared: false,
    userRole: 'member',
    isAdmin: false,
    currentUserId: null,
    
    activeTab: 'personal',
    tabs: [],
    
    completionChart: {
      lazyLoad: true
    },
    
    statusChart: {
      lazyLoad: true
    },
    
    globalStats: {
      totalCount: 0,
      completedCount: 0,
      completionRate: 0,
      avgDuration: '0h',
      overdueCount: 0,
      notStartedCount: 0,
      inProgressCount: 0,
      completedCountFull: 0,
      specificAssignCount: 0,
      anyAssignCount: 0,
      excludeAssignCount: 0,
      memberStats: [],
      createTimeDistribution: [],
      completeTimeDistribution: [],
      weeklyTrend: [],
      todayCreated: 0,
      todayCompleted: 0,
      weekCreated: 0,
      weekCompleted: 0
    },
    
    personalStats: {
      assignedCount: 0,
      myCompletedCount: 0,
      myCompletionRate: 0,
      myOverdueCount: 0,
      createdCount: 0,
      createdCompletedCount: 0,
      createdCompletionRate: 0,
      myCreateTimeDistribution: [],
      myCompleteTimeDistribution: [],
      myWeeklyTrend: [],
      todayCompleted: 0,
      weekCompleted: 0,
      streak: 0
    }
  },

  onLoad(options) {
    this.setCurrentUserId();
    if (options.id) {
      this.setData({ comboId: options.id });
      this.loadStats(options.id);
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onPullDownRefresh() {
    if (this.data.comboId) {
      this.loadStats(this.data.comboId).then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  setCurrentUserId() {
    let currentUserId = app.globalData.userInfo?.id;
    if (!currentUserId) {
      const storedUser = wx.getStorageSync('user');
      currentUserId = storedUser?.id;
    }
    this.setData({ currentUserId });
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab || e.detail?.value;
    if (tab) {
      this.setData({ activeTab: tab });
      if (tab === 'global' && this.data.isAdmin) {
        setTimeout(() => {
          this.initCompletionChart();
          this.initStatusChart();
        }, 100);
      }
    }
  },

  async loadStats(id) {
    try {
      const result = await combosApi.getById(id);
      const combo = result.combo || result;
      const isShared = combo.isShared || combo.is_shared || false;
      const userRole = combo.userRole || 'member';
      const isAdmin = userRole === 'owner' || userRole === 'admin';
      
      const tabs = isShared && isAdmin 
        ? [{ key: 'personal', name: '个人统计' }, { key: 'global', name: '管理视图' }]
        : [{ key: 'personal', name: '统计' }];
      
      this.setData({ 
        comboName: combo.name,
        isShared,
        userRole,
        isAdmin,
        tabs,
        activeTab: 'personal'
      });
      
      if (isShared) {
        const todos = combo.sharedTodos || combo.todos || [];
        const members = combo.members || [];
        
        if (isAdmin) {
          this.calculateGlobalStats(todos, members);
        }
        this.calculatePersonalStats(todos);
        
      } else {
        const allTodos = getLocalTodos();
        const todos = allTodos.filter(todo => 
          String(todo.comboId) === String(id) && !todo.isDeleted
        );
        this.calculatePersonalComboStats(todos);
      }
      
    } catch (err) {
      logger.error('COMBO', 'STATS', '加载统计失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  initCompletionChart() {
    const { globalStats } = this.data;
    const option = {
      tooltip: {
        show: false
      },
      color: ['#00B26A', '#E8F5E9'],
      series: [
        {
          name: '完成率',
          type: 'pie',
          radius: ['50%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'center',
            formatter: `{a|${globalStats.completionRate}%}\n{b|完成率}`,
            rich: {
              a: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#00B26A'
              },
              b: {
                fontSize: 12,
                color: '#999',
                padding: [4, 0, 0, 0]
              }
            }
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
            { value: globalStats.completedCount, name: '已完成' },
            { value: globalStats.totalCount - globalStats.completedCount, name: '未完成' }
          ]
        }
      ]
    };
    
    this.selectComponent('#completionChart').init((canvas, width, height) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });
      chart.setOption(option);
      return chart;
    });
  },

  initStatusChart() {
    const { globalStats } = this.data;
    const option = {
      tooltip: {
        show: false
      },
      color: ['#00B26A', '#f5a623', '#e0e0e0'],
      series: [
        {
          name: '状态分布',
          type: 'pie',
          radius: ['50%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'center',
            formatter: `{a|${globalStats.totalCount}}\n{b|总待办}`,
            rich: {
              a: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#333'
              },
              b: {
                fontSize: 12,
                color: '#999',
                padding: [4, 0, 0, 0]
              }
            }
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
            { value: globalStats.completedCountFull, name: '已完成' },
            { value: globalStats.inProgressCount, name: '进行中' },
            { value: globalStats.notStartedCount, name: '未开始' }
          ]
        }
      ]
    };
    
    this.selectComponent('#statusChart').init((canvas, width, height) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });
      chart.setOption(option);
      return chart;
    });
  },

  calculateGlobalStats(todos, members) {
    const totalCount = todos.length;
    const completedCount = todos.filter(t => t.completedAt || t.completed_at).length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const completedTodos = todos.filter(t => {
      const completedAt = t.completedAt || t.completed_at;
      const createdAt = t.time || t.created_at || t.createdAt;
      return completedAt && createdAt;
    });
    
    let avgDuration = '0h';
    if (completedTodos.length > 0) {
      const totalMs = completedTodos.reduce((sum, t) => {
        const completedAt = new Date(t.completedAt || t.completed_at).getTime();
        const createdAt = new Date(t.time || t.created_at || t.createdAt).getTime();
        return sum + (completedAt - createdAt);
      }, 0);
      const avgHours = (totalMs / (completedTodos.length * 1000 * 60 * 60)).toFixed(1);
      avgDuration = `${avgHours}h`;
    }
    
    const now = Date.now();
    const overdueCount = todos.filter(t => {
      if (t.completedAt || t.completed_at) return false;
      const setDate = t.setDate || t.set_date;
      const setTime = t.setTime || t.set_time || '23:59';
      if (!setDate) return false;
      const setTimestamp = new Date(`${setDate} ${setTime}`).getTime();
      return setTimestamp < now;
    }).length;
    
    const notStartedCount = todos.filter(t => {
      const assignCount = t.assignCount || (t.assignments || []).length;
      return assignCount === 0;
    }).length;
    
    const inProgressCount = todos.filter(t => {
      const completedCnt = t.completedCount || 0;
      const assignCnt = t.assignCount || (t.assignments || []).length;
      return assignCnt > 0 && completedCnt > 0 && completedCnt < assignCnt;
    }).length;
    
    const completedCountFull = todos.filter(t => {
      const completedCnt = t.completedCount || 0;
      const assignCnt = t.assignCount || (t.assignments || []).length;
      return assignCnt > 0 && completedCnt === assignCnt;
    }).length;
    
    const specificAssignCount = todos.filter(t => 
      (t.assignType || t.assign_type) === 'specific'
    ).length;
    
    const anyAssignCount = todos.filter(t => 
      (t.assignType || t.assign_type) === 'any'
    ).length;
    
    const excludeAssignCount = todos.filter(t => 
      t.excludeType || t.exclude_type
    ).length;
    
    const memberMap = {};
    members.forEach(m => {
      memberMap[m.id] = {
        id: m.id,
        nickname: m.nickname || '用户',
        avatarUrl: m.avatarUrl,
        createdCount: 0,
        completedCount: 0,
        assignedCount: 0,
        myCompletedCount: 0
      };
    });
    
    todos.forEach(todo => {
      const creatorId = todo.creator?.id || todo.creator_id;
      if (creatorId && memberMap[creatorId]) {
        memberMap[creatorId].createdCount++;
        if (todo.completedAt || todo.completed_at) {
          memberMap[creatorId].completedCount++;
        }
      }
      
      const assignments = todo.assignments || [];
      assignments.forEach(a => {
        if (memberMap[a.userId]) {
          memberMap[a.userId].assignedCount++;
          if (a.completedAt) {
            memberMap[a.userId].myCompletedCount++;
          }
        }
      });
    });
    
    const memberStats = Object.values(memberMap)
      .filter(m => m.createdCount > 0 || m.assignedCount > 0)
      .map(m => ({
        ...m,
        rate: m.assignedCount > 0 ? Math.round((m.myCompletedCount / m.assignedCount) * 100) : 0
      }))
      .sort((a, b) => b.myCompletedCount - a.myCompletedCount);
    
    const createTimeDistribution = this.calculateTimeDistribution(todos, 'create');
    const completeTimeDistribution = this.calculateTimeDistribution(todos, 'complete');
    const weeklyTrend = this.calculateWeeklyTrend(todos);
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const todayCreated = todos.filter(t => {
      const ts = t.time || t.created_at || t.createdAt;
      if (!ts) return false;
      const d = new Date(ts);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === todayStr;
    }).length;
    
    const todayCompleted = todos.filter(t => {
      const ts = t.completedAt || t.completed_at;
      if (!ts) return false;
      const d = new Date(ts);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === todayStr;
    }).length;
    
    const weekCreated = todos.filter(t => {
      const ts = t.time || t.created_at || t.createdAt;
      if (!ts) return false;
      return new Date(ts) >= weekAgo;
    }).length;
    
    const weekCompleted = todos.filter(t => {
      const ts = t.completedAt || t.completed_at;
      if (!ts) return false;
      return new Date(ts) >= weekAgo;
    }).length;
    
    this.setData({
      globalStats: {
        totalCount,
        completedCount,
        completionRate,
        avgDuration,
        overdueCount,
        notStartedCount,
        inProgressCount,
        completedCountFull,
        specificAssignCount,
        anyAssignCount,
        excludeAssignCount,
        memberStats,
        createTimeDistribution,
        completeTimeDistribution,
        weeklyTrend,
        todayCreated,
        todayCompleted,
        weekCreated,
        weekCompleted
      }
    });
  },

  calculatePersonalStats(todos) {
    const { currentUserId } = this.data;
    if (!currentUserId) return;
    
    const myAssignedTodos = todos.filter(t => {
      const assignments = t.assignments || [];
      return assignments.some(a => String(a.userId) === String(currentUserId));
    });
    
    const myCompletedTodos = myAssignedTodos.filter(t => {
      const assignments = t.assignments || [];
      const myAssignment = assignments.find(a => String(a.userId) === String(currentUserId));
      return myAssignment?.completedAt;
    });
    
    const assignedCount = myAssignedTodos.length;
    const myCompletedCount = myCompletedTodos.length;
    const myCompletionRate = assignedCount > 0 ? Math.round((myCompletedCount / assignedCount) * 100) : 0;
    
    const now = Date.now();
    const myOverdueCount = myAssignedTodos.filter(t => {
      const assignments = t.assignments || [];
      const myAssignment = assignments.find(a => String(a.userId) === String(currentUserId));
      if (myAssignment?.completedAt) return false;
      const setDate = t.setDate || t.set_date;
      const setTime = t.setTime || t.set_time || '23:59';
      if (!setDate) return false;
      const setTimestamp = new Date(`${setDate} ${setTime}`).getTime();
      return setTimestamp < now;
    }).length;
    
    const myCreatedTodos = todos.filter(t => {
      const creatorId = t.creator?.id || t.creator_id;
      return String(creatorId) === String(currentUserId);
    });
    
    const createdCount = myCreatedTodos.length;
    const createdCompletedCount = myCreatedTodos.filter(t => t.completedAt || t.completed_at).length;
    const createdCompletionRate = createdCount > 0 ? Math.round((createdCompletedCount / createdCount) * 100) : 0;
    
    const myCreateTimeDistribution = this.calculateTimeDistribution(myCreatedTodos, 'create');
    const myCompleteTimeDistribution = this.calculateTimeDistribution(myCompletedTodos, 'complete');
    const myWeeklyTrend = this.calculatePersonalWeeklyTrend(myCompletedTodos);
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const todayCompleted = myCompletedTodos.filter(t => {
      const assignments = t.assignments || [];
      const myAssignment = assignments.find(a => String(a.userId) === String(currentUserId));
      if (!myAssignment?.completedAt) return false;
      const d = new Date(myAssignment.completedAt);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === todayStr;
    }).length;
    
    const weekCompleted = myCompletedTodos.filter(t => {
      const assignments = t.assignments || [];
      const myAssignment = assignments.find(a => String(a.userId) === String(currentUserId));
      if (!myAssignment?.completedAt) return false;
      return new Date(myAssignment.completedAt) >= weekAgo;
    }).length;
    
    const streak = this.calculateStreak(myCompletedTodos, currentUserId);
    
    this.setData({
      personalStats: {
        assignedCount,
        myCompletedCount,
        myCompletionRate,
        myOverdueCount,
        createdCount,
        createdCompletedCount,
        createdCompletionRate,
        myCreateTimeDistribution,
        myCompleteTimeDistribution,
        myWeeklyTrend,
        todayCompleted,
        weekCompleted,
        streak
      }
    });
  },

  calculateTimeDistribution(todos, type) {
    const timeMap = {};
    for (let i = 0; i < 24; i++) {
      timeMap[i] = 0;
    }
    
    todos.forEach(todo => {
      let timestamp;
      if (type === 'create') {
        timestamp = todo.time || todo.created_at || todo.createdAt;
      } else {
        timestamp = todo.completedAt || todo.completed_at || todo.completed;
      }
      
      if (timestamp) {
        const hour = new Date(timestamp).getHours();
        timeMap[hour]++;
      }
    });
    
    const maxCount = Math.max(...Object.values(timeMap), 1);
    return Object.keys(timeMap).map(hour => ({
      hour: parseInt(hour),
      count: timeMap[hour],
      percent: (timeMap[hour] / maxCount) * 100
    }));
  },

  calculateWeeklyTrend(todos) {
    const trend = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const createdOnDay = todos.filter(t => {
        const createTimestamp = t.time || t.created_at || t.createdAt;
        if (!createTimestamp) return false;
        const createDate = new Date(createTimestamp);
        const createDateStr = `${createDate.getFullYear()}-${String(createDate.getMonth() + 1).padStart(2, '0')}-${String(createDate.getDate()).padStart(2, '0')}`;
        return createDateStr === dateStr;
      }).length;
      
      const completedOnDay = todos.filter(t => {
        const completedAt = t.completedAt || t.completed_at || t.completed;
        if (!completedAt) return false;
        const completedDate = new Date(completedAt);
        const completedDateStr = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}-${String(completedDate.getDate()).padStart(2, '0')}`;
        return completedDateStr === dateStr;
      }).length;
      
      trend.push({
        date: dateStr,
        dayLabel: i === 0 ? '今' : i === 1 ? '昨' : `${date.getMonth() + 1}/${date.getDate()}`,
        createdCount: createdOnDay,
        completedCount: completedOnDay
      });
    }
    
    return trend;
  },

  calculatePersonalWeeklyTrend(todos) {
    const trend = [];
    const now = new Date();
    const { currentUserId } = this.data;
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const completedOnDay = todos.filter(t => {
        const assignments = t.assignments || [];
        const myAssignment = assignments.find(a => String(a.userId) === String(currentUserId));
        if (!myAssignment?.completedAt) return false;
        const completedDate = new Date(myAssignment.completedAt);
        const completedDateStr = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}-${String(completedDate.getDate()).padStart(2, '0')}`;
        return completedDateStr === dateStr;
      }).length;
      
      trend.push({
        date: dateStr,
        dayLabel: i === 0 ? '今' : i === 1 ? '昨' : `${date.getMonth() + 1}/${date.getDate()}`,
        completedCount: completedOnDay
      });
    }
    
    return trend;
  },

  calculateStreak(todos, userId) {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      
      const hasCompleted = todos.some(t => {
        const assignments = t.assignments || [];
        const myAssignment = assignments.find(a => String(a.userId) === String(userId));
        if (!myAssignment?.completedAt) return false;
        const completedDate = new Date(myAssignment.completedAt);
        const completedDateStr = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}-${String(completedDate.getDate()).padStart(2, '0')}`;
        return completedDateStr === dateStr;
      });
      
      if (hasCompleted) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  },

  calculatePersonalComboStats(todos) {
    const totalCount = todos.length;
    const completedTodos = todos.filter(t => t.completed);
    const completedCount = completedTodos.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const now = Date.now();
    const overdueCount = todos.filter(t => {
      if (t.completed) return false;
      const setDate = t.setDate || t.set_date;
      const setTime = t.setTime || t.set_time || '23:59';
      if (!setDate) return false;
      const setTimestamp = new Date(`${setDate} ${setTime}`).getTime();
      return setTimestamp < now;
    }).length;
    
    const createTimeDistribution = this.calculateTimeDistribution(todos, 'create');
    const completeTimeDistribution = this.calculateTimeDistribution(completedTodos, 'complete');
    const weeklyTrend = this.calculateWeeklyTrend(todos);
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const todayCompleted = completedTodos.filter(t => {
      const ts = t.completed;
      if (!ts) return false;
      const d = new Date(ts);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dStr === todayStr;
    }).length;
    
    const weekCompleted = completedTodos.filter(t => {
      const ts = t.completed;
      if (!ts) return false;
      return new Date(ts) >= weekAgo;
    }).length;
    
    const streak = this.calculateComboStreak(completedTodos);
    
    this.setData({
      personalStats: {
        assignedCount: totalCount,
        myCompletedCount: completedCount,
        myCompletionRate: completionRate,
        myOverdueCount: overdueCount,
        createdCount: totalCount,
        createdCompletedCount: completedCount,
        createdCompletionRate: completionRate,
        myCreateTimeDistribution: createTimeDistribution,
        myCompleteTimeDistribution: completeTimeDistribution,
        myWeeklyTrend: weeklyTrend,
        todayCompleted,
        weekCompleted,
        streak
      }
    });
  },

  calculateComboStreak(completedTodos) {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      
      const hasCompleted = completedTodos.some(t => {
        if (!t.completed) return false;
        const completedDate = new Date(t.completed);
        const completedDateStr = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}-${String(completedDate.getDate()).padStart(2, '0')}`;
        return completedDateStr === dateStr;
      });
      
      if (hasCompleted) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }
});
