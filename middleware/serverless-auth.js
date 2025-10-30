// middleware/serverless-auth.js
// Alternative authentication for serverless environments
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || "yourSecretKey-change-this-in-production";

/**
 * Create a signed authentication token
 */
function createAuthToken(data) {
  const payload = JSON.stringify({
    ...data,
    timestamp: Date.now()
  });
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  
  return Buffer.from(payload + '.' + signature).toString('base64');
}

/**
 * Verify and decode authentication token
 */
function verifyAuthToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [payload, signature] = decoded.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const data = JSON.parse(payload);
    
    // Check if token is expired (24 hours)
    const maxAge = parseInt(process.env.SESSION_TIMEOUT) || 86400000;
    if (Date.now() - data.timestamp > maxAge) {
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
function setAuthCookie(res, data) {
  const token = createAuthToken(data);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 86400000
  };
  
  res.cookie('auth-token', token, cookieOptions);
}

/**
 * Clear authentication cookie
 */
function clearAuthCookie(res) {
  res.clearCookie('auth-token');
}

/**
 * Authentication middleware for serverless
 */
function requireServerlessAuth(req, res, next) {
  const token = req.cookies['auth-token'];
  
  if (process.env.DEBUG_SESSIONS === 'true') {
    console.log('🔐 Serverless auth check:', {
      url: req.originalUrl,
      hasToken: !!token,
      tokenLength: token?.length || 0
    });
  }
  
  if (!token) {
    console.log('🚪 No auth token, redirecting to login');
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ error: 'Authentication required' });
    } else {
      return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
  }
  
  const authData = verifyAuthToken(token);
  if (!authData || !authData.authenticated) {
    console.log('🚪 Invalid auth token, redirecting to login');
    clearAuthCookie(res);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ error: 'Authentication required' });
    } else {
      return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
  }
  
  console.log('✅ Serverless auth successful');
  req.auth = authData;
  next();
}

module.exports = {
  createAuthToken,
  verifyAuthToken,
  setAuthCookie,
  clearAuthCookie,
  requireServerlessAuth
};