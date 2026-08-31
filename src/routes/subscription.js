const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

// GET /plans — list active subscription plans
router.get('/plans', asyncHandler(async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM subscription_plans WHERE is_active = 1');
    res.json({ plans });
  } catch (err) {
    // Fallback static plans if DB fails
    res.json({
      plans: [
        { id: 'free', name: 'Free', price: 0, interval: 'monthly', max_boards: 5, max_classrooms: 1, storage_mb: 100, ai_features: 0 },
        { id: 'pro', name: 'Pro', price: 12, interval: 'monthly', max_boards: -1, max_classrooms: 10, storage_mb: 51200, ai_features: 1 },
        { id: 'enterprise', name: 'Enterprise', price: 49, interval: 'monthly', max_boards: -1, max_classrooms: -1, storage_mb: 1048576, ai_features: 1 }
      ]
    });
  }
}));

// POST /upgrade — upgrade user's plan
router.post('/upgrade', authenticate, asyncHandler(async (req, res) => {
  const { planId, interval = 'monthly' } = req.body;
  if (!planId) return res.status(400).json({ error: 'planId is required' });

  const validPlans = ['pro', 'enterprise', 'education'];
  if (!validPlans.includes(planId)) {
    return res.status(400).json({ error: 'Invalid or unsupported plan' });
  }

  try {
    const id = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month from now

    await db.query(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, interval, expires_at)
       VALUES (?, ?, ?, 'active', ?, ?)
       ON DUPLICATE KEY UPDATE plan_id = ?, status = 'active', interval = ?, expires_at = ?`,
      [id, req.user.id, planId, interval, expiresAt, planId, interval, expiresAt]
    );

    res.json({ success: true, planId, expiresAt, message: `Successfully upgraded to ${planId}` });
  } catch (err) {
    res.status(400).json({ error: 'Failed to upgrade subscription', details: err.message });
  }
}));

module.exports = router;
