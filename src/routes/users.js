const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const users = await db.query(
    'SELECT id, email, full_name, avatar_url, role, status, last_login_at, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(users);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const users = await db.query(
    'SELECT id, email, full_name, avatar_url, role, status, email_verified, last_login_at, created_at FROM users WHERE id = ?',
    [req.params.id]
  );
  if (users.length === 0) return res.status(404).json({ error: 'User not found' });
  const boardCount = await db.query('SELECT COUNT(*) as count FROM whiteboards WHERE owner_id = ?', [req.params.id]);
  const collaboratorCount = await db.query('SELECT COUNT(*) as count FROM whiteboard_collaborators WHERE user_id = ?', [req.params.id]);
  res.json({ ...users[0], boardCount: boardCount[0]?.count || 0, collaboratorCount: collaboratorCount[0]?.count || 0 });
}));

router.put('/:id/role', requireRole('admin'), asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ['admin', 'teacher', 'student', 'viewer'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ message: 'Role updated' });
}));

router.put('/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['active', 'suspended', 'inactive'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ message: 'Status updated' });
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted' });
}));

module.exports = router;
