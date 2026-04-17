// RoofReady Tier Logic Backend
// Implements: 1 form, 1 endpoint, centralized entitlement checks

const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://wolnyokijwtrxkyluxrj.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbG55b2tpand0cnhreWx1eHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODgwMTEsImV4cCI6MjA5MTY2NDAxMX0.n0HAtBGNSKuK8yV8qQ4p85JJy3UquAM-MPpfw7OK8jY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Plan configurations
const PLANS = {
  demo: {
    activeJobsLimit: 5,
    analytics: false,
    reporting: false,
    weatherAlerts: false,
    collaboration: false,
    apiAccess: false,
    fakeDataOnly: true
  },
  starter: {
    activeJobsLimit: 10,
    analytics: false,
    reporting: false,
    weatherAlerts: false,
    collaboration: false,
    apiAccess: false
  },
  pro: {
    activeJobsLimit: 50,
    analytics: true,
    reporting: true,
    weatherAlerts: true,
    collaboration: true,
    apiAccess: false
  },
  team: {
    activeJobsLimit: 999999, // unlimited
    analytics: true,
    reporting: true,
    weatherAlerts: true,
    collaboration: true,
    apiAccess: true
  }
};

// Default readiness factors
const DEFAULT_FACTORS = [
  { name: 'Materials', state: 'warning', owner: 'Office Manager', due_date_offset: -2, required: true },
  { name: 'Crew', state: 'complete', owner: 'Field Supervisor', due_date_offset: -1, required: true },
  { name: 'Customer', state: 'warning', owner: 'Sales Rep', due_date_offset: -1, required: true },
  { name: 'Weather', state: 'warning', owner: 'System', due_date_offset: 0, required: true },
  { name: 'Permit', state: 'warning', owner: 'Office Manager', due_date_offset: -3, required: true }
];

// Helper: Parse request body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// Helper: Get tenant plan
async function getTenantPlan(tenantId) {
  if (tenantId.startsWith('demo_')) {
    return PLANS.demo;
  }
  
  const { data, error } = await supabase
    .from('tenants')
    .select('plan_code')
    .eq('id', tenantId)
    .single();
    
  if (error || !data) {
    return PLANS.starter; // default
  }
  
  return PLANS[data.plan_code] || PLANS.starter;
}

// Helper: Get tenant usage
async function getTenantUsage(tenantId) {
  if (tenantId.startsWith('demo_')) {
    return { activeJobs: 0 }; // Demo always has capacity
  }
  
  const { data, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('status', '!=', 'completed');
    
  return { activeJobs: error ? 0 : data.length };
}

// Helper: Enforce plan limits
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

// Helper: Create readiness factors for a job
async function createReadinessFactors(jobId, installDate, crewAssignment) {
  const installDateObj = new Date(installDate);
  
  for (const factor of DEFAULT_FACTORS) {
    const factorData = { ...factor };
    
    // Adjust crew factor based on assignment
    if (factor.name === 'Crew') {
      factorData.state = crewAssignment ? 'complete' : 'blocked';
      factorData.notes = crewAssignment ? `Assigned: ${crewAssignment}` : 'No crew assigned';
    }
    
    // Calculate due date
    const dueDate = new Date(installDateObj);
    dueDate.setDate(dueDate.getDate() + factor.due_date_offset);
    
    const { error } = await supabase
      .from('readiness_factors')
      .insert({
        job_id: jobId,
        name: factorData.name,
        state: factorData.state,
        owner: factorData.owner,
        due_date: dueDate.toISOString(),
        notes: factorData.notes || '',
        required: factorData.required,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error creating factor:', error);
    }
  }
}

// Helper: Calculate job status from factors
async function calculateJobStatus(jobId) {
  const { data: factors, error } = await supabase
    .from('readiness_factors')
    .select('state, required')
    .eq('job_id', jobId);
    
  if (error || !factors || factors.length === 0) {
    return 'at_risk'; // Default
  }
  
  // Check for blockers
  const hasBlocked = factors.some(f => f.required && f.state === 'blocked');
  if (hasBlocked) return 'blocked';
  
  // Check for warnings
  const hasWarning = factors.some(f => f.required && f.state === 'warning');
  if (hasWarning) return 'at_risk';
  
  // Check if all complete
  const allComplete = factors.every(f => !f.required || f.state === 'complete');
  if (allComplete) return 'ready';
  
  // Default
  return 'at_risk';
}

// Helper: Run plan-specific post-create actions
async function runPostCreateActions(plan, jobId, tenantId) {
  // Basic actions for all plans
  console.log(`Job ${jobId} created for tenant ${tenantId}`);
  
  // Pro and Team plans get additional features
  if (plan.weatherAlerts) {
    console.log(`Weather alert check triggered for job ${jobId}`);
    // In production: call weather API, create alerts if needed
  }
  
  if (plan.collaboration) {
    console.log(`Team notifications sent for job ${jobId}`);
    // In production: send notifications to team members
  }
  
  if (plan.analytics) {
    console.log(`Analytics recorded for job ${jobId}`);
    // In production: record analytics event
  }
}

// Helper: Return board data
async function returnBoardData(tenantId) {
  if (tenantId.startsWith('demo_')) {
    // Return demo data
    return {
      jobs: [
        {
          id: 'demo_1',
          address: '123 Maple St, Anytown',
          customer_name: 'John & Sarah Miller',
          install_date: '2026-04-22',
          crew_assignment: 'Crew A',
          status: 'at_risk',
          created_at: new Date().toISOString()
        },
        {
          id: 'demo_2',
          address: '456 Oak Ave, Springfield',
          customer_name: 'Robert Johnson',
          install_date: '2026-04-18',
          crew_assignment: 'Crew B',
          status: 'ready',
          created_at: new Date().toISOString()
        }
      ],
      usage: { activeJobs: 2 },
      plan: PLANS.demo
    };
  }
  
  // Get real jobs from database
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
    
  const usage = await getTenantUsage(tenantId);
  const plan = await getTenantPlan(tenantId);
  
  return {
    jobs: jobs || [],
    usage,
    plan
  };
}

// Main job creation function
async function submitJob(data) {
  const { tenantId, mode = 'live', ...jobData } = data;
  
  // Validate required fields
  if (!tenantId || !jobData.address || !jobData.customer_name || !jobData.install_date) {
    throw new Error('Missing required fields: tenantId, address, customer_name, install_date');
  }
  
  // Get plan and usage
  const plan = await getTenantPlan(tenantId);
  const usage = await getTenantUsage(tenantId);
  
  // Enforce limits (skip for demo mode)
  if (mode !== 'demo') {
    const limitCheck = enforcePlanLimits(plan, usage, mode);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason);
    }
  }
  
  // Create job in database (or demo simulation)
  let job;
  if (mode === 'demo' || tenantId.startsWith('demo_')) {
    // Demo job - create in memory only
    job = {
      id: `demo_${Date.now()}`,
      ...jobData,
      tenant_id: tenantId,
      status: 'at_risk',
      created_at: new Date().toISOString(),
      is_demo: true
    };
  } else {
    // Real job - insert into database
    const { data: newJob, error } = await supabase
      .from('jobs')
      .insert({
        ...jobData,
        tenant_id: tenantId,
        status: 'at_risk', // Will be calculated after factors
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw new Error(`Database error: ${error.message}`);
    job = newJob;
    
    // Create readiness factors
    await createReadinessFactors(job.id, jobData.install_date, jobData.crew_assignment);
    
    // Calculate and update status
    const calculatedStatus = await calculateJobStatus(job.id);
    await supabase
      .from('jobs')
      .update({ status: calculatedStatus })
      .eq('id', job.id);
      
    job.status = calculatedStatus;
    
    // Run plan-specific actions
    await runPostCreateActions(plan, job.id, tenantId);
  }
  
  // Return updated board data
  return await returnBoardData(tenantId);
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      app: 'RoofReady Tier Logic',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Create job endpoint (MAIN ENDPOINT)
  if (req.url === '/api/jobs/create' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = await submitJob(body);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        ...result,
        message: body.mode === 'demo' ? 'Demo job created' : 'Job created successfully'
      }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }
  
  // Get tenant info (for frontend limit checking)
  if (req.url.startsWith('/api/tenant/') && req.method === 'GET') {
    const tenantId = req.url.split('/').pop();
    
    try {
      const plan = await getTenantPlan(tenantId);
      const usage = await getTenantUsage(tenantId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        tenantId,
        plan,
        usage,
        canCreateMore: usage.activeJobs < plan.activeJobsLimit
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // Demo compatibility endpoint (for existing frontend)
  if (req.url === '/api/demo/jobs' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const jobData = body.jobData || {};
      const tenantId = body.tenantId || `demo_${Date.now()}`;
      
      // Use the new create endpoint with demo mode
      const result = await submitJob({
        tenantId,
        mode: 'demo',
        ...jobData
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        job: result.jobs[0], // Return the newly created job
        message: 'Demo job created'
      }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ RoofReady Tier Logic API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🚀 Create job: POST http://localhost:${PORT}/api/jobs/create`);
});