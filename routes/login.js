const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
// CSV parsing no longer needed for JSON files
const argon2 = require('argon2');

// Paths
const employeeFile = path.join(__dirname, "..", "data", "employee.json");
const usersFile = path.join(__dirname, "..", "data", "users.json");
const checkInFile = path.join(__dirname, "..", "data", "checkIn.json");

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

    if (!fs.existsSync(usersFile)) return res.status(400).json({ error: 'No users database' });
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const userIdx = users.findIndex(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    if (userIdx === -1) return res.status(400).json({ error: 'User not found' });

    const user = users[userIdx];
    const ok = await argon2.verify(user.password_hash, currentPassword);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });

    // basic new password validation
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const newHash = await argon2.hash(newPassword);
    users[userIdx].password_hash = newHash;
    users[userIdx].updated_at = new Date().toISOString();

    // write atomically
    const tmp = usersFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
    fs.renameSync(tmp, usersFile);

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
      if (!fs.existsSync(usersFile)) return res.status(400).json({ error: 'No users database' });
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      const user = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
      if (!user || !user.password_hash) return res.status(400).json({ error: 'Invalid credentials' });
      const ok = await argon2.verify(user.password_hash, password);
      if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

      // success
      req.session.username = user.username;
      req.session.fname = user.fname || '';
      req.session.lname = user.lname || '';

      // record check-in
      const checkInData = fs.existsSync(checkInFile)
        ? JSON.parse(fs.readFileSync(checkInFile, 'utf8'))
        : [];
      const nextId = checkInData.length > 0 ? Math.max(...checkInData.map(c => c.id)) + 1 : 1;
      const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const time = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      checkInData.push({
        id: nextId,
        fname: (user.fname || '').toLowerCase(),
        lname: (user.lname || '').toLowerCase(),
        date: date,
        time: time
      });

      const tmp = checkInFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(checkInData, null, 2), 'utf8');
      fs.renameSync(tmp, checkInFile);

      return res.json({ redirect: '/options' });
    }

    // Legacy fallback: firstName + lastName (existing behavior)
    if (!firstName || !lastName) return res.status(400).json({ error: 'Missing fields' });

    let found = false;
    if (fs.existsSync(employeeFile)) {
      try {
        const employees = JSON.parse(fs.readFileSync(employeeFile, 'utf8'));
        found = employees.some(
          (emp) =>
            emp.fname?.toLowerCase() === firstName.toLowerCase() &&
            emp.lname?.toLowerCase() === lastName.toLowerCase()
        );
      } catch (e) {
        console.error('Failed to parse employee.json', e);
        found = false;
      }
    }

    if (found) {
      req.session.firstName = firstName;
      req.session.lastName = lastName;

      // record check-in
      const checkInData = fs.existsSync(checkInFile)
        ? JSON.parse(fs.readFileSync(checkInFile, 'utf8'))
        : [];
      const nextId = checkInData.length > 0 ? Math.max(...checkInData.map(c => c.id)) + 1 : 1;
      const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const time = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      checkInData.push({
        id: nextId,
        fname: firstName.toLowerCase(),
        lname: lastName.toLowerCase(),
        date: date,
        time: time
      });

      const tmp = checkInFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(checkInData, null, 2), 'utf8');
      fs.renameSync(tmp, checkInFile);

      return res.json({ redirect: '/options' });
    }

    return res.status(400).json({ error: 'Login failed. Name not found.' });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


