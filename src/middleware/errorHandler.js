const { sanitizeErrorMessage } = require('../utils/sanitize');

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.status === 403) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (err.status === 400) {
    return res.status(400).json({ error: sanitizeErrorMessage(err.message) });
  }

  const status = err.status || 500;
  // Never leak internal messages or stack traces to clients.
  const safeMessage = status < 500 ? sanitizeErrorMessage(err.message) : 'Internal server error';
  res.status(status).json({ error: safeMessage });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
