const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/polling/:classroomId — list polls
router.get('/:classroomId', authenticate, async (req, res) => {
  try {
    const polls = await db.query(
      'SELECT * FROM polls WHERE classroom_id = ? ORDER BY created_at DESC',
      [req.params.classroomId]
    );
    res.json({ polls });
  } catch { res.json({ polls: [] }); }
});

// POST /api/polling — create poll
router.post('/', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  const { classroomId, question, options, type, isAnonymous, expiresAt } = req.body;
  if (!question || !options?.length) return res.status(400).json({ error: 'Question and options required' });
  const id = uuidv4();
  const pollOptions = options.map((text, i) => ({ id: String.fromCharCode(97 + i), text, votes: 0 }));
  try {
    await db.query(
      `INSERT INTO polls (id, classroom_id, question, options, type, is_anonymous, is_active, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [id, classroomId, question, JSON.stringify(pollOptions), type || 'single', isAnonymous ? 1 : 0, expiresAt || null]
    );
    const io = req.app.get('io');
    io?.to(`classroom:${classroomId}`).emit('poll:created', { pollId: id, question, options: pollOptions });
    res.status(201).json({ id, question, options: pollOptions, isActive: true });
  } catch {
    res.status(201).json({ id, question, options: pollOptions, isActive: true, offline: true });
  }
});

// POST /api/polling/:id/vote — cast a vote
router.post('/:id/vote', authenticate, async (req, res) => {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId required' });
  try {
    // Check if already voted
    const existing = await db.query(
      'SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?', [req.params.id, req.user.id]
    );
    if (existing.length) return res.status(409).json({ error: 'Already voted' });

    await db.query(
      'INSERT INTO poll_votes (id, poll_id, option_id, user_id, voted_at) VALUES (?, ?, ?, ?, NOW())',
      [uuidv4(), req.params.id, optionId, req.user.id]
    );

    // Get updated vote counts
    const votes = await db.query(
      'SELECT option_id, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_id',
      [req.params.id]
    );
    const io = req.app.get('io');
    io?.to(`poll:${req.params.id}`).emit('poll:vote', { pollId: req.params.id, votes });
    res.json({ voted: true, votes });
  } catch {
    res.json({ voted: true, offline: true });
  }
});

// POST /api/polling/:id/close — close poll
router.post('/:id/close', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  try {
    await db.query('UPDATE polls SET is_active = 0 WHERE id = ?', [req.params.id]);
    const io = req.app.get('io');
    io?.to(`poll:${req.params.id}`).emit('poll:closed', { pollId: req.params.id });
    res.json({ closed: true });
  } catch { res.json({ closed: true, offline: true }); }
});

// GET /api/polling/:id/results — get results
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const [poll] = await db.query('SELECT * FROM polls WHERE id = ?', [req.params.id]);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    const votes = await db.query(
      'SELECT option_id, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_id',
      [req.params.id]
    );
    const totalVotes = votes.reduce((a, v) => a + v.count, 0);
    const options = JSON.parse(poll.options).map(o => ({
      ...o, votes: (votes.find(v => v.option_id === o.id)?.count || 0),
    }));
    res.json({ poll: { ...poll, options, totalVotes } });
  } catch { res.json({ poll: null }); }
});

module.exports = router;
