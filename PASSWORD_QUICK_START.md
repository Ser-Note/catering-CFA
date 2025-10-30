# 🔐 Quick Password Protection Reference

## ✅ What's Protected Now

**ALL sensitive data access** is now password-protected:
- ✅ `orders.json` - Cannot be accessed without password
- ✅ `catering.txt` - Cannot be accessed without password  
- ✅ `employee.txt` - Cannot be accessed without password
- ✅ `checkIn.txt` - Cannot be accessed without password
- ✅ Any route that reads/writes these files requires authentication

## 🎯 Quick Start (5 Minutes)

1. **Start server:** `node server.js`
2. **Open:** `http://localhost:3000/auth/setup`
3. **Enter password** (minimum 8 characters)
4. **Copy the hash** shown on success page
5. **Paste into `.env` file** (already created for you)
6. **Restart server**
7. **Login at:** `http://localhost:3000/auth/login`

## 🔑 Daily Usage

**To access the system:**
- Visit: `http://localhost:3000/auth/login`
- Enter your password
- You're logged in for 24 hours

**To logout:**
- Visit: `http://localhost:3000/auth/logout`

## 🛡️ Security Features

- Password is **hashed** (SHA-256) - not stored in plain text
- Sessions expire automatically after 24 hours
- `.env` file is in `.gitignore` (never uploaded to GitHub)
- All data routes protected by middleware
- No backdoors or bypasses

## 📝 Example Workflow

```
1. User opens http://localhost:3000/orders
2. System checks: Is user authenticated?
3. No → Redirect to /auth/login
4. User enters password
5. System validates password hash
6. Correct → Create session, redirect to /orders
7. User can now access all protected routes for 24 hours
```

## ⚠️ Important Notes

- **Only YOU know the password** - it's not stored anywhere in plain text
- **If you forget it** - you must reset via `/auth/setup` (delete hash from `.env`)
- **Never share the password** or the `.env` file
- **Each iPad** will need to login separately (but stays logged in for 24 hours)

## 🚀 For Deployment (Vercel/Production)

When deploying to Vercel:
1. Add `DATA_PASSWORD_HASH` as an environment variable in Vercel dashboard
2. Add `SESSION_SECRET` as an environment variable (use a strong random string)
3. Set `NODE_ENV=production`
4. Your password protection works the same way in production!

---

**Your data is now secure! 🎉**
