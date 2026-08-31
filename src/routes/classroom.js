const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/classrooms — list user's classrooms
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM classroom_members cm WHERE cm.classroom_id = c.id AND cm.status = 'active') as student_count
       FROM classrooms c
       WHERE c.teacher_id = ? OR c.id IN (SELECT classroom_id FROM classroom_members WHERE user_id = ?)
       ORDER BY c.created_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ classrooms: rows });
  } catch (err) {
    // Offline fallback
    res.json({ classrooms: [] });
  }
});

// POST /api/classrooms — create classroom (teacher only)
router.post('/', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  const { name, subject, description, maxStudents, settings } = req.body;
  if (!name) return res.status(400).json({ error: 'Classroom name is required' });

  const id = uuidv4();
  const code = `${(subject || 'CLASS').toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  try {
    await db.query(
      `INSERT INTO classrooms (id, name, code, subject, description, teacher_id, max_students, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, name, code, subject || null, description || null, req.user.id, maxStudents || 30, JSON.stringify(settings || {})]
    );
    res.status(201).json({ id, name, code, subject, teacherId: req.user.id });
  } catch (err) {
    res.status(201).json({ id, name, code, subject, teacherId: req.user.id, offline: true });
  }
});

// GET /api/classrooms/:id — get classroom details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [classroom] = await db.query('SELECT * FROM classrooms WHERE id = ?', [req.params.id]);
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    const members = await db.query(
      `SELECT cm.*, u.name, u.email, u.avatar FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id WHERE cm.classroom_id = ?`, [req.params.id]
    );
    res.json({ ...classroom, members });
  } catch (err) {
    res.json({ id: req.params.id, name: 'Demo Classroom', members: [], offline: true });
  }
});

// POST /api/classrooms/join — join by code
router.post('/join', authenticate, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Classroom code required' });
  try {
    const [classroom] = await db.query('SELECT * FROM classrooms WHERE code = ?', [code.toUpperCase()]);
    if (!classroom) return res.status(404).json({ error: 'Invalid classroom code' });
    await db.query(
      `INSERT IGNORE INTO classroom_members (id, classroom_id, user_id, role, status, joined_at)
       VALUES (?, ?, ?, 'student', 'active', NOW())`,
      [uuidv4(), classroom.id, req.user.id]
    );
    res.json({ classroom, joined: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not join classroom', offline: true });
  }
});

// POST /api/classrooms/:id/start — start live session
router.post('/:id/start', authenticate, requireRole(['teacher', 'school_admin']), async (req, res) => {
  try {
    await db.query('UPDATE classrooms SET is_live = 1, started_at = NOW() WHERE id = ?', [req.params.id]);
    const io = req.app.get('io');
    io?.to(`classroom:${req.params.id}`).emit('session:started', { classroomId: req.params.id });
    res.json({ started: true });
  } catch (err) {
    res.json({ started: true, offline: true });
  }
});

// POST /api/classrooms/:id/end — end live session
router.post('/:id/end', authenticate, requireRole(['teacher', 'school_admin']), async (req, res) => {
  try {
    await db.query('UPDATE classrooms SET is_live = 0, ended_at = NOW() WHERE id = ?', [req.params.id]);
    const io = req.app.get('io');
    io?.to(`classroom:${req.params.id}`).emit('session:ended', { classroomId: req.params.id });
    res.json({ ended: true });
  } catch (err) {
    res.json({ ended: true, offline: true });
  }
});

// GET /api/classrooms/:id/members
router.get('/:id/members', authenticate, async (req, res) => {
  try {
    const members = await db.query(
      `SELECT cm.*, u.name, u.email, u.avatar, u.role FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id WHERE cm.classroom_id = ? ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ members });
  } catch (err) {
    res.json({ members: [] });
  }
});

// DELETE /api/classrooms/:id — delete classroom
router.delete('/:id', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  try {
    await db.query('DELETE FROM classrooms WHERE id = ? AND teacher_id = ?', [req.params.id, req.user.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.json({ deleted: true, offline: true });
  }
});

module.exports = router;
