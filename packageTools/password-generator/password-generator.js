Page({
  data: {
    options: [
      { name: 'numbers', label: '数字', checked: true },
      { name: 'lowercase', label: '小写字母', checked: true },
      { name: 'uppercase', label: '大写字母', checked: true },
      { name: 'symbols', label: '符号', checked: false },
      { name: 'underscore', label: '下划线', checked: false }
    ],
    length: 16,
    password: '',
    strength: '',

    strengthTips: {
      weak: { 
        time: '数秒内', 
        desc: '简单字符组合，普通电脑可在数秒内暴力破解'
      },
      medium: {
        time: '数小时', 
        desc: '中等复杂度，需高性能计算机持续运算破解'
      },
      strong: {
        time: '数百年', 
        desc: '含多种字符类型的高熵值密码，难以破解'
      }
    }
  },

  checkboxChange(e) {
    const index = e.currentTarget.dataset.index
    const option = `options[${index}].checked`
    this.setData({
      [option]: !this.data.options[index].checked
    })
  },

  lengthChanging(e) {
    this.setData({ length: e.detail.value })
  },

  setLength(e) {
    const len = parseInt(e.currentTarget.dataset.len)
    this.setData({ length: len })
  },

  buildCharSet() {
    const chars = {
      numbers: '0123456789',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      symbols: '!@#$%^&*()-+=',
      underscore: '_'
    }
    let charSet = ''
    this.data.options.forEach(opt => {
      if (opt.checked) charSet += chars[opt.name]
    })
    return charSet
  },

  generatePassword() {
    wx.vibrateShort({ type: 'medium' })

    const charSet = this.buildCharSet()
    if (!charSet) {
      wx.showToast({ title: '请至少选择一种字符', icon: 'none' })
      return
    }

    const length = this.data.length
    const randomValues = new Uint8Array(length)
    wx.getRandomValues({ values: randomValues })
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charSet[randomValues[i] % charSet.length]
    }

    this.setData({
      password,
      strength: this.calculateStrength(password)
    })
  },

  calculateStrength(pwd) {
    let score = 0
    if (pwd.length >= 12) score += 2
    if (/\d/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 2

    return score >= 6 ? 'strong' : score >= 4 ? 'medium' : 'weak'
  },

  copyPassword() {
    if (this.data.password) {
      wx.setClipboardData({ 
        data: this.data.password,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' })
        }
      })
    }
  }
})
