const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');

const router = express.Router();

const empFile = path.join(__dirname, '..', 'data', 'employee.txt');
const usersFile = path.join(__dirname, '..', 'data', 'users.json');

function sanitizeUsername(fname, lname) {
  return `${fname}.${lname}`.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function genPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
}

function readEmployeesFromTxt() {
  if (!fs.existsSync(empFile)) return [];
  const lines = fs.readFileSync(empFile, 'utf8').split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    out.push({ id: Number(parts[0]) || null, fname: parts[1], lname: parts[2], name: parts[1] + ' ' + parts[2] });
  }
  return out;
}

function writeEmployeesToTxt(list) {
  const lines = list.map((e, i) => `${i+1},${e.fname},${e.lname}`);
  fs.writeFileSync(empFile, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
}

function readUsers() {
  if (!fs.existsSync(usersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8')) || [];
  } catch (e) {
    console.error('Failed to parse users.json', e);
    return [];
  }
}

function writeUsers(list) {
  const tmp = usersFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
  fs.renameSync(tmp, usersFile);
}

// GET /api/employees
router.get('/employees', (req, res) => {
  try {
    // Prefer users.json if present (new secure store)
    if (fs.existsSync(usersFile)) {
      const users = readUsers();
      const mapped = users.map((u, idx) => ({ id: u.id || idx + 1, username: u.username, fname: u.fname, lname: u.lname, name: ((u.fname||'') + ' ' + (u.lname||'')).trim() }));
      return res.json(mapped);
    }

    const employees = readEmployeesFromTxt();
    res.json(employees);
  } catch (err) {
    console.error('Failed to read employees', err);
    res.status(500).json({ error: 'Failed to read employees' });
  }
});

// POST /api/employees { fname, lname }
router.post('/employees', (req, res) => {
  try {
    const { fname, lname } = req.body || {};
    if (!fname || !lname) return res.status(400).json({ error: 'fname and lname required' });

    // If users.json exists, create a secure user record and return a temp password
    if (fs.existsSync(usersFile)) {
      const users = readUsers();
      const cleanF = String(fname).trim();
      const cleanL = String(lname).trim();
      let username = sanitizeUsername(cleanF, cleanL);
      // ensure unique username
      let attempt = 1;
      while (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
        attempt++;
        username = `${sanitizeUsername(cleanF, cleanL)}${attempt}`;
      }
      const tempPassword = genPassword();
      // hash password
      argon2.hash(tempPassword).then(h => {
        const id = users.length ? (Math.max(...users.map(u => u.id || 0)) + 1) : 1;
        const user = { id, username, fname: cleanF.toLowerCase(), lname: cleanL.toLowerCase(), password_hash: h, created_at: new Date().toISOString() };
        users.push(user);
        writeUsers(users);
        // return temp password once to the admin client
        res.status(201).json({ success: true, username, tempPassword });
      }).catch(err => {
        console.error('Failed to hash password', err);
        res.status(500).json({ error: 'Failed to create user' });
      });
      return;
    }

    // Legacy TXT path (keeps old behavior)
    const employees = readEmployeesFromTxt();
    // store lowercase as original PHP did
    const entry = { fname: String(fname).trim().toLowerCase(), lname: String(lname).trim().toLowerCase() };
    employees.push(entry);
    writeEmployeesToTxt(employees);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Failed to add employee', err);
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

// DELETE /api/employees/:id
router.delete('/employees/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    // If users.json exists, delete from users
    if (fs.existsSync(usersFile)) {
      let users = readUsers();
      users = users.filter(u => Number(u.id) !== id);
      // reindex ids to keep compact numbering (optional)
      users = users.map((u, idx) => ({ ...u, id: idx + 1 }));
      writeUsers(users);
      return res.json({ success: true });
    }

    let employees = readEmployeesFromTxt();
    employees = employees.filter(e => Number(e.id) !== id);
    // reindex and write
    writeEmployeesToTxt(employees);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete employee', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
