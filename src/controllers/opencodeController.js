/**
 * OpenCode Controller
 * Express request handlers for OpenCode project management & code execution.
 */

const executionService = require('../services/opencodeExecutionService');

// In-memory / DB fallback projects store
const mockProjects = [
  { id: 'proj_1', title: 'Python Data Science Demo', language: 'python', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proj_2', title: 'Algorithms in C++', language: 'cpp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proj_3', title: 'Node.js Microservice', language: 'javascript', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

exports.getProjects = async (req, res) => {
  try {
    return res.json({ projects: mockProjects });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch OpenCode projects' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, language } = req.body;
    const newProj = {
      id: `opencode_proj_${Date.now()}`,
      title: title || 'Untitled Project',
      language: language || 'python',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockProjects.push(newProj);
    return res.status(201).json(newProj);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.executeCode = async (req, res) => {
  try {
    const { code, language, stdin } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code content is required' });
    }
    const result = await executionService.execute(code, language || 'python', stdin || '');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      stdout: '',
      stderr: err.message || 'Execution internal error',
      exitCode: 1,
      executionTimeMs: 0
    });
  }
};
