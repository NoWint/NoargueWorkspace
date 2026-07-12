const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.get('/stats', authMiddleware, isAdmin, adminController.getStats);

router.get('/stats/retention', authMiddleware, isAdmin, adminController.getRetentionStats);
router.get('/stats/tag-usage', authMiddleware, isAdmin, adminController.getTagUsageStats);
router.get('/stats/notification-rate', authMiddleware, isAdmin, adminController.getNotificationRateStats);
router.get('/stats/user-todo-distribution', authMiddleware, isAdmin, adminController.getUserTodoDistribution);
router.get('/stats/todo-hourly', authMiddleware, isAdmin, adminController.getTodoHourlyStats);
router.get('/stats/shared-todo-completion', authMiddleware, isAdmin, adminController.getSharedTodoCompletion);
router.get('/stats/member-roles', authMiddleware, isAdmin, adminController.getMemberRoleStats);
router.get('/stats/assign-types', authMiddleware, isAdmin, adminController.getAssignTypeStats);
router.get('/stats/request-rate', authMiddleware, isAdmin, adminController.getRequestApprovalRate);
router.get('/stats/sync-actions', authMiddleware, isAdmin, adminController.getSyncActionStats);
router.get('/stats/cross/tag-completion', authMiddleware, isAdmin, adminController.getTagCompletionAnalysis);
router.get('/stats/cross/notification-effect', authMiddleware, isAdmin, adminController.getNotificationEffectAnalysis);

router.get('/stats/:type', authMiddleware, isAdmin, adminController.getStatDetail);

router.get('/users', authMiddleware, isAdmin, adminController.getUsers);
router.get('/users/:id', authMiddleware, isAdmin, adminController.getUserDetail);
router.put('/users/:id/limits', authMiddleware, isAdmin, adminController.updateUserLimits);
router.put('/users/:id/nickname', authMiddleware, isAdmin, adminController.updateUserNickname);
router.put('/users/:id/badges', authMiddleware, isAdmin, adminController.updateUserBadges);

router.get('/notices', authMiddleware, isAdmin, adminController.getNotices);
router.post('/notices', authMiddleware, isAdmin, adminController.createNotice);
router.put('/notices/:index', authMiddleware, isAdmin, adminController.updateNotice);
router.delete('/notices/:index', authMiddleware, isAdmin, adminController.deleteNotice);

router.get('/updates', authMiddleware, isAdmin, adminController.getChangelog);
router.post('/updates', authMiddleware, isAdmin, adminController.createChangelog);
router.put('/updates/:index', authMiddleware, isAdmin, adminController.updateChangelog);
router.delete('/updates/:index', authMiddleware, isAdmin, adminController.deleteChangelog);

router.get('/tables', authMiddleware, isAdmin, adminController.getTables);
router.get('/tables/:tableName', authMiddleware, isAdmin, adminController.getTableData);

router.get('/config', authMiddleware, isAdmin, adminController.getAdminConfig);
router.put('/config', authMiddleware, isAdmin, adminController.updateAdminConfig);

router.get('/comments', authMiddleware, isAdmin, adminController.getComments);
router.delete('/comments/:id', authMiddleware, isAdmin, adminController.deleteComment);

router.get('/todo/:todoId', authMiddleware, isAdmin, adminController.getTodoDetail);

module.exports = router;
