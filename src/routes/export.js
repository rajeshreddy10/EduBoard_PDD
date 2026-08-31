const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const EXPORT_DIR = path.join(__dirname, '..', '..', 'exports');

router.get('/formats', (req, res) => {
  res.json({
    formats: [
      { id: 'pdf', name: 'PDF Document', icon: 'file-text', mime: 'application/pdf' },
      { id: 'png', name: 'PNG Image', icon: 'image', mime: 'image/png' },
      { id: 'svg', name: 'SVG Vector', icon: 'file-image', mime: 'image/svg+xml' },
      { id: 'json', name: 'JSON Data', icon: 'file-code', mime: 'application/json' },
      { id: 'pptx', name: 'PowerPoint', icon: 'presentation', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { id: 'docx', name: 'Word Document', icon: 'file-text', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { id: 'html', name: 'HTML Page', icon: 'globe', mime: 'text/html' },
      { id: 'markdown', name: 'Markdown', icon: 'file-code', mime: 'text/markdown' },
      { id: 'latex', name: 'LaTeX', icon: 'file-code', mime: 'text/x-tex' },
      { id: 'csv', name: 'CSV Spreadsheet', icon: 'table', mime: 'text/csv' },
      { id: 'gif', name: 'GIF Animation', icon: 'film', mime: 'image/gif' },
      { id: 'mp4', name: 'MP4 Video', icon: 'video', mime: 'video/mp4' }
    ]
  });
});

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { whiteboardId, format, options } = req.body;
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const id = uuidv4();
  await db.query(
    'INSERT INTO exports (id, whiteboard_id, user_id, format, options, status) VALUES (?, ?, ?, ?, ?, ?)',
    [id, whiteboardId, req.user.id, format, JSON.stringify(options || {}), 'processing']
  );
  const whiteboard = await db.query('SELECT * FROM whiteboards WHERE id = ?', [whiteboardId]);
  const shapes = await db.query('SELECT * FROM shapes WHERE whiteboard_id = ? ORDER BY z_index ASC', [whiteboardId]);
  const w = whiteboard[0];
  const filename = `${w.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format}`;
  const filePath = path.join(EXPORT_DIR, filename);
  const exportService = require('../services/exportService');
  try {
    await exportService.export(w, shapes, format, options, filePath);
    const stats = fs.statSync(filePath);
    await db.query(
      "UPDATE exports SET status = 'completed', file_url = ?, file_size = ?, processing_time_ms = ? WHERE id = ?",
      [`/exports/${filename}`, stats.size, 0, id]
    );
    res.json({ id, filename, url: `/api/exports/download/${filename}`, size: stats.size });
  } catch (err) {
    await db.query("UPDATE exports SET status = 'failed', error_message = ? WHERE id = ?", [err.message, id]);
    res.status(500).json({ error: 'Export failed', details: err.message });
  }
}));

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(EXPORT_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const exports = await db.query(
    "SELECT e.*, w.title as whiteboard_title FROM exports e LEFT JOIN whiteboards w ON e.whiteboard_id = w.id WHERE e.user_id = ? ORDER BY e.created_at DESC LIMIT 50",
    [req.user.id]
  );
  res.json(exports);
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM exports WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Export deleted' });
}));

module.exports = router;
