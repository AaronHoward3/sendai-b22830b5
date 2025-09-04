import crypto from 'crypto';

// CSRF token storage (in production, use Redis or similar)
const csrfTokens = new Map();

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token, userId) {
  if (!token || !userId) return false;
  
  const storedToken = csrfTokens.get(userId);
  if (!storedToken || storedToken !== token) return false;
  
  // Remove token after use (one-time use)
  csrfTokens.delete(userId);
  return true;
}

export function requireCSRF(req, res, next) {
  // Skip CSRF for GET requests and webhooks
  if (req.method === 'GET' || req.path.startsWith('/webhooks/')) {
    return next();
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required for CSRF protection' });
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  if (!validateCSRFToken(csrfToken, userId)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

export function attachCSRFToken(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next();

  const token = generateCSRFToken();
  csrfTokens.set(userId, token);
  
  // Add token to response headers
  res.setHeader('X-CSRF-Token', token);
  next();
}
