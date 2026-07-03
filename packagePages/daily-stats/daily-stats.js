const { getLocalTodos, saveTodo, getTodoById } = require('../../utils/sync.js');
const app = getApp();

Page({
  data: {
    navBarHeight: app.globalData.navBarHeight,
    menuRight: app.globalData.menuRight,
    menuTop: app.globalData.menuTop,
    menuHeight: app.globalData.menuHeight,
    menuWidth: app.globalData.menuWidth,
    
    selectedDate: '',
    selectedDateValue: new Date().getTime(),
    selectedDateDisplay: '',
    dateWeekday: '',
    showCalendar: false,
    minDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    maxDate: Date.now(),
    
    dayStats: {
      created: 0,
      completed: 0,
      completionRate: 0,
      avgTime: '0h'
    },
    
    dayTodos: [],
    timeDistribution: [],
    maxTimeCount: 1,

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
    }
  },

  onLoad() {
    const today = this.formatDate(new Date());
    this.setData({ 
      selectedDate: today,
      selectedDateValue: new Date().getTime()
    });
    this.selectDate(today);
  },

  onShow() {
    if (this.data.selectedDate) {
      this.loadDayData(this.data.selectedDate);
    }
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  getWeekday(dateStr) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(dateStr);
    return weekdays[date.getDay()];
  },

  showDatePicker() {
    this.setData({ showCalendar: true });
  },

  handleCalendarClose() {
    this.setData({ showCalendar: false });
  },

  handleCalendarConfirm(e) {
    const selectedDate = this.formatDate(new Date(e.detail.value));
    this.setData({ 
      selectedDate: selectedDate,
      selectedDateValue: e.detail.value
    });
    this.selectDate(selectedDate);
  },

  selectDate(dateStr) {
    const display = this.formatDateDisplay(dateStr);
    const weekday = this.getWeekday(dateStr);
    
    this.setData({
      selectedDate: dateStr,
      selectedDateDisplay: display,
      dateWeekday: weekday
    });
    
    this.loadDayData(dateStr);
  },

  toggleTodo(e) {
    const index = e.currentTarget.dataset.index;
    const dayTodo = this.data.dayTodos[index];
    const todo = getTodoById(dayTodo.id);

    if (todo) {
      const isCompleting = !todo.completed;
      todo.completed = isCompleting ? Date.now() : false;

      saveTodo(todo);
      app.updateCalendarCache(getLocalTodos());

      this.loadDayData(this.data.selectedDate);
    }
  },

  navigateToDetail(e) {
    if (e.target.dataset.component === 't-radio') {
      return;
    }
    
    const index = e.currentTarget.dataset.index;
    const dayTodo = this.data.dayTodos[index];
    
    if (!dayTodo || !dayTodo.id) return;
    
    wx.navigateTo({
      url: `/packagePages/todo-detail/todo-detail?todoId=${encodeURIComponent(dayTodo.id)}`
    });
  },

  loadDayData(dateStr) {
    const todos = getLocalTodos();
    
    const dayTodos = todos.filter(todo => {
      if (todo.parent_id) return false;
      if (todo.setDate === dateStr) return true;
      
      if (todo.time) {
        const createDate = new Date(todo.time);
        const createDateStr = this.formatDate(createDate);
        if (createDateStr === dateStr) return true;
      }
      
      if (typeof todo.completed === 'number') {
        const completeDate = new Date(todo.completed);
        const completeDateStr = this.formatDate(completeDate);
        if (completeDateStr === dateStr) return true;
      }
      
      return false;
    });

    const createdTodos = dayTodos.filter(todo => {
      if (todo.time) {
        const createDate = new Date(todo.time);
        const createDateStr = this.formatDate(createDate);
        return createDateStr === dateStr;
      }
      return todo.setDate === dateStr;
    });

    const completedTodos = dayTodos.filter(todo => {
      if (typeof todo.completed === 'number') {
        const completeDate = new Date(todo.completed);
        const completeDateStr = this.formatDate(completeDate);
        return completeDateStr === dateStr;
      }
      return false;
    });

    const completedCount = completedTodos.length;
    const createdCount = createdTodos.length;
    const completionRate = createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0;

    let avgTime = '0h';
    const validCompletedTodos = completedTodos.filter(todo => {
      if (!todo.time || typeof todo.completed !== 'number') return false;
      const createTime = new Date(todo.time).getTime();
      const completeTime = new Date(todo.completed).getTime();
      return completeTime > createTime;
    });

    if (validCompletedTodos.length > 0) {
      const totalMs = validCompletedTodos.reduce((sum, todo) => {
        return sum + (new Date(todo.completed).getTime() - new Date(todo.time).getTime());
      }, 0);
      const avgHours = (totalMs / (validCompletedTodos.length * 1000 * 60 * 60)).toFixed(1);
      avgTime = `${avgHours}h`;
    }

    const timeDistribution = this.analyzeTimeDistribution(createdTodos, dateStr);
    const maxTimeCount = Math.max(...timeDistribution.map(t => t.count), 1);

    this.setData({
      dayTodos: dayTodos.sort((a, b) => {
        const timeA = a.setTime || '00:00';
        const timeB = b.setTime || '00:00';
        return timeA.localeCompare(timeB);
      }),
      dayStats: {
        created: createdCount,
        completed: completedCount,
        completionRate,
        avgTime
      },
      timeDistribution,
      maxTimeCount
    });
  },

  analyzeTimeDistribution(todos, dateStr) {
    const hourMap = {};
    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0;
    }

    todos.forEach(todo => {
      let hour = 0;
      if (todo.time) {
        const createDate = new Date(todo.time);
        const createDateStr = this.formatDate(createDate);
        if (createDateStr === dateStr) {
          hour = createDate.getHours();
        }
      } else if (todo.setTime) {
        hour = parseInt(todo.setTime.split(':')[0]) || 0;
      }
      hourMap[hour]++;
    });

    return Object.keys(hourMap).map(hour => ({
      hour: parseInt(hour),
      count: hourMap[hour]
    }));
  },

  generateReport() {
    wx.showLoading({ title: '生成中...' });

    wx.createSelectorQuery()
      .select('#reportCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res || !res[0]) {
          wx.hideLoading();
          wx.showToast({ title: '生成失败', icon: 'none' });
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;

        function drawRoundRect(x, y, width, height, radius) {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + width, y, x + width, y + height, radius);
          ctx.arcTo(x + width, y + height, x, y + height, radius);
          ctx.arcTo(x, y + height, x, y, radius);
          ctx.arcTo(x, y, x + width, y, radius);
          ctx.closePath();
        }

        function loadLogo(imgUrl) {
          return new Promise((resolve, reject) => {
            const logoImg = canvas.createImage();
            logoImg.onload = () => resolve(logoImg);
            logoImg.onerror = reject;
            logoImg.src = imgUrl;
          });
        }

        canvas.width = 750 * dpr;
        canvas.height = 1800 * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, 750, 1800);

        const gradient = ctx.createLinearGradient(0, 0, 750, 0);
        gradient.addColorStop(0, '#00B26A');
        gradient.addColorStop(1, '#52f099');
        ctx.fillStyle = gradient;
        drawRoundRect(0, 0, 750, 280, 0);
        ctx.fill();

        try {
          const logoImg = await loadLogo('https://api.yzjtiantian.cn/uploads/logo/logo.png');
          ctx.drawImage(logoImg, 50, 30, 80, 80);
        } catch (e) {
          logger.warn('UI', 'LOGO', 'Logo加载失败', e);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px "PingFang SC"';
        ctx.fillText('每日统计报告', 150, 80);

        ctx.font = '26px "PingFang SC"';
        ctx.globalAlpha = 0.9;
        ctx.fillText(`${this.data.selectedDateDisplay} ${this.data.dateWeekday}`, 150, 130);
        ctx.globalAlpha = 1.0;

        const dayTodos = this.data.dayTodos;
        const starCount = dayTodos.filter(t => t.isStar).length;
        const imageCount = dayTodos.filter(t => {
          if (!t.images) return false;
          if (Array.isArray(t.images) && t.images.length > 0) return true;
          if (typeof t.images === 'string') {
            try {
              const parsed = JSON.parse(t.images);
              return Array.isArray(parsed) && parsed.length > 0;
            } catch (e) { return false; }
          }
          return false;
        }).length;
        const locationCount = dayTodos.filter(t => t.location).length;

        const cardY = 320;
        drawRoundRect(30, cardY, 690, 200, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        ctx.shadowColor = 'transparent';

        const stats = this.data.dayStats;
        const metrics = [
          { label: '创建待办', value: stats.created, x: 65, color: '#2d3436' },
          { label: '完成待办', value: stats.completed, x: 215, color: '#00B26A' },
          { label: '完成率', value: `${stats.completionRate}%`, x: 365, color: '#26c6da' },
          { label: '平均耗时', value: stats.avgTime, x: 515, color: '#f5a623' }
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
          { label: '收藏', value: starCount, x: 65 },
          { label: '带图', value: imageCount, x: 215 },
          { label: '定位', value: locationCount, x: 365 }
        ];

        extraMetrics.forEach(m => {
          ctx.font = '20px "PingFang SC"';
          ctx.fillStyle = '#888888';
          ctx.fillText(m.label, m.x, cardY + 155);

          ctx.font = 'bold 32px "PingFang SC"';
          ctx.fillStyle = '#00B26A';
          ctx.fillText(String(m.value), m.x, cardY + 190);
        });

        let nextY = cardY + 240;

        const timeSectionY = nextY;
        drawRoundRect(30, timeSectionY, 690, 300, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        ctx.shadowColor = 'transparent';

        ctx.font = 'bold 30px "PingFang SC"';
        ctx.fillStyle = '#2d3436';
        ctx.fillText('⏰ 创建时间分布', 50, timeSectionY + 50);

        const timeDist = this.data.timeDistribution;
        const maxCount = Math.max(...timeDist.map(t => t.count), 1);
        const chartHeight = 180;
        const chartWidth = 610;
        const chartX = 70;
        const chartY = timeSectionY + 80;
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

        timeDist.forEach((item, i) => {
          if (item.count > 0) {
            const x = chartX + i * stepX;
            const barHeight = (item.count / maxCount) * chartHeight;
            const y = chartY + chartHeight - barHeight;

            const barGradient = ctx.createLinearGradient(0, y, 0, chartY + chartHeight);
            barGradient.addColorStop(0, '#00B26A');
            barGradient.addColorStop(1, '#26c6da');
            ctx.fillStyle = barGradient;

            drawRoundRect(x, y, Math.max(stepX - 2, 4), barHeight, 2);
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

        nextY = timeSectionY + 340;

        const todoSectionY = nextY;
        drawRoundRect(30, todoSectionY, 690, 450, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        ctx.shadowColor = 'transparent';

        ctx.font = 'bold 30px "PingFang SC"';
        ctx.fillStyle = '#2d3436';
        ctx.fillText(`📋 当日待办 (${dayTodos.length})`, 50, todoSectionY + 50);

        const displayTodos = dayTodos.slice(0, 7);
        displayTodos.forEach((todo, i) => {
          const itemY = todoSectionY + 90 + i * 50;

          ctx.beginPath();
          ctx.arc(70, itemY + 12, 14, 0, Math.PI * 2);
          ctx.fillStyle = todo.completed ? '#00B26A' : '#e0e0e0';
          ctx.fill();

          if (todo.completed) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "PingFang SC"';
            ctx.fillText('✓', 62, itemY + 18);
          }

          if (todo.isStar) {
            ctx.fillStyle = '#f5a623';
            ctx.font = '16px "PingFang SC"';
            ctx.fillText('★', 95, itemY + 18);
          }

          ctx.font = '24px "PingFang SC"';
          ctx.fillStyle = todo.completed ? '#00B26A' : '#2d3436';
          const text = todo.text.length > 18 ? todo.text.substring(0, 18) + '...' : todo.text;
          ctx.fillText(text, todo.isStar ? 120 : 100, itemY + 18);

          if (todo.setTime) {
            ctx.font = '18px "PingFang SC"';
            ctx.fillStyle = '#999999';
            ctx.fillText(todo.setTime, 600, itemY + 18);
          }
        });

        if (dayTodos.length > 7) {
          ctx.font = '20px "PingFang SC"';
          ctx.fillStyle = '#aaaaaa';
          ctx.fillText(`还有 ${dayTodos.length - 7} 条待办...`, 50, todoSectionY + 420);
        }

        ctx.fillStyle = '#e8f5e9';
        drawRoundRect(0, 1700, 750, 100, 0);
        ctx.fill();

        ctx.font = '22px "PingFang SC"';
        ctx.fillStyle = '#00B26A';
        ctx.textAlign = 'center';
        ctx.fillText('时光绿径待办 · 让每一天更有序', 375, 1750);
        ctx.textAlign = 'left';

        wx.canvasToTempFilePath({
          canvas,
          success: res => {
            wx.hideLoading();
            wx.showShareImageMenu({
              path: res.tempFilePath,
              success: () => {
                wx.shareFileMessage({
                  filePath: res.tempFilePath,
                  fileName: `每日统计_${this.data.selectedDate}.png`
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
  }
});
