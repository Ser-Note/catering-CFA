// routes/auth.js
const express = require('express');
const crypto = require('crypto');
const { verifyPassword, hashPassword } = require('../middleware/auth');
const { setAuthCookie, clearAuthCookie, verifyAuthToken } = require('../middleware/serverless-auth');
const router = express.Router();

// GET /auth/login - Show login page
router.get('/login', (req, res) => {
  const redirectUrl = req.query.redirect || '/login';
  res.render('auth-login', { redirectUrl, error: null });
});

// POST /auth/login - Handle login submission
router.post('/login', (req, res) => {
  const { password, redirect } = req.body;
  const storedPasswordHash = process.env.DATA_PASSWORD_HASH;
  
  console.log('🔐 Login attempt:');
  console.log('- Password received:', password ? 'YES' : 'NO');
  console.log('- Password length:', password ? password.length : 0);
  console.log('- Redirect URL:', redirect);
  console.log('- Hash configured:', storedPasswordHash ? 'YES' : 'NO');
  console.log('- Hash length:', storedPasswordHash ? storedPasswordHash.length : 0);
  console.log('- Session ID before auth:', req.session?.id);
  
  if (!storedPasswordHash) {
    return res.render('auth-login', { 
      redirectUrl: redirect || '/login',
      error: 'Password not configured. Please contact administrator.' 
    });
  }
  
  console.log('🔍 Verifying password...');
  const passwordValid = verifyPassword(password, storedPasswordHash);
  console.log('🔍 Password verification result:', passwordValid);
  
  if (passwordValid) {
    console.log('✅ Password correct - creating serverless auth');
    
    // Set serverless auth cookie instead of session
    setAuthCookie(res, {
      authenticated: true,
      authenticatedAt: new Date().toISOString()
    });
    
    // Also set session for backward compatibility
    req.session.authenticated = true;
    req.session.authenticatedAt = new Date().toISOString();
    
    console.log('📍 Serverless auth cookie set, redirecting to:', redirect || '/login');
    // Redirect to original destination or employee login
    return res.redirect(redirect || '/login');
  } else {
    console.log('❌ Password incorrect');
    // Password incorrect
    return res.render('auth-login', { 
      redirectUrl: redirect || '/login',
      error: 'Incorrect password. Please try again.' 
    });
  }
});

// GET /auth/test-login - Test login functionality
router.get('/test-login', (req, res) => {
  const storedPasswordHash = process.env.DATA_PASSWORD_HASH;
  res.json({
    message: 'Login test endpoint',
    passwordHashConfigured: !!storedPasswordHash,
    hashLength: storedPasswordHash?.length || 0,
    sessionExists: !!req.session,
    sessionId: req.session?.id,
    authenticated: req.session?.authenticated
  });
});

// POST /auth/test-login - Manually authenticate for testing
router.post('/test-login', (req, res) => {
  console.log('🧪 Manual authentication test');
  req.session.authenticated = true;
  req.session.authenticatedAt = new Date().toISOString();
  
  req.session.save((err) => {
    if (err) {
      console.error('❌ Test auth session save error:', err);
      return res.json({ success: false, error: err.message });
    }
    
    console.log('✅ Test authentication successful');
    res.json({ 
      success: true, 
      sessionId: req.session.id,
      authenticated: req.session.authenticated,
      message: 'Manually authenticated - try accessing /options now'
    });
  });
});

// GET /auth/force-auth - Force authentication via GET (for easy testing)  
router.get('/force-auth', (req, res) => {
  console.log('🧪 Force authentication via GET');
  req.session.authenticated = true;
  req.session.authenticatedAt = new Date().toISOString();
  
  req.session.save((err) => {
    if (err) {
      console.error('❌ Force auth session save error:', err);
      return res.json({ success: false, error: err.message });
    }
    
    console.log('✅ Force authentication successful');
    res.json({ 
      success: true, 
      sessionId: req.session.id,
      authenticated: req.session.authenticated,
      message: 'Force authenticated - try accessing /options now',
      nextStep: 'Visit /options to test if authentication worked'
    });
  });
});

// GET /auth/force-serverless-auth - Force authentication using serverless cookies
router.get('/force-serverless-auth', (req, res) => {
  console.log('🧪 Force serverless authentication via GET');
  
  // Set serverless auth cookie
  setAuthCookie(res, {
    authenticated: true,
    authenticatedAt: new Date().toISOString()
  });
  
  console.log('✅ Serverless force authentication successful');
  res.json({ 
    success: true, 
    method: 'serverless-cookie',
    message: 'Serverless authenticated - try accessing /options now',
    nextStep: 'Visit /options to test if serverless authentication worked'
  });
});

// GET /auth/check-cookies - Check what cookies are present
router.get('/check-cookies', (req, res) => {
  const authToken = req.cookies['auth-token'];
  const authData = authToken ? verifyAuthToken(authToken) : null;
  
  res.json({
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie
    },
    authToken: {
      present: !!authToken,
      length: authToken?.length || 0,
      valid: !!authData,
      data: authData
    }
  });
});

// GET /auth/verify-token - Debug token verification step by step  
router.get('/verify-token', (req, res) => {
  const authToken = req.cookies['auth-token'];
  
  if (!authToken) {
    return res.json({ error: 'No auth token found' });
  }
  
  try {
    const crypto = require('crypto');
    
    // Debug the token verification process step by step
    const decoded = Buffer.from(authToken, 'base64').toString('utf8');
    const [payload, signature] = decoded.split('.');
    
    const SESSION_SECRET = process.env.SESSION_SECRET || "yourSecretKey-change-this-in-production";
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');
    
    const data = JSON.parse(payload);
    const maxAge = parseInt(process.env.SESSION_TIMEOUT) || 86400000;
    const age = Date.now() - data.timestamp;
    
    res.json({
      token: authToken,
      decoded: decoded,
      payload: payload,
      payloadData: data,
      receivedSignature: signature,
      expectedSignature: expectedSignature,
      signatureMatch: signature === expectedSignature,
      sessionSecret: SESSION_SECRET.substring(0, 10) + '...', // Only show first 10 chars
      age: age,
      maxAge: maxAge,
      expired: age > maxAge,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({ 
      error: 'Token verification failed', 
      message: error.message,
      token: authToken 
    });
  }
});

// GET /auth/debug - Debug session information (only in development or when DEBUG_SESSIONS=true)
router.get('/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_SESSIONS !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    session: {
      id: req.session?.id,
      authenticated: req.session?.authenticated,
      authenticatedAt: req.session?.authenticatedAt,
      cookie: req.session?.cookie
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasPasswordHash: !!process.env.DATA_PASSWORD_HASH,
      sessionSecretLength: process.env.SESSION_SECRET?.length || 0
    },
    request: {
      headers: {
        'user-agent': req.headers['user-agent'],
        'cookie': req.headers.cookie ? req.headers.cookie : 'missing',
        'host': req.headers.host,
        'x-forwarded-proto': req.headers['x-forwarded-proto']
      },
      secure: req.secure,
      protocol: req.protocol
    },
    cookieDetails: {
      expectedName: 'catering.sid',
      cookieString: req.headers.cookie || 'none'
    }
  });
});

// GET /auth/logout - Destroy session
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/auth/login');
  });
});

// GET /auth/setup - One-time password setup (for initial configuration)
router.get('/setup', (req, res) => {
  // Only allow setup if no password is configured
  if (process.env.DATA_PASSWORD_HASH) {
    return res.status(403).send('Password already configured. Use /auth/login instead.');
  }
  
  res.render('auth-setup', { error: null, success: false });
});

// POST /auth/setup - Save initial password
router.post('/setup', (req, res) => {
  if (process.env.DATA_PASSWORD_HASH) {
    return res.status(403).send('Password already configured.');
  }
  
  const { password, confirmPassword } = req.body;
  
  if (!password || password.length < 8) {
    return res.render('auth-setup', { 
      error: 'Password must be at least 8 characters long.',
      success: false 
    });
  }
  
  if (password !== confirmPassword) {
    return res.render('auth-setup', { 
      error: 'Passwords do not match.',
      success: false 
    });
  }
  
  const hash = hashPassword(password);
  
  // Show the hash to user so they can add it to .env file
  res.render('auth-setup', { 
    error: null,
    success: true,
    hash: hash,
    instructions: `Add this line to your .env file:\n\nDATA_PASSWORD_HASH=${hash}\n\nThen restart the server and use /auth/login to access the system.`
  });
});

module.exports = router;
