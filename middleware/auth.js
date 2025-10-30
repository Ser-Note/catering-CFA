// middleware/auth.js
const crypto = require('crypto');

/**
 * Authentication middleware to protect sensitive data access
 * Checks if user has valid session before allowing access to protected routes
 */
function requireAuth(req, res, next) {
  // Debug session information (only in development or when debugging)
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSIONS === 'true') {
    console.log('🔐 Auth check:', {
      url: req.originalUrl,
      method: req.method,
      hasSession: !!req.session,
      sessionId: req.session?.id?.substring(0, 8) + '...',
      authenticated: req.session?.authenticated,
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });
  }
  
  // Check if user is authenticated via session
  if (req.session && req.session.authenticated === true) {
    return next();
  }
  
  // If not authenticated, redirect to login page or return 401
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    // API request - return JSON error
    return res.status(401).json({ error: 'Authentication required' });
  } else {
    // Browser request - redirect to login
    const redirectUrl = '/auth/login?redirect=' + encodeURIComponent(req.originalUrl);
    console.log('🚪 Redirecting to login:', redirectUrl);
    return res.redirect(redirectUrl);
  }
}

/**
 * Verify password against stored hash
 */
function verifyPassword(inputPassword, storedHash) {
  const hash = crypto.createHash('sha256').update(inputPassword).digest('hex');
  return hash === storedHash;
}

/**
 * Hash a password for storage
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = {
  requireAuth,
  verifyPassword,
  hashPassword
};
