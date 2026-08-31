const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { creditGuard } = require('../middleware/creditGuard');
const { asyncHandler } = require('../middleware/errorHandler');
const aiController = require('../controllers/aiController');

// All AI endpoints require valid authentication and sufficient AI credit quota
router.use(authenticate);
router.use(creditGuard);

// Handwriting recognition using OpenAI Vision
router.post('/handwriting', asyncHandler(aiController.handwriting));

// OCR / grammar cleanup
router.post('/format-text', asyncHandler(aiController.formatText));

// AI Quiz Generation
router.post('/quiz', asyncHandler(aiController.quiz));

// Lecture / document summarization
router.post('/summarize', asyncHandler(aiController.summarize));

// Multilingual translation
router.post('/translate', asyncHandler(aiController.translate));

// AI Interaction history
router.get('/history', asyncHandler(aiController.history));

module.exports = router;
