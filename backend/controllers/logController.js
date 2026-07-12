const logger = require('../utils/logger');

exports.report = async (req, res) => {
  const { logs, app: source, env } = req.body;
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return res.json({ success: false, message: '无日志数据' });
  }

  logs.forEach(function (log) {
    if (!log || !log.msg) return;
    var prefix = '[' + (source || 'miniprogram') + ']'
    if (env) prefix += '[' + env + ']'
    if (log.module) prefix += '[' + log.module + ']'
    logger.error('CLIENT', log.action || 'REPORT', prefix + ' ' + log.msg, {
      data: log.data || '',
      ts: log.ts || Date.now()
    });
  });

  res.json({ success: true, count: logs.length });
};
