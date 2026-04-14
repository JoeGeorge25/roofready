// Setup RoofReady Database Schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Setting up RoofReady Database Schema');
  console.log('=======================================\n');
  
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
    process.exit(1);
  }
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Read the schema file
    const schema = fs.readFileSync('database/fulfillment-schema.sql', 'utf8');
    
    console.log('📋 Database schema loaded');
    console.log('Size:', schema.length, 'bytes');
    
    // Split into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const stmtPreview = stmt.substring(0, 100).replace(/\n/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${stmtPreview}...`);
      
      try {
        // Use Supabase's SQL API to execute the statement
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          // If RPC doesn't exist, try direct query (for simple statements)
          if (error.message.includes('function "exec_sql" does not exist')) {
            console.log('  ⚠️  RPC not available, trying alternative method...');
            
            // For CREATE TABLE statements, we need a different approach
            if (stmt.toLowerCase().startsWith('create table')) {
              console.log('  ⚠️  CREATE TABLE requires manual execution in Supabase SQL Editor');
              console.log('  Please run this in Supabase Dashboard → SQL Editor:');
              console.log('  ```sql');
              console.log(stmt);
              console.log('  ```');
            }
          } else {
            console.log(`  ❌ Error: ${error.message}`);
          }
        } else {
          console.log('  ✅ Success');
        }
      } catch (err) {
        console.log(`  ❌ Execution error: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Database setup instructions generated!');
    console.log('=======================================');
    console.log('\nNext steps:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project: wolnyokijwtrxkyluxrj');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the CREATE TABLE statements from:');
    console.log('   database/fulfillment-schema.sql');
    console.log('5. Run each CREATE TABLE statement separately');
    console.log('\nRequired tables:');
    console.log('- tenants');
    console.log('- subscriptions');
    console.log('- entitlements');
    console.log('- tenant_usage');
    console.log('- users');
    console.log('- onboarding_tasks');
    console.log('- billing_events');
    console.log('- audit_logs');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run setup
setupDatabase();