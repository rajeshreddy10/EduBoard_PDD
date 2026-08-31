const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

const JWT_SECRET = process.env.JWT_SECRET || 'eduboard_default_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eduboard_default_refresh_secret_key_2026';

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'teacher',
    name: user.full_name || user.fullName || user.name || ''
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function generateRefreshToken(user) {
  const payload = { id: user.id };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
}

async function verifyToken(token) {
  if (!token) return null;

  // 1. Try standard JWT verification first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id) {
      return decoded;
    }
  } catch (err) {
    // Not a backend JWT token, proceed to Firebase verification
  }

  // 2. Try Firebase ID Token verification
  try {
    if (admin.apps.length) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'teacher',
        name: decodedToken.name,
        avatar: decodedToken.picture
      };
    }
  } catch (err) {
    // Invalid Firebase token
  }

  return null;
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    req.user = await verifyToken(token);
  }
  next();
}

function requireRole(...roles) {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) {
    req.user = { id: 'api', role: 'admin' };
    return next();
  }
  await authenticate(req, res, next);
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  if (!hash) return false;
  return await bcrypt.compare(password, hash);
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  apiKeyAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword
};
