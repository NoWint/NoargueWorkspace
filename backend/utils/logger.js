const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const LOG_MODULES = {
    AUTH: 'AUTH',
    TODO: 'TODO',
    COMBO: 'COMBO',
    COLLAB: 'COLLAB',
    COMMENT: 'COMMENT',
    NOTIFY: 'NOTIFY',
    UPLOAD: 'UPLOAD',
    CONFIG: 'CONFIG',
    ADMIN: 'ADMIN',
    SYNC: 'SYNC',
    WECHAT: 'WECHAT',
    DB: 'DB',
    API: 'API',
    SYSTEM: 'SYSTEM'
};

const LOG_COLORS = {
    DEBUG: '\x1b[36m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m',
    DIM: '\x1b[2m',
    BRIGHT: '\x1b[1m'
};

const currentLevel = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] : LOG_LEVELS.DEBUG;

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

function formatMessage(level, module, action, message, data) {
    const timestamp = getTimestamp();
    const color = LOG_COLORS[level] || '';
    const reset = LOG_COLORS.RESET;
    const dim = LOG_COLORS.DIM;
    
    const levelStr = level.padEnd(5);
    const moduleStr = `[${module}]`.padEnd(10);
    const actionStr = action ? `[${action}]` : '';
    
    let logMessage = `${dim}${timestamp}${reset} ${color}${levelStr}${reset} ${moduleStr} ${actionStr} ${message}`;
    
    if (data !== undefined && data !== null) {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        logMessage += ` ${dim}| ${dataStr}${reset}`;
    }
    
    return logMessage;
}

function log(level, module, action, message, data) {
    if (LOG_LEVELS[level] < currentLevel) return;
    
    const formattedMessage = formatMessage(level, module, action, message, data);
    
    if (level === 'ERROR') {
        console.error(formattedMessage);
    } else if (level === 'WARN') {
        console.warn(formattedMessage);
    } else {
        console.log(formattedMessage);
    }
}

const logger = {
    debug: (module, action, message, data) => log('DEBUG', module, action, message, data),
    info: (module, action, message, data) => log('INFO', module, action, message, data),
    warn: (module, action, message, data) => log('WARN', module, action, message, data),
    error: (module, action, message, data) => log('ERROR', module, action, message, data),
    
    MODULES: LOG_MODULES,
    
    auth: {
        login: (message, data) => log('INFO', LOG_MODULES.AUTH, 'LOGIN', message, data),
        logout: (message, data) => log('INFO', LOG_MODULES.AUTH, 'LOGOUT', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.AUTH, 'ERROR', message, data)
    },
    
    todo: {
        create: (message, data) => log('INFO', LOG_MODULES.TODO, 'CREATE', message, data),
        update: (message, data) => log('INFO', LOG_MODULES.TODO, 'UPDATE', message, data),
        delete: (message, data) => log('INFO', LOG_MODULES.TODO, 'DELETE', message, data),
        sync: (message, data) => log('INFO', LOG_MODULES.TODO, 'SYNC', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.TODO, 'ERROR', message, data)
    },
    
    combo: {
        create: (message, data) => log('INFO', LOG_MODULES.COMBO, 'CREATE', message, data),
        update: (message, data) => log('INFO', LOG_MODULES.COMBO, 'UPDATE', message, data),
        delete: (message, data) => log('INFO', LOG_MODULES.COMBO, 'DELETE', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.COMBO, 'ERROR', message, data)
    },
    
    collab: {
        join: (message, data) => log('INFO', LOG_MODULES.COLLAB, 'JOIN', message, data),
        leave: (message, data) => log('INFO', LOG_MODULES.COLLAB, 'LEAVE', message, data),
        approve: (message, data) => log('INFO', LOG_MODULES.COLLAB, 'APPROVE', message, data),
        reject: (message, data) => log('INFO', LOG_MODULES.COLLAB, 'REJECT', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.COLLAB, 'ERROR', message, data)
    },
    
    comment: {
        create: (message, data) => log('INFO', LOG_MODULES.COMMENT, 'CREATE', message, data),
        delete: (message, data) => log('INFO', LOG_MODULES.COMMENT, 'DELETE', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.COMMENT, 'ERROR', message, data)
    },
    
    notify: {
        schedule: (message, data) => log('INFO', LOG_MODULES.NOTIFY, 'SCHEDULE', message, data),
        send: (message, data) => log('INFO', LOG_MODULES.NOTIFY, 'SEND', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.NOTIFY, 'ERROR', message, data)
    },
    
    upload: {
        success: (message, data) => log('INFO', LOG_MODULES.UPLOAD, 'SUCCESS', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.UPLOAD, 'ERROR', message, data)
    },
    
    admin: {
        action: (message, data) => log('INFO', LOG_MODULES.ADMIN, 'ACTION', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.ADMIN, 'ERROR', message, data)
    },
    
    wechat: {
        api: (message, data) => log('DEBUG', LOG_MODULES.WECHAT, 'API', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.WECHAT, 'ERROR', message, data)
    },
    
    db: {
        query: (message, data) => log('DEBUG', LOG_MODULES.DB, 'QUERY', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.DB, 'ERROR', message, data)
    },
    
    api: {
        request: (message, data) => log('INFO', LOG_MODULES.API, 'REQUEST', message, data),
        response: (message, data) => log('DEBUG', LOG_MODULES.API, 'RESPONSE', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.API, 'ERROR', message, data)
    },
    
    system: {
        start: (message, data) => log('INFO', LOG_MODULES.SYSTEM, 'START', message, data),
        stop: (message, data) => log('INFO', LOG_MODULES.SYSTEM, 'STOP', message, data),
        error: (message, data) => log('ERROR', LOG_MODULES.SYSTEM, 'ERROR', message, data)
    },
    
    systemInfo: (action, message, data) => log('INFO', LOG_MODULES.SYSTEM, action, message, data),
    systemError: (action, message, data) => log('ERROR', LOG_MODULES.SYSTEM, action, message, data),
    
    authInfo: (action, message, data) => log('INFO', LOG_MODULES.AUTH, action, message, data),
    authError: (action, message, data) => log('ERROR', LOG_MODULES.AUTH, action, message, data),
    
    todoInfo: (action, message, data) => log('INFO', LOG_MODULES.TODO, action, message, data),
    todoError: (action, message, data) => log('ERROR', LOG_MODULES.TODO, action, message, data),
    todoSync: (action, message, data) => log('INFO', LOG_MODULES.TODO, 'SYNC', message, data),
    
    comboInfo: (action, message, data) => log('INFO', LOG_MODULES.COMBO, action, message, data),
    comboError: (action, message, data) => log('ERROR', LOG_MODULES.COMBO, action, message, data),
    
    collabInfo: (action, message, data) => log('INFO', LOG_MODULES.COLLAB, action, message, data),
    collabError: (action, message, data) => log('ERROR', LOG_MODULES.COLLAB, action, message, data),
    
    commentInfo: (action, message, data) => log('INFO', LOG_MODULES.COMMENT, action, message, data),
    commentError: (action, message, data) => log('ERROR', LOG_MODULES.COMMENT, action, message, data),
    
    notifySchedule: (action, message, data) => log('INFO', LOG_MODULES.NOTIFY, action, message, data),
    notifySend: (action, message, data) => log('INFO', LOG_MODULES.NOTIFY, 'SEND', message, data),
    notifyError: (action, message, data) => log('ERROR', LOG_MODULES.NOTIFY, action, message, data),
    
    uploadSuccess: (action, message, data) => log('INFO', LOG_MODULES.UPLOAD, action, message, data),
    uploadError: (action, message, data) => log('ERROR', LOG_MODULES.UPLOAD, action, message, data),
    
    adminInfo: (action, message, data) => log('INFO', LOG_MODULES.ADMIN, action, message, data),
    adminError: (action, message, data) => log('ERROR', LOG_MODULES.ADMIN, action, message, data),
    
    wechatApi: (action, message, data) => log('DEBUG', LOG_MODULES.WECHAT, action, message, data),
    wechatError: (action, message, data) => log('ERROR', LOG_MODULES.WECHAT, action, message, data),
    
    dbDebug: (action, message, data) => log('DEBUG', LOG_MODULES.DB, action, message, data),
    dbError: (action, message, data) => log('ERROR', LOG_MODULES.DB, action, message, data),
    
    apiInfo: (action, message, data) => log('INFO', LOG_MODULES.API, action, message, data),
    apiWarn: (action, message, data) => log('WARN', LOG_MODULES.API, action, message, data)
};

module.exports = logger;
