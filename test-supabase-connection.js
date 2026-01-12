/**
 * Test Supabase Connection
 * 
 * Run this script to verify your Supabase connection works:
 * node test-supabase-connection.js
 */

const fs = require('fs');
const path = require('path');

// Read .env.local file manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env.local file not found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        process.env[key.trim()] = cleanValue;
      }
    }
  });
}

// Load environment variables
loadEnvFile();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing in .env.local');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('📡 Test 1: Testing basic connection...');
    const { data: healthData, error: healthError } = await supabase
      .from('events')
      .select('id')
      .limit(1);
    
    if (healthError) {
      if (healthError.code === 'PGRST116') {
        console.log('   ⚠️  Table "events" might not exist (this is OK if schema not applied)');
      } else {
        console.error('   ❌ Connection failed:', healthError.message);
        console.error('   Error code:', healthError.code);
        return false;
      }
    } else {
      console.log('   ✅ Basic connection works!');
    }

    // Test 2: Check if tables exist
    console.log('\n📊 Test 2: Checking database tables...');
    const tables = ['users', 'events', 'bookings', 'health_metrics'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   ❌ Table "${table}" does not exist`);
        } else {
          console.log(`   ⚠️  Table "${table}" - Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Table "${table}" exists`);
      }
    }

    // Test 3: Check RLS policies (by trying to read users table)
    console.log('\n🔒 Test 3: Testing Row Level Security...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      if (usersError.code === 'PGRST301' || usersError.message.includes('policy')) {
        console.log('   ✅ RLS is enabled (expected error without auth)');
      } else {
        console.log(`   ⚠️  RLS check: ${usersError.message}`);
      }
    } else {
      console.log('   ⚠️  RLS might not be enabled (unexpected to get data without auth)');
    }

    // Test 4: Check trigger function exists (via SQL)
    console.log('\n⚙️  Test 4: Checking database functions...');
    const { data: functionData, error: functionError } = await supabase.rpc('pg_get_functiondef', {
      funcname: 'handle_new_user'
    });
    
    if (functionError) {
      console.log('   ⚠️  Cannot check trigger function (may need direct SQL access)');
      console.log('   💡 Check in Supabase SQL Editor: SELECT proname FROM pg_proc WHERE proname = \'handle_new_user\';');
    } else {
      console.log('   ✅ Trigger function exists');
    }

    // Test 5: Test authentication endpoint
    console.log('\n🔐 Test 5: Testing authentication endpoint...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log(`   ⚠️  Auth check: ${authError.message}`);
    } else {
      console.log('   ✅ Auth endpoint accessible');
      if (authData.session) {
        console.log('   ℹ️  Active session found');
      } else {
        console.log('   ℹ️  No active session (expected)');
      }
    }

    console.log('\n✅ Connection test complete!');
    console.log('\n📝 Summary:');
    console.log('   - If all tests pass, your Supabase connection is working');
    console.log('   - If tables are missing, run supabase/schema.sql in Supabase SQL Editor');
    console.log('   - If RLS errors appear, that\'s normal without authentication');
    
    return true;

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Run tests
testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
