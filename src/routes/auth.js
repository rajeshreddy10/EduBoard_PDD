const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');
const {
  generateToken, generateRefreshToken, verifyRefreshToken,
  hashPassword, comparePassword,
} = require('../middleware/auth');

// ── Helper: upsert OAuth user ─────────────────────────────────────────────
async function upsertOAuthUser({ email, fullName, avatarUrl, provider, providerId }) {
  const normalizedEmail = email.toLowerCase().trim();
  let users = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  let user;

  if (users.length > 0) {
    user = users[0];
    const updateData = {
      last_login_at: new Date().toISOString()
    };
    if (avatarUrl && !user.avatar_url) updateData.avatar_url = avatarUrl;
    if (fullName && !user.full_name) updateData.full_name = fullName;

    try {
      await db.db.collection('users').doc(user.id).set(updateData, { merge: true });
    } catch (err) {
      console.warn('Firestore user update warning:', err.message);
    }
    user = { ...user, ...updateData };
  } else {
    const userId = uuidv4();
    const newUser = {
      id: userId,
      email: normalizedEmail,
      full_name: fullName || normalizedEmail.split('@')[0],
      avatar_url: avatarUrl || null,
      role: 'teacher',
      email_verified: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      provider: provider || 'google',
      provider_id: providerId || null
    };
    try {
      await db.db.collection('users').doc(userId).set(newUser);
    } catch (err) {
      await db.query(
        'INSERT INTO users (id, email, full_name, avatar_url, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, normalizedEmail, newUser.full_name, newUser.avatar_url, 'teacher', 1]
      );
    }
    user = newUser;
  }
  return user;
}


// ── Register ──────────────────────────────────────────────────────────────
async function handleRegister(req, res) {
  const { email, password, fullName, name, role } = req.body;
  const displayName = fullName || name;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const userId = uuidv4();
  const passwordHash = await hashPassword(password);
  const newUserDoc = {
    id: userId,
    email: normalizedEmail,
    password_hash: passwordHash,
    full_name: displayName,
    name: displayName,
    role: role || 'teacher',
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  };

  try {
    await db.db.collection('users').doc(userId).set(newUserDoc);
  } catch (err) {
    await db.query(
      'INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, normalizedEmail, passwordHash, displayName, role || 'teacher']
    );
  }

  // Sync user creation with Firebase Auth if Firebase Admin is initialized
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length) {
      await admin.auth().createUser({
        uid: userId,
        email: normalizedEmail,
        password: password,
        displayName: displayName
      }).catch(err => {
        if (err.code !== 'auth/email-already-in-use' && err.code !== 'auth/uid-already-exists') {
          console.warn('Firebase Auth user creation warning:', err.message);
        }
      });
    }
  } catch (fbAdminErr) {
    console.warn('Firebase Auth user sync note:', fbAdminErr.message);
  }

  const user = { id: userId, email: normalizedEmail, role: role || 'teacher' };
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  try {
    await db.query(
      'INSERT INTO sessions (id, user_id, token, refresh_token, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, token, refreshToken, req.ip, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );
  } catch (err) {
    console.error('Session creation failed:', err.message);
  }
  res.status(201).json({
    token, refreshToken,
    user: { id: userId, email: normalizedEmail, fullName: displayName, role: role || 'teacher' },
  });
}


router.post('/register', asyncHandler(handleRegister));
router.post('/signup', asyncHandler(handleRegister));

// ── Login (Native Firestore SDK with Firebase Auth Fallback) ─────────────
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let snapshot = { empty: true, docs: [] };
  try {
    if (db.db && typeof db.db.collection === 'function') {
      snapshot = await db.db.collection('users').where('email', '==', normalizedEmail).get();
    }
  } catch {}

  if (snapshot.empty) {
    try {
      const sqlUsers = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
      if (sqlUsers && sqlUsers.length > 0) {
        snapshot = { empty: false, docs: [{ id: sqlUsers[0].id, data: () => sqlUsers[0] }] };
      }
    } catch {}
  }

  // If not found in Firestore/DB, check if user exists in Firebase Auth (e.g. created on Web)
  if (snapshot.empty) {
    try {
      const admin = require('firebase-admin');
      if (admin.apps.length) {
        const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        if (userRecord) {
          const newHash = await hashPassword(password);
          const newUserDoc = {
            id: userRecord.uid,
            email: normalizedEmail,
            full_name: userRecord.displayName || normalizedEmail.split('@')[0],
            name: userRecord.displayName || normalizedEmail.split('@')[0],
            password_hash: newHash,
            role: 'teacher',
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString()
          };
          await db.db.collection('users').doc(userRecord.uid).set(newUserDoc, { merge: true });
          snapshot = await db.db.collection('users').where('email', '==', normalizedEmail).get();
        }
      }
    } catch (fbErr) {
      console.warn('Firebase Auth lookup fallback note:', fbErr.message);
    }
  }

  if (snapshot.empty) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const userDoc = snapshot.docs[0];
  const user = { id: userDoc.id, ...userDoc.data() };

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended' });
  }

  const storedHash = user.password_hash || user.password;
  if (!storedHash) {
    // If account was created via Google or Web without password_hash, bind the password to allow password login
    const newHash = await hashPassword(password);
    try {
      await db.db.collection('users').doc(user.id).set({ password_hash: newHash }, { merge: true });
    } catch {}
    user.password_hash = newHash;
  } else {
    const valid = await comparePassword(password, storedHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionId = uuidv4();
    await db.db.collection('sessions').doc(sessionId).set({
      id: sessionId,
      user_id: user.id,
      token,
      refresh_token: refreshToken,
      ip_address: req.ip || '',
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Session Firestore save error:', err.message);
  }

  res.json({
    token, refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name || user.fullName || user.name || user.email.split('@')[0],
      role: user.role || 'teacher'
    }
  });
}));

// ── Google OAuth Endpoint ────────────────────────────────────────────────
router.post('/oauth/google', asyncHandler(async (req, res) => {
  const { credential, idToken } = req.body;
  const tokenToVerify = credential || idToken;

  if (!tokenToVerify) {
    return res.status(400).json({ error: 'Google credential / ID token is required' });
  }

  let email = null;
  let name = null;
  let picture = null;
  let googleSub = null;

  // 1. Try Firebase Admin verifyIdToken
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length) {
      const decoded = await admin.auth().verifyIdToken(tokenToVerify);
      email = decoded.email;
      name = decoded.name;
      picture = decoded.picture;
      googleSub = decoded.sub;
    }
  } catch (err) {
    console.log('[auth/google] Firebase Admin verification note:', err.message);
  }

  // 2. Try Google Auth Library OAuth2Client
  if (!email) {
    try {
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({ idToken: tokenToVerify });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleSub = payload.sub;
    } catch (err) {
      console.log('[auth/google] Google Auth Library verification note:', err.message);
    }
  }

  // 3. Fallback: Parse JWT payload (Base64)
  if (!email) {
    try {
      const parts = tokenToVerify.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        email = payload.email;
        name = payload.name || payload.given_name;
        picture = payload.picture;
        googleSub = payload.sub;
      }
    } catch (err) {
      console.error('[auth/google] JWT payload parsing error:', err.message);
    }
  }

  if (!email) {
    return res.status(401).json({ error: 'Invalid Google ID token' });
  }

  const user = await upsertOAuthUser({
    email,
    fullName: name,
    avatarUrl: picture,
    provider: 'google',
    providerId: googleSub
  });

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name || user.email.split('@')[0],
      role: user.role || 'teacher'
    }
  });
}));

// ── GET /me & /profile ───────────────────────────────────────────────────
const handleGetProfile = asyncHandler(async (req, res) => {
  const snapshot = await db.db.collection('users').doc(req.user.id).get();
  if (!snapshot.exists) {
    return res.status(404).json({ error: 'User not found' });
  }
  const data = snapshot.data();
  res.json({
    id: snapshot.id,
    ...data,
    fullName: data.full_name || data.fullName || data.name || data.email?.split('@')[0]
  });
});

router.get('/me', authenticate, handleGetProfile);
router.get('/profile', authenticate, handleGetProfile);

module.exports = router;
