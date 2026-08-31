const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');

router.post('/log', authenticate, asyncHandler(async (req, res) => {
  const { gestureType, confidence, landmarks, handUsed, fps, brightness, sessionId } = req.body;
  await db.query(
    'INSERT INTO gesture_logs (user_id, gesture_type, confidence, landmarks, hand_used, fps, brightness, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, gestureType, confidence || 0, JSON.stringify(landmarks || {}), handUsed || 'right', fps || 0, brightness || 0, sessionId || null]
  );
  res.json({ message: 'Gesture logged' });
}));

router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const { range = '7d' } = req.query;
  const days = { '24h': 1, '7d': 7, '30d': 30 }[range] || 7;
  const stats = await db.query(
    `SELECT gesture_type, COUNT(*) as count, AVG(confidence) as avg_confidence, AVG(fps) as avg_fps
     FROM gesture_logs WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY gesture_type ORDER BY count DESC`,
    [req.user.id, days]
  );
  const timeline = await db.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count, AVG(fps) as avg_fps
     FROM gesture_logs WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY DATE(created_at) ORDER BY date`,
    [req.user.id, days]
  );
  res.json({ stats, timeline });
}));

module.exports = router;
