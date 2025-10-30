# 🔐 Password Protection Setup Guide

Your catering system now has **password protection** for all sensitive data files (`orders.json`, `catering.txt`, `employee.txt`, `checkIn.txt`, etc.).

## 📋 How It Works

- **All protected routes** require authentication before access
- Your password is **hashed** (not stored in plain text) for security
- Sessions expire after 24 hours (configurable)
- Password is stored in `.env` file (never committed to git)

## 🚀 Initial Setup Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Your Password

1. **Start the server:**
   ```bash
   node server.js
   ```

2. **Visit the setup page:**
   Open browser to: `http://localhost:3000/auth/setup`

3. **Create your password:**
   - Enter a password (minimum 8 characters)
   - Confirm the password
   - Click "Generate Password Hash"

4. **Copy the generated hash:**
   You'll see a hash like:
   ```
   DATA_PASSWORD_HASH=5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
   ```

5. **Add to `.env` file:**
   - Open the `.env` file in your project root
   - Paste the hash line you copied
   - Save the file

6. **Restart the server:**
   - Stop the server (Ctrl+C)
   - Start it again: `node server.js`

### Step 3: Login

1. Visit any protected route (e.g., `http://localhost:3000/orders`)
2. You'll be redirected to the login page
3. Enter your password
4. You'll be logged in for 24 hours

## 🛡️ Protected Routes

These routes now require password authentication:

- `/orders` - View orders (BOH/FOH)
- `/catering/*` - All catering management pages
- `/fetch-catering` - Fetch emails from Gmail
- `/api/*` - Employee management API
- `/fundraiser` - Fundraiser pages
- `/json-catering` - JSON catering views

## 🔓 Public Routes

These routes do NOT require password:

- `/auth/login` - Login page
- `/auth/setup` - One-time password setup
- `/auth/logout` - Logout
- `/` - Home redirect

## 🔑 Managing Your Password

### Change Your Password

To change your password:

1. Stop the server
2. Delete the `DATA_PASSWORD_HASH=` line from `.env`
3. Restart server
4. Visit `/auth/setup` again
5. Create new password and update `.env`
6. Restart server

### Forgot Password?

If you forget your password:
- You must delete the `DATA_PASSWORD_HASH` line from `.env` and set up a new password
- There is no recovery method (this is by design for security)

### Logout

Visit `http://localhost:3000/auth/logout` to end your session

## ⚙️ Configuration Options

Edit `.env` file to customize:

```env
# Your password hash (from setup page)
DATA_PASSWORD_HASH=your-hash-here

# Session secret (change for production)
SESSION_SECRET=your-random-secret-key-change-this

# Session timeout in milliseconds (default: 24 hours)
SESSION_TIMEOUT=86400000
```

## 🚨 Security Best Practices

1. **Never commit `.env` to git** - Already in `.gitignore`
2. **Use a strong password** - At least 12 characters recommended
3. **Change SESSION_SECRET** - Use a random string in production
4. **Keep password private** - Only you should know it
5. **Logout on shared devices** - Always logout after use

## 📱 iPad Usage

When using on iPads for FOH/BOH:

1. Login once on each iPad
2. Session will stay active for 24 hours
3. After 24 hours, you'll need to login again
4. Bookmark the login page for easy access

## 🔧 Troubleshooting

**Problem: Can't access `/auth/setup`**
- Solution: Make sure `DATA_PASSWORD_HASH` is empty in `.env`

**Problem: "Authentication required" on every page**
- Solution: Check that you've added the hash to `.env` and restarted server

**Problem: Password not working**
- Solution: Verify you copied the entire hash from setup page

**Problem: Session expires too quickly**
- Solution: Increase `SESSION_TIMEOUT` in `.env` (value in milliseconds)

## 📞 Support

If you encounter issues, verify:
1. `.env` file exists with `DATA_PASSWORD_HASH` set
2. Server was restarted after setting password
3. You're using the correct password
4. Cookies are enabled in your browser

---

**Important:** Keep your password secure and never share it with unauthorized users!
