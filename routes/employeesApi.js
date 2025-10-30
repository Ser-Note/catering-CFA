const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');
const { employeeDB, userDB } = require('../database/db');

const router = express.Router();

function sanitizeUsername(fname, lname) {
  return `${fname}.${lname}`.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function genPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
}

// GET /api/employees
router.get('/employees', async (req, res) => {
  try {
    const users = await userDB.getAll();
    const mapped = users.map(u => ({ 
      id: u.id, 
      username: u.username, 
      fname: u.fname, 
      lname: u.lname, 
      name: ((u.fname||'') + ' ' + (u.lname||'')).trim() 
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Failed to read employees', err);
    res.status(500).json({ error: 'Failed to read employees' });
  }
});

// POST /api/employees { fname, lname }
router.post('/employees', async (req, res) => {
  try {
    const { fname, lname } = req.body || {};
    if (!fname || !lname) return res.status(400).json({ error: 'fname and lname required' });

    const cleanF = String(fname).trim();
    const cleanL = String(lname).trim();
    let username = sanitizeUsername(cleanF, cleanL);
    
    // Ensure unique username in database
    let attempt = 1;
    let existingUser = await userDB.getByUsername(username);
    while (existingUser) {
      attempt++;
      username = `${sanitizeUsername(cleanF, cleanL)}${attempt}`;
      existingUser = await userDB.getByUsername(username);
    }
    
    const tempPassword = genPassword();
    const hashedPassword = await argon2.hash(tempPassword);
    
    const user = await userDB.create(username, hashedPassword, cleanF.toLowerCase(), cleanL.toLowerCase());
    
    // Return temp password once to the admin client
    res.status(201).json({ success: true, username, tempPassword });
  } catch (err) {
    console.error('Failed to add employee', err);
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

// DELETE /api/employees/:id
router.delete('/employees/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    
    await userDB.delete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete employee', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
