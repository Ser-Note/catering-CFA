// routes/auth.js
const express = require('express');
const { verifyPassword, hashPassword } = require('../middleware/auth');
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
    console.log('✅ Password correct - creating session');
    // Password correct - create session
    req.session.authenticated = true;
    req.session.authenticatedAt = new Date().toISOString();
    
    console.log('🔧 Session before save:', {
      id: req.session.id,
      authenticated: req.session.authenticated,
      cookie: req.session.cookie
    });
    
    // Force session save before redirect (important for serverless environments)
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.render('auth-login', { 
          redirectUrl: redirect || '/login',
          error: 'Session error. Please try again.' 
        });
      }
      
      console.log('📍 Session saved successfully, redirecting to:', redirect || '/login');
      console.log('🍪 Set-Cookie header should be sent');
      // Redirect to original destination or employee login
      return res.redirect(redirect || '/login');
    });
  } else {
    console.log('❌ Password incorrect');
    // Password incorrect
    return res.render('auth-login', { 
      redirectUrl: redirect || '/login',
      error: 'Incorrect password. Please try again.' 
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
