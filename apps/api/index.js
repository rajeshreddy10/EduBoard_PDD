/**
 * EduBoard Backend Server Entry Point (Monorepo)
 *
 * This file initializes the Express server, configures middleware,
 * connects to the database, and sets up real-time collaboration via Socket.IO.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables from the api app directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Imports from unified src directory
const initializeSocket = require('../../src/socket');
const authRoutes = require('../../src/routes/auth');
const whiteboardRoutes = require('../../src/routes/whiteboards');
const collaborationRoutes = require('../../src/routes/collaboration');
const analyticsRoutes = require('../../src/routes/analytics');
const aiRoutes = require('../../src/routes/ai');
const exportRoutes = require('../../src/routes/export');
const voiceRoutes = require('../../src/routes/voice');
const userRoutes = require('../../src/routes/users');
const gestureRoutes = require('../../src/routes/gesture');
const classroomRoutes = require('../../src/routes/classroom');
const quizRoutes = require('../../src/routes/quiz');
const pollingRoutes = require('../../src/routes/polling');
const attendanceRoutes = require('../../src/routes/attendance');
const adminRoutes = require('../../src/routes/admin');
const subscriptionRoutes = require('../../src/routes/subscription');
const opencodeRoutes = require('../../src/routes/opencode');
const { errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');
const { setupRedisAdapter, closeRedisConnections } = require('../../src/config/redis');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'https://eduboard.app'];

const isLocalLan = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^(http:\/\/|https:\/\/|exp:\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|.*\.loca\.lt|.*\.ngrok-free\.app)(:\d+)?$/.test(origin)) return true;
  return false;
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isLocalLan(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 5e7
});

setupRedisAdapter(io).catch(err => console.warn('[Redis Adapter Setup Warning]:', err));

app.set('io', io);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (isLocalLan(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', monorepo: true, uptime: process.uptime() });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gesture', gestureRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/polling', pollingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/opencode', opencodeRoutes);


initializeSocket(io);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`EduBoard API Server running on port ${PORT} (Listening on 0.0.0.0 for LAN & Web access)`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await closeRedisConnections();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await closeRedisConnections();
  server.close(() => process.exit(0));
});
