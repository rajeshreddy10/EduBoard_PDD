/**
 * AI Credit Guardrail Middleware
 * Protects AI endpoints against unauthorized or un-metered usage.
 *
 * Verifies that the authenticated user has available `ai_credits`
 * before permitting AI feature execution.
 */

const DEFAULT_FREE_CREDITS = 50;
const userCreditsStore = new Map();

async function creditGuard(req, res, next) {
  try {
    // Require authenticated user context
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required to access AI services.'
      });
    }

    const userId = req.user.id;
    let credits = userCreditsStore.has(userId)
      ? userCreditsStore.get(userId)
      : (typeof req.user.ai_credits === 'number' ? req.user.ai_credits : DEFAULT_FREE_CREDITS);

    if (!userCreditsStore.has(userId)) {
      userCreditsStore.set(userId, credits);
    }

    if (credits <= 0) {
      return res.status(402).json({
        error: 'Insufficient AI credits. Please upgrade your subscription plan or top up your credits to continue using AI tools.',
        code: 'OUT_OF_CREDITS',
        credits: 0
      });
    }

    // Attach remaining credits to request context for downstream handlers/logging
    req.userCredits = credits;
    next();
  } catch (error) {
    console.error('[CreditGuard Error]:', error);
    return res.status(500).json({
      error: 'Failed to verify AI credit quota. Please try again later.'
    });
  }
}

/**
 * Utility function to deduct AI credit after successful API execution.
 */
async function deductCredit(userId, amount = 1) {
  try {
    const current = userCreditsStore.get(userId) ?? DEFAULT_FREE_CREDITS;
    userCreditsStore.set(userId, Math.max(0, current - amount));
  } catch (err) {
    console.warn(`[CreditGuard Warning] Failed to deduct ${amount} credit(s) for user ${userId}:`, err.message);
  }
}

module.exports = {
  creditGuard,
  deductCredit
};

