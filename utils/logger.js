/**
 * 小程序前端日志工具
 *
 * 级别: DEBUG < INFO < WARN < ERROR
 * 开发环境: DEBUG+ / 体验版: INFO+ / 生产: WARN+(INFO采样1%)
 *
 * 用法（全局挂载，无需 import）:
 *   logger.info('TODO', 'FETCH', '获取待办列表', { id: 123 })
 *   logger.error('TODO', 'FETCH', '获取待办失败', err)
 *   logger.warn('SYNC', 'CONFLICT', '同步冲突,重试', { retry: 2 })
 *   logger.debug('PAGE', 'LOAD', '页面加载', { page: 'todo' })
 *
 * ERROR 自动批量上报: POST /log/report
 *
 * 日志格式:
 *   [HH:mm:ss.xxx] [LEVEL] [MODULE] [ACTION] 消息 | data
 */
(function () {
  var LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
  var LEVEL_LABEL = ['DEBUG', 'INFO', 'WARN', 'ERROR']

  var envLevel, infoRate

  function detectEnv() {
    try {
      var e = wx.getAccountInfoSync().miniProgram.envVersion
      if (e === 'develop') { envLevel = LEVEL.DEBUG; infoRate = 1 }
      else if (e === 'trial') { envLevel = LEVEL.INFO; infoRate = 0.1 }
      else { envLevel = LEVEL.WARN; infoRate = 0.01 }
    } catch (_) { envLevel = LEVEL.DEBUG; infoRate = 1 }
  }
  detectEnv()

  function pad2(n) { return n < 10 ? '0' + n : '' + n }
  function pad3(n) { return n < 100 ? (n < 10 ? '00' + n : '0' + n) : '' + n }

  function ts() {
    var d = new Date()
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + pad3(d.getMilliseconds())
  }

  function str(x) {
    if (x == null) return ''
    if (typeof x === 'string') return x
    if (x instanceof Error) return x.message + (x.stack ? ' | ' + x.stack.split('\n').slice(0, 2).join('; ') : '')
    try { return JSON.stringify(x) } catch (_) { return String(x) }
  }

  // ---------- 远程 ERROR 上报 ----------
  var queue = []
  var uploading = false
  var MAX_BATCH = 5
  var MAX_QUEUE = 100

  function getURL() {
    try { return getApp().globalData._logUrl } catch (_) { return '' }
  }

  function flush() {
    if (uploading || queue.length === 0) return
    var batch = queue.splice(0, MAX_BATCH)
    uploading = true
    var url = getURL()
    if (!url) { uploading = false; return }
    wx.request({
      url: url,
      method: 'POST',
      data: {
        logs: batch,
        app: 'miniprogram',
        env: (function () { try { return wx.getAccountInfoSync().miniProgram.envVersion } catch (_) { return 'unknown' } })()
      },
      fail: function () { /* 丢弃，不重试 */ },
      complete: function () { uploading = false }
    })
  }

  setInterval(flush, 10000)
  try { wx.onAppHide(flush) } catch (_) {}

  // ---------- 核心 ----------
  function log(level, mod, act, msg, data) {
    if (level < envLevel) return
    if (level === LEVEL.INFO && Math.random() > infoRate) return

    var line = '[' + ts() + '] [' + LEVEL_LABEL[level] + '] [' + mod + '] [' + act + '] ' + msg
    if (data !== undefined && data !== null) line += ' | ' + str(data)

    switch (level) {
      case LEVEL.DEBUG: (console.debug || console.log)(line); break
      case LEVEL.INFO:  console.log(line); break
      case LEVEL.WARN:  console.warn(line); break
      case LEVEL.ERROR: console.error(line); break
    }

    if (level === LEVEL.ERROR) {
      queue.push({ ts: Date.now(), module: mod, action: act, msg: msg, data: data != null ? str(data) : '' })
      if (queue.length > MAX_QUEUE) queue.shift()
      if (queue.length >= MAX_BATCH) flush()
    }
  }

  var logger = {
    /** @param {string} mod 模块名  TODO|COMBO|SYNC|AUTH|PAGE|STORAGE|ADMIN|TOOLS|AI|UPLOAD|NOTIFY|NETWORK|APP */
    debug: function (mod, act, msg, data) { log(LEVEL.DEBUG, mod, act, msg, data) },
    info:  function (mod, act, msg, data) { log(LEVEL.INFO,  mod, act, msg, data) },
    warn:  function (mod, act, msg, data) { log(LEVEL.WARN,  mod, act, msg, data) },
    error: function (mod, act, msg, data) { log(LEVEL.ERROR, mod, act, msg, data) },

    /** 上传路径配置: app.js 调用 logger.init({ reportUrl }) */
    init: function (opts) {
      if (opts.reportUrl) {
        try {
          getApp().globalData._logUrl = opts.reportUrl
        } catch (_) {}
      }
      if (opts.envLevel !== undefined) { envLevel = opts.envLevel; infoRate = opts.infoRate || 1 }
    },

    /** 手动触发上报队列 */
    flush: function () { flush() },

    /** 获取当前环境级别(用于调试) */
    getLevel: function () { return LEVEL_LABEL[envLevel] },

    /** 模块常量（与后端 logger.MODULES 对齐） */
    MODULES: {
      TODO: 'TODO', COMBO: 'COMBO', COLLAB: 'COLLAB', SYNC: 'SYNC',
      AUTH: 'AUTH', NOTIFY: 'NOTIFY', UPLOAD: 'UPLOAD',
      ADMIN: 'ADMIN', TOOLS: 'TOOLS', AI: 'AI',
      PAGE: 'PAGE', APP: 'APP', STORAGE: 'STORAGE', UI: 'UI', NETWORK: 'NETWORK',
      COMMENT: 'COMMENT'
    }
  }

  globalThis.logger = logger
})()
