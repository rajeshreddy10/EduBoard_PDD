const path = require('path');
const express = require('express');
const http = require('http');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '..', '..', 'OneDrive', 'Pictures', 'Documents', 'EduBoard_Web', 'apps', 'api', '.env') });

const webBasePath = 'C:\\Users\\rajes\\OneDrive\\Pictures\\Documents\\EduBoard_Web';
const authRoutes = require(path.join(webBasePath, 'src', 'routes', 'auth.js'));
const whiteboardRoutes = require(path.join(webBasePath, 'src', 'routes', 'whiteboards.js'));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', crossPlatform: true }));

const PORT = 3010;
const server = app.listen(PORT, async () => {
  console.log(`Cross-Platform Auth Test Server running on port ${PORT}`);

  function apiCall(method, apiPath, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : '';
      const headers = { 'Content-Type': 'application/json' };
      if (data) headers['Content-Length'] = Buffer.byteLength(payload);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request({
        hostname: 'localhost',
        port: PORT,
        path: apiPath,
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

  let passed = 0;
  let failed = 0;

  function report(testName, isSuccess, details) {
    if (isSuccess) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       Details: ${JSON.stringify(details).slice(0, 140)}`);
      passed++;
    } else {
      console.log(`[FAIL] ${testName}`);
      console.log(`       Details: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(' CROSS-PLATFORM (WEB & ANDROID) AUTH TEST SUITE ');
  console.log('====================================================\n');

  // Test 1: Android Registration & Profile
  const androidEmail = `android_user_${Date.now()}@eduboard.app`;
  try {
    const reg = await apiCall('POST', '/api/auth/register', {
      email: androidEmail,
      password: 'PassWord123!',
      fullName: 'Android Student',
      role: 'student'
    });
    const ok = reg.statusCode === 201 && reg.json?.token && reg.json?.user?.fullName === 'Android Student';
    report('1. Android Registration creates full_name & token', ok, reg.json);
  } catch (err) {
    report('1. Android Registration creates full_name & token', false, err.message);
  }

  // Test 2: Android Login with Case-Insensitive Email
  try {
    const login = await apiCall('POST', '/api/auth/login', {
      email: androidEmail.toUpperCase(),
      password: 'PassWord123!'
    });
    const ok = login.statusCode === 200 && login.json?.token && login.json?.user?.fullName === 'Android Student';
    report('2. Android Login with UpperCase Email matches normalized record', ok, login.json);
  } catch (err) {
    report('2. Android Login with UpperCase Email matches normalized record', false, err.message);
  }

  // Test 3: Web-created user doc (name field, no initial password_hash) -> Android Login auto-binds & succeeds
  const webEmail = `web_user_${Date.now()}@eduboard.app`;
  try {
    const db = require(path.join(webBasePath, 'src', 'config', 'db'));
    const mockUid = `web_uid_${Date.now()}`;
    await db.db.collection('users').doc(mockUid).set({
      id: mockUid,
      email: webEmail.toLowerCase(),
      name: 'Web Registered Teacher',
      full_name: 'Web Registered Teacher',
      role: 'teacher',
      createdAt: new Date().toISOString()
    });

    const webLoginOnAndroid = await apiCall('POST', '/api/auth/login', {
      email: webEmail,
      password: 'WebTeacherPass123!'
    });
    const ok = webLoginOnAndroid.statusCode === 200 && webLoginOnAndroid.json?.token && webLoginOnAndroid.json?.user?.fullName === 'Web Registered Teacher';
    report('3. Account registered on Web logs in on Android & returns fullName', ok, webLoginOnAndroid.json);
  } catch (err) {
    report('3. Account registered on Web logs in on Android & returns fullName', false, err.message);
  }

  // Test 4: Subsequent Android login with correct password succeeds
  try {
    const secondLogin = await apiCall('POST', '/api/auth/login', {
      email: webEmail,
      password: 'WebTeacherPass123!'
    });
    const ok = secondLogin.statusCode === 200 && secondLogin.json?.token;
    report('4. Subsequent login for Web user with set password_hash succeeds', ok, secondLogin.json);
  } catch (err) {
    report('4. Subsequent login for Web user with set password_hash succeeds', false, err.message);
  }

  // Test 5: Wrong password for Web user rejects with 401
  try {
    const wrongLogin = await apiCall('POST', '/api/auth/login', {
      email: webEmail,
      password: 'WrongPassword999!'
    });
    const ok = wrongLogin.statusCode === 401 && wrongLogin.json?.error === 'Invalid email or password';
    report('5. Invalid password for Web user rejected with 401', ok, wrongLogin.json);
  } catch (err) {
    report('5. Invalid password for Web user rejected with 401', false, err.message);
  }

  console.log('\n====================================================');
  console.log(` CROSS-PLATFORM AUTH RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  server.close(() => process.exit(failed > 0 ? 1 : 0));
});
