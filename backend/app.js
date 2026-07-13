require('dotenv').config();
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const todoRoutes = require('./routes/todoRoutes');
const tagRoutes = require('./routes/tagRoutes');
const comboRoutes = require('./routes/comboRoutes');
const collabRoutes = require('./routes/collabRoutes');
const notifyRoutes = require('./routes/notifyRoutes');
const configRoutes = require('./routes/configRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const commentRoutes = require('./routes/commentRoutes');
const shareRoutes = require('./routes/shareRoutes');
const logRoutes = require('./routes/logRoutes');
const postsRoutes = require('./routes/postsRoutes');
const likesRoutes = require('./routes/likesRoutes');
const postCommentsRoutes = require('./routes/postCommentsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const userRoutes = require('./routes/userRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const workReportRoutes = require('./routes/workReportRoutes');
const pollRoutes = require('./routes/pollRoutes');
const shareController = require('./controllers/shareController');
const { authMiddleware, optionalAuth } = require('./middleware/auth');
const { startNotificationScheduler } = require('./services/wechatService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '时光绿径待办 API 服务运行中',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/auth', authRoutes);
app.use('/todos', todoRoutes);
app.use('/tags', tagRoutes);
app.use('/combos', comboRoutes);
app.use('/collab', collabRoutes);
app.use('/notify', notifyRoutes);
app.use('/config', configRoutes);
app.use('/upload', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/comments', commentRoutes);
app.use('/share', shareRoutes);
app.use('/log', logRoutes);
app.use('/posts', postsRoutes);
app.use('/likes', likesRoutes);
app.use('/post-comments', postCommentsRoutes);
app.use('/reports', reportsRoutes);
app.use('/users', userRoutes);
app.use('/checkin', checkinRoutes);
app.use('/work-reports', workReportRoutes);
app.use('/posts', pollRoutes);

app.post('/share/snapshot/verify-password/:shareId', optionalAuth, shareController.verifyPassword);
app.post('/share/snapshot/record-add/:shareId', optionalAuth, shareController.recordAddAction);
app.get('/share/snapshot/visitors/:shareId', authMiddleware, shareController.getVisitors);

app.use((err, req, res, next) => {
  logger.systemError('全局错误处理', err.message, { stack: err.stack });
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

app.use((req, res) => {
  logger.apiWarn('404', '接口不存在', { method: req.method, path: req.path });
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

app.listen(PORT, () => {
  logger.systemInfo('服务启动', '时光绿径待办后端服务已启动', { port: PORT });
  startNotificationScheduler();
  cleanupExpiredSnapshots();
  setInterval(cleanupExpiredSnapshots, 60 * 60 * 1000);
});

async function cleanupExpiredSnapshots() {
  try {
    const { query } = require('./config/database');
    await query(
      `DELETE sv FROM share_visitors sv
       INNER JOIN share_snapshots ss ON sv.share_id = ss.share_id
       WHERE ss.expires_at < NOW()`
    );
    await query('DELETE FROM share_snapshots WHERE expires_at < NOW()');
  } catch (err) {
    logger.dbError('清理', '清理过期分享快照失败', { error: err.message });
  }
}
