const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/flac', 'audio/x-m4a', 'audio/opus'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported audio format: ${file.mimetype}. Allowed: webm, wav, ogg, mp3, mp4, flac, m4a, opus`));
  }
});

async function saveTranscription(userId, data) {
  try {
    await db.query(
      `INSERT INTO voice_transcriptions
       (user_id, transcript, raw_transcript, confidence, language, duration_ms, audio_format, source, word_count, formatting_applied, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        data.processed || data.transcript || '',
        data.transcript || '',
        data.confidence || 0,
        data.language || 'en',
        data.durationMs || 0,
        data.audioFormat || 'webm',
        data.source || 'whisper',
        data.wordCount || 0,
        data.formattingApplied || false,
        JSON.stringify({ processingTime: data.processingTime })
      ]
    );
  } catch (err) {
    console.warn('[voice] Failed to save transcription:', err.message);
  }
}

const handleVoiceCommand = asyncHandler(async (req, res) => {
  const { command, transcript, language } = req.body;
  const input = command || transcript || '';
  let intent = 'NONE';
  let executed = true;
  let message = 'Voice command processed';

  if (input.toLowerCase().includes('circle') || input.toLowerCase().includes('draw')) {
    intent = 'DRAW_SHAPE';
    message = 'Drawing shape on canvas';
  } else if (input.toLowerCase().includes('clear')) {
    intent = 'CLEAR_CANVAS';
    message = 'Canvas cleared';
  }

  try {
    if (req.user?.id) {
      await db.query(
        'INSERT INTO voice_commands (user_id, command_text, intent, confidence, raw_transcript, executed, execution_result) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, input, intent, 1.0, transcript || command || '', executed, JSON.stringify({ intent, message })]
      );
    }
  } catch { /* non-blocking */ }

  res.json({
    success: true,
    action: intent,
    message,
    detectedCommand: input
  });
});

router.post('/command', optionalAuth, handleVoiceCommand);
router.post('/commands', optionalAuth, handleVoiceCommand);


router.post('/transcribe', optionalAuth, asyncHandler(async (req, res) => {
  const { audio, language, formatResponse, task, prompt, temperature, source: clientSource } = req.body;

  if (!audio) {
    return res.status(400).json({ success: false, error: 'Missing required field: audio (base64 data URI or raw base64)' });
  }

  const voiceService = require('../services/voiceService');
  const result = await voiceService.transcribeAudio(audio, {
    language: language || 'en',
    formatResponse: formatResponse !== false,
    task: task || 'transcribe',
    prompt: prompt || '',
    temperature: typeof temperature === 'number' ? temperature : 0,
  });

  if (result.success && req.user?.id) {
    await saveTranscription(req.user.id, { ...result, audioFormat: voiceService.getAudioFormat(audio) || 'webm' });
  }

  res.json(result);
}));

router.post('/transcribe/upload', optionalAuth, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file uploaded. Use field name "audio".' });
  }

  const language = req.body.language || 'en';
  const formatResponse = req.body.formatResponse !== 'false';
  const task = req.body.task || 'transcribe';

  const mimeMap = {
    'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/wave': 'wav',
    'audio/ogg': 'ogg', 'audio/mp3': 'mp3', 'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4', 'audio/flac': 'flac', 'audio/x-m4a': 'm4a',
    'audio/opus': 'opus',
  };
  const ext = mimeMap[req.file.mimetype] || 'webm';
  const base64Audio = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const voiceService = require('../services/voiceService');
  const result = await voiceService.transcribeAudio(base64Audio, {
    language,
    formatResponse,
    task,
    prompt: req.body.prompt || '',
    temperature: parseFloat(req.body.temperature) || 0,
  });

  if (result.success && req.user?.id) {
    await saveTranscription(req.user.id, { ...result, audioFormat: ext });
  }

  res.json(result);
}));

router.post('/transcribe/batch', optionalAuth, asyncHandler(async (req, res) => {
  const { chunks, language, formatResponse, task } = req.body;

  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing or empty chunks array' });
  }

  if (chunks.length > 50) {
    return res.status(400).json({ success: false, error: 'Maximum 50 chunks per batch request' });
  }

  const voiceService = require('../services/voiceService');
  const result = await voiceService.transcribeAudioChunked(chunks, {
    language: language || 'en',
    formatResponse: formatResponse !== false,
    task: task || 'transcribe',
  });

  if (result.success && req.user?.id) {
    await saveTranscription(req.user.id, { ...result, audioFormat: 'webm' });
  }

  res.json(result);
}));

router.get('/transcriptions', authenticate, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const transcriptions = await db.query(
    'SELECT id, transcript, confidence, language, duration_ms, word_count, source, formatting_applied, created_at FROM voice_transcriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, limit, offset]
  );
  res.json({ transcriptions, limit, offset, total: transcriptions.length });
}));

router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const commands = await db.query(
    'SELECT * FROM voice_commands WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [req.user.id]
  );
  res.json(commands);
}));

router.get('/intents', (req, res) => {
  res.json({
    intents: [
      { id: 'draw_shape', command: 'draw a circle', description: 'Draw a shape on the board' },
      { id: 'change_color', command: 'change color to blue', description: 'Change drawing color' },
      { id: 'clear_board', command: 'clear the board', description: 'Clear all shapes' },
      { id: 'undo', command: 'undo', description: 'Undo last action' },
      { id: 'redo', command: 'redo', description: 'Redo last action' },
      { id: 'save', command: 'save the board', description: 'Save the current board' },
      { id: 'export', command: 'export as pdf', description: 'Export board' },
      { id: 'zoom_in', command: 'zoom in', description: 'Zoom in on board' },
      { id: 'zoom_out', command: 'zoom out', description: 'Zoom out on board' },
      { id: 'add_text', command: 'add text hello world', description: 'Add text to board' },
      { id: 'delete_selected', command: 'delete selected', description: 'Delete selected shape' },
      { id: 'collaborate', command: 'invite user', description: 'Invite collaborator' },
      { id: 'switch_theme', command: 'switch to dark mode', description: 'Change theme' }
    ]
  });
});

router.get('/model-status', (req, res) => {
  const localSttEngine = require('../services/localSttEngine');
  res.json({
    success: true,
    model: localSttEngine.getModelStatus(),
  });
});

router.post('/train', optionalAuth, asyncHandler(async (req, res) => {
  const { phrase, category, phonemes, keywords } = req.body;
  if (!phrase) {
    return res.status(400).json({ success: false, error: 'Missing required field: phrase' });
  }

  const localSttEngine = require('../services/localSttEngine');
  const result = localSttEngine.trainModel({ phrase, category, phonemes, keywords });

  res.json(result);
}));

router.post('/cache/clear', authenticate, asyncHandler(async (req, res) => {
  const voiceService = require('../services/voiceService');
  voiceService.clearCache();
  res.json({ success: true, message: 'STT cache cleared' });
}));

module.exports = router;
