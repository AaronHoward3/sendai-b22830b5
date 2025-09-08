// Error handling middleware to prevent information disclosure
export function errorHandler(err, req, res, next) {
  // Log the full error for debugging (but don't send to client)
  console.error('🚨 FULL ERROR DETAILS:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString(),
    body: req.body ? JSON.stringify(req.body, null, 2) : 'no body'
  });

  // Don't expose internal errors to clients
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details || 'Invalid input data'
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access denied'
    });
  }

  // For debugging - show real error in development
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}

// 404 handler
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Resource not found'
  });
}
