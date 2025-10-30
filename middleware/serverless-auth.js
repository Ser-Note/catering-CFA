// middleware/serverless-auth.js
// Alternative authentication for serverless environments
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || "yourSecretKey-change-this-in-production";

/**
 * Create a signed authentication token
 */
function createAuthToken(data) {
  // Use shorter field names to reduce token size
  const payload = JSON.stringify({
    a: data.authenticated || true,  // 'a' instead of 'authenticated'
    t: Date.now()  // 't' instead of 'timestamp', no 'authenticatedAt' needed
  });
  
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 32); // Use only first 32 chars of signature to reduce size
  
  // Use URL-safe base64 encoding to prevent cookie truncation issues
  const token = Buffer.from(payload + '.' + signature)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  console.log('🏗️  Created token:', {
    payloadLength: payload.length,
    signatureLength: signature.length,
    totalLength: (payload + '.' + signature).length,
    base64Length: token.length
  });
  
  return token;
}

/**
 * Verify and decode authentication token
 */
function verifyAuthToken(token) {
  try {
    // Convert URL-safe base64 back to regular base64
    let base64Token = token
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if necessary
    while (base64Token.length % 4) {
      base64Token += '=';
    }
    
    const decoded = Buffer.from(base64Token, 'base64').toString('utf8');
    const [payload, signature] = decoded.split('.');
    
    console.log('🔍 Token verification:', {
      tokenLength: token.length,
      decodedLength: decoded.length,
      payloadLength: payload.length,
      signatureLength: signature.length
    });
    
    // Verify signature (compare only first 32 chars)
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 32);
    
    if (signature !== expectedSignature) {
      console.log('❌ Signature mismatch:', { received: signature, expected: expectedSignature });
      return null;
    }
    
    const data = JSON.parse(payload);
    
    // Check if token is expired (24 hours)
    const maxAge = parseInt(process.env.SESSION_TIMEOUT) || 86400000;
    if (Date.now() - data.t > maxAge) {
      console.log('❌ Token expired');
      return null;
    }
    
    // Convert back to expected format
    return {
      authenticated: data.a,
      timestamp: data.t,
      authenticatedAt: new Date(data.t).toISOString()
    };
  } catch (error) {
    console.log('❌ Token verification error:', error.message);
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
  
  // Always log in production for debugging
  console.log('🔐 Serverless auth check:', {
    url: req.originalUrl,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    allCookies: Object.keys(req.cookies || {}),
    cookieString: req.headers.cookie
  });
  
  if (!token) {
    console.log('🚪 No auth token, redirecting to login');
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ error: 'Authentication required' });
    } else {
      return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
  }
  
  const authData = verifyAuthToken(token);
  console.log('🔍 Token verification result:', {
    valid: !!authData,
    authenticated: authData?.authenticated,
    timestamp: authData?.timestamp,
    age: authData ? (Date.now() - authData.timestamp) : 'N/A'
  });
  
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