/**
 * Simple Supabase Connection Test
 * 
 * Usage:
 * 1. Set your credentials:
 *    export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
 *    export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key-here"
 * 
 * 2. Run: node test-supabase-simple.js
 * 
 * OR run in Node.js REPL:
 * node
 * > const { createClient } = require('@supabase/supabase-js');
 * > const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 * > supabase.from('events').select('id').limit(1).then(console.log);
 */

const { createClient } = require('@supabase/supabase-js');

// Get from environment or prompt user
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Environment variables not set!\n');
  console.log('Set them first:');
  console.log('  export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"');
  console.log('  export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key-here"');
  console.log('\nOr add them to .env.local and run:');
  console.log('  node -r dotenv/config test-supabase-simple.js dotenv_config_path=.env.local');
  console.log('\nOr run in Node REPL and paste your credentials:');
  console.log('  node');
  console.log('  > const url = "https://your-project.supabase.co";');
  console.log('  > const key = "your-key";');
  console.log('  > const { createClient } = require("@supabase/supabase-js");');
  console.log('  > const supabase = createClient(url, key);');
  console.log('  > supabase.from("events").select("id").limit(1).then(r => console.log(r));');
  process.exit(1);
}

console.log('🔍 Testing Supabase Connection...\n');
console.log(`URL: ${supabaseUrl.substring(0, 40)}...`);
console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    // Test connection
    console.log('📡 Testing connection...');
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Table "events" not found - schema may not be applied');
      } else {
        console.log(`❌ Error: ${error.message}`);
        console.log(`   Code: ${error.code}`);
      }
    } else {
      console.log('✅ Connection successful!');
      console.log(`   Found ${data?.length || 0} events`);
    }
    
    // Test auth
    console.log('\n🔐 Testing auth endpoint...');
    const { data: session, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log(`⚠️  Auth: ${authError.message}`);
    } else {
      console.log('✅ Auth endpoint accessible');
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

test();
