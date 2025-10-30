const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');

// Paths
const EMP_TXT = path.join(__dirname, '..', 'data', 'employee.txt');
const USERS_JSON = path.join(__dirname, '..', 'data', 'users.json');
const TEMP_CREDS = path.join(__dirname, '..', 'data', 'temp-creds.csv');

function sanitizeUsername(fname, lname) {
  return `${fname}.${lname}`.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function genPassword() {
  return crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
}

async function migrate() {
  if (!fs.existsSync(EMP_TXT)) {
    console.error('No employee.txt found at', EMP_TXT);
    process.exit(1);
  }

  const raw = fs.readFileSync(EMP_TXT, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const users = [];
  const creds = [];

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const fname = parts[1].trim();
    const lname = parts[2].trim();
    const username = sanitizeUsername(fname, lname);
    const password = genPassword();
    const hash = await argon2.hash(password);
    users.push({ id: Number(parts[0]) || null, username, fname, lname, password_hash: hash, created_at: new Date().toISOString() });
    creds.push(`${username},${password}`);
    console.log(`Migrated ${username}`);
  }

  fs.writeFileSync(USERS_JSON, JSON.stringify(users, null, 2), 'utf8');
  fs.writeFileSync(TEMP_CREDS, creds.join('\n') + (creds.length ? '\n' : ''), 'utf8');

  console.log('Migration complete. Wrote', USERS_JSON, 'and', TEMP_CREDS);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
