// RoofReady Backend with Real Database Integration
// Saves jobs and readiness factors to Supabase

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

// Helper: Get or create demo tenant
async function getOrCreateDemoTenant(tenantId) {
  if (tenantId.startsWith('demo_')) {
    // For demo sessions, create or get a demo tenant
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, company_name, plan_code, is_demo')
      .eq('company_email', `${tenantId}@demo.roofready.com`)
      .single();
    
    if (fetchError || !existingTenant) {
      // Create new demo tenant
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          company_name: `Demo Tenant ${tenantId}`,
          company_email: `${tenantId}@demo.roofready.com`,
          plan_code: 'demo',
          is_demo: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating demo tenant:', createError);
        throw new Error('Failed to create demo tenant');
      }
      
      return newTenant;
    }
    
    return existingTenant;
  }
  
  // For real tenant IDs, fetch from database
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, company_name, plan_code, is_demo')
    .eq('id', tenantId)
    .single();
    
  if (error) {
    console.error('Error fetching tenant:', error);
    throw new Error('Tenant not found');
  }
  
  return tenant;
}

// Helper: Get tenant plan
async function getTenantPlan(tenant) {
  return PLANS[tenant.plan_code] || PLANS.starter;
}

// Helper: Get tenant usage
async function getTenantUsage(tenantId) {
  const { data, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
    
  return { activeJobs: error ? 0 : data.length };
}

// Helper: Enforce plan limits
function enforcePlanLimits(plan, usage, mode, tenant) {
  if (mode === 'demo' || tenant.is_demo) {
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
  const factors = [];
  
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
    
    factors.push({
      job_id: jobId,
      name: factorData.name,
      state: factorData.state,
      owner: factorData.owner,
      due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
      notes: factorData.notes || '',
      required: factorData.required,
      created_at: new Date().toISOString()
    });
  }
  
  // Insert all factors at once
  const { error } = await supabase
    .from('readiness_factors')
    .insert(factors);
    
  if (error) {
    console.error('Error creating readiness factors:', error);
    throw new Error('Failed to create readiness factors');
  }
  
  return factors;
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

// Helper: Return board data
async function returnBoardData(tenantId) {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching jobs:', error);
    return { jobs: [], usage: { activeJobs: 0 }, plan: PLANS.demo };
  }
  
  const usage = await getTenantUsage(tenantId);
  const tenant = await getOrCreateDemoTenant(tenantId);
  const plan = await getTenantPlan(tenant);
  
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
  
  // Get or create tenant
  const tenant = await getOrCreateDemoTenant(tenantId);
  
  // Get plan and usage
  const plan = await getTenantPlan(tenant);
  const usage = await getTenantUsage(tenant.id);
  
  // Enforce limits (skip for demo tenants)
  if (!tenant.is_demo && mode !== 'demo') {
    const limitCheck = enforcePlanLimits(plan, usage, mode, tenant);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason);
    }
  }
  
  // Create job in database
  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      tenant_id: tenant.id,
      address: jobData.address,
      customer_name: jobData.customer_name,
      install_date: jobData.install_date,
      crew_assignment: jobData.crew_assignment || null,
      status: 'at_risk', // Will be calculated after factors
      notes: jobData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (jobError) {
    console.error('Error creating job:', jobError);
    throw new Error(`Database error: ${jobError.message}`);
  }
  
  // Create readiness factors
  await createReadinessFactors(newJob.id, jobData.install_date, jobData.crew_assignment);
  
  // Calculate and update status
  const calculatedStatus = await calculateJobStatus(newJob.id);
  const { error: updateError } = await supabase
    .from('jobs')
    .update({ 
      status: calculatedStatus,
      status_calculated_at: new Date().toISOString()
    })
    .eq('id', newJob.id);
    
  if (updateError) {
    console.error('Error updating job status:', updateError);
  }
  
  newJob.status = calculatedStatus;
  
  // Return updated board data
  return await returnBoardData(tenant.id);
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
      app: 'RoofReady Real Database',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'Supabase connected'
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
        message: 'Job created successfully'
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
  
  // Get tenant info
  if (req.url.startsWith('/api/tenant/') && req.method === 'GET') {
    const tenantId = req.url.split('/').pop();
    
    try {
      const tenant = await getOrCreateDemoTenant(tenantId);
      const plan = await getTenantPlan(tenant);
      const usage = await getTenantUsage(tenant.id);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        tenantId: tenant.id,
        plan,
        usage,
        canCreateMore: usage.activeJobs < plan.activeJobsLimit || tenant.is_demo
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // Demo compatibility endpoint
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
  console.log(`✅ RoofReady Real Database API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🚀 Create job: POST http://localhost:${PORT}/api/jobs/create`);
});