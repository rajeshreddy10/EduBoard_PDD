const express = require('express');
const router = express.Router();

const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  try {
    const snapshot = await db.db.collection('whiteboards').where('owner_id', '==', req.user.id).get();
    const whiteboards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(whiteboards);
  } catch (err) {
    const snapshot = await db.db.collection('whiteboards').get();
    const whiteboards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(whiteboards);
  }
}));


router.get('/shared', authenticate, asyncHandler(async (req, res) => {
  const whiteboards = await db.query(
    `SELECT w.*, u.full_name as owner_name FROM whiteboards w
     INNER JOIN whiteboard_collaborators wc ON w.id = wc.whiteboard_id
     LEFT JOIN users u ON w.owner_id = u.id
     WHERE wc.user_id = ? ORDER BY w.last_edited_at DESC`,
    [req.user.id]
  );
  res.json(whiteboards);
}));

router.get('/public', asyncHandler(async (req, res) => {
  const whiteboards = await db.query(
    `SELECT w.*, u.full_name as owner_name FROM whiteboards w
     LEFT JOIN users u ON w.owner_id = u.id WHERE w.is_public = TRUE
     ORDER BY w.last_edited_at DESC LIMIT 50`
  );
  res.json(whiteboards);
}));

// GET /:id (Native Firestore SDK)
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const boardDoc = await db.db.collection('whiteboards').doc(req.params.id).get();
  if (!boardDoc.exists) return res.status(404).json({ error: 'Whiteboard not found' });
  const boardData = boardDoc.data();

  // Get shapes from Firestore subcollection or top-level shapes collection
  const shapesSnap = await db.db.collection('whiteboards').doc(req.params.id).collection('shapes').get();
  const shapes = shapesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Get collaborators
  const collabSnap = await db.db.collection('whiteboards').doc(req.params.id).collection('collaborators').get();
  const collaborators = collabSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  res.json({ id: boardDoc.id, ...boardData, shapes, collaborators });
}));

// POST / (Native Firestore SDK)
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { title, description, background_color, width, height } = req.body;
  const id = uuidv4();
  const payload = {
    id,
    title: title || 'Untitled Board',
    description: description || '',
    owner_id: req.user.id,
    background_color: background_color || '#ffffff',
    width: width || 1920,
    height: height || 1080,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.db.collection('whiteboards').doc(id).set(payload);
  await db.db.collection('whiteboards').doc(id).collection('layers').doc(uuidv4()).set({
    name: 'Layer 1',
    z_index: 0
  });

  res.status(201).json({ id, message: 'Whiteboard created' });
}));

// PUT /:id (Native Firestore SDK)
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { title, description, background_color, background_image, is_public, allow_comments, allow_export } = req.body;
  const updates = {
    last_edited_by: req.user.id,
    updated_at: new Date().toISOString()
  };

  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (background_color !== undefined) updates.background_color = background_color;
  if (background_image !== undefined) updates.background_image = background_image;
  if (is_public !== undefined) updates.is_public = is_public;
  if (allow_comments !== undefined) updates.allow_comments = allow_comments;
  if (allow_export !== undefined) updates.allow_export = allow_export;

  await db.db.collection('whiteboards').doc(req.params.id).set(updates, { merge: true });
  res.json({ message: 'Whiteboard updated' });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM shapes WHERE whiteboard_id = ?', [req.params.id]);
  await db.query('DELETE FROM whiteboard_collaborators WHERE whiteboard_id = ?', [req.params.id]);
  await db.query('DELETE FROM whiteboards WHERE id = ?', [req.params.id]);
  res.json({ message: 'Whiteboard deleted' });
}));

router.post('/:id/share', authenticate, asyncHandler(async (req, res) => {
  const shareLink = uuidv4().slice(0, 8);
  const accessCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  await db.query('UPDATE whiteboards SET share_link = ?, access_code = ? WHERE id = ?', [shareLink, accessCode, req.params.id]);
  res.json({ shareLink, accessCode });
}));

router.post('/:id/duplicate', authenticate, asyncHandler(async (req, res) => {
  const original = await db.query('SELECT * FROM whiteboards WHERE id = ?', [req.params.id]);
  if (original.length === 0) return res.status(404).json({ error: 'Whiteboard not found' });
  const newId = uuidv4();
  const w = original[0];
  await db.query(
    'INSERT INTO whiteboards (id, title, description, owner_id, background_color, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [newId, `${w.title} (Copy)`, w.description, req.user.id, w.background_color, w.width, w.height]
  );
  const shapes = await db.query('SELECT * FROM shapes WHERE whiteboard_id = ?', [req.params.id]);
  for (const s of shapes) {
    const shapeId = uuidv4();
    await db.query(
      'INSERT INTO shapes (id, whiteboard_id, type, data, style, z_index, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shapeId, newId, s.type, JSON.stringify(s.data), JSON.stringify(s.style), s.z_index, req.user.id]
    );
  }
  res.status(201).json({ id: newId, message: 'Whiteboard duplicated' });
}));

// POST /:id/shapes (Native Firestore SDK)
router.post('/:id/shapes', authenticate, asyncHandler(async (req, res) => {
  const { type, data, style, z_index } = req.body;
  const id = uuidv4();
  const shapeData = {
    id,
    type,
    data: data || {},
    style: style || {},
    z_index: z_index || 0,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };

  await db.db.collection('whiteboards').doc(req.params.id).collection('shapes').doc(id).set(shapeData);
  res.status(201).json({ id });
}));

router.put('/:id/shapes/:shapeId', authenticate, asyncHandler(async (req, res) => {
  const { data, style, z_index, opacity, rotation, is_locked, is_hidden } = req.body;
  const updates = []; const params = [];
  if (data !== undefined) { updates.push('data = ?'); params.push(JSON.stringify(data)); }
  if (style !== undefined) { updates.push('style = ?'); params.push(JSON.stringify(style)); }
  if (z_index !== undefined) { updates.push('z_index = ?'); params.push(z_index); }
  if (opacity !== undefined) { updates.push('opacity = ?'); params.push(opacity); }
  if (rotation !== undefined) { updates.push('rotation = ?'); params.push(rotation); }
  if (is_locked !== undefined) { updates.push('is_locked = ?'); params.push(is_locked); }
  if (is_hidden !== undefined) { updates.push('is_hidden = ?'); params.push(is_hidden); }
  if (updates.length > 0) {
    params.push(req.params.shapeId);
    await db.query(`UPDATE shapes SET ${updates.join(', ')} WHERE id = ?`, params);
    await db.query('UPDATE whiteboards SET last_edited_by = ? WHERE id = ?', [req.user.id, req.params.id]);
  }
  res.json({ message: 'Shape updated' });
}));

router.delete('/:id/shapes/:shapeId', authenticate, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM shapes WHERE id = ? AND whiteboard_id = ?', [req.params.shapeId, req.params.id]);
  await db.query('UPDATE whiteboards SET total_shapes = GREATEST(0, total_shapes - 1), last_edited_by = ? WHERE id = ?', [req.user.id, req.params.id]);
  res.json({ message: 'Shape deleted' });
}));

router.post('/:id/versions', authenticate, asyncHandler(async (req, res) => {
  const shapes = await db.query('SELECT * FROM shapes WHERE whiteboard_id = ? ORDER BY z_index ASC', [req.params.id]);
  const versionResult = await db.query('SELECT MAX(version_number) as maxVer FROM whiteboard_versions WHERE whiteboard_id = ?', [req.params.id]);
  const versionNumber = (versionResult[0]?.maxVer || 0) + 1;
  const id = uuidv4();
  await db.query(
    'INSERT INTO whiteboard_versions (id, whiteboard_id, version_number, snapshot, created_by, description) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.params.id, versionNumber, JSON.stringify(shapes), req.user.id, req.body.description || `Version ${versionNumber}`]
  );
  await db.query('UPDATE whiteboards SET total_versions = total_versions + 1 WHERE id = ?', [req.params.id]);
  res.status(201).json({ id, versionNumber });
}));

router.get('/:id/versions', authenticate, asyncHandler(async (req, res) => {
  const versions = await db.query(
    'SELECT id, version_number, created_by, description, created_at FROM whiteboard_versions WHERE whiteboard_id = ? ORDER BY version_number DESC',
    [req.params.id]
  );
  res.json(versions);
}));

router.post('/:id/restore/:versionId', authenticate, asyncHandler(async (req, res) => {
  const versions = await db.query('SELECT * FROM whiteboard_versions WHERE id = ? AND whiteboard_id = ?', [req.params.versionId, req.params.id]);
  if (versions.length === 0) return res.status(404).json({ error: 'Version not found' });
  const snapshot = typeof versions[0].snapshot === 'string' ? JSON.parse(versions[0].snapshot) : versions[0].snapshot;
  await db.query('DELETE FROM shapes WHERE whiteboard_id = ?', [req.params.id]);
  for (const s of snapshot) {
    await db.query(
      'INSERT INTO shapes (id, whiteboard_id, type, data, style, z_index, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, req.params.id, s.type, JSON.stringify(s.data), JSON.stringify(s.style), s.z_index, req.user.id]
    );
  }
  await db.query('UPDATE whiteboards SET last_edited_by = ? WHERE id = ?', [req.user.id, req.params.id]);
  res.json({ message: 'Version restored' });
}));

module.exports = router;
