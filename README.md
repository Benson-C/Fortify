# Health & Fitness Research Study Platform

A Next.js web application for managing research study participants who attend workout sessions, with health metrics tracking and administrative oversight.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Charts**: Recharts
- **Validation**: Zod

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **pnpm**
- **Git** ([Download](https://git-scm.com/))
- A **Supabase account** ([Sign up](https://supabase.com))

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if applicable)
git clone <repository-url>
cd bennopi_webapp

# Install dependencies
npm install
```

### 2. Set Up Supabase Project

#### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: Choose a name for your project
   - **Database Password**: Create a strong password (save this securely)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Select Free tier for development
4. Click **"Create new project"** and wait for provisioning (2-3 minutes)

#### 2.2 Set Up Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents of `schema.sql`
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Cmd/Ctrl + Enter`)
7. Verify success - you should see "Success. No rows returned"

This creates:
- Database tables (users, events, bookings, health_metrics)
- Row Level Security (RLS) policies
- Database functions and triggers
- Indexes for performance

#### 2.3 Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API** (left sidebar)
2. You'll need these values:
   - **Project URL**: Found under "Project URL" (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**: Found under "Project API keys" → "anon" → "public" (starts with `eyJ...` or `sb_publishable_...`)
   - **service_role key**: Found under "Project API keys" → "service_role" → "secret" (⚠️ Keep this secret!)

### 3. Configure Environment Variables

#### 3.1 Create `.env.local` File

1. In the project root directory, create a new file named `.env.local`
   ```bash
   # On macOS/Linux
   touch .env.local
   
   # Or create it manually in your editor
   ```

2. **Important**: The file must be named exactly `.env.local` (not `.env.local.txt` or `.env`)

#### 3.2 Add Environment Variables

Open `.env.local` and add the following variables with your actual Supabase credentials:

```env
# Supabase Configuration
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Environment
NODE_ENV=development
```

**Important Notes:**
- Replace `your-project-id`, `your-anon-key-here`, and `your-service-role-key-here` with your actual values
- **No spaces** around the `=` sign
- **No quotes** around values (unless the value contains spaces)
- Each variable on its own line
- The file should end with a newline

#### 3.3 Verify Environment Variables

After saving `.env.local`, verify it has content:

```bash
# Check file exists and has content
cat .env.local

# Should show your environment variables
```

**Common Issues:**
- ❌ File is empty (0 bytes) → Make sure you saved the file
- ❌ File named `.env.local.txt` → Remove `.txt` extension
- ❌ Variables not loading → Restart dev server after creating/editing `.env.local`

### 4. Start Development Server

```bash
npm run dev
```

The server will start on [http://localhost:3000](http://localhost:3000)

**First Time Setup:**
- If you see errors about missing environment variables, verify your `.env.local` file is correct and restart the server
- The dev server must be restarted after creating or modifying `.env.local`

### 5. Create Admin Account

#### 5.1 Register a User

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **"Register"**
3. Fill in the registration form:
   - Full Name
   - Email (use a real email you can access)
   - Password (minimum 6 characters)
   - Optional: Phone Number, ID Number
4. Click **"Register"**
5. You'll be redirected to the dashboard (as a participant)

#### 5.2 Promote User to Admin

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New query"**
4. Run this SQL command (replace with your email):

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

5. Click **"Run"**
6. Verify: You should see "Success. 1 row updated"
7. **Refresh your browser** or log out and log back in
8. You should now be redirected to `/admin` instead of `/dashboard`

### 6. Verify Setup

#### 6.1 Test Authentication

- ✅ Can register a new user
- ✅ Can log in with registered credentials
- ✅ Participants see `/dashboard` after login
- ✅ Admins see `/admin` after login

#### 6.2 Test Database Connection

- ✅ No errors in browser console
- ✅ No errors in terminal/server logs
- ✅ Can view events (if any exist)
- ✅ Database queries work (check Network tab in browser DevTools)

#### 6.3 Common Issues

**Error: "Missing Supabase environment variables"**
- Verify `.env.local` exists and has content
- Check variable names are correct (case-sensitive)
- Restart dev server: Stop (`Ctrl+C`) and run `npm run dev` again

**Error: "Invalid API key"**
- Verify you copied the correct keys from Supabase dashboard
- Check for extra spaces or quotes in `.env.local`
- Ensure `NEXT_PUBLIC_SUPABASE_URL` includes `https://`

**Database errors**
- Verify schema.sql ran successfully in Supabase SQL Editor
- Check RLS policies are enabled (Supabase Dashboard → Authentication → Policies)
- Ensure user is authenticated before accessing protected routes

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

### Environment Variables Not Loading

**Symptoms:**
- Error: "Missing Supabase environment variables"
- Variables appear as `undefined`

**Solutions:**
1. Verify `.env.local` exists in project root (same directory as `package.json`)
2. Check file has content: `cat .env.local`
3. Ensure no spaces around `=` signs
4. Restart dev server completely (stop with `Ctrl+C`, then `npm run dev`)
5. Clear Next.js cache: `rm -rf .next` then restart

### Database Connection Issues

**Symptoms:**
- "Invalid API key" errors
- RLS policy errors
- Tables not found

**Solutions:**
1. Verify Supabase project is active (not paused)
2. Check API keys are correct in `.env.local`
3. Ensure `schema.sql` ran successfully
4. Verify RLS policies exist (Supabase Dashboard → Authentication → Policies)
5. Check browser console for specific error messages

### Build Errors

**Symptoms:**
- TypeScript errors during build
- ESLint errors

**Solutions:**
1. Run type check: `npx tsc --noEmit`
2. Run linter: `npm run lint`
3. Fix errors shown in terminal
4. Ensure all dependencies installed: `npm install`

### Authentication Issues

**Symptoms:**
- Can't log in
- Redirects not working
- Session not persisting

**Solutions:**
1. Clear browser cookies for `localhost:3000`
2. Check middleware is running (check terminal logs)
3. Verify Supabase Auth is enabled (Supabase Dashboard → Authentication → Providers)
4. Check browser console for errors

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

## Support

If you encounter issues not covered here:

1. Check the [CODEBASE_REVIEW.md](./CODEBASE_REVIEW.md) for known issues
2. Review error messages in terminal and browser console
3. Verify all setup steps were completed correctly
4. Check Supabase project status and logs
