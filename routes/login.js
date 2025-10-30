const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const argon2 = require('argon2');
const { employeeDB, checkInDB, userDB } = require('../database/db');

// GET /login → serve login page
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "login", "index.html"));
});

// GET /change-password → serve change password page
router.get('/change-password', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login', 'change-password.html'));
});

// POST /change-password → change password for user
router.post('/change-password', async (req, res) => {
  try {
    const body = req.body || {};
    // prefer session username if logged in
    const sessionUser = req.session && req.session.username;
    const username = (sessionUser || (body.username || '')).trim();
    const currentPassword = (body.currentPassword || '').trim();
    const newPassword = (body.newPassword || '').trim();

    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'username/currentPassword/newPassword required' });
    }

    // Get user from database
    const user = await userDB.getByUsername(username);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const ok = await argon2.verify(user.password_hash, currentPassword);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });

    // basic new password validation
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const newHash = await argon2.hash(newPassword);
    await userDB.updatePassword(username, newHash);

    return res.json({ success: true });
  } catch (err) {
    console.error('Change password error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /login → handle login fetch
router.post("/login", async (req, res) => {
  // New flow: username + password
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  // Backwards-compatible legacy flow: firstName + lastName (no password)
  const firstName = (req.body.firstName || '').trim();
  const lastName = (req.body.lastName || '').trim();

  try {
    // If username/password provided, prefer secure hashed-password authentication
    if (username && password) {
      try {
        // Get user from database
        const user = await userDB.getByUsername(username);
        if (!user || !user.password_hash) return res.status(400).json({ error: 'Invalid credentials' });
        
        const ok = await argon2.verify(user.password_hash, password);
        if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

        // success
        req.session.username = user.username;
        req.session.fname = user.fname || '';
        req.session.lname = user.lname || '';

        // record check-in to database
        try {
          const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const time = new Date().toLocaleTimeString('en-GB', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          });

          await checkInDB.create(user.fname || '', user.lname || '', date, time);
        } catch (checkInError) {
          console.error('Failed to record check-in:', checkInError);
          // Don't fail login if check-in fails, just log the error
        }

        return res.json({ redirect: '/options' });
      } catch (dbError) {
        console.error('Database error during user authentication:', dbError);
        return res.status(500).json({ error: 'Server error during authentication' });
      }
    }

    // Legacy fallback: firstName + lastName (existing behavior)
    if (!firstName || !lastName) return res.status(400).json({ error: 'Missing fields' });

    try {
      // Check database for employee
      const employee = await employeeDB.findByName(firstName, lastName);
      
      if (employee) {
        req.session.firstName = firstName;
        req.session.lastName = lastName;

        // record check-in to database
        try {
          const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const time = new Date().toLocaleTimeString('en-GB', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          });

          await checkInDB.create(firstName, lastName, date, time);
        } catch (checkInError) {
          console.error('Failed to record check-in:', checkInError);
          // Don't fail login if check-in fails, just log the error
        }

        return res.json({ redirect: '/options' });
      }

      return res.status(400).json({ error: 'Login failed. Name not found.' });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return res.status(500).json({ error: 'Server error during login' });
    }
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


