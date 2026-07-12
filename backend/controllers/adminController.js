const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { clearCache: clearConfigCache } = require('./configController');
const logger = require('../utils/logger');

const dataDir = path.join(__dirname, '../data');
const noticesPath = path.join(dataDir, 'notices.json');
const changelogPath = path.join(dataDir, 'changelog.json');
const adminsPath = path.join(dataDir, 'admins.json');

function getLocalDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function readJsonFile(filePath, defaultValue = []) {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
        return defaultValue;
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        logger.adminError('读取文件', `读取JSON文件失败: ${filePath}`, { error: err.message });
        return defaultValue;
    }
}

function writeJsonFile(filePath, data) {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    delete require.cache[require.resolve(filePath)];
    if (clearConfigCache) {
        clearConfigCache();
    }
}

function getAdminIds() {
    try {
        const config = readJsonFile(adminsPath, { adminIds: [] });
        return config.adminIds || [];
    } catch (err) {
        logger.adminError('读取配置', '读取管理员配置失败', { error: err.message });
        return [];
    }
}

function formatDateTime(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

const TIME_FIELDS = [
    'created_at', 'updated_at', 'deleted_at', 'joined_at', 'last_sync',
    'notify_time', 'sent_at', 'processed_at', 'completed_at', 'CREATE_TIME', 'UPDATE_TIME'
];

const DATE_FIELDS = [
    'set_date'
];

function formatDataTimes(data) {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => formatItemTimes(item));
    }
    return formatItemTimes(data);
}

function formatItemTimes(item) {
    if (!item || typeof item !== 'object') return item;
    const result = { ...item };
    for (const key of TIME_FIELDS) {
        if (result[key] !== undefined && result[key] !== null) {
            result[key] = formatDateTime(result[key]);
        }
    }
    for (const key of DATE_FIELDS) {
        if (result[key] !== undefined && result[key] !== null) {
            result[key] = formatDate(result[key]);
        }
    }
    if (result['completed'] && typeof result['completed'] === 'number' && result['completed'] > 0) {
        result['completed_at'] = formatDateTime(new Date(result['completed']));
    }
    return result;
}

const getStats = async (req, res) => {
    try {
        const userCount = await query('SELECT COUNT(*) as count FROM users');
        const todoCount = await query('SELECT COUNT(*) as count FROM todos WHERE is_deleted = 0');
        const deletedTodoCount = await query('SELECT COUNT(*) as count FROM todos WHERE is_deleted = 1');
        const comboCount = await query('SELECT COUNT(*) as count FROM combos');
        const sharedComboCount = await query('SELECT COUNT(*) as count FROM combos WHERE is_shared = 1');
        const tagCount = await query('SELECT COUNT(*) as count FROM tags');
        const sharedTodoCount = await query('SELECT COUNT(*) as count FROM shared_todos WHERE is_deleted = 0');
        const notificationCount = await query('SELECT COUNT(*) as count FROM todo_notifications');
        const pendingNotifications = await query('SELECT COUNT(*) as count FROM todo_notifications WHERE is_sent = 0');
        const syncLogCount = await query('SELECT COUNT(*) as count FROM sync_logs');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayNewUsers = await query('SELECT COUNT(*) as count FROM users WHERE created_at >= ?', [todayStart]);
        const todayNewTodos = await query('SELECT COUNT(*) as count FROM todos WHERE created_at >= ? AND is_deleted = 0', [todayStart]);

        const completedTodoCount = await query('SELECT COUNT(*) as count FROM todos WHERE completed > 0 AND is_deleted = 0');
        const starredTodoCount = await query('SELECT COUNT(*) as count FROM todos WHERE is_star = 1 AND is_deleted = 0');
        
        const todoWithLocation = await query('SELECT COUNT(*) as count FROM todos WHERE location_text IS NOT NULL AND is_deleted = 0');
        const todoWithImages = await query('SELECT COUNT(*) as count FROM todos WHERE images IS NOT NULL AND images != "" AND images != "[]" AND is_deleted = 0');

        const memberCount = await query('SELECT COUNT(*) as count FROM combo_members');
        const pendingRequests = await query('SELECT COUNT(*) as count FROM collab_requests WHERE status = "pending"');
        const assignmentCount = await query('SELECT COUNT(*) as count FROM shared_todo_assignments');

        const todaySyncCount = await query('SELECT COUNT(*) as count FROM sync_logs WHERE created_at >= ?', [todayStart]);
        const successSyncCount = await query('SELECT COUNT(*) as count FROM sync_logs WHERE status = "success"');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers7Days = await query('SELECT COUNT(DISTINCT user_id) as count FROM sync_logs WHERE created_at >= ?', [sevenDaysAgo]);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers30Days = await query('SELECT COUNT(DISTINCT user_id) as count FROM sync_logs WHERE created_at >= ?', [thirtyDaysAgo]);

        const avgTodoResult = await query('SELECT AVG(todo_count) as avg FROM (SELECT COUNT(*) as todo_count FROM todos WHERE is_deleted = 0 GROUP BY user_id) as t');
        const avgTodosPerUser = avgTodoResult[0].avg || 0;

        const totalTodos = todoCount[0].count || 0;
        const completedTodos = completedTodoCount[0].count || 0;
        const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

        const totalSyncs = syncLogCount[0].count || 0;
        const successSyncs = successSyncCount[0].count || 0;
        const syncSuccessRate = totalSyncs > 0 ? Math.round((successSyncs / totalSyncs) * 100) : 0;

        const commentCount = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE is_deleted = 0');
        const mainCommentCount = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE is_deleted = 0 AND parent_id IS NULL');
        const replyCount = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE is_deleted = 0 AND parent_id IS NOT NULL');
        const todayNewComments = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE created_at >= ? AND is_deleted = 0', [todayStart]);
        const todayNewMainComments = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE created_at >= ? AND is_deleted = 0 AND parent_id IS NULL', [todayStart]);
        const todayNewReplies = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE created_at >= ? AND is_deleted = 0 AND parent_id IS NOT NULL', [todayStart]);

        res.json({
            success: true,
            stats: {
                userCount: userCount[0].count,
                todoCount: totalTodos,
                deletedTodoCount: deletedTodoCount[0].count,
                completedTodoCount: completedTodos,
                completionRate: completionRate,
                starredTodoCount: starredTodoCount[0].count,
                todoWithLocation: todoWithLocation[0].count,
                todoWithImages: todoWithImages[0].count,
                comboCount: comboCount[0].count,
                sharedComboCount: sharedComboCount[0].count,
                memberCount: memberCount[0].count,
                pendingRequests: pendingRequests[0].count,
                assignmentCount: assignmentCount[0].count,
                tagCount: tagCount[0].count,
                sharedTodoCount: sharedTodoCount[0].count,
                notificationCount: notificationCount[0].count,
                pendingNotificationCount: pendingNotifications[0].count,
                syncLogCount: totalSyncs,
                todaySyncCount: todaySyncCount[0].count,
                syncSuccessRate: syncSuccessRate,
                todayNewUsers: todayNewUsers[0].count,
                todayNewTodos: todayNewTodos[0].count,
                activeUsers7Days: activeUsers7Days[0].count,
                activeUsers30Days: activeUsers30Days[0].count,
                avgTodosPerUser: Math.round(avgTodosPerUser * 10) / 10,
                commentCount: commentCount[0].count,
                mainCommentCount: mainCommentCount[0].count,
                replyCount: replyCount[0].count,
                todayNewComments: todayNewComments[0].count,
                todayNewMainComments: todayNewMainComments[0].count,
                todayNewReplies: todayNewReplies[0].count
            }
        });
    } catch (err) {
        logger.adminError('统计', '获取统计数据失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取统计数据失败'
        });
    }
};

const getStatDetail = async (req, res) => {
    const { type } = req.params;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        let data = [];
        
        switch (type) {
            case 'todayNewUsers':
                data = await query(`
                    SELECT id, nickname, avatar_url, created_at
                    FROM users 
                    WHERE created_at >= ? 
                    ORDER BY created_at DESC
                `, [todayStart]);
                break;
                
            case 'todayNewTodos':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.set_time, t.completed, t.created_at,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.created_at >= ? AND t.is_deleted = 0
                    ORDER BY t.created_at DESC
                    LIMIT 100
                `, [todayStart]);
                break;
                
            case 'todaySyncCount':
                data = await query(`
                    SELECT s.id, s.action, s.todo_count, s.status, s.created_at,
                           u.nickname as user_name, u.id as user_id
                    FROM sync_logs s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE s.created_at >= ?
                    ORDER BY s.created_at DESC
                    LIMIT 100
                `, [todayStart]);
                break;
                
            case 'activeUsers7Days':
                data = await query(`
                    SELECT DISTINCT u.id, u.nickname, u.avatar_url, u.created_at,
                           MAX(s.created_at) as last_sync
                    FROM users u
                    INNER JOIN sync_logs s ON u.id = s.user_id
                    WHERE s.created_at >= ?
                    GROUP BY u.id
                    ORDER BY last_sync DESC
                `, [sevenDaysAgo]);
                
                data.forEach(user => {
                    user.last_sync = user.last_sync ? formatDateTime(user.last_sync) : '从未同步过';
                });
                break;
                
            case 'activeUsers30Days':
                data = await query(`
                    SELECT DISTINCT u.id, u.nickname, u.avatar_url, u.created_at,
                           MAX(s.created_at) as last_sync
                    FROM users u
                    INNER JOIN sync_logs s ON u.id = s.user_id
                    WHERE s.created_at >= ?
                    GROUP BY u.id
                    ORDER BY last_sync DESC
                `, [thirtyDaysAgo]);
                
                data.forEach(user => {
                    user.last_sync = user.last_sync ? formatDateTime(user.last_sync) : '从未同步过';
                });
                break;
                
            case 'userCount':
                data = await query(`
                    SELECT id, nickname, avatar_url, created_at,
                           (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND is_deleted = 0) as todo_count
                    FROM users u
                    ORDER BY id DESC
                    LIMIT 100
                `);
                break;
                
            case 'todoCount':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.completed, t.is_star,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.is_deleted = 0
                    ORDER BY t.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'comboCount':
                data = await query(`
                    SELECT c.id, c.name, c.color, c.icon, c.is_shared, c.created_at,
                           u.nickname as creator_name,
                           (SELECT COUNT(*) FROM combo_members WHERE combo_id = c.id) as member_count
                    FROM combos c
                    LEFT JOIN users u ON c.user_id = u.id
                    ORDER BY c.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'sharedComboCount':
                data = await query(`
                    SELECT c.id, c.name, c.color, c.icon, c.created_at,
                           u.nickname as creator_name,
                           (SELECT COUNT(*) FROM combo_members WHERE combo_id = c.id) as member_count
                    FROM combos c
                    LEFT JOIN users u ON c.user_id = u.id
                    WHERE c.is_shared = 1
                    ORDER BY c.id DESC
                `);
                break;
                
            case 'completedTodoCount':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.completed,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.completed > 0 AND t.is_deleted = 0
                    ORDER BY t.completed DESC
                    LIMIT 100
                `);
                break;
                
            case 'starredTodoCount':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.completed,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.is_star = 1 AND t.is_deleted = 0
                    ORDER BY t.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'deletedTodoCount':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.deleted_at,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.is_deleted = 1
                    ORDER BY t.deleted_at DESC
                    LIMIT 100
                `);
                break;
                
            case 'todoWithLocation':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.location_text,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.location_text IS NOT NULL AND t.is_deleted = 0
                    ORDER BY t.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'todoWithImages':
                data = await query(`
                    SELECT t.id, t.text, t.set_date, t.images,
                           u.nickname as user_name, u.id as user_id
                    FROM todos t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.images IS NOT NULL AND t.images != "" AND t.images != "[]" AND t.is_deleted = 0
                    ORDER BY t.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'memberCount':
                data = await query(`
                    SELECT cm.id, cm.combo_id, cm.user_id, cm.role, cm.joined_at,
                           c.name as combo_name,
                           u.nickname as user_name
                    FROM combo_members cm
                    LEFT JOIN combos c ON cm.combo_id = c.id
                    LEFT JOIN users u ON cm.user_id = u.id
                    ORDER BY cm.joined_at DESC
                    LIMIT 100
                `);
                break;
                
            case 'sharedTodoCount':
                data = await query(`
                    SELECT st.id, st.text, st.set_date, st.assign_type,
                           c.name as combo_name, c.id as combo_id,
                           u.nickname as creator_name, u.id as user_id
                    FROM shared_todos st
                    LEFT JOIN combos c ON st.combo_id = c.id
                    LEFT JOIN users u ON st.creator_id = u.id
                    WHERE st.is_deleted = 0
                    ORDER BY st.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'assignmentCount':
                data = await query(`
                    SELECT sta.id, sta.shared_todo_id, sta.user_id, sta.completed_at,
                           st.text as todo_text,
                           u.nickname as user_name
                    FROM shared_todo_assignments sta
                    LEFT JOIN shared_todos st ON sta.shared_todo_id = st.id
                    LEFT JOIN users u ON sta.user_id = u.id
                    ORDER BY sta.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'pendingRequests':
                data = await query(`
                    SELECT cr.id, cr.combo_id, cr.user_id, cr.created_at,
                           c.name as combo_name,
                           u.nickname as user_name
                    FROM collab_requests cr
                    LEFT JOIN combos c ON cr.combo_id = c.id
                    LEFT JOIN users u ON cr.user_id = u.id
                    WHERE cr.status = 'pending'
                    ORDER BY cr.created_at DESC
                `);
                break;
                
            case 'tagCount':
                data = await query(`
                    SELECT t.id, t.name, t.color, t.user_id, t.created_at,
                           u.nickname as user_name,
                           (SELECT COUNT(*) FROM todos WHERE tags LIKE CONCAT('%', t.id, '%')) as usage_count
                    FROM tags t
                    LEFT JOIN users u ON t.user_id = u.id
                    ORDER BY t.id DESC
                    LIMIT 100
                `);
                break;
                
            case 'notificationCount':
                data = await query(`
                    SELECT tn.id, tn.todo_id, tn.notify_time, tn.is_sent, tn.sent_at,
                           t.text as todo_text,
                           u.nickname as user_name, u.id as user_id
                    FROM todo_notifications tn
                    LEFT JOIN todos t ON tn.todo_id = t.id
                    LEFT JOIN users u ON tn.user_id = u.id
                    ORDER BY tn.notify_time DESC
                    LIMIT 100
                `);
                break;
                
            case 'pendingNotificationCount':
                data = await query(`
                    SELECT tn.id, tn.todo_id, tn.notify_time,
                           t.text as todo_text,
                           u.nickname as user_name, u.id as user_id
                    FROM todo_notifications tn
                    LEFT JOIN todos t ON tn.todo_id = t.id
                    LEFT JOIN users u ON tn.user_id = u.id
                    WHERE tn.is_sent = 0
                    ORDER BY tn.notify_time ASC
                    LIMIT 100
                `);
                break;
                
            case 'syncLogCount':
                data = await query(`
                    SELECT s.id, s.user_id, s.action, s.todo_count, s.status, s.created_at,
                           u.nickname as user_name
                    FROM sync_logs s
                    LEFT JOIN users u ON s.user_id = u.id
                    ORDER BY s.created_at DESC
                    LIMIT 100
                `);
                break;
                
            case 'commentCount':
                data = await query(`
                    SELECT c.id, c.shared_todo_id, c.content, c.parent_id, c.created_at, c.is_deleted,
                           u.nickname as user_name, u.id as user_id,
                           st.text as todo_text,
                           cb.name as combo_name, cb.id as combo_id
                    FROM shared_todo_comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
                    LEFT JOIN combos cb ON st.combo_id = cb.id
                    WHERE c.is_deleted = 0
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `);
                break;
                
            case 'mainCommentCount':
                data = await query(`
                    SELECT c.id, c.shared_todo_id, c.content, c.created_at,
                           u.nickname as user_name, u.id as user_id,
                           st.text as todo_text,
                           cb.name as combo_name, cb.id as combo_id
                    FROM shared_todo_comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
                    LEFT JOIN combos cb ON st.combo_id = cb.id
                    WHERE c.is_deleted = 0 AND c.parent_id IS NULL
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `);
                break;
                
            case 'replyCount':
                data = await query(`
                    SELECT c.id, c.shared_todo_id, c.content, c.parent_id, c.reply_to_user_id, c.created_at,
                           u.nickname as user_name, u.id as user_id,
                           ru.nickname as reply_to_name,
                           st.text as todo_text,
                           cb.name as combo_name, cb.id as combo_id
                    FROM shared_todo_comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN users ru ON c.reply_to_user_id = ru.id
                    LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
                    LEFT JOIN combos cb ON st.combo_id = cb.id
                    WHERE c.is_deleted = 0 AND c.parent_id IS NOT NULL
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `);
                break;
                
            case 'todayNewComments':
                data = await query(`
                    SELECT c.id, c.shared_todo_id, c.content, c.parent_id, c.created_at,
                           u.nickname as user_name, u.id as user_id,
                           st.text as todo_text,
                           cb.name as combo_name, cb.id as combo_id
                    FROM shared_todo_comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
                    LEFT JOIN combos cb ON st.combo_id = cb.id
                    WHERE c.is_deleted = 0 AND c.created_at >= ?
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `, [todayStart]);
                break;
                
            case 'todayNewMainComments':
                data = await query(`
                    SELECT c.id, c.shared_todo_id, c.content, c.created_at,
                           u.nickname as user_name, u.id as user_id,
                           st.text as todo_text,
                           cb.name as combo_name, cb.id as combo_id
                    FROM shared_todo_comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
                    LEFT JOIN combos cb ON st.combo_id = cb.id
                    WHERE c.is_deleted = 0 AND c.parent_id IS NULL AND c.created_at >= ?
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `, [todayStart]);
                break;
                
            case 'todayNewReplies':
                data = await query(`
                    SELECT c.id, c.shared_todo_id, c.content, c.parent_id, c.reply_to_user_id, c.created_at,
                           u.nickname as user_name, u.id as user_id,
                           ru.nickname as reply_to_name,
                           st.text as todo_text,
                           cb.name as combo_name, cb.id as combo_id
                    FROM shared_todo_comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    LEFT JOIN users ru ON c.reply_to_user_id = ru.id
                    LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
                    LEFT JOIN combos cb ON st.combo_id = cb.id
                    WHERE c.is_deleted = 0 AND c.parent_id IS NOT NULL AND c.created_at >= ?
                    ORDER BY c.created_at DESC
                    LIMIT 100
                `, [todayStart]);
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: '不支持的统计类型'
                });
        }
        
        res.json({
            success: true,
            type,
            data: formatDataTimes(data)
        });
    } catch (err) {
        logger.adminError('统计详情', '获取统计详情失败', { type, error: err.message });
        res.status(500).json({
            success: false,
            message: '获取统计详情失败'
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const { page = 1, pageSize = 20, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        let sql = `
            SELECT 
                u.id, u.openid, u.nickname, u.avatar_url, 
                u.todo_limit, u.combo_limit, u.collab_limit, 
                u.created_at, u.updated_at,
                (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND is_deleted = 0) as todo_count,
                (SELECT COUNT(*) FROM combos WHERE user_id = u.id) as combo_count
            FROM users u
        `;
        let countSql = 'SELECT COUNT(*) as count FROM users';
        const params = [];
        const countParams = [];

        if (search) {
            sql += ' WHERE u.nickname LIKE ?';
            countSql += ' WHERE nickname LIKE ?';
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        sql += ' ORDER BY u.id DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const users = await query(sql, params);
        const total = await query(countSql, countParams);

        res.json({
            success: true,
            data: {
                list: formatDataTimes(users),
                total: total[0].count,
                page: parseInt(page),
                pageSize: limit
            }
        });
    } catch (err) {
        logger.adminError('用户列表', '获取用户列表失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取用户列表失败'
        });
    }
};

const getUserDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const users = await query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const user = users[0];

        const todos = await query(`
            SELECT id, todo_id, text, set_date, set_time, remarks, images, location_text as location, priority, completed, is_star, is_deleted, combo_id, created_at, updated_at
            FROM todos 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        const combos = await query(`
            SELECT c.id, c.name, c.icon, c.color, c.is_shared, c.created_at,
                   (SELECT COUNT(*) FROM todos t WHERE t.combo_id = c.id AND t.is_deleted = 0) as todo_count
            FROM combos c
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [id]);

        const sharedCombos = await query(`
            SELECT c.id, c.name, c.icon, c.color, cm.role, cm.joined_at,
                   (SELECT COUNT(*) FROM shared_todos st WHERE st.combo_id = c.id AND st.is_deleted = 0) as todo_count
            FROM combo_members cm
            JOIN combos c ON cm.combo_id = c.id
            WHERE cm.user_id = ?
            ORDER BY cm.joined_at DESC
        `, [id]);

        const todoCount = await query('SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_deleted = 0', [id]);
        const completedCount = await query('SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND completed > 0 AND is_deleted = 0', [id]);
        
        const lastSyncResult = await query(`
            SELECT created_at 
            FROM sync_logs 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [id]);
        
        const lastSyncAt = lastSyncResult && lastSyncResult.length > 0 
            ? formatDateTime(lastSyncResult[0].created_at) 
            : null;

        const assignedTodos = await query(`
            SELECT st.id, st.text, st.set_date, st.set_time, st.remarks, st.assign_type,
                   st.completed_at, c.id as combo_id, c.name as combo_name, c.color as combo_color,
                   sta.completed_at as my_completed_at,
                   u.nickname as creator_name
            FROM shared_todo_assignments sta
            JOIN shared_todos st ON sta.shared_todo_id = st.id
            JOIN combos c ON st.combo_id = c.id
            LEFT JOIN users u ON st.creator_id = u.id
            WHERE sta.user_id = ? AND st.is_deleted = 0
            ORDER BY st.created_at DESC
        `, [id]);

        const comments = await query(`
            SELECT c.id, c.content, c.created_at, c.parent_id,
                   st.text as todo_text, st.id as shared_todo_id,
                   combo.id as combo_id, combo.name as combo_name,
                   parent.content as parent_content,
                   reply_to.nickname as reply_to_name
            FROM shared_todo_comments c
            JOIN shared_todos st ON c.shared_todo_id = st.id
            JOIN combos combo ON st.combo_id = combo.id
            LEFT JOIN shared_todo_comments parent ON c.parent_id = parent.id
            LEFT JOIN users reply_to ON c.reply_to_user_id = reply_to.id
            WHERE c.user_id = ? AND c.is_deleted = 0
            ORDER BY c.created_at DESC
            LIMIT 50
        `, [id]);

        const commentCount = await query(`
            SELECT COUNT(*) as count FROM shared_todo_comments 
            WHERE user_id = ? AND is_deleted = 0
        `, [id]);

        const assignedByCombo = {};
        assignedTodos.forEach(todo => {
            if (!assignedByCombo[todo.combo_id]) {
                assignedByCombo[todo.combo_id] = {
                    combo_id: todo.combo_id,
                    combo_name: todo.combo_name,
                    combo_color: todo.combo_color,
                    todos: []
                };
            }
            assignedByCombo[todo.combo_id].todos.push({
                ...todo,
                is_completed: todo.my_completed_at > 0
            });
        });

        res.json({
            success: true,
            user: {
                ...formatItemTimes(user),
                last_sync_at: lastSyncAt
            },
            todos: formatDataTimes(todos),
            combos: formatDataTimes(combos),
            sharedCombos: formatDataTimes(sharedCombos),
            assignedTodos: Object.values(assignedByCombo),
            assignedTodosFlat: formatDataTimes(assignedTodos),
            comments: formatDataTimes(comments),
            stats: {
                totalTodos: todoCount[0].count,
                completedTodos: completedCount[0].count,
                assignedTodosCount: assignedTodos.length,
                commentsCount: commentCount[0].count
            }
        });
    } catch (err) {
        logger.adminError('用户详情', '获取用户详情失败', { id, error: err.message });
        res.status(500).json({
            success: false,
            message: '获取用户详情失败'
        });
    }
};

const updateUserLimits = async (req, res) => {
    try {
        const { id } = req.params;
        const { todo_limit, combo_limit, collab_limit } = req.body;

        const updates = [];
        const params = [];

        if (todo_limit !== undefined) {
            updates.push('todo_limit = ?');
            params.push(parseInt(todo_limit));
        }
        if (combo_limit !== undefined) {
            updates.push('combo_limit = ?');
            params.push(parseInt(combo_limit));
        }
        if (collab_limit !== undefined) {
            updates.push('collab_limit = ?');
            params.push(parseInt(collab_limit));
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有要更新的字段'
            });
        }

        updates.push('updated_at = NOW()');
        params.push(id);

        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({
            success: true,
            message: '更新成功'
        });
    } catch (err) {
        logger.adminError('更新限制', '更新用户限制失败', { id, error: err.message });
        res.status(500).json({
            success: false,
            message: '更新用户限制失败'
        });
    }
};

const updateUserNickname = async (req, res) => {
    try {
        const { id } = req.params;
        const { nickname } = req.body;

        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '昵称不能为空'
            });
        }

        if (nickname.length > 20) {
            return res.status(400).json({
                success: false,
                message: '昵称不能超过20个字符'
            });
        }

        await query('UPDATE users SET nickname = ?, updated_at = NOW() WHERE id = ?', [nickname.trim(), id]);

        logger.adminInfo('更新昵称', '管理员修改用户昵称', { userId: id, newNickname: nickname });

        res.json({
            success: true,
            message: '昵称更新成功',
            nickname: nickname.trim()
        });
    } catch (err) {
        logger.adminError('更新昵称', '更新用户昵称失败', { id, error: err.message });
        res.status(500).json({
            success: false,
            message: '更新用户昵称失败'
        });
    }
};

const getNotices = async (req, res) => {
    try {
        const notices = readJsonFile(noticesPath, []);
        res.json({
            success: true,
            notices: notices
        });
    } catch (err) {
        logger.adminError('公告列表', '获取公告列表失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取公告列表失败'
        });
    }
};

const createNotice = async (req, res) => {
    try {
        const { title, date, content, version } = req.body;

        if (version) {
            const notices = readJsonFile(noticesPath, []);
            const newNotice = {
                version,
                date: date || getLocalDateStr()
            };
            notices.unshift(newNotice);
            writeJsonFile(noticesPath, notices);
            res.json({
                success: true,
                message: '创建成功',
                data: newNotice
            });
        } else {
            if (!title || !content) {
                return res.status(400).json({
                    success: false,
                    message: '标题和内容不能为空'
                });
            }

            const notices = readJsonFile(noticesPath, []);
            const newNotice = {
                title,
                date: date || getLocalDateStr(),
                content
            };

            notices.unshift(newNotice);
            writeJsonFile(noticesPath, notices);

            res.json({
                success: true,
                message: '创建成功',
                data: newNotice
            });
        }
    } catch (err) {
        logger.adminError('创建公告', '创建公告失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '创建公告失败'
        });
    }
};

const updateNotice = async (req, res) => {
    try {
        const { index } = req.params;
        const { title, date, content, version } = req.body;

        const notices = readJsonFile(noticesPath, []);
        const idx = parseInt(index);

        if (idx < 0 || idx >= notices.length) {
            return res.status(404).json({
                success: false,
                message: '公告不存在'
            });
        }

        if (version) {
            notices[idx] = {
                version,
                date: date || notices[idx].date
            };
        } else {
            notices[idx] = {
                title: title || notices[idx].title,
                date: date || notices[idx].date,
                content: content !== undefined ? content : notices[idx].content
            };
        }

        writeJsonFile(noticesPath, notices);

        res.json({
            success: true,
            message: '更新成功',
            data: notices[idx]
        });
    } catch (err) {
        logger.adminError('更新公告', '更新公告失败', { index, error: err.message });
        res.status(500).json({
            success: false,
            message: '更新公告失败'
        });
    }
};

const deleteNotice = async (req, res) => {
    try {
        const { index } = req.params;

        const notices = readJsonFile(noticesPath, []);
        const idx = parseInt(index);

        if (idx < 0 || idx >= notices.length) {
            return res.status(404).json({
                success: false,
                message: '公告不存在'
            });
        }

        notices.splice(idx, 1);
        writeJsonFile(noticesPath, notices);

        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (err) {
        logger.adminError('删除公告', '删除公告失败', { index, error: err.message });
        res.status(500).json({
            success: false,
            message: '删除公告失败'
        });
    }
};

const getChangelog = async (req, res) => {
    try {
        const changelog = readJsonFile(changelogPath, []);
        res.json({
            success: true,
            changelog: changelog
        });
    } catch (err) {
        logger.adminError('更新日志', '获取更新日志失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取更新日志失败'
        });
    }
};

const createChangelog = async (req, res) => {
    try {
        const { version, date, content } = req.body;

        if (!version || !content) {
            return res.status(400).json({
                success: false,
                message: '版本号和内容不能为空'
            });
        }

        const changelog = readJsonFile(changelogPath, []);
        const newEntry = {
            version,
            date: date || getLocalDateStr(),
            content
        };

        changelog.unshift(newEntry);
        writeJsonFile(changelogPath, changelog);

        res.json({
            success: true,
            message: '创建成功',
            data: newEntry
        });
    } catch (err) {
        logger.adminError('创建日志', '创建更新日志失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '创建更新日志失败'
        });
    }
};

const updateChangelog = async (req, res) => {
    try {
        const { index } = req.params;
        const { version, date, content } = req.body;

        const changelog = readJsonFile(changelogPath, []);
        const idx = parseInt(index);

        if (idx < 0 || idx >= changelog.length) {
            return res.status(404).json({
                success: false,
                message: '更新日志不存在'
            });
        }

        changelog[idx] = {
            ...changelog[idx],
            version: version || changelog[idx].version,
            date: date || changelog[idx].date,
            content: content || changelog[idx].content
        };

        writeJsonFile(changelogPath, changelog);

        res.json({
            success: true,
            message: '更新成功',
            data: changelog[idx]
        });
    } catch (err) {
        logger.adminError('更新日志', '更新更新日志失败', { index, error: err.message });
        res.status(500).json({
            success: false,
            message: '更新更新日志失败'
        });
    }
};

const deleteChangelog = async (req, res) => {
    try {
        const { index } = req.params;

        const changelog = readJsonFile(changelogPath, []);
        const idx = parseInt(index);

        if (idx < 0 || idx >= changelog.length) {
            return res.status(404).json({
                success: false,
                message: '更新日志不存在'
            });
        }

        changelog.splice(idx, 1);
        writeJsonFile(changelogPath, changelog);

        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (err) {
        logger.adminError('删除日志', '删除更新日志失败', { index, error: err.message });
        res.status(500).json({
            success: false,
            message: '删除更新日志失败'
        });
    }
};

const getTables = async (req, res) => {
    try {
        const tables = await query(`
            SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `);

        res.json({
            success: true,
            data: formatDataTimes(tables)
        });
    } catch (err) {
        logger.adminError('表列表', '获取表列表失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取表列表失败'
        });
    }
};

const getTableData = async (req, res) => {
    try {
        const { tableName } = req.params;
        const { page = 1, pageSize = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        const validTables = [
            'users', 'todos', 'tags', 'todo_tags', 'combos', 'combo_members',
            'shared_todos', 'shared_todo_assignments', 'collab_requests',
            'todo_notifications', 'sync_logs'
        ];

        if (!validTables.includes(tableName)) {
            return res.status(400).json({
                success: false,
                message: '无效的表名'
            });
        }

        const data = await query(`SELECT * FROM ?? ORDER BY id DESC LIMIT ? OFFSET ?`, [tableName, limit, offset]);
        const count = await query(`SELECT COUNT(*) as count FROM ??`, [tableName]);

        const columns = await query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `, [tableName]);

        res.json({
            success: true,
            data: {
                columns,
                rows: formatDataTimes(data),
                total: count[0].count,
                page: parseInt(page),
                pageSize: limit
            }
        });
    } catch (err) {
        logger.adminError('表数据', '获取表数据失败', { tableName, error: err.message });
        res.status(500).json({
            success: false,
            message: '获取表数据失败'
        });
    }
};

const getAdminConfig = async (req, res) => {
    try {
        const config = readJsonFile(adminsPath, { adminIds: [] });
        res.json({
            success: true,
            data: config
        });
    } catch (err) {
        logger.adminError('管理员配置', '获取管理员配置失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取管理员配置失败'
        });
    }
};

const updateAdminConfig = async (req, res) => {
    try {
        const { adminIds } = req.body;

        if (!Array.isArray(adminIds)) {
            return res.status(400).json({
                success: false,
                message: 'adminIds 必须是数组'
            });
        }

        const config = { adminIds };
        writeJsonFile(adminsPath, config);

        res.json({
            success: true,
            message: '更新成功',
            data: config
        });
    } catch (err) {
        logger.adminError('更新配置', '更新管理员配置失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '更新管理员配置失败'
        });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        
        const comments = await query('SELECT * FROM shared_todo_comments WHERE id = ?', [id]);
        
        if (comments.length === 0) {
            return res.status(404).json({
                success: false,
                message: '评论不存在'
            });
        }
        
        const comment = comments[0];
        
        if (comment.is_deleted) {
            return res.status(400).json({
                success: false,
                message: '评论已被删除'
            });
        }
        
        await query('UPDATE shared_todo_comments SET is_deleted = 1 WHERE id = ?', [id]);
        
        if (comment.parent_id) {
            await query('UPDATE shared_todo_comments SET is_deleted = 1 WHERE parent_id = ?', [id]);
        }
        
        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (err) {
        logger.adminError('删除评论', '删除评论失败', { id, error: err.message });
        res.status(500).json({
            success: false,
            message: '删除评论失败'
        });
    }
};

const getComments = async (req, res) => {
    try {
        const { page = 1, pageSize = 20, comboId, userId } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);
        
        let sql = `
            SELECT c.id, c.shared_todo_id, c.content, c.parent_id, c.reply_to_user_id, c.created_at, c.is_deleted,
                   u.nickname as user_name, u.id as user_id,
                   ru.nickname as reply_to_name,
                   st.text as todo_text,
                   cb.name as combo_name, cb.id as combo_id
            FROM shared_todo_comments c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users ru ON c.reply_to_user_id = ru.id
            LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
            LEFT JOIN combos cb ON st.combo_id = cb.id
            WHERE c.is_deleted = 0
        `;
        const params = [];
        
        if (comboId) {
            sql += ' AND cb.id = ?';
            params.push(comboId);
        }
        
        if (userId) {
            sql += ' AND c.user_id = ?';
            params.push(userId);
        }
        
        sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const comments = await query(sql, params);
        
        let countSql = `
            SELECT COUNT(*) as count
            FROM shared_todo_comments c
            LEFT JOIN shared_todos st ON c.shared_todo_id = st.id
            LEFT JOIN combos cb ON st.combo_id = cb.id
            WHERE c.is_deleted = 0
        `;
        const countParams = [];
        
        if (comboId) {
            countSql += ' AND cb.id = ?';
            countParams.push(comboId);
        }
        
        if (userId) {
            countSql += ' AND c.user_id = ?';
            countParams.push(userId);
        }
        
        const total = await query(countSql, countParams);
        
        res.json({
            success: true,
            data: {
                list: formatDataTimes(comments),
                total: total[0].count,
                page: parseInt(page),
                pageSize: limit
            }
        });
    } catch (err) {
        logger.adminError('评论列表', '获取评论列表失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取评论列表失败'
        });
    }
};

const getRetentionStats = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newUsers = await query(`
            SELECT id, created_at 
            FROM users 
            WHERE created_at >= ?
        `, [thirtyDaysAgo]);
        
        const nextDayRetained = await query(`
            SELECT COUNT(DISTINCT u.id) as count
            FROM users u
            INNER JOIN sync_logs s ON u.id = s.user_id
            WHERE u.created_at >= ? 
            AND DATE(s.created_at) = DATE(DATE_ADD(u.created_at, INTERVAL 1 DAY))
        `, [thirtyDaysAgo]);
        
        const sevenDayRetained = await query(`
            SELECT COUNT(DISTINCT u.id) as count
            FROM users u
            INNER JOIN sync_logs s ON u.id = s.user_id
            WHERE u.created_at >= ? 
            AND DATEDIFF(s.created_at, u.created_at) BETWEEN 1 AND 7
        `, [thirtyDaysAgo]);
        
        const thirtyDayRetained = await query(`
            SELECT COUNT(DISTINCT u.id) as count
            FROM users u
            INNER JOIN sync_logs s ON u.id = s.user_id
            WHERE u.created_at >= ? 
            AND DATEDIFF(s.created_at, u.created_at) BETWEEN 1 AND 30
        `, [thirtyDaysAgo]);
        
        const totalNewUsers = newUsers.length;
        const nextDayRate = totalNewUsers > 0 ? Math.round((nextDayRetained[0].count / totalNewUsers) * 100) : 0;
        const sevenDayRate = totalNewUsers > 0 ? Math.round((sevenDayRetained[0].count / totalNewUsers) * 100) : 0;
        const thirtyDayRate = totalNewUsers > 0 ? Math.round((thirtyDayRetained[0].count / totalNewUsers) * 100) : 0;
        
        res.json({
            success: true,
            data: {
                totalNewUsers,
                nextDayRetention: nextDayRate,
                sevenDayRetention: sevenDayRate,
                thirtyDayRetention: thirtyDayRate,
                nextDayCount: nextDayRetained[0].count,
                sevenDayCount: sevenDayRetained[0].count,
                thirtyDayCount: thirtyDayRetained[0].count
            }
        });
    } catch (err) {
        logger.adminError('留存统计', '获取留存统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取留存统计失败'
        });
    }
};

const getTagUsageStats = async (req, res) => {
    try {
        const tags = await query(`
            SELECT t.id, t.name, t.color, t.icon, t.is_system,
                   COUNT(tt.todo_id) as usage_count
            FROM tags t
            LEFT JOIN todo_tags tt ON t.id = tt.tag_id
            LEFT JOIN todos todo ON tt.todo_id = todo.id AND todo.is_deleted = 0
            GROUP BY t.id
            ORDER BY usage_count DESC
            LIMIT 20
        `);
        
        const systemVsCustom = await query(`
            SELECT 
                t.is_system,
                COUNT(tt.todo_id) as usage_count
            FROM tags t
            LEFT JOIN todo_tags tt ON t.id = tt.tag_id
            LEFT JOIN todos todo ON tt.todo_id = todo.id AND todo.is_deleted = 0
            GROUP BY t.is_system
        `);
        
        res.json({
            success: true,
            data: {
                topTags: tags,
                systemVsCustom: systemVsCustom.map(item => ({
                    type: item.is_system ? '系统标签' : '自定义标签',
                    count: item.usage_count
                }))
            }
        });
    } catch (err) {
        logger.adminError('标签统计', '获取标签使用统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取标签使用统计失败'
        });
    }
};

const getNotificationRateStats = async (req, res) => {
    try {
        const total = await query('SELECT COUNT(*) as count FROM todo_notifications');
        const sent = await query('SELECT COUNT(*) as count FROM todo_notifications WHERE is_sent = 1');
        const pending = await query('SELECT COUNT(*) as count FROM todo_notifications WHERE is_sent = 0');
        
        const successRate = total[0].count > 0 ? Math.round((sent[0].count / total[0].count) * 100) : 0;
        
        const recentSent = await query(`
            SELECT tn.id, tn.notify_time, tn.sent_at,
                   t.text as todo_text,
                   u.nickname as user_name
            FROM todo_notifications tn
            LEFT JOIN todos t ON tn.todo_id = t.id
            LEFT JOIN users u ON tn.user_id = u.id
            WHERE tn.is_sent = 1
            ORDER BY tn.sent_at DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            data: {
                total: total[0].count,
                sent: sent[0].count,
                pending: pending[0].count,
                successRate,
                recentSent: formatDataTimes(recentSent)
            }
        });
    } catch (err) {
        logger.adminError('通知统计', '获取通知成功率统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取通知成功率统计失败'
        });
    }
};

const getUserTodoDistribution = async (req, res) => {
    try {
        const distribution = await query(`
            SELECT 
                CASE 
                    WHEN todo_count = 0 THEN '0个'
                    WHEN todo_count BETWEEN 1 AND 10 THEN '1-10个'
                    WHEN todo_count BETWEEN 11 AND 50 THEN '11-50个'
                    ELSE '50个以上'
                END as range_label,
                COUNT(*) as user_count
            FROM (
                SELECT user_id, COUNT(*) as todo_count
                FROM todos 
                WHERE is_deleted = 0
                GROUP BY user_id
            ) t
            GROUP BY range_label
            ORDER BY FIELD(range_label, '0个', '1-10个', '11-50个', '50个以上')
        `);
        
        const usersWithoutTodos = await query(`
            SELECT COUNT(*) as count FROM users 
            WHERE id NOT IN (SELECT DISTINCT user_id FROM todos WHERE is_deleted = 0)
        `);
        
        const totalUsers = await query('SELECT COUNT(*) as count FROM users');
        
        const distributionWithZero = distribution.find(d => d.range_label === '0个');
        if (!distributionWithZero) {
            distribution.unshift({
                range_label: '0个',
                user_count: usersWithoutTodos[0].count
            });
        }
        
        const total = totalUsers[0].count;
        const result = distribution.map(item => ({
            range: item.range_label,
            count: item.user_count,
            percent: total > 0 ? Math.round((item.user_count / total) * 100) : 0
        }));
        
        res.json({
            success: true,
            data: {
                distribution: result,
                totalUsers: total
            }
        });
    } catch (err) {
        logger.adminError('用户待办分布', '获取用户待办分布失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取用户待办分布失败'
        });
    }
};

const getTodoHourlyStats = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const hourlyData = await query(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as count
            FROM todos
            WHERE created_at >= ? AND is_deleted = 0
            GROUP BY HOUR(created_at)
            ORDER BY hour
        `, [sevenDaysAgo]);
        
        const result = [];
        for (let i = 0; i < 24; i++) {
            const found = hourlyData.find(h => h.hour === i);
            result.push({
                hour: i,
                hourLabel: `${i.toString().padStart(2, '0')}:00`,
                count: found ? found.count : 0
            });
        }
        
        const peakHours = result.filter(h => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
        
        res.json({
            success: true,
            data: {
                hourlyDistribution: result,
                peakHours,
                period: '最近7天'
            }
        });
    } catch (err) {
        logger.adminError('时段统计', '获取待办时段统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取待办时段统计失败'
        });
    }
};

const getSharedTodoCompletion = async (req, res) => {
    try {
        const total = await query('SELECT COUNT(*) as count FROM shared_todos WHERE is_deleted = 0');
        const completed = await query('SELECT COUNT(*) as count FROM shared_todos WHERE is_deleted = 0 AND completed_at > 0');
        
        const completionRate = total[0].count > 0 ? Math.round((completed[0].count / total[0].count) * 100) : 0;
        
        const assignTypeStats = await query(`
            SELECT assign_type, COUNT(*) as count,
                   SUM(CASE WHEN completed_at > 0 THEN 1 ELSE 0 END) as completed_count
            FROM shared_todos
            WHERE is_deleted = 0
            GROUP BY assign_type
        `);
        
        const recentCompleted = await query(`
            SELECT st.id, st.text, st.completed_at, st.assign_type,
                   c.name as combo_name,
                   u.nickname as creator_name
            FROM shared_todos st
            LEFT JOIN combos c ON st.combo_id = c.id
            LEFT JOIN users u ON st.creator_id = u.id
            WHERE st.is_deleted = 0 AND st.completed_at > 0
            ORDER BY st.completed_at DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            data: {
                total: total[0].count,
                completed: completed[0].count,
                completionRate,
                assignTypeStats: assignTypeStats.map(item => ({
                    type: item.assign_type === 'all' ? '全员完成' : item.assign_type === 'any' ? '任意完成' : '指定成员',
                    total: item.count,
                    completed: item.completed_count,
                    rate: item.count > 0 ? Math.round((item.completed_count / item.count) * 100) : 0
                })),
                recentCompleted: formatDataTimes(recentCompleted)
            }
        });
    } catch (err) {
        logger.adminError('共享待办统计', '获取共享待办完成率失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取共享待办完成率失败'
        });
    }
};

const getMemberRoleStats = async (req, res) => {
    try {
        const roleStats = await query(`
            SELECT role, COUNT(*) as count
            FROM combo_members
            GROUP BY role
            ORDER BY FIELD(role, 'owner', 'admin', 'member')
        `);
        
        const comboMemberCounts = await query(`
            SELECT c.id, c.name, c.is_shared,
                   COUNT(cm.id) as member_count,
                   SUM(CASE WHEN cm.role = 'owner' THEN 1 ELSE 0 END) as owner_count,
                   SUM(CASE WHEN cm.role = 'admin' THEN 1 ELSE 0 END) as admin_count,
                   SUM(CASE WHEN cm.role = 'member' THEN 1 ELSE 0 END) as member_count_only
            FROM combos c
            LEFT JOIN combo_members cm ON c.id = cm.combo_id
            WHERE c.is_shared = 1
            GROUP BY c.id
            ORDER BY member_count DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            data: {
                roleDistribution: roleStats.map(item => ({
                    role: item.role === 'owner' ? '创建者' : item.role === 'admin' ? '管理员' : '成员',
                    roleKey: item.role,
                    count: item.count
                })),
                topCombos: comboMemberCounts
            }
        });
    } catch (err) {
        logger.adminError('成员角色统计', '获取成员角色统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取成员角色统计失败'
        });
    }
};

const getAssignTypeStats = async (req, res) => {
    try {
        const assignTypes = await query(`
            SELECT assign_type, COUNT(*) as count
            FROM shared_todos
            WHERE is_deleted = 0
            GROUP BY assign_type
        `);
        
        const total = assignTypes.reduce((sum, item) => sum + item.count, 0);
        
        res.json({
            success: true,
            data: {
                distribution: assignTypes.map(item => ({
                    type: item.assign_type === 'all' ? '全员完成' : item.assign_type === 'any' ? '任意完成' : '指定成员',
                    typeKey: item.assign_type,
                    count: item.count,
                    percent: total > 0 ? Math.round((item.count / total) * 100) : 0
                })),
                total
            }
        });
    } catch (err) {
        logger.adminError('分配类型统计', '获取分配类型统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取分配类型统计失败'
        });
    }
};

const getRequestApprovalRate = async (req, res) => {
    try {
        const statusStats = await query(`
            SELECT status, COUNT(*) as count
            FROM collab_requests
            GROUP BY status
        `);
        
        const total = statusStats.reduce((sum, item) => sum + item.count, 0);
        const approved = statusStats.find(s => s.status === 'approved')?.count || 0;
        const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
        
        const recentRequests = await query(`
            SELECT cr.id, cr.status, cr.created_at, cr.processed_at,
                   c.name as combo_name,
                   u.nickname as user_name,
                   pu.nickname as processed_by_name
            FROM collab_requests cr
            LEFT JOIN combos c ON cr.combo_id = c.id
            LEFT JOIN users u ON cr.user_id = u.id
            LEFT JOIN users pu ON cr.processed_by = pu.id
            ORDER BY cr.created_at DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            data: {
                statusDistribution: statusStats.map(item => ({
                    status: item.status === 'pending' ? '待审批' : item.status === 'approved' ? '已通过' : '已拒绝',
                    statusKey: item.status,
                    count: item.count
                })),
                total,
                approved,
                approvalRate,
                recentRequests: formatDataTimes(recentRequests)
            }
        });
    } catch (err) {
        logger.adminError('审批统计', '获取审批统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取审批统计失败'
        });
    }
};

const getSyncActionStats = async (req, res) => {
    try {
        const actionStats = await query(`
            SELECT action, COUNT(*) as count
            FROM sync_logs
            GROUP BY action
        `);
        
        const total = actionStats.reduce((sum, item) => sum + item.count, 0);
        
        const statusByAction = await query(`
            SELECT action, status, COUNT(*) as count
            FROM sync_logs
            GROUP BY action, status
        `);
        
        const actionLabels = {
            upload: '上传',
            download: '下载',
            merge: '合并',
            sync: '同步',
            full_sync: '全量同步'
        };
        
        res.json({
            success: true,
            data: {
                distribution: actionStats.map(item => ({
                    action: actionLabels[item.action] || item.action,
                    actionKey: item.action,
                    count: item.count,
                    percent: total > 0 ? Math.round((item.count / total) * 100) : 0
                })),
                total,
                statusByAction: statusByAction.map(item => ({
                    action: actionLabels[item.action] || item.action,
                    status: item.status,
                    count: item.count
                }))
            }
        });
    } catch (err) {
        logger.adminError('同步统计', '获取同步操作统计失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取同步操作统计失败'
        });
    }
};

const getTagCompletionAnalysis = async (req, res) => {
    try {
        const tagCompletion = await query(`
            SELECT 
                t.id, t.name, t.color, t.icon,
                COUNT(*) as total,
                SUM(CASE WHEN todo.completed != 0 THEN 1 ELSE 0 END) as completed,
                ROUND(SUM(CASE WHEN todo.completed != 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as rate
            FROM todo_tags tt
            JOIN tags t ON tt.tag_id = t.id
            JOIN todos todo ON tt.todo_id = todo.id
            WHERE todo.is_deleted = 0
            GROUP BY t.id
            HAVING total > 0
            ORDER BY rate DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            data: {
                tagCompletion: tagCompletion.map(item => ({
                    ...item,
                    rate: Math.round(item.rate)
                }))
            }
        });
    } catch (err) {
        logger.adminError('标签完成率', '获取标签完成率分析失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取标签完成率分析失败'
        });
    }
};

const getNotificationEffectAnalysis = async (req, res) => {
    try {
        const withNotify = await query(`
            SELECT 
                COUNT(DISTINCT t.id) as total,
                SUM(CASE WHEN t.completed > 0 THEN 1 ELSE 0 END) as completed
            FROM todos t
            INNER JOIN todo_notifications tn ON t.id = tn.todo_id
            WHERE t.is_deleted = 0
        `);
        
        const withoutNotify = await query(`
            SELECT 
                COUNT(DISTINCT t.id) as total,
                SUM(CASE WHEN t.completed > 0 THEN 1 ELSE 0 END) as completed
            FROM todos t
            LEFT JOIN todo_notifications tn ON t.id = tn.todo_id
            WHERE t.is_deleted = 0 AND tn.id IS NULL
        `);
        
        const withNotifyData = withNotify[0];
        const withoutNotifyData = withoutNotify[0];
        
        const withNotifyRate = withNotifyData.total > 0 
            ? Math.round((withNotifyData.completed / withNotifyData.total) * 100) 
            : 0;
        const withoutNotifyRate = withoutNotifyData.total > 0 
            ? Math.round((withoutNotifyData.completed / withoutNotifyData.total) * 100) 
            : 0;
        
        res.json({
            success: true,
            data: {
                withNotify: {
                    total: withNotifyData.total,
                    completed: withNotifyData.completed,
                    rate: withNotifyRate
                },
                withoutNotify: {
                    total: withoutNotifyData.total,
                    completed: withoutNotifyData.completed,
                    rate: withoutNotifyRate
                },
                difference: withNotifyRate - withoutNotifyRate
            }
        });
    } catch (err) {
        logger.adminError('通知效果', '获取通知效果分析失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取通知效果分析失败'
        });
    }
};

const getTodoDetail = async (req, res) => {
    try {
        const { todoId } = req.params;
        const userId = req.query.userId || req.user.id;

        const todos = await query(
            'SELECT * FROM todos WHERE (todo_id = ? OR id = ?) AND user_id = ? AND is_deleted = 0',
            [todoId, todoId, userId]
        );

        if (todos.length === 0) {
            return res.status(404).json({
                success: false,
                message: '待办不存在'
            });
        }

        const todo = todos[0];

        // 获取子任务
        const subtasks = await query(
            'SELECT * FROM todos WHERE parent_id = ? AND user_id = ? AND is_deleted = 0 ORDER BY created_at ASC',
            [todo.todo_id, userId]
        );

        // 获取组合信息
        let combo = null;
        if (todo.combo_id) {
            const combos = await query(
                'SELECT id, name, icon, color, is_shared FROM combos WHERE id = ?',
                [todo.combo_id]
            );
            combo = combos.length > 0 ? combos[0] : null;
        }

        // 获取创建者信息
        const users = await query(
            'SELECT id, nickname, avatar_url FROM users WHERE id = ?',
            [userId]
        );
        const creator = users.length > 0 ? users[0] : null;

        res.json({
            success: true,
            data: formatItemTimes({
                todo,
                subtasks,
                combo,
                creator
            })
        });
    } catch (err) {
        logger.adminError('待办详情', '获取管理员待办详情失败', { todoId, userId, error: err.message });
        res.status(500).json({
            success: false,
            message: '获取待办详情失败'
        });
    }
};

const updateUserBadges = async (req, res) => {
    try {
        const { id } = req.params;
        const { badgeTitles, badgeColors } = req.body;

        if (!Array.isArray(badgeTitles) || !Array.isArray(badgeColors)) {
            return res.status(400).json({
                success: false,
                message: 'badgeTitles 和 badgeColors 必须是数组'
            });
        }

        if (badgeTitles.length !== badgeColors.length) {
            return res.status(400).json({
                success: false,
                message: '称号与颜色数量不匹配'
            });
        }

        // 验证每个颜色为有效 hex 值
        for (const color of badgeColors) {
            if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
                return res.status(400).json({
                    success: false,
                    message: `无效颜色值: ${color}，需为 #RRGGBB 格式`
                });
            }
        }

        await query(
            'UPDATE users SET badge_titles = ?, badge_colors = ?, updated_at = NOW() WHERE id = ?',
            [JSON.stringify(badgeTitles), JSON.stringify(badgeColors), id]
        );

        logger.adminInfo('更新徽标', '管理员修改用户徽标', { userId: id, titles: badgeTitles });

        res.json({
            success: true,
            message: '徽标更新成功'
        });
    } catch (err) {
        logger.adminError('更新徽标', '更新用户徽标失败', { userId: id, error: err.message });
        res.status(500).json({
            success: false,
            message: '更新用户徽标失败'
        });
    }
};

module.exports = {
    getStats,
    getStatDetail,
    getUsers,
    getUserDetail,
    updateUserLimits,
    getNotices,
    createNotice,
    updateNotice,
    deleteNotice,
    getChangelog,
    createChangelog,
    updateChangelog,
    deleteChangelog,
    getTables,
    getTableData,
    getAdminConfig,
    updateAdminConfig,
    getAdminIds,
    deleteComment,
    getComments,
    getRetentionStats,
    getTagUsageStats,
    getNotificationRateStats,
    getUserTodoDistribution,
    getTodoHourlyStats,
    getSharedTodoCompletion,
    getMemberRoleStats,
    getAssignTypeStats,
    getRequestApprovalRate,
    getSyncActionStats,
    getTagCompletionAnalysis,
    getNotificationEffectAnalysis,
    updateUserNickname,
    updateUserBadges,
    getTodoDetail
};
