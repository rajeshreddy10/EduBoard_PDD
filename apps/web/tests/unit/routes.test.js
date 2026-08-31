/**
 * EduBoard — Jest Unit Tests
 * Tests for auth, classroom, quiz, polling, and subscription routes
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// ─── Mock DB ────────────────────────────────────────────────────────────────
jest.mock('../../../../src/config/db', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const db = require('../../../../src/config/db');
const JWT_SECRET = 'test-secret-key';
process.env.JWT_SECRET = JWT_SECRET;

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeToken(payload = { id: 'user-1', role: 'teacher' }) {
  return `Bearer ${jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })}`;
}

function makeApp(router, path) {
  const app = express();
  app.use(express.json());
  const io = { to: () => ({ emit: jest.fn() }), emit: jest.fn() };
  app.set('io', io);
  app.use(path, router);
  return app;
}

// ─── Auth Route Tests ────────────────────────────────────────────────────────
describe('Auth Routes', () => {
  const authRouter = require('../../../../src/routes/auth');
  const app = makeApp(authRouter, '/auth');

  beforeEach(() => jest.resetAllMocks());

  test('POST /auth/login — missing credentials returns 400', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('POST /auth/login — wrong password returns 401', async () => {
    db.query.mockResolvedValueOnce([{
      id: 'u1', email: 'test@test.com', name: 'Test',
      password: '$2a$10$invalidhash', role: 'teacher', status: 'active'
    }]);
    const res = await request(app).post('/auth/login').send({ email: 'test@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/register — missing fields returns 400', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });
});

// ─── Classroom Route Tests ───────────────────────────────────────────────────
describe('Classroom Routes', () => {
  const classroomRouter = require('../../../../src/routes/classroom');
  const app = makeApp(classroomRouter, '/classrooms');

  beforeEach(() => jest.resetAllMocks());

  test('GET /classrooms — returns list for authenticated user', async () => {
    db.query.mockResolvedValueOnce([
      { id: 'c1', name: 'Math 101', code: 'MATH-001', student_count: 24 }
    ]);
    const res = await request(app).get('/classrooms').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body.classrooms).toHaveLength(1);
  });

  test('GET /classrooms — returns empty list on DB error (offline fallback)', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/classrooms').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body.classrooms).toEqual([]);
  });

  test('POST /classrooms — requires name', async () => {
    const res = await request(app).post('/classrooms')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ subject: 'Math' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('POST /classrooms — creates classroom with code', async () => {
    db.query.mockResolvedValueOnce([]);
    const res = await request(app).post('/classrooms')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ name: 'Advanced Math', subject: 'Mathematics' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Advanced Math');
    expect(res.body.code).toMatch(/^MATH-/);
  });

  test('POST /classrooms/join — requires code', async () => {
    const res = await request(app).post('/classrooms/join')
      .set('Authorization', makeToken())
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── Quiz Route Tests ────────────────────────────────────────────────────────
describe('Quiz Routes', () => {
  const quizRouter = require('../../../../src/routes/quiz');
  const app = makeApp(quizRouter, '/quiz');

  beforeEach(() => jest.resetAllMocks());

  test('GET /quiz/:classroomId — returns quizzes', async () => {
    db.query.mockResolvedValueOnce([{ id: 'q1', title: 'Test Quiz', is_active: 0 }]);
    const res = await request(app).get('/quiz/classroom-1').set('Authorization', makeToken());
    expect(res.status).toBe(200);
    expect(res.body.quizzes).toHaveLength(1);
  });

  test('POST /quiz — requires title and questions', async () => {
    const res = await request(app).post('/quiz')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ classroomId: 'c1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title|questions/i);
  });

  test('POST /quiz — creates quiz with questions', async () => {
    db.query.mockResolvedValueOnce([]);
    const questions = [{ id: '1', question: 'What is 2+2?', options: ['3','4','5','6'], correctIndex: 1, points: 10 }];
    const res = await request(app).post('/quiz')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ classroomId: 'c1', title: 'Math Quiz', questions });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Math Quiz');
  });
});

// ─── Polling Route Tests ─────────────────────────────────────────────────────
describe('Polling Routes', () => {
  const pollingRouter = require('../../../../src/routes/polling');
  const app = makeApp(pollingRouter, '/polling');

  beforeEach(() => jest.resetAllMocks());

  test('POST /polling — requires question and options', async () => {
    const res = await request(app).post('/polling')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ classroomId: 'c1' });
    expect(res.status).toBe(400);
  });

  test('POST /polling — creates poll with options', async () => {
    db.query.mockResolvedValueOnce([]);
    const res = await request(app).post('/polling')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ classroomId: 'c1', question: 'Do you understand?', options: ['Yes', 'No', 'Somewhat'] });
    expect(res.status).toBe(201);
    expect(res.body.isActive).toBe(true);
    expect(res.body.options).toHaveLength(3);
  });

  test('POST /polling/:id/vote — requires optionId', async () => {
    const res = await request(app).post('/polling/poll-id/vote')
      .set('Authorization', makeToken())
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── Subscription Route Tests ────────────────────────────────────────────────
describe('Subscription Routes', () => {
  const subRouter = require('../../../../src/routes/subscription');
  const app = makeApp(subRouter, '/subscription');

  beforeEach(() => jest.resetAllMocks());

  test('GET /subscription/plans — returns plan list', async () => {
    db.query.mockResolvedValueOnce([
      { id: 'free', name: 'Free', price: 0, interval: 'monthly', max_boards: 5, max_classrooms: 1, storage_mb: 100, ai_features: 0 },
      { id: 'pro', name: 'Pro', price: 12, interval: 'monthly', max_boards: -1, max_classrooms: 10, storage_mb: 51200, ai_features: 1 }
    ]);
    const res = await request(app).get('/subscription/plans');
    expect(res.status).toBe(200);
    expect(res.body.plans.length).toBeGreaterThan(0);
    const ids = res.body.plans.map(p => p.id);
    expect(ids).toContain('free');
    expect(ids).toContain('pro');
  });

  test('POST /subscription/upgrade — rejects invalid plan', async () => {
    const res = await request(app).post('/subscription/upgrade')
      .set('Authorization', makeToken())
      .send({ planId: 'mega-ultra' });
    expect(res.status).toBe(400);
  });

  test('POST /subscription/upgrade — rejects upgrading to free', async () => {
    const res = await request(app).post('/subscription/upgrade')
      .set('Authorization', makeToken())
      .send({ planId: 'free' });
    expect(res.status).toBe(400);
  });
});

// ─── Attendance Route Tests ──────────────────────────────────────────────────
describe('Attendance Routes', () => {
  const attRouter = require('../../../../src/routes/attendance');
  const app = makeApp(attRouter, '/attendance');

  beforeEach(() => jest.resetAllMocks());

  test('POST /attendance — requires classroomId and records', async () => {
    const res = await request(app).post('/attendance')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /attendance — records attendance successfully', async () => {
    db.query.mockResolvedValue([]);
    const records = [{ userId: 'u1', status: 'present', method: 'manual' }];
    const res = await request(app).post('/attendance')
      .set('Authorization', makeToken({ id: 'u1', role: 'teacher' }))
      .send({ classroomId: 'c1', date: '2026-05-28', records });
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
    expect(res.body.presentCount).toBe(1);
  });
});

// ─── Admin Route Tests ───────────────────────────────────────────────────────
describe('Admin Routes', () => {
  const adminRouter = require('../../../../src/routes/admin');
  const app = makeApp(adminRouter, '/admin');

  beforeEach(() => jest.resetAllMocks());

  test('GET /admin/metrics — requires admin role', async () => {
    const res = await request(app).get('/admin/metrics')
      .set('Authorization', makeToken({ id: 'u1', role: 'student' }));
    expect(res.status).toBe(403);
  });

  test('GET /admin/metrics — returns metrics for admin', async () => {
    db.query
      .mockResolvedValueOnce([[{ total: 100, active_today: 20, new_today: 5 }]])
      .mockResolvedValueOnce([[{ total: 500 }]]);
    const res = await request(app).get('/admin/metrics')
      .set('Authorization', makeToken({ id: 'u1', role: 'super_admin' }));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
  });

  test('DELETE /admin/users/:id — prevents self-deletion', async () => {
    const res = await request(app).delete('/admin/users/u1')
      .set('Authorization', makeToken({ id: 'u1', role: 'super_admin' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });
});
