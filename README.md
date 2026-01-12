# Health & Fitness Research Study Platform

A Next.js web application for managing research study participants who attend workout sessions, with health metrics tracking and administrative oversight.

## 🚀 Quick Start for Beginners

**New to web development?** Start here: **[QUICK_START.md](./QUICK_START.md)**

This beginner-friendly guide walks you through every step with detailed explanations.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Charts**: Recharts
- **Validation**: Zod

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** 18.x or higher ([Download](https://nodejs.org/))
   - ⚠️ **Important**: After installing, **restart your computer**
   - **Verify it worked**: 
     - Open Terminal (Mac/Linux) or Command Prompt (Windows)
     - Type: `node --version`
     - You should see something like `v18.x.x` or higher
     - If you see "command not found", Node.js didn't install correctly

2. **npm** (comes with Node.js automatically - no separate install needed)
   - **Verify it worked**: Type `npm --version` in Terminal/Command Prompt
   - You should see something like `9.x.x` or higher

### Optional but Recommended

3. **Git** ([Download](https://git-scm.com/))
   - Needed if you want to use version control
   - **Verify it worked**: Type `git --version`

4. **A code editor** (VS Code recommended: [Download](https://code.visualstudio.com/))
   - Makes editing files much easier than Notepad/TextEdit

### Accounts Needed

5. **Supabase account** ([Sign up](https://supabase.com) - free tier available)
   - You'll create this during setup (Step 3)

**Don't have these yet?** Follow the detailed installation guide in [QUICK_START.md](./QUICK_START.md) Step 1.

## Setup Instructions

> 💡 **First time setting up?** Check out [QUICK_START.md](./QUICK_START.md) for a step-by-step beginner's guide with detailed explanations of every step.

**Setup Checklist:**
- [ ] Node.js installed and verified
- [ ] Project code downloaded/cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Database schema applied (`schema.sql` run in Supabase)
- [ ] Supabase credentials copied
- [ ] `.env.local` file created with credentials
- [ ] Development server started (`npm run dev`)
- [ ] App opens in browser at `http://localhost:3000`
- [ ] Registration works

### 1. Get the Project Code

**Option A: From GitHub**
```bash
# Clone the repository
git clone <repository-url>
cd bennopi_webapp
```

**Option B: If you have the code locally**
```bash
# Navigate to your project folder
cd /path/to/bennopi_webapp
```

**Option C: Download as ZIP**
1. Download the repository as a ZIP file
2. Extract it to a folder
3. Open Terminal/Command Prompt in that folder

### 2. Install Dependencies

**What are dependencies?** They're code libraries (pre-written code) that your project needs to run. Think of them as tools your app uses.

1. Make sure you're in the project folder in Terminal/Command Prompt
2. Type this command:
   ```bash
   npm install
   ```
3. Press Enter
4. **Wait 2-5 minutes** - you'll see a lot of text scrolling (this is normal!)
5. When it's done, you'll see something like "added 500 packages" and return to the command prompt

**What just happened?**
- npm downloaded all the code libraries your app needs
- It created a `node_modules` folder (you can ignore this - it's just where the libraries are stored)
- Your project is now ready to run!

**Troubleshooting:**
- ❌ **"command not found"** → Node.js isn't installed (go back to Prerequisites)
- ⏳ **Takes a long time** → This is normal! npm is downloading hundreds of files
- ❌ **"npm ERR!"** → Check your internet connection, then try again
- ⚠️ **Warnings (yellow text)** → Usually safe to ignore, but read them to be sure

### 3. Set Up Supabase Project

**What is Supabase?** It's a service that provides your database (where data is stored) and user authentication (login system).

#### 3.1 Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub (easiest) or email
4. Verify your email if prompted

#### 3.2 Create a Supabase Project

1. In the Supabase dashboard, click **"New Project"** (big green button)
2. Fill in the project details:
   - **Name**: Choose any name (e.g., "My Research Study")
   - **Database Password**: 
     - ⚠️ **IMPORTANT**: Create a strong password and **save it somewhere safe**
     - You'll need this if you want to connect to the database directly later
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Select **"Free"** (perfect for development and testing)
3. Click **"Create new project"**
4. **Wait 2-3 minutes** - Supabase is setting up your database
5. You'll see a loading screen - wait until it says "Project is ready"

#### 3.3 Set Up Database Schema

**What is a schema?** It's the structure of your database - it defines what tables exist and how they're organized.

1. In your Supabase project dashboard, look at the **left sidebar**
2. Click **"SQL Editor"** (it has a database/table icon)
3. Click **"New query"** button (top right)
4. Open the file `supabase/schema.sql` from this project in a text editor
5. **Select all** the text (Ctrl+A or Cmd+A) and **copy** it (Ctrl+C or Cmd+C)
6. Go back to Supabase SQL Editor and **paste** the text (Ctrl+V or Cmd+V)
7. Click the **"Run"** button (or press `Cmd+Enter` on Mac or `Ctrl+Enter` on Windows)
8. Wait a few seconds
9. You should see: **"Success. No rows returned"** ✅

**What just happened?** You created:
- **Database tables**: `users`, `events`, `bookings`, `health_metrics` (where your data is stored)
- **Security rules**: Row Level Security (RLS) policies (who can access what data)
- **Automatic functions**: Triggers that create user profiles when someone registers
- **Performance indexes**: To make database queries faster

**If you see an error:**
- Make sure you copied the ENTIRE file (from the first line to the last line)
- Make sure there are no extra spaces at the beginning
- Try clicking "Run" again
- Check the error message - it will tell you what went wrong

#### 3.4 Get Your Supabase Credentials

**What are credentials?** They're like passwords that let your app communicate with Supabase.

1. In your Supabase project dashboard, click **"Settings"** (gear icon in left sidebar)
2. Click **"API"** (under Project Settings)
3. You'll see several sections - you need two values:

**Value 1: Project URL**
- Find the section labeled **"Project URL"**
- You'll see a URL like: `https://abcdefghijklmnop.supabase.co`
- Click the **copy icon** next to it (or select and copy manually)
- Save this somewhere temporarily (Notepad, Notes app, etc.)

**Value 2: Anon Public Key**
- Scroll down to **"Project API keys"**
- Find the **"anon"** key (it says "public" next to it)
- ⚠️ **Important**: Use the "anon" key, NOT the "service_role" key
- The key is a long string starting with `eyJ...` or `sb_publishable_...`
- If it's hidden, click the **eye icon** to reveal it
- Click the **copy icon** to copy it
- Save this somewhere temporarily

**What's the difference?**
- **anon key**: Safe to use in your app (this is what you need)
- **service_role key**: Secret key - never use this in your app!

### 4. Configure Environment Variables

**What are environment variables?** They're settings your app needs to run, stored in a special file that your app reads when it starts.

#### 4.1 Create `.env.local` File

**Where?** In your project root folder (same folder as `package.json`)

**💡 Tip:** There's a template file `.env.example` in the project. You can copy it:
```bash
# Mac/Linux
cp .env.example .env.local

# Windows
copy .env.example .env.local
```
Then edit `.env.local` and fill in your values.

**Or create it manually:**

**Method 1: Using Terminal/Command Prompt (Easiest)**
```bash
# Mac/Linux
touch .env.local

# Windows
type nul > .env.local
```

**Method 2: Using a Code Editor**
- Open your project in VS Code, Sublime Text, or any text editor
- Click "New File"
- Name it exactly: `.env.local` (including the dot at the start)
- Save it

**Method 3: Using File Explorer (Windows)**
- Right-click in your project folder → New → Text Document
- Name it exactly: `.env.local` (including the dot at the start)
- Windows might warn you about changing the file extension - click **"Yes"**
- ⚠️ **Important**: If Windows creates `.env.local.txt`, you need to:
  1. Right-click the file → Rename
  2. Remove `.txt` so it's just `.env.local`
  3. Windows will warn you again - click "Yes"

**Method 4: Copy from Template (Easiest!)**
- There's a file called `.env.example` in your project
- Copy it and rename to `.env.local`:
  ```bash
  # Mac/Linux
  cp .env.example .env.local
  
  # Windows
  copy .env.example .env.local
  ```
- Then edit `.env.local` and fill in your actual values

**⚠️ Important Rules:**
- File must be named exactly `.env.local` (not `.env.local.txt` or `env.local`)
- Must start with a dot (`.`)
- Must be in the project root folder (same folder as `package.json`)

#### 4.2 Add Environment Variables

1. Open the `.env.local` file you just created (use any text editor)
2. Copy and paste this template:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Replace the placeholders** with your actual values from Step 3.4:
   - Replace `your-project-url-here` with the Project URL you copied
   - Replace `your-anon-key-here` with the anon key you copied

**Example of what it should look like (with fake values):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

**⚠️ Make sure you:**
- Replace the example values with YOUR actual values from Supabase
- Don't use the example values above (they're fake!)
- The URL should start with `https://` and end with `.supabase.co`
- The key is a very long string (usually 200+ characters)

**⚠️ Critical Rules:**
- ✅ **No spaces** around the `=` sign (correct: `KEY=value`, wrong: `KEY = value`)
- ✅ **No quotes** around the values (unless the value has spaces, which these don't)
- ✅ Each variable on its own line
- ✅ Don't add extra text, comments, or blank lines (for now)
- ✅ Make sure you're using the **anon key**, not the service_role key

4. **Save the file**

#### 4.3 Verify Environment Variables

After saving `.env.local`, make sure it worked:

**Method 1: Using Terminal/Command Prompt**
```bash
# Mac/Linux
cat .env.local

# Windows
type .env.local
```

You should see your two lines with your actual values (not the placeholder text).

**Method 2: Open in Text Editor**
- Open `.env.local` in any text editor
- You should see two lines with your Supabase URL and key

**Common Issues:**
- ❌ **File is empty** → You didn't save it, or you saved it as a different file
  - Solution: Open the file, paste the content again, save it
- ❌ **File named `.env.local.txt`** → Windows added `.txt` extension
  - Solution: Rename the file to remove `.txt`
- ❌ **Shows placeholder text** → You didn't replace the placeholders
  - Solution: Replace `your-project-url-here` and `your-anon-key-here` with your actual values
- ❌ **Variables not loading** → You need to restart the dev server
  - Solution: Stop the server (Ctrl+C) and start it again (`npm run dev`)

### 5. Start Development Server

**What is a development server?** It's a local version of your app that runs on your computer for testing.

1. Make sure you're in your project folder in Terminal/Command Prompt
2. Type this command:
   ```bash
   npm run dev
   ```
3. Wait 10-30 seconds - you'll see text scrolling (this is normal!)
4. When it's ready, you'll see:
   ```
   ✓ Ready in 2.5s
   ○ Local: http://localhost:3000
   ```
5. **⚠️ Don't close the Terminal window!** The server needs to keep running.

**Open Your App:**
1. Open your web browser (Chrome, Firefox, Safari, Edge - any browser works)
2. In the address bar, type: `http://localhost:3000`
3. Press Enter
4. You should see the landing page! 🎉

**What is localhost?** 
- `localhost` means "this computer" 
- You're running the app on your own machine for testing
- It's not on the internet - only you can access it
- `3000` is the port number (like a door number for your app)

**Can't see the page?**
- Make sure the Terminal window is still open (the server needs to keep running)
- Make sure you typed `http://localhost:3000` (not `https://` and not a different port)
- Try refreshing the page (F5 or Cmd+R / Ctrl+R)
- Check the Terminal for error messages

**First Time Setup:**
- ✅ If you see the landing page: Everything is working!
- ❌ If you see errors about "missing environment variables": 
  - Check your `.env.local` file has the correct values
  - **Restart the server**: Press `Ctrl+C` to stop, then type `npm run dev` again
- ⚠️ **Important**: You must restart the server after creating or modifying `.env.local`

### 6. Test Registration

Let's make sure everything works!

1. On the landing page (`http://localhost:3000`), click **"Register"** or **"Get Started"**
2. Fill in the registration form:
   - **Full Name**: Your name (required)
   - **Email**: Your email address (required)
   - **Password**: At least 6 characters (required)
   - **Phone Number**: (Optional - can leave blank)
   - **ID Number**: (Optional - can leave blank)
3. Click **"Create Account"** or **"Register"**
4. You should be redirected to the dashboard! ✅

**If registration fails:**
- Check the browser console (Press F12 → Console tab) for error messages
- Make sure your `.env.local` file has the correct values
- Make sure you restarted the server after creating `.env.local`
- See the Troubleshooting section below or check `documentation/TROUBLESHOOTING_DATABASE_ERROR.md`

### 7. Create an Admin Account (Optional)

By default, all new users are "participants". To make yourself an administrator:

1. Go back to your Supabase project dashboard
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New query"** button
4. Copy and paste this SQL command (replace with your email):

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

5. **Replace `your-email@example.com`** with the email address you used to register
6. Click **"Run"** button (or press `Cmd+Enter` / `Ctrl+Enter`)
7. You should see: **"Success. 1 row updated"** ✅
8. Go back to your app (`http://localhost:3000`)
9. **Refresh the page** (F5 or Cmd+R / Ctrl+R) or log out and log back in
10. You should now see the admin dashboard instead of the participant dashboard!

**What's the difference?**
- **Participants**: Can book events, track health metrics, view their own data
- **Admins**: Can create/edit events, view all participants, access analytics

### 8. Verify Everything Works

#### 8.1 Test Authentication

Try these to make sure authentication works:
- ✅ Can register a new user (Step 6)
- ✅ Can log out (if there's a logout button)
- ✅ Can log in with the credentials you just created
- ✅ Participants see the dashboard after login
- ✅ Admins see the admin dashboard after login (if you promoted yourself)

#### 8.2 Test Database Connection

Check that your app can talk to the database:
- ✅ No red errors in browser console (Press F12 → Console tab)
- ✅ No errors in Terminal where the server is running
- ✅ Pages load without "Failed to fetch" errors
- ✅ Registration works (creates a user in the database)

**How to check browser console:**
1. Press `F12` (or right-click → Inspect)
2. Click the **"Console"** tab
3. Look for red error messages
4. Green checkmarks or no errors = everything is working!

#### 8.3 Common Issues

**Error: "Missing Supabase environment variables"**
- ✅ Verify `.env.local` file exists in the project root folder
- ✅ Check the file has content (open it and look)
- ✅ Check variable names are exactly correct (case-sensitive):
  - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URLS`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `ANON_KEY` or `SUPABASE_KEY`)
- ✅ **Restart dev server**: 
  - Press `Ctrl+C` in Terminal to stop the server
  - Type `npm run dev` again to start it
  - Refresh your browser

**Error: "Invalid API key"**
- ✅ Go to Supabase Dashboard → Settings → API
- ✅ Copy the keys again (they might have changed or you copied the wrong one)
- ✅ Make sure you're using the **"anon"** key (public), NOT the "service_role" key
- ✅ Check for extra spaces in `.env.local` (should be `KEY=value` not `KEY = value`)
- ✅ Make sure `NEXT_PUBLIC_SUPABASE_URL` starts with `https://` (not `http://`)
- ✅ Update `.env.local` with the correct values
- ✅ Restart the dev server

**Error: "Database error saving new user" or Status 500**
- ✅ Verify `schema.sql` ran successfully in Supabase SQL Editor (Step 3.3)
- ✅ Check Supabase Dashboard → Logs → Postgres Logs for specific errors
- ✅ See detailed guide: `documentation/TROUBLESHOOTING_DATABASE_ERROR.md`
- ✅ Common cause: Database trigger not set up correctly

**Error: "infinite recursion detected in policy for relation users"**
- ✅ **CRITICAL**: This must be fixed first! It prevents all RLS policies from working
- ✅ **Quick Fix**: Run `supabase/fix_infinite_recursion.sql` in Supabase SQL Editor
- ✅ **Detailed Guide**: See `documentation/FIX_INFINITE_RECURSION.md`
- ✅ **Cause**: Admin policies query the users table, which triggers the policy again → infinite loop
- ✅ **Solution**: Use a `security definer` helper function that bypasses RLS

**Error: "new row violates row-level security policy for table users"**
- ✅ This means the database trigger failed and the fallback insert was blocked by RLS
- ✅ **EASIEST FIX**: Run `supabase/COMPLETE_FIX.sql` - fixes everything at once!
- ✅ **OR fix step-by-step**:
  1. If you see "infinite recursion": Run `supabase/fix_infinite_recursion.sql` FIRST
  2. Then run `supabase/fix_insert_policy.sql` (more permissive INSERT policy)
  3. Or run `supabase/fix_rls_trigger.sql` (complete trigger + policy fix)
- ✅ **Detailed Guide**: See `documentation/FIX_RLS_POLICY_ERROR.md`
- ✅ Common causes:
  - Infinite recursion error preventing policies from working (fix first!)
  - INSERT policy too strict (doesn't allow fallback registration)
  - Trigger function missing `security definer`
  - Trigger not enabled
  - Session timing issue (auth.uid() not available when fallback runs)

## Project Structure

```
bennopi_webapp/
├── app/                    # Next.js app directory
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── dashboard/          # User dashboard
│   ├── events/             # Events management
│   └── admin/              # Admin dashboard
├── lib/                    # Utility functions
│   ├── supabase/           # Supabase client setup
│   └── validations.ts      # Zod schemas
├── components/             # React components
├── supabase/               # Database schema
│   └── schema.sql          # Database schema
└── documentation/          # Project documentation
    └── PRD.md             # Product Requirements Document
```

## Features

- ✅ User authentication (register/login)
- ✅ Role-based access (participant/admin)
- ✅ Events management
- ✅ Booking system with calendar view
- ✅ Health metrics tracking
- ✅ Data visualization
- ✅ 24-hour cancellation policy
- ✅ Admin dashboard with analytics

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm run start

# Run ESLint
npm run lint

# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes**: Edit files in `app/`, `lib/`, etc.
3. **See changes**: Browser auto-refreshes (Hot Module Replacement)
4. **Check for errors**: Watch terminal and browser console
5. **Run linter**: `npm run lint` before committing

### Project Structure

```
bennopi_webapp/
├── app/                    # Next.js app directory (App Router)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home/landing page
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── dashboard/          # Participant dashboard
│   ├── events/             # Events listing and booking
│   └── admin/              # Admin dashboard
├── lib/                    # Utility functions and helpers
│   ├── supabase/           # Supabase client configuration
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server-side client
│   │   └── middleware.ts  # Middleware client
│   ├── auth.ts            # Authentication utilities
│   ├── validations.ts     # Zod schemas
│   └── utils.ts           # General utilities
├── components/            # React components (to be created)
├── supabase/             # Database schema and migrations
│   ├── schema.sql         # Main database schema
│   └── create_admin.sql   # Admin creation script
├── middleware.ts          # Next.js middleware (auth/routing)
├── .env.local            # Environment variables (gitignored)
├── .env.example          # Environment variable template
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Troubleshooting

> 💡 **Need more help?** Check [QUICK_START.md](./QUICK_START.md) for beginner-friendly troubleshooting, or see the detailed guides in `documentation/` folder.

### Environment Variables Not Loading

**Symptoms:**
- Error message: "Missing Supabase environment variables"
- App shows errors about configuration
- Variables appear as `undefined` in code

**Solutions (try in order):**
1. **Verify file exists and location:**
   - File must be named exactly `.env.local`
   - File must be in the project root (same folder as `package.json`)
   - Check: Open Terminal in project folder, type `ls -la .env.local` (Mac/Linux) or `dir .env.local` (Windows)

2. **Check file has content:**
   ```bash
   # Mac/Linux
   cat .env.local
   
   # Windows
   type .env.local
   ```
   - Should show your two environment variables
   - If empty or shows nothing, the file wasn't saved correctly

3. **Check for common mistakes:**
   - ✅ No spaces around `=` (correct: `KEY=value`, wrong: `KEY = value`)
   - ✅ No quotes around values (correct: `KEY=value`, wrong: `KEY="value"`)
   - ✅ Variable names are exactly correct (case-sensitive)
   - ✅ Each variable on its own line

4. **Restart dev server completely:**
   - Press `Ctrl+C` in Terminal to stop the server
   - Wait a few seconds
   - Type `npm run dev` again
   - Refresh your browser

5. **Clear Next.js cache (if still not working):**
   ```bash
   # Delete the cache folder
   rm -rf .next
   
   # Then restart server
   npm run dev
   ```

### Database Connection Issues

**Symptoms:**
- Error: "Invalid API key"
- Error: "Failed to fetch"
- Error: "Table not found"
- Error: "RLS policy" or "permission denied"

**Solutions:**

1. **Verify Supabase project is active:**
   - Go to Supabase Dashboard
   - Check if project shows as "Active" (not "Paused")
   - Free tier projects pause after inactivity - click "Restore" if paused

2. **Check API keys are correct:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the keys again
   - Make sure you're using the **anon** key (public), not service_role
   - Update `.env.local` with the correct values
   - Restart dev server

3. **Verify database schema is set up:**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
   - Should show: `users`, `events`, `bookings`, `health_metrics`
   - If tables are missing, run `schema.sql` again (Step 3.3)

4. **Check for specific errors:**
   - Open browser console (F12 → Console tab)
   - Look for red error messages
   - Copy the error message and check `documentation/TROUBLESHOOTING_DATABASE_ERROR.md`

### Build Errors

**Symptoms:**
- Error messages when running `npm run build`
- TypeScript errors
- ESLint warnings/errors

**Solutions:**

1. **Check what the error is:**
   - Read the error message in Terminal
   - It will tell you which file has the problem and what's wrong

2. **Run checks individually:**
   ```bash
   # Check TypeScript errors
   npx tsc --noEmit
   
   # Check linting errors
   npm run lint
   ```
   - Fix any errors shown
   - Common fixes: typos, missing imports, type mismatches

3. **Reinstall dependencies (if weird errors):**
   ```bash
   # Delete node_modules and package-lock.json
   rm -rf node_modules package-lock.json
   
   # Reinstall
   npm install
   
   # Try building again
   npm run build
   ```

4. **If you're stuck:**
   - Copy the full error message
   - Check if it's a known issue in `documentation/`
   - Search the error message online

### Authentication Issues

**Symptoms:**
- Can't log in (wrong password error even with correct password)
- Redirects not working (stays on login page)
- Session not persisting (logged out after refresh)

**Solutions:**

1. **Clear browser data:**
   - Press `F12` to open Developer Tools
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Find **Cookies** → `http://localhost:3000`
   - Right-click → **Clear** or delete all cookies
   - Refresh the page and try again

2. **Check if middleware is running:**
   - Look at Terminal where `npm run dev` is running
   - You should see logs when you navigate pages
   - If no logs, middleware might not be working

3. **Verify Supabase Auth is enabled:**
   - Go to Supabase Dashboard → Authentication → Providers
   - Make sure **Email** provider is enabled
   - If disabled, enable it and try again

4. **Check browser console for errors:**
   - Press `F12` → Console tab
   - Look for red error messages
   - Common errors: "Invalid API key", "Network error", "CORS error"
   - Fix based on the specific error message

## Production Deployment

### Deploy to Vercel

For detailed deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

**Quick Start:**
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel Settings
4. Deploy!

**Required Environment Variables in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL (optional)

### Build for Production

```bash
npm run build
```

### Security Notes

- ⚠️ **Never commit `.env.local`** to git (already in `.gitignore`)
- ⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the client
- ✅ Use `NEXT_PUBLIC_*` prefix only for variables needed in the browser
- ✅ Keep service role key server-side only

### Other Hosting Platforms

- **Netlify**: Similar to Vercel, set environment variables in Site Settings
- **Railway**: Set environment variables in project settings
- **AWS/DigitalOcean**: Configure environment variables in your hosting platform's dashboard

## Deployment

For detailed deployment instructions to Vercel, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

**Quick Deploy:**
1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vercel Deployment Guide](./DEPLOYMENT.md)

## Getting Help

If you're stuck and the troubleshooting didn't help:

1. **Check the error message carefully:**
   - Read the full error (don't just read the first line)
   - Error messages usually tell you exactly what's wrong

2. **Check the documentation:**
   - **[QUICK_START.md](./QUICK_START.md)** - Beginner-friendly guide with detailed explanations
   - **[DEPLOYMENT.md](./DEPLOYMENT.md)** - How to deploy to production
   - **`documentation/` folder** - Detailed troubleshooting guides:
     - `TROUBLESHOOTING_DATABASE_ERROR.md` - Database issues
     - `FIX_500_ERROR.md` - Status 500 errors
     - `DEBUGGING.md` - How to debug registration
     - `SUPABASE_SETUP_CHECK.md` - Verify Supabase setup

3. **Check these locations for clues:**
   - **Browser console** (F12 → Console tab) - Client-side errors
   - **Terminal/Command Prompt** - Server-side errors
   - **Supabase Dashboard → Logs** - Database errors

4. **Verify setup steps:**
   - Did you complete all steps in order?
   - Did you see "Success" messages for each step?
   - Did you restart the server after creating `.env.local`?

5. **Common beginner mistakes:**
   - Forgot to save `.env.local` file
   - Used wrong variable names (typos, wrong case)
   - Didn't restart server after changing `.env.local`
   - Copied the wrong Supabase key (service_role instead of anon)
   - Didn't run `schema.sql` in Supabase

## Additional Resources

- **[QUICK_START.md](./QUICK_START.md)** - Complete beginner's guide ⭐ **Start here if you're new!**
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js
- [Supabase Documentation](https://supabase.com/docs) - Learn about Supabase
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Learn about styling
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - Learn about TypeScript
- [Vercel Deployment Guide](./DEPLOYMENT.md) - Deploy your app online
