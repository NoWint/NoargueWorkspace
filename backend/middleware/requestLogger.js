const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl;
    const query = req.query;
    const body = req.body;
    const userId = req.user?.id;
    const userAgent = req.get('user-agent');
    
    logger.apiInfo('请求', '收到请求', { method, url, query, body: body || null, userId, userAgent });
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const responseTime = `${duration}ms`;
        
        if (status >= 400) {
            logger.error('API', '请求错误', { method, url, status, duration, responseTime, body: body || null, userId });
        } else {
            logger.apiInfo('请求完成', '请求处理完成', { method, url, status, duration, responseTime, userId });
        }
    });
    
    next();
};

module.exports = requestLogger;
