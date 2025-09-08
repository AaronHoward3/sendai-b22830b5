import crypto from 'crypto';

// CSRF token storage (in production, use Redis or similar)
const csrfTokens = new Map();

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token, userId) {
  if (!token || !userId) {
    console.log('[CSRF] Validation failed: missing token or userId', { hasToken: !!token, hasUserId: !!userId });
    return false;
  }
  
  const storedToken = csrfTokens.get(userId);
  console.log('[CSRF] Token validation:', { 
    userId, 
    hasStoredToken: !!storedToken, 
    tokensMatch: storedToken === token,
    storedTokenPreview: storedToken ? storedToken.slice(0, 8) + '...' : 'none',
    receivedTokenPreview: token.slice(0, 8) + '...'
  });
  
  if (!storedToken || storedToken !== token) {
    console.log('[CSRF] Token validation failed');
    return false;
  }
  
  // Remove token after use (one-time use)
  csrfTokens.delete(userId);
  console.log('[CSRF] Token validated and consumed');
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
  
  console.log('[CSRF] requireCSRF middleware:', {
    method: req.method,
    path: req.path,
    userId,
    hasTokenInHeaders: !!req.headers['x-csrf-token'],
    hasTokenInBody: !!req.body._csrf,
    tokenFromHeaders: req.headers['x-csrf-token'] ? req.headers['x-csrf-token'].slice(0, 8) + '...' : 'none',
    tokenFromBody: req.body._csrf ? req.body._csrf.slice(0, 8) + '...' : 'none',
    allHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf')),
    csrfTokenPreview: csrfToken ? csrfToken.slice(0, 8) + '...' : 'none'
  });
  
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
  
  console.log('[CSRF] Generated new token for user:', { 
    userId, 
    tokenPreview: token.slice(0, 8) + '...',
    totalTokensStored: csrfTokens.size 
  });
  
  // Add token to response headers
  res.setHeader('X-CSRF-Token', token);
  next();
}
