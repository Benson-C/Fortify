# Deployment Guide - Vercel

This guide will walk you through deploying the Health & Fitness Research Study Platform to Vercel.

## Prerequisites

Before deploying, ensure you have:

- ✅ A **GitHub account** (or GitLab/Bitbucket)
- ✅ Your code **pushed to a Git repository**
- ✅ A **Vercel account** ([Sign up](https://vercel.com/signup) - free tier available)
- ✅ Your **Supabase project** set up and running
- ✅ **Environment variables** ready (Supabase URL and keys)

## Step 1: Prepare Your Repository

### 1.1 Push Code to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git (if not already done)
git init

# Add remote repository
git remote add origin https://github.com/your-username/your-repo-name.git

# Commit all changes
git add .
git commit -m "Ready for deployment"

# Push to GitHub
git push -u origin main
```

### 1.2 Verify Build Works Locally

Test that your app builds successfully:

```bash
npm run build
```

If the build succeeds, you're ready to deploy!

## Step 2: Deploy to Vercel

### 2.1 Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**

### 2.2 Configure Project Settings

Vercel will auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (project root)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

**Click "Deploy"** - Vercel will start the first deployment (it will fail without environment variables, which is expected).

## Step 3: Configure Environment Variables

### 3.1 Add Environment Variables in Vercel

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add each variable:

#### Required Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Optional Variables:

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 3.2 Get Your Supabase Credentials

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3.3 Set Environment Variables

For each variable:
1. Click **"Add New"**
2. Enter the **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the **Value** (your actual Supabase URL)
4. Select **Environments**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

**Important Notes:**
- Variables with `NEXT_PUBLIC_` prefix are exposed to the browser
- Never add `SUPABASE_SERVICE_ROLE_KEY` as a public variable (server-side only)
- After adding variables, you need to **redeploy** for them to take effect

## Step 4: Redeploy with Environment Variables

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Select **"Use existing Build Cache"** (optional)
5. Click **"Redeploy"**

Or trigger a new deployment by:
- Pushing a new commit to your repository
- Vercel will automatically redeploy with the new environment variables

## Step 5: Verify Deployment

### 5.1 Check Deployment Status

1. Go to **Deployments** tab in Vercel
2. Wait for deployment to complete (usually 1-3 minutes)
3. Status should show **"Ready"** with a green checkmark

### 5.2 Test Your Application

1. Click the deployment URL (e.g., `https://your-app.vercel.app`)
2. Test these features:
   - ✅ Landing page loads
   - ✅ Registration works
   - ✅ Login works
   - ✅ Dashboard loads after login
   - ✅ Events page loads
   - ✅ Database operations work

### 5.3 Check Browser Console

Open Developer Tools (F12) → Console:
- ✅ No errors related to Supabase
- ✅ No missing environment variable errors
- ✅ Authentication works

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain

1. Go to **Settings** → **Domains**
2. Enter your domain (e.g., `app.yourdomain.com`)
3. Click **"Add"**

### 6.2 Configure DNS

Vercel will provide DNS instructions:
- Add a **CNAME** record pointing to Vercel
- Or add **A** records for apex domains

### 6.3 Update Environment Variables

If using a custom domain, update:

```env
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Build completes successfully
- [ ] Landing page loads
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads
- [ ] Database queries work
- [ ] No console errors
- [ ] Custom domain configured (if applicable)

## Troubleshooting

### Build Fails

**Error: "Missing Supabase environment variables"**
- ✅ Verify environment variables are set in Vercel
- ✅ Check variable names are correct (case-sensitive)
- ✅ Ensure variables are enabled for Production environment
- ✅ Redeploy after adding variables

**Error: "Module not found"**
- ✅ Check `package.json` has all dependencies
- ✅ Verify `npm install` completes successfully
- ✅ Check for TypeScript errors: `npm run build` locally

**Error: "Build timeout"**
- ✅ Check build logs for specific errors
- ✅ Verify Next.js version compatibility
- ✅ Check for large dependencies slowing build

### Runtime Errors

**Error: "Invalid API key"**
- ✅ Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- ✅ Check key hasn't been rotated in Supabase
- ✅ Ensure key is the "anon public" key, not service role key

**Error: "Failed to fetch"**
- ✅ Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- ✅ Check Supabase project is active (not paused)
- ✅ Verify CORS settings in Supabase (should allow Vercel domain)

**Error: "Database error"**
- ✅ Verify database schema is applied in Supabase
- ✅ Check Supabase Postgres logs for errors
- ✅ Verify RLS policies are set up correctly

### Authentication Issues

**Users can't register/login**
- ✅ Check Supabase Auth is enabled
- ✅ Verify email provider is configured in Supabase
- ✅ Check Supabase Auth logs for errors
- ✅ Verify environment variables are set correctly

**Sessions not persisting**
- ✅ Check middleware is working (check Vercel function logs)
- ✅ Verify cookie settings in Supabase
- ✅ Check browser console for cookie errors

## Environment-Specific Configuration

### Production Environment

Set these in Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Preview Environment (Pull Requests)

Vercel automatically creates preview deployments for PRs. Use the same environment variables, or set different ones for testing.

### Development Environment

For local development, use `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Continuous Deployment

Vercel automatically deploys:
- ✅ **Production**: Every push to `main` branch
- ✅ **Preview**: Every pull request
- ✅ **Development**: Every push to other branches (if configured)

### Deployment Workflow

1. **Push code** to GitHub
2. **Vercel detects** the push
3. **Builds** your application
4. **Deploys** to production/preview
5. **Notifies** you via email/Slack (if configured)

## Monitoring & Logs

### View Logs in Vercel

1. Go to **Deployments** → Select a deployment
2. Click **"Functions"** tab to see serverless function logs
3. Click **"Logs"** to see build and runtime logs

### View Logs in Supabase

1. Go to **Supabase Dashboard** → **Logs**
2. Check **Postgres Logs** for database errors
3. Check **API Logs** for API request errors
4. Check **Auth Logs** for authentication issues

## Performance Optimization

### Build Optimization

- ✅ Use Next.js Image component for images
- ✅ Enable static generation where possible
- ✅ Minimize bundle size (check `npm run build` output)

### Runtime Optimization

- ✅ Enable Vercel Edge Functions for middleware (if needed)
- ✅ Use Supabase connection pooling
- ✅ Implement caching where appropriate

## Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to git (already in `.gitignore`)
- ✅ Use `NEXT_PUBLIC_` prefix only for browser-accessible variables
- ✅ Never expose service role keys to the client
- ✅ Rotate keys regularly in Supabase

### Supabase Security

- ✅ Enable RLS on all tables
- ✅ Review RLS policies regularly
- ✅ Use least-privilege principles
- ✅ Monitor Supabase logs for suspicious activity

## Rollback Deployment

If something goes wrong:

1. Go to **Deployments** tab
2. Find a previous working deployment
3. Click **"..."** menu → **"Promote to Production"**

This instantly rolls back to the previous version.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Environment Variables Best Practices](https://vercel.com/docs/concepts/projects/environment-variables)

## Quick Reference

### Deployment Commands

```bash
# Test build locally
npm run build

# Deploy via Vercel CLI (alternative to web UI)
npm install -g vercel
vercel login
vercel
```

### Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL (optional)
- [ ] `NODE_ENV=production` - Set automatically by Vercel

### Common Issues Quick Fix

| Issue | Quick Fix |
|-------|-----------|
| Build fails | Check build logs, verify dependencies |
| Environment variables not working | Redeploy after adding variables |
| Database errors | Verify schema is applied in Supabase |
| Auth not working | Check Supabase Auth settings |
| 500 errors | Check Supabase Postgres logs |
