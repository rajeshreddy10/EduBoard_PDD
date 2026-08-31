const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');

router.get('/overview', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [boardCount, shapeCount, collaboratorCount, aiCount, gestureCount, recentBoards, activity] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM whiteboards WHERE owner_id = ?', [userId]),
    db.query('SELECT COUNT(*) as count FROM shapes s INNER JOIN whiteboards w ON s.whiteboard_id = w.id WHERE w.owner_id = ?', [userId]),
    db.query('SELECT COUNT(DISTINCT wc.user_id) as count FROM whiteboard_collaborators wc INNER JOIN whiteboards w ON wc.whiteboard_id = w.id WHERE w.owner_id = ?', [userId]),
    db.query('SELECT COUNT(*) as count FROM ai_interactions WHERE user_id = ?', [userId]),
    db.query('SELECT COUNT(*) as count FROM gesture_logs WHERE user_id = ?', [userId]),
    db.query('SELECT id, title, last_edited_at FROM whiteboards WHERE owner_id = ? ORDER BY last_edited_at DESC LIMIT 5', [userId]),
    db.query('SELECT DATE(created_at) as date, COUNT(*) as count FROM analytics_events WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date', [userId])
  ]);
  res.json({
    boardCount: boardCount[0]?.count || 0,
    shapeCount: shapeCount[0]?.count || 0,
    collaboratorCount: collaboratorCount[0]?.count || 0,
    aiInteractions: aiCount[0]?.count || 0,
    gestureCount: gestureCount[0]?.count || 0,
    recentBoards,
    activity
  });
}));

router.get('/boards', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await db.query(
    `SELECT DATE(w.created_at) as date, COUNT(*) as boards_created,
     SUM(w.total_shapes) as total_shapes
     FROM whiteboards w WHERE w.owner_id = ?
     AND w.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(w.created_at) ORDER BY date`,
    [userId]
  );
  res.json(stats);
}));

router.get('/ai', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { range = '7d' } = req.query;
  const intervals = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
  const days = intervals[range] || 7;
  const interactions = await db.query(
    `SELECT interaction_type, COUNT(*) as count, AVG(confidence_score) as avg_confidence,
     AVG(processing_time_ms) as avg_time, SUM(tokens_used) as total_tokens
     FROM ai_interactions WHERE user_id = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY interaction_type ORDER BY count DESC`,
    [userId, days]
  );
  const daily = await db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM ai_interactions WHERE user_id = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at) ORDER BY date`,
    [userId, days]
  );
  res.json({ interactions, daily });
}));

router.get('/gestures', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { range = '7d' } = req.query;
  const days = { '24h': 1, '7d': 7, '30d': 30 }[range] || 7;
  const gestures = await db.query(
    `SELECT gesture_type, COUNT(*) as count, AVG(confidence) as avg_confidence, AVG(fps) as avg_fps
     FROM gesture_logs WHERE user_id = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY gesture_type ORDER BY count DESC`,
    [userId, days]
  );
  const timeline = await db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count, AVG(fps) as avg_fps
     FROM gesture_logs WHERE user_id = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at) ORDER BY date`,
    [userId, days]
  );
  res.json({ gestures, timeline });
}));

router.get('/export', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const exports = await db.query(
    `SELECT format, COUNT(*) as count, SUM(file_size) as total_size
     FROM exports WHERE user_id = ?
     GROUP BY format ORDER BY count DESC`,
    [userId]
  );
  res.json(exports);
}));

router.get('/collaboration', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const rooms = await db.query(
    `SELECT cr.*, COUNT(ce.id) as event_count
     FROM collaboration_rooms cr
     INNER JOIN whiteboard_collaborators wc ON cr.whiteboard_id = wc.whiteboard_id
     LEFT JOIN collaboration_events ce ON cr.id = ce.room_id
     WHERE wc.user_id = ? GROUP BY cr.id`,
    [userId]
  );
  res.json(rooms);
}));

router.get('/users', requireRole('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const users = await db.query(
    `SELECT id, email, full_name, role, status, last_login_at, created_at,
     (SELECT COUNT(*) FROM whiteboards WHERE owner_id = u.id) as board_count
     FROM users u ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [parseInt(limit), parseInt(offset)]
  );
  const total = await db.query('SELECT COUNT(*) as count FROM users');
  res.json({ users, total: total[0]?.count || 0, page: parseInt(page) });
}));

router.post('/track', authenticate, asyncHandler(async (req, res) => {
  const { eventType, eventData, whiteboardId, sessionDuration } = req.body;
  await db.query(
    'INSERT INTO analytics_events (user_id, whiteboard_id, event_type, event_data, session_duration) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, whiteboardId || null, eventType, JSON.stringify(eventData || {}), sessionDuration || 0]
  );
  res.json({ message: 'Event tracked' });
}));

module.exports = router;
