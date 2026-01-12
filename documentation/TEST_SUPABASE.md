# Testing Supabase Connection Locally

## Quick Test in Node.js Console

### Option 1: Interactive Node REPL (Recommended)

```bash
# Start Node REPL
node

# Then paste these commands one by one:
```

```javascript
// 1. Load Supabase client
const { createClient } = require('@supabase/supabase-js');

// 2. Set your credentials (replace with your actual values)
const url = 'https://your-project-id.supabase.co';
const key = 'your-anon-key-here';

// 3. Create client
const supabase = createClient(url, key);

// 4. Test connection - try to read events table
supabase
  .from('events')
  .select('id')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
    } else {
      console.log('✅ Connection works!');
      console.log('   Data:', data);
    }
  });

// 5. Test auth endpoint
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.log('⚠️  Auth error:', error.message);
  } else {
    console.log('✅ Auth endpoint accessible');
  }
});
```

### Option 2: Using Test Script

```bash
# Set environment variables first
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key-here"

# Run test
node test-supabase-simple.js
```

### Option 3: With .env.local (if dotenv installed)

```bash
# Install dotenv first
npm install --save-dev dotenv

# Then run
node -r dotenv/config test-supabase-simple.js dotenv_config_path=.env.local
```

## What to Check

### ✅ Success Indicators:
- Connection test returns data or "table not found" (means connection works)
- Auth endpoint accessible
- No network errors

### ❌ Failure Indicators:
- "Invalid API key" → Check your anon key
- "Failed to fetch" → Check your URL
- "Table not found" → Connection works, but schema not applied
- Network timeout → Check internet/firewall

## Quick Browser Console Test

You can also test directly in your browser console when your app is running:

1. Open your app: `http://localhost:3000`
2. Open Developer Tools (F12)
3. Go to Console tab
4. Paste:

```javascript
// This uses the Supabase client from your app
const { createClient } = await import('/lib/supabase/client.ts');
// Actually, better to test via the app's client:
// Just try registering a user and watch the console logs
```

## Test Results Interpretation

| Result | Meaning | Action |
|--------|---------|--------|
| ✅ Connection works | Supabase is reachable | Continue debugging registration |
| ❌ Invalid API key | Wrong credentials | Check .env.local |
| ❌ Table not found | Schema not applied | Run schema.sql in Supabase |
| ❌ Network error | Can't reach Supabase | Check URL, internet, firewall |
| ⚠️ RLS error | Normal without auth | Expected behavior |

## Next Steps After Testing

1. **If connection works**: The issue is likely with the trigger or RLS policies
2. **If connection fails**: Fix environment variables first
3. **If table not found**: Apply schema.sql in Supabase SQL Editor
