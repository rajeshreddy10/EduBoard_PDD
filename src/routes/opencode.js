/**
 * OpenCode Routes
 * Mounted at /api/opencode/*
 */

const express = require('express');
const router = express.Router();
const opencodeController = require('../controllers/opencodeController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/projects', opencodeController.getProjects);
router.post('/projects', opencodeController.createProject);
router.post('/execute', opencodeController.executeCode);

module.exports = router;
