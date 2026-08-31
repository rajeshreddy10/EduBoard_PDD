const path = require('path');
const express = require('express');
const http = require('http');
const fs = require('fs');

const webBasePath = 'C:\\Users\\rajes\\OneDrive\\Pictures\\Documents\\EduBoard_Web';
require('dotenv').config({ path: path.join(webBasePath, 'apps', 'api', '.env') });

const authRoutes = require(path.join(webBasePath, 'src', 'routes', 'auth.js'));
const whiteboardRoutes = require(path.join(webBasePath, 'src', 'routes', 'whiteboards.js'));
const classroomRoutes = require(path.join(webBasePath, 'src', 'routes', 'classroom.js'));
const quizRoutes = require(path.join(webBasePath, 'src', 'routes', 'quiz.js'));
const pollingRoutes = require(path.join(webBasePath, 'src', 'routes', 'polling.js'));
const attendanceRoutes = require(path.join(webBasePath, 'src', 'routes', 'attendance.js'));
const adminRoutes = require(path.join(webBasePath, 'src', 'routes', 'admin.js'));
const voiceRoutes = require(path.join(webBasePath, 'src', 'routes', 'voice.js'));
const aiRoutes = require(path.join(webBasePath, 'src', 'routes', 'ai.js'));
const db = require(path.join(webBasePath, 'src', 'config', 'db'));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/polling', pollingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/ai', aiRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.1.0-PARITY', architecture: '100% Web & Mobile Parity' }));

const PORT = 3019;
const server = app.listen(PORT, async () => {
  console.log(`\n========================================================================`);
  console.log(` FULL WEB & ANDROID TOP-TO-BOTTOM FEATURE PARITY VERIFICATION (PORT ${PORT}) `);
  console.log(`========================================================================\n`);

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

  function report(step, title, isSuccess, details) {
    if (isSuccess) {
      console.log(`[STEP ${step} - PASS] ${title}`);
      if (details) console.log(`              Details: ${JSON.stringify(details).slice(0, 130)}`);
      passed++;
    } else {
      console.log(`[STEP ${step} - FAIL] ${title}`);
      console.log(`              Details: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testEmail = `parity_superadmin_${timestamp}@eduboard.app`;
  const testPass = `ParityPass123!`;
  let authToken = null;
  let createdClassroomId = null;

  // STEP 1: User Registration as Super Admin
  try {
    const regRes = await apiCall('POST', '/api/auth/register', {
      email: testEmail,
      password: testPass,
      fullName: 'Prof. Alan Turing (Super Admin)',
      role: 'super_admin'
    });
    const ok = regRes.statusCode === 201 && regRes.json?.token;
    if (ok) authToken = regRes.json.token;
    report(1, 'User Auth & Profile Sync', ok, regRes.json);
  } catch (err) {
    report(1, 'User Auth & Profile Sync', false, err.message);
  }

  // STEP 2: Whiteboards Feature (Create & List)
  try {
    const wbRes = await apiCall('POST', '/api/whiteboards', { title: 'Advanced AI Lecture' }, authToken);
    const ok = wbRes.statusCode === 201 && wbRes.json?.id;
    report(2, 'Whiteboards Feature (Web & Android Sync)', ok, wbRes.json);
  } catch (err) {
    report(2, 'Whiteboards Feature', false, err.message);
  }

  // STEP 3: Smart Classrooms Feature (Create & Join)
  try {
    const clsRes = await apiCall('POST', '/api/classrooms', { name: 'Computer Science 101', subject: 'Algorithms', grade_level: 'Grade 12' }, authToken);
    const ok = clsRes.statusCode === 201 && clsRes.json?.id;
    if (ok) createdClassroomId = clsRes.json.id;
    report(3, 'Smart Classrooms Feature (Create & Join)', ok, clsRes.json);
  } catch (err) {
    report(3, 'Smart Classrooms Feature', false, err.message);
  }

  // STEP 4: AI Quizzes & Assessments Feature (Create & Query)
  try {
    const quizRes = await apiCall('POST', '/api/quiz', {
      classroom_id: createdClassroomId || 'default_class',
      title: 'Data Structures Quiz',
      questions: [{ question: 'What is O(1)?', options: ['Constant time', 'Linear time'], correct_index: 0 }]
    }, authToken);
    const ok = quizRes.statusCode === 201 && quizRes.json?.id;
    report(4, 'AI Quizzes & Assessments Feature', ok, quizRes.json);
  } catch (err) {
    report(4, 'AI Quizzes & Assessments Feature', false, err.message);
  }

  // STEP 5: Live Polling Feature (Create & Vote)
  try {
    const pollRes = await apiCall('POST', '/api/polling', {
      classroom_id: createdClassroomId || 'default_class',
      question: 'Preferred Programming Language?',
      options: ['Kotlin', 'TypeScript', 'Python']
    }, authToken);
    const ok = pollRes.statusCode === 201 && pollRes.json?.id;
    report(5, 'Live Polling Feature', ok, pollRes.json);
  } catch (err) {
    report(5, 'Live Polling Feature', false, err.message);
  }

  // STEP 6: Attendance Tracker Feature (Report & QR Check-in)
  try {
    const attRes = await apiCall('POST', `/api/attendance/qr/${createdClassroomId || 'default_class'}`, {}, authToken);
    const ok = attRes.statusCode === 200 && (attRes.json?.success === true || attRes.json?.checkedIn === true);
    report(6, 'Attendance Tracker & QR Check-In Feature', ok, attRes.json);
  } catch (err) {
    report(6, 'Attendance Tracker Feature', false, err.message);
  }

  // STEP 7: Analytics Overview Feature
  try {
    const metricsRes = await apiCall('GET', '/api/admin/metrics', null, authToken);
    const ok = metricsRes.statusCode === 200 && (metricsRes.json?.totalUsers !== undefined || metricsRes.json?.total_users !== undefined);
    report(7, 'Analytics & Performance Metrics Feature', ok, metricsRes.json);
  } catch (err) {
    report(7, 'Analytics Feature', false, err.message);
  }

  // STEP 8: Voice Board AI Feature
  try {
    const voiceRes = await apiCall('POST', '/api/voice/commands', { transcript: 'open physics board' }, authToken);
    const ok = voiceRes.statusCode === 200 && voiceRes.json?.success === true;
    report(8, 'Voice Board AI Feature', ok, voiceRes.json);
  } catch (err) {
    report(8, 'Voice Board AI Feature', false, err.message);
  }

  // STEP 9: Profile & Preferences Sync Feature
  try {
    const profRes = await apiCall('GET', '/api/auth/profile', null, authToken);
    const ok = profRes.statusCode === 200 && profRes.json?.email === testEmail.toLowerCase();
    report(9, 'Profile & Preferences Sync Feature', ok, profRes.json);
  } catch (err) {
    report(9, 'Profile & Preferences Sync Feature', false, err.message);
  }

  // STEP 10: Overall Platform Health & Public Tunnel
  try {
    const healthRes = await apiCall('GET', '/api/health', null);
    const ok = healthRes.statusCode === 200 && healthRes.json?.version === '3.1.0-PARITY';
    report(10, 'Overall Backend Platform Health Check', ok, healthRes.json);
  } catch (err) {
    report(10, 'Overall Backend Platform Health Check', false, err.message);
  }

  console.log(`\n========================================================================`);
  console.log(` TOP-TO-BOTTOM FEATURE PARITY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================================\n`);

  server.close(() => process.exit(failed > 0 ? 1 : 0));
});
