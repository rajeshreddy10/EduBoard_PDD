/**
 * sanitize.js
 * Shared helpers for redacting secrets and internal details from
 * error messages before they are returned to API clients or stored.
 */

/**
 * Redacts API keys, bearer tokens, authorization headers, and long
 * token-like strings from an arbitrary message. Also truncates very
 * long messages to avoid leaking large internal payloads.
 */
function sanitizeErrorMessage(message) {
  if (typeof message !== 'string' || !message) return message;

  let safe = message;

  // Redact query-string API keys (e.g., Gemini ?key=... / &key=...)
  safe = safe.replace(/([?&]key=)[^&\s'"]+/gi, '$1[REDACTED]');

  // Redact OpenAI sk-* keys
  safe = safe.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[REDACTED]');

  // Redact Google / Anthropic style keys (AIza..., sk-ant-..., etc.)
  safe = safe.replace(/\b(?:AIza|sk-ant-|rwk_|ghp_|gho_|AKIA)[A-Za-z0-9_-]+\b/g, '$1[REDACTED]');

  // Redact Bearer tokens
  safe = safe.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]');

  // Redact Authorization / x-api-key header values
  safe = safe.replace(/(authorization|x-api-key|api[_-]?key)["']?\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]+/gi, '$1: [REDACTED]');

  // Redact long token-like strings (JWT / hex / base64 blobs)
  safe = safe.replace(/\b[A-Za-z0-9_.-]{32,}\b/g, '[REDACTED]');

  if (safe.length > 500) safe = `${safe.slice(0, 500)}...`;

  return safe;
}

module.exports = { sanitizeErrorMessage };
