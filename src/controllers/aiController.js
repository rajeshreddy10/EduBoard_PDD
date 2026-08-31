/**
 * AI Controller
 * Express request handlers for all /api/ai endpoints.
 *
 * Centralises AI request handling so routes stay thin, error messages are
 * sanitized before reaching clients, and response contracts are consistent.
 */

const db = require('../config/db');
const aiService = require('../services/aiService');
const handwritingService = require('../services/handwritingService');

const MAX_IMAGE_LENGTH = 50 * 1024 * 1024; // 50MB base64 image ceiling

// POST /api/ai/handwriting — OCR / handwriting recognition
exports.handwriting = async (req, res) => {
  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Image data required' });
  }
  if (image.length > MAX_IMAGE_LENGTH) {
    return res.status(400).json({ error: 'Image data too large' });
  }

  const result = await handwritingService.recognizeHandwriting(image);

  if (req.user?.id && result.success) {
    try {
      await db.query(
        'INSERT INTO ai_interactions (user_id, interaction_type, input_data, output_data, model_used, processing_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, 'handwriting_recognition', JSON.stringify({ imageSize: image.length }), JSON.stringify(result), result.model, result.processingTime]
      );
    } catch (err) {
      console.warn('Failed to log interaction:', err.message);
    }
  }

  res.json({
    success: Boolean(result.success),
    text: result.text || '',
    model: result.model || 'fallback',
    processingTime: result.processingTime || 0,
    tokensUsed: result.tokens || 0,
    isFallback: Boolean(result.isFallback || result.model === 'offline-ocr-heuristic'),
    ...(result.error ? { error: result.error } : {}),
  });
};

// POST /api/ai/format-text — OCR / grammar cleanup
exports.formatText = async (req, res) => {
  const { text, task } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text required' });
  }
  if (text.length > 20000) {
    return res.status(400).json({ error: 'Text too long' });
  }

  const result = await aiService.formatText(text, task);
  res.json({
    success: true,
    formatted: result.formatted || text,
    model: result.model,
    isFallback: Boolean(result.isFallback),
    processingTime: result.processingTime,
  });
};

// POST /api/ai/quiz
exports.quiz = async (req, res) => {
  const { topic, count, difficulty, type } = req.body || {};
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const safeCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);
  const safeDifficulty = ['easy', 'medium', 'hard', 'expert'].includes(difficulty) ? difficulty : 'medium';
  const safeType = ['multiple-choice', 'short-answer', 'true-false', 'mixed'].includes(type) ? type : 'multiple-choice';

  const result = await aiService.generateQuiz(topic.trim().slice(0, 500), safeCount, safeDifficulty, safeType);
  res.json(result);
};

// POST /api/ai/summarize
exports.summarize = async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  const result = await aiService.summarizeText(text.slice(0, 30000));
  res.json({ success: true, text: result.text, model: result.model, provider: result.provider });
};

// POST /api/ai/translate
exports.translate = async (req, res) => {
  const { text, targetLanguage } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  if (!targetLanguage || typeof targetLanguage !== 'string') {
    return res.status(400).json({ error: 'targetLanguage is required' });
  }
  const result = await aiService.translateText(text.slice(0, 10000), targetLanguage);
  res.json(result);
};

// GET /api/ai/history
exports.history = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const interactions = await db.query(
    'SELECT id, interaction_type, input_data, output_data, model_used, processing_time_ms, created_at FROM ai_interactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [req.user.id, limit]
  );
  res.json(interactions);
};
