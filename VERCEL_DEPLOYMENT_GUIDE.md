# Vercel Deployment Guide

## Environment Variables Setup

Your application is failing because the Supabase environment variables are not configured in your Vercel deployment. Here's how to fix it:

### 1. Set Environment Variables in Vercel

You need to add these environment variables to your Vercel project:

#### Option A: Using Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `catering-CFA` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
Name: SUPABASE_URL
Value: https://your-project-ref.supabase.co

Name: SUPABASE_ANON_KEY  
Value: your-anon-key-here
```

#### Option B: Using Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add SUPABASE_URL
# Enter: https://your-project-ref.supabase.co

vercel env add SUPABASE_ANON_KEY
# Enter: your-anon-key-here

# Redeploy
vercel --prod
```

### 2. Get Your Supabase Credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (for SUPABASE_URL)
   - **anon public** key (for SUPABASE_ANON_KEY)

### 3. Example Values

Your environment variables should look like this:
```
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Additional Environment Variables for Sessions

Add these additional environment variables in Vercel for proper session handling:

```
Name: SESSION_SECRET
Value: generate-a-long-random-string-here

Name: DEBUG_SESSIONS  
Value: true

Name: NODE_ENV
Value: production
```

### 5. Redeploy

After setting the environment variables:
1. Go to your Vercel project dashboard
2. Click **Deployments**
3. Click **Redeploy** on your latest deployment
4. Or push a new commit to trigger automatic deployment

## Troubleshooting

### Error: "Invalid supabaseUrl"
- Check that SUPABASE_URL starts with `https://`
- Make sure there are no extra spaces or characters
- Verify the URL is exactly as shown in Supabase dashboard

### Error: "Unauthorized" 
- Check that SUPABASE_ANON_KEY is the correct anon public key
- Make sure the key is complete (they're usually quite long)

### Session Issues (Login works but then redirects back to login)

This is a common issue with serverless deployments. Try these fixes:

1. **Set SESSION_SECRET environment variable**:
   ```
   SESSION_SECRET=your-very-long-random-secret-string-here-make-it-at-least-32-characters
   ```

2. **Enable session debugging** by setting:
   ```
   DEBUG_SESSIONS=true
   ```

3. **Check Vercel function logs**:
   - Go to your Vercel dashboard → Functions tab
   - Look for session-related errors in the logs

4. **Generate a strong session secret**:
   ```bash
   # Run this locally to generate a secure secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   
5. **Verify cookie settings**:
   - Make sure your domain supports secure cookies (HTTPS)
   - Check that no ad blockers are interfering with cookies

### Still having issues?
- Check the Vercel deployment logs for specific error messages
- Verify your Supabase project is active and accessible  
- Test your credentials locally first with `node test-supabase-connection.js`
- Look for 🔐 and 📍 emoji in the function logs for session debugging info

## Security Note

- Never commit your actual `.env` file to git
- The `.env` file should be in your `.gitignore` 
- Only use environment variables for sensitive data in production