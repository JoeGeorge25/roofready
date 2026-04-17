// Simple status calculation test
console.log('🧪 ROOFREADY STATUS CALCULATION TESTS\n');
console.log('=' .repeat(50));

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

// Test data
const testJobs = [
  {
    name: "READY TEST - All complete",
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
    name: "AT RISK TEST - Some warnings",
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
    name: "BLOCKED TEST - One blocker",
    factors: [
      { name: 'Materials', state: 'blocked', required: true },
      { name: 'Crew', state: 'complete', required: true },
      { name: 'Customer', state: 'complete', required: true },
      { name: 'Weather', state: 'complete', required: true },
      { name: 'Permit', state: 'complete', required: true }
    ],
    expected: 'blocked'
  },
  {
    name: "AT RISK TEST - Mixed states",
    factors: [
      { name: 'Materials', state: 'complete', required: true },
      { name: 'Crew', state: 'complete', required: true },
      { name: 'Customer', state: 'pending', required: true },
      { name: 'Weather', state: 'complete', required: true },
      { name: 'Permit', state: 'complete', required: true }
    ],
    expected: 'at_risk'
  },
  {
    name: "BLOCKED TEST - Multiple blockers",
    factors: [
      { name: 'Materials', state: 'blocked', required: true },
      { name: 'Crew', state: 'complete', required: true },
      { name: 'Customer', state: 'blocked', required: true },
      { name: 'Weather', state: 'complete', required: true },
      { name: 'Permit', state: 'complete', required: true }
    ],
    expected: 'blocked'
  }
];

// Run tests
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

// Test plan limit logic
console.log('\n🔗 PLAN LIMIT LOGIC TESTS');
console.log('=' .repeat(50));

const PLANS = {
  demo: { activeJobsLimit: 5 },
  starter: { activeJobsLimit: 10 },
  pro: { activeJobsLimit: 50 },
  team: { activeJobsLimit: 999999 }
};

function enforcePlanLimits(plan, usage, mode) {
  if (mode === 'demo') {
    return { allowed: true, reason: 'Demo mode' };
  }
  
  if (usage.activeJobs >= plan.activeJobsLimit) {
    return {
      allowed: false,
      reason: `You've reached your active job limit (${usage.activeJobs}/${plan.activeJobsLimit}). Upgrade to continue.`
    };
  }
  
  return { allowed: true, reason: 'Within limits' };
}

// Test cases
const limitTests = [
  { plan: 'demo', usage: 4, mode: 'demo', expected: true },
  { plan: 'demo', usage: 5, mode: 'demo', expected: true }, // Demo always allowed
  { plan: 'starter', usage: 9, mode: 'live', expected: true },
  { plan: 'starter', usage: 10, mode: 'live', expected: false },
  { plan: 'starter', usage: 11, mode: 'live', expected: false },
  { plan: 'pro', usage: 49, mode: 'live', expected: true },
  { plan: 'pro', usage: 50, mode: 'live', expected: false },
  { plan: 'team', usage: 1000, mode: 'live', expected: true } // Unlimited
];

let limitPassed = 0;
let limitFailed = 0;

for (const test of limitTests) {
  const plan = PLANS[test.plan];
  const result = enforcePlanLimits(plan, { activeJobs: test.usage }, test.mode);
  const success = result.allowed === test.expected;
  
  console.log(`\n📋 ${test.plan.toUpperCase()} plan, ${test.usage} jobs, mode: ${test.mode}`);
  console.log(`Expected: ${test.expected ? 'Allowed' : 'Blocked'}`);
  console.log(`Got: ${result.allowed ? 'Allowed' : 'Blocked'} (${result.reason})`);
  console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) limitPassed++;
  else limitFailed++;
}

console.log('\n' + '=' .repeat(50));
console.log(`📊 LIMIT TESTS: ${limitPassed} passed, ${limitFailed} failed`);
console.log(`Overall: ${limitFailed === 0 ? '✅ ALL LIMIT TESTS PASS' : '❌ SOME LIMIT TESTS FAILED'}`);