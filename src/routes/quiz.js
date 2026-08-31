const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/quiz/:classroomId — list quizzes for a classroom
router.get('/:classroomId', authenticate, async (req, res) => {
  try {
    const quizzes = await db.query(
      'SELECT * FROM quizzes WHERE classroom_id = ? ORDER BY created_at DESC',
      [req.params.classroomId]
    );
    res.json({ quizzes });
  } catch { res.json({ quizzes: [] }); }
});

// POST /api/quiz — create quiz
router.post('/', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  const { classroomId, title, questions, timeLimit, shuffleQuestions } = req.body;
  if (!title || !questions?.length) return res.status(400).json({ error: 'Title and questions required' });
  const id = uuidv4();
  try {
    await db.query(
      `INSERT INTO quizzes (id, classroom_id, title, questions, time_limit, shuffle_questions, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [id, classroomId, title, JSON.stringify(questions), timeLimit || 30, shuffleQuestions ? 1 : 0]
    );
    res.status(201).json({ id, title, questions, isActive: false });
  } catch {
    res.status(201).json({ id, title, questions, isActive: false, offline: true });
  }
});

// POST /api/quiz/:id/activate — make quiz live
router.post('/:id/activate', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  try {
    await db.query('UPDATE quizzes SET is_active = 1 WHERE id = ?', [req.params.id]);
    const io = req.app.get('io');
    io?.to(`classroom:${req.body.classroomId}`).emit('quiz:started', { quizId: req.params.id });
    res.json({ activated: true });
  } catch { res.json({ activated: true, offline: true }); }
});

// POST /api/quiz/:id/submit — submit answers
router.post('/:id/submit', authenticate, async (req, res) => {
  const { answers, timeTaken } = req.body;
  const submissionId = uuidv4();
  try {
    const [quiz] = await db.query('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    const questions = JSON.parse(quiz.questions);
    let score = 0;
    const results = questions.map((q, i) => {
      const correct = answers[i] === q.correctIndex;
      if (correct) score += q.points || 10;
      return { questionId: q.id, correct, points: correct ? (q.points || 10) : 0 };
    });
    await db.query(
      `INSERT INTO quiz_submissions (id, quiz_id, user_id, answers, score, time_taken, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [submissionId, req.params.id, req.user.id, JSON.stringify(answers), score, timeTaken || 0]
    );
    res.json({ submissionId, score, results, totalPoints: questions.reduce((a, q) => a + (q.points || 10), 0) });
  } catch {
    res.json({ submissionId, score: 0, offline: true });
  }
});

// GET /api/quiz/:id/results — get quiz results (teacher)
router.get('/:id/results', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  try {
    const submissions = await db.query(
      `SELECT qs.*, u.name, u.email FROM quiz_submissions qs
       JOIN users u ON u.id = qs.user_id WHERE qs.quiz_id = ? ORDER BY qs.score DESC`,
      [req.params.id]
    );
    res.json({ submissions });
  } catch { res.json({ submissions: [] }); }
});

// DELETE /api/quiz/:id
router.delete('/:id', authenticate, requireRole(['teacher', 'school_admin', 'super_admin']), async (req, res) => {
  try {
    await db.query('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
    res.json({ deleted: true });
  } catch { res.json({ deleted: true, offline: true }); }
});

module.exports = router;
