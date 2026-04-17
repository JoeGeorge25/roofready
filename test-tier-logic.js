// Test RoofReady Tier Logic
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = 'https://wolnyokijwtrxkyluxrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbG55b2tpand0cnhreWx1eHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODgwMTEsImV4cCI6MjA5MTY2NDAxMX0.n0HAtBGNSKuK8yV8qQ4p85JJy3UquAM-MPpfw7OK8jY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testJobs = [
  {
    name: "READY TEST",
    factors: [
      { name: 'Materials', state: 'complete', required: true },
      { name: 'Crew', state: 'complete', required: true },
      { name: 'Customer', state: 'complete', required: true },
      { name: 'Weather', state: 'complete', required: true },
      { name: 'Permit', state: 'complete', required: true }
    ],
    expected: 'ready'
  },
  {
    name: "AT RISK TEST",
    factors: [
      { name: 'Materials', state: 'warning', required: true },
      { name: 'Crew', state: 'complete', required: true },
      { name: 'Customer', state: 'warning', required: true },
      { name: 'Weather', state: 'complete', required: true },
      { name: 'Permit', state: 'complete', required: true }
    ],
    expected: 'at_risk'
  },
  {
    name: "BLOCKED TEST",
    factors: [
      { name: 'Materials', state: 'blocked', required: true },
      { name: 'Crew', state: 'complete', required: true },
      { name: 'Customer', state: 'complete', required: true },
      { name: 'Weather', state: 'complete', required: true },
      { name: 'Permit', state: 'complete', required: true }
    ],
    expected: 'blocked'
  }
];

// Status calculation function (same as in server)
function calculateJobStatus(factors) {
  let hasBlocked = false;
  let hasWarning = false;
  let allComplete = true;

  for (const factor of factors) {
    if (factor.required) {
      if (factor.state === 'blocked') {
        hasBlocked = true;
      } else if (factor.state === 'warning') {
        hasWarning = true;
      } else if (factor.state !== 'complete') {
        allComplete = false;
      }
    }
  }

  if (hasBlocked) return 'blocked';
  if (hasWarning || !allComplete) return 'at_risk';
  if (allComplete) return 'ready';
  return 'at_risk';
}

// Run tests
console.log('🧪 ROOFREADY TIER LOGIC TESTS\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

for (const test of testJobs) {
  const result = calculateJobStatus(test.factors);
  const success = result === test.expected;
  
  console.log(`\n📋 ${test.name}`);
  console.log(`Factors: ${test.factors.map(f => `${f.name}=${f.state}`).join(', ')}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Got: ${result}`);
  console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) passed++;
  else failed++;
}

console.log('\n' + '=' .repeat(50));
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log(`Overall: ${failed === 0 ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}`);

// Test database connection
console.log('\n🔗 DATABASE CONNECTION TEST');
supabase.from('tenants').select('count', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.log(`❌ Database connection failed: ${error.message}`);
    } else {
      console.log(`✅ Database connected. Tenants table has ${count} rows.`);
    }
    
    // Test readiness_factors table exists
    return supabase.from('readiness_factors').select('count', { count: 'exact', head: true });
  })
  .then(({ count, error }) => {
    if (error && error.code === '42P01') {
      console.log('⚠️  readiness_factors table does not exist yet. Run tier-schema.sql in Supabase.');
    } else if (error) {
      console.log(`❌ Error checking readiness_factors: ${error.message}`);
    } else {
      console.log(`✅ readiness_factors table exists with ${count} rows.`);
    }
  })
  .catch(err => {
    console.log(`❌ Database test error: ${err.message}`);
  });