const express = require('express');
const request = require('supertest');

// Mock DB
jest.mock('../../../../src/config/db', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  query: jest.fn(),
  getPool: jest.fn(),
  getLocalStorage: jest.fn()
}));

describe('Auth Routes', () => {
  let authRoutes;
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    authRoutes = require('../../../../src/routes/auth');
    app.use('/api/auth', authRoutes);
  });

  test('POST /api/auth/register - missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login - missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me - no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Health Route', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/health', (req, res) => res.json({ status: 'ok' }));
  });

  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
