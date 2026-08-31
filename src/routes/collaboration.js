const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

router.get('/rooms', authenticate, asyncHandler(async (req, res) => {
  const rooms = await db.query(
    `SELECT cr.*, w.title as whiteboard_title FROM collaboration_rooms cr
     LEFT JOIN whiteboards w ON cr.whiteboard_id = w.id
     WHERE cr.is_active = TRUE ORDER BY cr.created_at DESC`
  );
  res.json(rooms);
}));

router.post('/rooms', authenticate, asyncHandler(async (req, res) => {
  const { whiteboardId, name } = req.body;
  const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const id = uuidv4();
  await db.query(
    'INSERT INTO collaboration_rooms (id, whiteboard_id, name, room_code) VALUES (?, ?, ?, ?)',
    [id, whiteboardId, name || 'Collaboration Room', roomCode]
  );
  res.status(201).json({ id, roomCode });
}));

// POST /rooms/join (Native Firestore SDK)
router.post('/rooms/join', authenticate, asyncHandler(async (req, res) => {
  const { roomCode } = req.body;
  if (!roomCode) return res.status(400).json({ error: 'Room code required' });

  const snapshot = await db.db.collection('classrooms').where('code', '==', roomCode.toUpperCase().trim()).get();
  let room = null;
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    room = { id: doc.id, ...doc.data(), whiteboard_id: doc.id };
  } else {
    // Check collaboration_rooms collection fallback
    const colSnap = await db.db.collection('collaboration_rooms').where('room_code', '==', roomCode.toUpperCase().trim()).get();
    if (colSnap.empty) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }
    const doc = colSnap.docs[0];
    room = { id: doc.id, ...doc.data() };
  }

  const collabRef = db.db.collection('whiteboards').doc(room.whiteboard_id || room.id).collection('collaborators').doc(req.user.id);
  await collabRef.set({
    user_id: req.user.id,
    permission: 'edit',
    is_online: true,
    last_active_at: new Date().toISOString()
  }, { merge: true });

  res.json({ roomId: room.id, whiteboardId: room.whiteboard_id || room.id });
}));

// GET /room/:id/participants (Native Firestore SDK)
router.get('/room/:id/participants', authenticate, asyncHandler(async (req, res) => {
  const collabSnap = await db.db.collection('whiteboards').doc(req.params.id).collection('collaborators').get();
  const participants = collabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json(participants);
}));

router.get('/:whiteboardId/comments', authenticate, asyncHandler(async (req, res) => {
  const comments = await db.query(
    `SELECT c.*, u.full_name, u.avatar_url FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.whiteboard_id = ? ORDER BY c.created_at ASC`,
    [req.params.whiteboardId]
  );
  res.json(comments);
}));

router.post('/:whiteboardId/comments', authenticate, asyncHandler(async (req, res) => {
  const { content, shapeId, parentId } = req.body;
  const id = uuidv4();
  await db.query(
    'INSERT INTO comments (id, whiteboard_id, user_id, shape_id, parent_id, content) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.params.whiteboardId, req.user.id, shapeId || null, parentId || null, content]
  );
  const comment = await db.query(
    `SELECT c.*, u.full_name, u.avatar_url FROM comments c
     LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
    [id]
  );
  res.status(201).json(comment[0]);
}));

router.put('/comments/:id/resolve', authenticate, asyncHandler(async (req, res) => {
  await db.query('UPDATE comments SET resolved = TRUE, resolved_by = ? WHERE id = ?', [req.user.id, req.params.id]);
  res.json({ message: 'Comment resolved' });
}));

router.put('/comments/:id/pin', authenticate, asyncHandler(async (req, res) => {
  const comment = await db.query('SELECT pinned FROM comments WHERE id = ?', [req.params.id]);
  if (comment.length > 0) {
    await db.query('UPDATE comments SET pinned = ? WHERE id = ?', [!comment[0].pinned, req.params.id]);
  }
  res.json({ message: 'Comment pinned status toggled' });
}));

module.exports = router;
