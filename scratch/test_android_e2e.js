const path = require('path');
const express = require('express');
const http = require('http');

require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const authRoutes = require(path.join(__dirname, '..', 'src', 'routes', 'auth.js'));
const whiteboardRoutes = require(path.join(__dirname, '..', 'src', 'routes', 'whiteboards.js'));
const voiceRoutes = require(path.join(__dirname, '..', 'src', 'routes', 'voice.js'));
const aiRoutes = require(path.join(__dirname, '..', 'src', 'routes', 'ai.js'));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/ai', aiRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.0.0', monorepo: true }));

const PORT = 3009;
const server = app.listen(PORT, async () => {
  console.log(`E2E Verification Server running on port ${PORT}`);

  function apiCall(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : '';
      const headers = {
        'Content-Type': 'application/json'
      };
      if (data) headers['Content-Length'] = Buffer.byteLength(payload);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request({
        hostname: 'localhost',
        port: PORT,
        path: path,
        method: method,
        headers: headers
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(body); } catch {}
          resolve({ statusCode: res.statusCode, body, json });
        });
      });

      req.on('error', reject);
      if (data) req.write(payload);
      req.end();
    });
  }

  console.log('====================================================');
  console.log(' EDUBOARD ANDROID & BACKEND E2E INTEGRATION VERIFICATION ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(testName, isSuccess, details) {
    if (isSuccess) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       Details: ${JSON.stringify(details).slice(0, 120)}`);
      passed++;
    } else {
      console.log(`[FAIL] ${testName}`);
      console.log(`       Details: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
      failed++;
    }
  }

  // 1. Health Check
  try {
    const health = await apiCall('GET', '/api/health');
    report('1. Server Health Check (/api/health)', health.statusCode === 200 && health.json?.status === 'ok', health.json);
  } catch (err) {
    report('1. Server Health Check (/api/health)', false, err.message);
  }

  // 2. Registration
  const testEmail = `android_user_${Date.now()}@eduboard.app`;
  let authToken = null;
  let userId = null;

  try {
    const reg = await apiCall('POST', '/api/auth/register', {
      email: testEmail,
      password: 'AndroidUser123!',
      fullName: 'Android Test Student',
      role: 'student'
    });
    const ok = reg.statusCode === 201 && reg.json?.token;
    if (ok) {
      authToken = reg.json.token;
      userId = reg.json.user?.id;
    }
    report('2. Android Registration Flow (/api/auth/register)', ok, reg.json || reg.body);
  } catch (err) {
    report('2. Android Registration Flow (/api/auth/register)', false, err.message);
  }

  // 3. Login
  try {
    const login = await apiCall('POST', '/api/auth/login', {
      email: testEmail,
      password: 'AndroidUser123!'
    });
    const ok = login.statusCode === 200 && login.json?.token;
    if (ok && !authToken) authToken = login.json.token;
    report('3. Android Password Login Flow (/api/auth/login)', ok, login.json || login.body);
  } catch (err) {
    report('3. Android Password Login Flow (/api/auth/login)', false, err.message);
  }

  // 4. Invalid Password Handling
  try {
    const invalidLogin = await apiCall('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword'
    });
    const ok = invalidLogin.statusCode === 401 && invalidLogin.json?.error === 'Invalid email or password';
    report('4. Android Invalid Auth Guard (/api/auth/login validation)', ok, invalidLogin.json || invalidLogin.body);
  } catch (err) {
    report('4. Android Invalid Auth Guard (/api/auth/login validation)', false, err.message);
  }

  // 5. Google OAuth Endpoint Validation
  try {
    const mockPayload = Buffer.from(JSON.stringify({ email: 'android_google_test@eduboard.app', name: 'Google Student', sub: '123456' })).toString('base64');
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${mockPayload}.mockSignature`;
    const googleLogin = await apiCall('POST', '/api/auth/oauth/google', { credential: mockToken });
    const ok = googleLogin.statusCode === 200 && googleLogin.json?.token;
    report('5. Android Google OAuth & Firestore Sync (/api/auth/oauth/google)', ok, googleLogin.json || googleLogin.body);
  } catch (err) {
    report('5. Android Google OAuth & Firestore Sync (/api/auth/oauth/google)', false, err.message);
  }

  // 6. User Profile Fetching (Authenticated)
  try {
    const profile = await apiCall('GET', '/api/auth/me', null, authToken);
    const ok = profile.statusCode === 200 && profile.json?.email === testEmail;
    report('6. User Profile & Firestore Data Retrieval (/api/auth/me)', ok, profile.json || profile.body);
  } catch (err) {
    report('6. User Profile & Firestore Data Retrieval (/api/auth/me)', false, err.message);
  }

  // 7. Whiteboard Creation (Firestore Integration)
  let createdBoardId = null;
  try {
    const createBoard = await apiCall('POST', '/api/whiteboards', {
      title: 'Android Test Canvas Board',
      description: 'Created via Android app integration verification'
    }, authToken);
    const ok = createBoard.statusCode === 201 && createBoard.json?.id;
    if (ok) createdBoardId = createBoard.json.id;
    report('7. Create Whiteboard (/api/whiteboards POST)', ok, createBoard.json || createBoard.body);
  } catch (err) {
    report('7. Create Whiteboard (/api/whiteboards POST)', false, err.message);
  }

  // 8. Fetch Whiteboards List
  try {
    const fetchBoards = await apiCall('GET', '/api/whiteboards', null, authToken);
    const ok = fetchBoards.statusCode === 200 && Array.isArray(fetchBoards.json);
    report('8. Fetch Whiteboards (/api/whiteboards GET)', ok, { count: fetchBoards.json?.length });
  } catch (err) {
    report('8. Fetch Whiteboards (/api/whiteboards GET)', false, err.message);
  }

  // 9. Voice Command Processing
  try {
    const voice = await apiCall('POST', '/api/voice/commands', { transcript: 'draw circle red' }, authToken);
    const ok = voice.statusCode === 200 && voice.json?.success === true;
    report('9. Voice Command Processing (/api/voice/commands)', ok, voice.json || voice.body);
  } catch (err) {
    report('9. Voice Command Processing (/api/voice/commands)', false, err.message);
  }

  // 10. AI Text Summarization
  try {
    const aiRes = await apiCall('POST', '/api/ai/summarize', { text: 'EduBoard is an interactive smart classroom whiteboard application.' }, authToken);
    const ok = aiRes.statusCode === 200;
    report('10. AI Summarization Service (/api/ai/summarize)', ok, aiRes.json || aiRes.body);
  } catch (err) {
    report('10. AI Summarization Service (/api/ai/summarize)', false, err.message);
  }

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  server.close(() => process.exit(failed > 0 ? 1 : 0));
});
