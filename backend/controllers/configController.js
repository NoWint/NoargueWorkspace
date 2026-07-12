const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { query } = require('../config/database');

let cachedChangelog = null;
let cachedNotices = null;
let cachedAdmins = null;
let cachedGuides = null;

function clearCache() {
    cachedChangelog = null;
    cachedNotices = null;
    cachedAdmins = null;
    cachedGuides = null;
}

function loadChangelog() {
    try {
        const filePath = path.join(__dirname, '../data/changelog.json');
        const data = fs.readFileSync(filePath, 'utf8');
        cachedChangelog = JSON.parse(data);
        return cachedChangelog;
    } catch (err) {
        logger.error('CONFIG', '读取', '读取changelog.json失败', { error: err.message });
        return [];
    }
}

function loadNotices() {
    try {
        const filePath = path.join(__dirname, '../data/notices.json');
        const data = fs.readFileSync(filePath, 'utf8');
        cachedNotices = JSON.parse(data);
        return cachedNotices;
    } catch (err) {
        logger.error('CONFIG', '读取', '读取notices.json失败', { error: err.message });
        return [];
    }
}

function loadAdmins() {
    if (cachedAdmins) return cachedAdmins;
    try {
        const filePath = path.join(__dirname, '../data/admins.json');
        const data = fs.readFileSync(filePath, 'utf8');
        cachedAdmins = JSON.parse(data);
        return cachedAdmins;
    } catch (err) {
        logger.error('CONFIG', '读取', '读取admins.json失败', { error: err.message });
        return [];
    }
}

function loadGuides() {
    if (cachedGuides) return cachedGuides;
    try {
        const filePath = path.join(__dirname, '../data/guides.json');
        const data = fs.readFileSync(filePath, 'utf8');
        cachedGuides = JSON.parse(data);
        return cachedGuides;
    } catch (err) {
        logger.error('CONFIG', '读取', '读取guides.json失败', { error: err.message });
        return [];
    }
}

function processNotices(noticesRaw, changelogList) {
    return noticesRaw.map(notice => {
        if (notice.title && notice.content) {
            return notice;
        }
        
        if (notice.version) {
            const changelog = changelogList.find(item => item.version === notice.version);
            if (changelog) {
                return {
                    title: `${changelog.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日')}-更新公告（V${changelog.version}）`,
                    date: changelog.date,
                    content: `本次更新包含以下内容：\n${
                        changelog.content
                            .map((item, index) => `${index + 1}、${item}`)
                            .join('\n')
                    }\n\n历史更新请前往 "更多"->"更新日志" 查看。\n有问题欢迎在 右上角"···"->"反馈与投诉" 说明，谢谢！`
                };
            }
        }
        
        return null;
    }).filter(Boolean);
}

const getChangelog = (req, res) => {
    res.json({
        success: true,
        changelogList: loadChangelog()
    });
};

const getNotices = (req, res) => {
    const changelogList = loadChangelog();
    const noticesRaw = loadNotices();
    const notices = processNotices(noticesRaw, changelogList);
    
    res.json({
        success: true,
        notices
    });
};

const getAppConfig = (req, res) => {
    const changelogList = loadChangelog();
    const noticesRaw = loadNotices();
    const notices = processNotices(noticesRaw, changelogList);
    
    res.json({
        success: true,
        changelogList,
        notices
    });
};

const getGuides = (req, res) => {
    const guides = loadGuides();
    res.json({
        success: true,
        guides
    });
};

const getGuideById = (req, res) => {
    const { id } = req.params;
    const guides = loadGuides();
    const guide = guides.find(g => g.id === id);
    
    if (!guide) {
        return res.status(404).json({
            success: false,
            message: '指南不存在'
        });
    }
    
    res.json({
        success: true,
        guide
    });
};

const getPublicStats = async (req, res) => {
    try {
        const userCount = await query('SELECT COUNT(*) as count FROM users');
        const todoCount = await query('SELECT COUNT(*) as count FROM todos WHERE is_deleted = 0');
        const completedTodoCount = await query('SELECT COUNT(*) as count FROM todos WHERE completed > 0 AND is_deleted = 0');
        const comboCount = await query('SELECT COUNT(*) as count FROM combos');
        const sharedComboCount = await query('SELECT COUNT(*) as count FROM combos WHERE is_shared = 1');
        const sharedTodoCount = await query('SELECT COUNT(*) as count FROM shared_todos WHERE is_deleted = 0');
        const memberCount = await query('SELECT COUNT(*) as count FROM combo_members');
        const commentCount = await query('SELECT COUNT(*) as count FROM shared_todo_comments WHERE is_deleted = 0');
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayNewUsers = await query('SELECT COUNT(*) as count FROM users WHERE created_at >= ?', [todayStart]);
        const todayNewTodos = await query('SELECT COUNT(*) as count FROM todos WHERE created_at >= ? AND is_deleted = 0', [todayStart]);
        
        const totalTodos = todoCount[0].count || 0;
        const completedTodos = completedTodoCount[0].count || 0;
        const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers7Days = await query('SELECT COUNT(DISTINCT user_id) as count FROM sync_logs WHERE created_at >= ?', [sevenDaysAgo]);
        
        const changelogList = loadChangelog();
        const latestVersion = changelogList.length > 0 ? changelogList[0].version : '1.0.0';
        
        res.json({
            success: true,
            stats: {
                userCount: userCount[0].count,
                todoCount: totalTodos,
                completedTodoCount: completedTodos,
                completionRate: completionRate,
                comboCount: comboCount[0].count,
                sharedComboCount: sharedComboCount[0].count,
                sharedTodoCount: sharedTodoCount[0].count,
                memberCount: memberCount[0].count,
                commentCount: commentCount[0].count,
                todayNewUsers: todayNewUsers[0].count,
                todayNewTodos: todayNewTodos[0].count,
                activeUsers7Days: activeUsers7Days[0].count,
                latestVersion: latestVersion
            }
        });
    } catch (err) {
        logger.error('CONFIG', '公开统计', '获取公开统计数据失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取统计数据失败'
        });
    }
};

const getPublicTags = async (req, res) => {
    try {
        const tags = await query(`
            SELECT t.id, t.name, t.color, t.icon, t.is_system,
                   COUNT(tt.todo_id) as usage_count
            FROM tags t
            LEFT JOIN todo_tags tt ON t.id = tt.tag_id
            LEFT JOIN todos todo ON tt.todo_id = todo.id AND todo.is_deleted = 0
            GROUP BY t.id
            ORDER BY usage_count DESC
            LIMIT 50
        `);
        
        res.json({
            success: true,
            tags: tags.map(tag => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
                icon: tag.icon,
                isSystem: tag.is_system === 1,
                usageCount: tag.usage_count
            }))
        });
    } catch (err) {
        logger.error('CONFIG', '公开标签', '获取公开标签失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取标签失败'
        });
    }
};

const getPublicUsers = async (req, res) => {
    try {
        const { page = 1, pageSize = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);
        
        const users = await query(`
            SELECT id, nickname, avatar_url, created_at,
                   (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND is_deleted = 0) as todo_count
            FROM users u
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        const total = await query('SELECT COUNT(*) as count FROM users');
        
        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                nickname: user.nickname || '时光绿径用户',
                avatarUrl: user.avatar_url || null,
                createdAt: user.created_at,
                todoCount: user.todo_count || 0
            })),
            total: total[0].count,
            page: parseInt(page),
            pageSize: limit
        });
    } catch (err) {
        logger.error('CONFIG', '公开用户', '获取公开用户列表失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取用户列表失败'
        });
    }
};

const getPublicHourlyStats = async (req, res) => {
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
        
        const peakHours = result.filter(h => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
        const totalTodos = result.reduce((sum, h) => sum + h.count, 0);
        const avgPerHour = totalTodos > 0 ? Math.round(totalTodos / 24) : 0;
        
        res.json({
            success: true,
            data: {
                hourlyDistribution: result,
                peakHours: peakHours.map(h => ({
                    hour: h.hour,
                    hourLabel: h.hourLabel,
                    count: h.count
                })),
                totalTodos,
                avgPerHour,
                period: '最近 7 天'
            }
        });
    } catch (err) {
        logger.error('CONFIG', '时段统计', '获取时段分布失败', { error: err.message });
        res.status(500).json({
            success: false,
            message: '获取时段分布失败'
        });
    }
};

module.exports = {
    getChangelog,
    getNotices,
    getAppConfig,
    loadAdmins,
    clearCache,
    getGuides,
    getGuideById,
    getPublicStats,
    getPublicTags,
    getPublicUsers,
    getPublicHourlyStats
};
