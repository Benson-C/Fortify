# Quick Start Guide for Beginners

This guide is designed for complete beginners. If you're new to web development, follow these steps carefully.

## What You'll Need

Before starting, make sure you have:

1. **A computer** (Mac, Windows, or Linux)
2. **Internet connection**
3. **A web browser** (Chrome, Firefox, Safari, or Edge)
4. **About 30 minutes** for initial setup

## Step 1: Install Required Software

### 1.1 Install Node.js

**What is Node.js?** It's software that lets you run JavaScript on your computer (not just in browsers).

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS version** (recommended for most users)
3. Run the installer
4. Follow the installation wizard (click "Next" through all steps)
5. **Restart your computer** after installation

**Verify it worked:**
- Open **Terminal** (Mac/Linux) or **Command Prompt** (Windows)
- Type: `node --version`
- You should see something like `v18.x.x` or higher
- If you see an error, Node.js didn't install correctly

**What is Terminal/Command Prompt?**
- **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
- **Windows**: Press `Windows + R`, type "cmd", press Enter
- **Linux**: Usually `Ctrl + Alt + T`

### 1.2 Verify npm is Installed

**What is npm?** It's a package manager that comes with Node.js. It helps install code libraries.

1. In Terminal/Command Prompt, type: `npm --version`
2. You should see something like `9.x.x` or higher
3. If it works, you're ready to continue!

### 1.3 Install Git (Optional but Recommended)

**What is Git?** It's version control software that tracks changes to your code.

1. Go to [git-scm.com](https://git-scm.com/)
2. Download for your operating system
3. Run the installer
4. Use default settings (click "Next" through all steps)

**Verify it worked:**
- In Terminal/Command Prompt, type: `git --version`
- You should see something like `git version 2.x.x`

## Step 2: Get the Project Code

You have two options:

### Option A: If the Code is on GitHub

1. Go to the GitHub repository page
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP file to a folder (e.g., `Desktop` or `Documents`)
5. Open Terminal/Command Prompt
6. Navigate to the folder:
   ```bash
   # Example: If you saved it to Desktop
   cd ~/Desktop/bennopi_webapp
   
   # Or on Windows:
   cd C:\Users\YourName\Desktop\bennopi_webapp
   ```

### Option B: If You Have the Code Locally

1. Open Terminal/Command Prompt
2. Navigate to your project folder:
   ```bash
   cd /path/to/your/project
   ```

**How to navigate in Terminal:**
- `cd folder-name` - Go into a folder
- `cd ..` - Go back one folder
- `ls` (Mac/Linux) or `dir` (Windows) - See what's in current folder
- `pwd` (Mac/Linux) or `cd` (Windows) - See current folder path

## Step 3: Install Project Dependencies

**What are dependencies?** They're code libraries your project needs to run.

1. Make sure you're in the project folder (see Step 2)
2. Type this command:
   ```bash
   npm install
   ```
3. Wait for it to finish (this may take 2-5 minutes)
4. You'll see a lot of text scrolling - this is normal!
5. When it's done, you'll see something like "added 500 packages"

**Common Issues:**
- **Error: "command not found"** → Node.js isn't installed (go back to Step 1.1)
- **Error: "permission denied"** → Try: `sudo npm install` (Mac/Linux) or run Command Prompt as Administrator (Windows)
- **Takes a long time** → This is normal, be patient!

## Step 4: Create a Supabase Account

**What is Supabase?** It's a service that provides a database and user authentication for your app.

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with:
   - **GitHub account** (easiest), OR
   - **Email and password**
4. Verify your email if prompted
5. You're now logged into Supabase!

## Step 5: Create a Supabase Project

1. In Supabase dashboard, click **"New Project"** (big green button)
2. Fill in the form:
   - **Name**: Type any name (e.g., "My Research Study")
   - **Database Password**: 
     - Create a strong password (mix of letters, numbers, symbols)
     - **IMPORTANT**: Save this password somewhere safe! You'll need it later.
   - **Region**: Choose the one closest to you (e.g., "US East" if you're in the US)
   - **Pricing Plan**: Select **"Free"** (perfect for learning/testing)
3. Click **"Create new project"**
4. **Wait 2-3 minutes** - Supabase is setting up your database
5. You'll see a loading screen - wait until it says "Project is ready"

## Step 6: Set Up Your Database

**What is a database?** It's where your app stores information (users, events, etc.).

### 6.1 Open SQL Editor

1. In your Supabase project dashboard, look at the left sidebar
2. Find and click **"SQL Editor"** (it has a database icon)
3. You'll see a big text box - this is where you'll paste code

**What is SQL?** It's a language for talking to databases. Don't worry - you're just copying and pasting!

### 6.2 Copy the Schema File

1. In your project folder, open the file: `supabase/schema.sql`
   - You can open it with any text editor (Notepad, TextEdit, VS Code, etc.)
2. **Select all the text** (Ctrl+A or Cmd+A)
3. **Copy it** (Ctrl+C or Cmd+C)

### 6.3 Paste and Run in Supabase

1. Go back to Supabase SQL Editor
2. **Paste** the copied text into the big text box (Ctrl+V or Cmd+V)
3. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
4. Wait a few seconds
5. You should see: **"Success. No rows returned"** ✅

**What just happened?** You created all the database tables, security rules, and automatic functions your app needs!

**If you see an error:**
- Make sure you copied the ENTIRE file
- Make sure there are no extra spaces at the beginning
- Try clicking "Run" again

## Step 7: Get Your Supabase Keys

**What are keys?** They're like passwords that let your app talk to Supabase.

1. In Supabase dashboard, click **"Settings"** (gear icon in left sidebar)
2. Click **"API"** (under Project Settings)
3. You'll see a page with several sections

### 7.1 Copy Project URL

1. Find the section labeled **"Project URL"**
2. You'll see a URL like: `https://xxxxx.supabase.co`
3. **Copy this entire URL** (click the copy icon or select and copy)
4. Save it somewhere temporarily (Notepad, Notes app, etc.)

### 7.2 Copy Anon Key

1. Scroll down to **"Project API keys"**
2. Find the **"anon"** key (it's the "public" one, not "service_role")
3. You'll see a long string starting with `eyJ...` or `sb_publishable_...`
4. Click the **eye icon** to reveal it (if hidden)
5. Click the **copy icon** to copy it
6. Save it somewhere temporarily

**Important:** 
- The "anon" key is safe to use in your app
- The "service_role" key is secret - don't use it in your app!

## Step 8: Create Environment Variables File

**What are environment variables?** They're settings your app needs to run, stored in a special file.

### 8.1 Create the File

1. In your project folder, create a new file named exactly: `.env.local`
   - **Important**: The file must start with a dot (`.`) and be named `.env.local`
   - **Not**: `.env.local.txt` or `env.local` or anything else

**How to create it:**

**On Mac:**
- Open Terminal in your project folder
- Type: `touch .env.local`
- Press Enter

**On Windows:**
- In your project folder, right-click → New → Text Document
- Name it exactly: `.env.local` (including the dot at the start)
- Windows might warn you - click "Yes"
- If it creates `.env.local.txt`, rename it to remove `.txt`

**Using a Code Editor (Easiest):**
- Open your project in VS Code, Sublime Text, or any code editor
- Click "New File"
- Name it `.env.local`
- Save it

### 8.2 Add Your Credentials

1. Open the `.env.local` file you just created
2. Copy and paste this template:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace the placeholders:
   - Replace `your-project-url-here` with the URL you copied in Step 7.1
   - Replace `your-anon-key-here` with the key you copied in Step 7.2

**Example of what it should look like:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

**Important Rules:**
- ✅ No spaces around the `=` sign
- ✅ No quotes around the values (unless the value has spaces, which it won't)
- ✅ Each variable on its own line
- ✅ Don't add any extra text or comments (for now)

4. **Save the file**

### 8.3 Verify the File

1. Make sure the file is saved
2. In Terminal/Command Prompt, type:
   ```bash
   cat .env.local
   ```
   (On Windows, you might need: `type .env.local`)
3. You should see your two lines with your actual values
4. If you see nothing or an error, the file wasn't created correctly

## Step 9: Start the Development Server

**What is a development server?** It's a local version of your app that runs on your computer.

1. Make sure you're in your project folder in Terminal/Command Prompt
2. Type:
   ```bash
   npm run dev
   ```
3. Wait 10-30 seconds - you'll see text scrolling
4. When it's ready, you'll see:
   ```
   ✓ Ready in 2.5s
   ○ Local: http://localhost:3000
   ```
5. **Don't close the Terminal window!** The server needs to keep running.

### 9.1 Open Your App

1. Open your web browser
2. Go to: `http://localhost:3000`
3. You should see the landing page! 🎉

**What is localhost?** It means "this computer" - you're running the app on your own machine.

**If you see an error:**
- Make sure the Terminal window is still open
- Make sure you see "Ready" in the Terminal
- Try refreshing the browser page
- Check that you're going to `http://localhost:3000` (not `https://`)

## Step 10: Test Registration

Let's make sure everything works!

1. On the landing page, click **"Register"** or **"Get Started"**
2. Fill in the form:
   - **Full Name**: Your name
   - **Email**: Your email address
   - **Password**: At least 6 characters
   - **Phone Number**: (Optional - can leave blank)
   - **ID Number**: (Optional - can leave blank)
3. Click **"Create Account"** or **"Register"**
4. You should be redirected to the dashboard!

**If registration fails:**
- Check the browser console (F12 → Console tab) for error messages
- Make sure your `.env.local` file has the correct values
- Make sure you restarted the server after creating `.env.local`
- See the Troubleshooting section below

## Step 11: Create an Admin Account (Optional)

By default, new users are "participants". To make yourself an admin:

1. Go back to your Supabase dashboard
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New query"**
4. Copy and paste this (replace with your email):

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

5. Replace `your-email@example.com` with the email you used to register
6. Click **"Run"**
7. You should see: "Success. 1 row updated"
8. Go back to your app and **refresh the page** or log out and log back in
9. You should now see the admin dashboard!

## Troubleshooting for Beginners

### "Command not found" Errors

**Problem:** Terminal says "command not found" when you type `node` or `npm`

**Solution:**
- Node.js isn't installed or isn't in your PATH
- Go back to Step 1.1 and reinstall Node.js
- **Restart your computer** after installing
- Try the command again

### "Missing Supabase environment variables" Error

**Problem:** App shows error about missing environment variables

**Solution:**
1. Make sure `.env.local` file exists in your project root folder
2. Make sure it has the correct variable names (exactly as shown)
3. Make sure you saved the file
4. **Restart the dev server:**
   - In Terminal, press `Ctrl+C` to stop the server
   - Type `npm run dev` again to start it
5. Refresh your browser

### "Cannot GET /" or "404" Error

**Problem:** Browser shows a 404 error or "Cannot GET /"

**Solution:**
- Make sure the dev server is running (check Terminal)
- Make sure you're going to `http://localhost:3000` (not a different port)
- Try stopping the server (`Ctrl+C`) and starting it again (`npm run dev`)

### "Invalid API key" Error

**Problem:** App shows "Invalid API key" error

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the keys again (they might have changed)
3. Update your `.env.local` file with the new keys
4. Restart the dev server
5. Refresh your browser

### Database Errors

**Problem:** Registration fails with "Database error"

**Solution:**
1. Make sure you ran the `schema.sql` file in Supabase SQL Editor (Step 6)
2. Check Supabase Dashboard → Logs → Postgres Logs for errors
3. See the detailed troubleshooting guide: `documentation/TROUBLESHOOTING_DATABASE_ERROR.md`

### Port Already in Use

**Problem:** Terminal says "Port 3000 is already in use"

**Solution:**
- Another program is using port 3000
- Find the other program and close it, OR
- Use a different port: `npm run dev -- -p 3001`
- Then go to `http://localhost:3001` instead

## What's Next?

Once everything is working:

1. ✅ Explore the app - try registering, logging in, viewing events
2. ✅ Read the full [README.md](./README.md) for more details
3. ✅ Check [DEPLOYMENT.md](./DEPLOYMENT.md) to learn how to deploy online
4. ✅ Review [documentation/](./documentation/) for advanced topics

## Getting Help

If you're stuck:

1. **Check the error message** - it usually tells you what's wrong
2. **Check browser console** - Press F12, go to Console tab, look for red errors
3. **Check Terminal** - Look for error messages in the server output
4. **Read the troubleshooting guides** in the `documentation/` folder
5. **Check Supabase logs** - Dashboard → Logs → Postgres Logs

## Common Questions

**Q: Do I need to know programming to use this?**
A: Basic setup doesn't require programming, but understanding code helps for customization.

**Q: Is this free?**
A: Yes! Node.js, npm, Git, and Supabase all have free tiers perfect for learning.

**Q: Can I break something?**
A: You can always delete and recreate your Supabase project if something goes wrong!

**Q: How long does setup take?**
A: First time: 30-60 minutes. After that, you can set up a new project in 10-15 minutes.

**Q: What if I make a mistake?**
A: Most mistakes are fixable! Check the troubleshooting section or start over with a fresh Supabase project.
