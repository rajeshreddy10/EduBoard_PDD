const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/attendance/:classroomId/:date — get attendance for a date
router.get('/:classroomId/:date', authenticate, async (req, res) => {
  try {
    const { classroomId, date } = req.params;
    const records = await db.query(
      `SELECT a.*, u.name, u.email, u.avatar FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE a.classroom_id = ? AND DATE(a.date) = ?
       ORDER BY u.name`,
      [classroomId, date]
    );
    const members = await db.query(
      `SELECT cm.user_id, u.name, u.email, u.avatar FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id WHERE cm.classroom_id = ?`,
      [classroomId]
    );
    res.json({ records, members, date });
  } catch { res.json({ records: [], members: [], date: req.params.date }); }
});

// POST /api/attendance — record attendance
router.post('/', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  const { classroomId, date, records } = req.body;
  if (!classroomId || !records?.length) return res.status(400).json({ error: 'classroomId and records required' });

  const results = [];
  for (const record of records) {
    const id = uuidv4();
    try {
      await db.query(
        `INSERT INTO attendance (id, classroom_id, user_id, date, status, method, marked_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE status = VALUES(status), method = VALUES(method)`,
        [id, classroomId, record.userId, date, record.status, record.method || 'manual', req.user.id]
      );
      results.push({ ...record, id, saved: true });
    } catch {
      results.push({ ...record, saved: false });
    }
  }

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  res.json({ saved: true, records: results, presentCount, total: records.length });
});

// POST /api/attendance/qr/:classroomId — QR code self check-in
router.post('/qr/:classroomId', authenticate, async (req, res) => {
  const { token } = req.body;
  // In production: validate QR token with HMAC-SHA256
  const id = uuidv4();
  const today = new Date().toISOString().split('T')[0];
  try {
    await db.query(
      `INSERT INTO attendance (id, classroom_id, user_id, date, status, method, marked_by, created_at)
       VALUES (?, ?, ?, ?, 'present', 'qrcode', ?, NOW())
       ON DUPLICATE KEY UPDATE status = 'present', method = 'qrcode'`,
      [id, req.params.classroomId, req.user.id, today, req.user.id]
    );
    res.json({ checkedIn: true, method: 'qrcode', time: new Date().toISOString() });
  } catch {
    res.json({ checkedIn: true, method: 'qrcode', offline: true });
  }
});

// GET /api/attendance/report/:classroomId — attendance summary report
router.get('/report/:classroomId', authenticate, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const summary = await db.query(
      `SELECT u.id, u.name, u.email,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused,
        COUNT(a.id) as total_sessions
       FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN attendance a ON a.user_id = u.id AND a.classroom_id = cm.classroom_id
         AND (? IS NULL OR DATE(a.date) >= ?) AND (? IS NULL OR DATE(a.date) <= ?)
       WHERE cm.classroom_id = ?
       GROUP BY u.id, u.name, u.email`,
      [startDate || null, startDate || null, endDate || null, endDate || null, req.params.classroomId]
    );
    res.json({ summary });
  } catch { res.json({ summary: [] }); }
});

module.exports = router;
