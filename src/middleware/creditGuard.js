/**
 * AI Credit Guardrail Middleware
 * Protects AI endpoints against unauthorized or un-metered usage.
 *
 * Verifies that the authenticated user has available `ai_credits` in Firestore
 * before permitting AI feature execution.
 */

const admin = require('firebase-admin');

// Default initial credit allocation for new user documents if field is missing
const DEFAULT_FREE_CREDITS = 50;

async function creditGuard(req, res, next) {
  try {
    // Require authenticated user context
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required to access AI services.'
      });
    }

    const userId = req.user.id;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let credits = 0;

    if (!userDoc.exists) {
      // Create user record with default free credits if initial setup
      credits = DEFAULT_FREE_CREDITS;
      try {
        await userRef.set({
          email: req.user.email || '',
          name: req.user.name || '',
          ai_credits: DEFAULT_FREE_CREDITS,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (writeErr) {
        console.warn('[CreditGuard Warning] Could not auto-initialize user document:', writeErr.message);
      }
    } else {
      const data = userDoc.data() || {};
      if (typeof data.ai_credits === 'number') {
        credits = data.ai_credits;
      } else {
        // If field is missing on existing doc, initialize with free tier allowance
        credits = DEFAULT_FREE_CREDITS;
        try {
          await userRef.update({ ai_credits: DEFAULT_FREE_CREDITS });
        } catch (updateErr) {
          console.warn('[CreditGuard Warning] Could not set default ai_credits:', updateErr.message);
        }
      }
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
 * Utility function to deduct 1 AI credit after successful API execution.
 */
async function deductCredit(userId, amount = 1) {
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      ai_credits: admin.firestore.FieldValue.increment(-amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.warn(`[CreditGuard Warning] Failed to deduct ${amount} credit(s) for user ${userId}:`, err.message);
  }
}

module.exports = {
  creditGuard,
  deductCredit
};
