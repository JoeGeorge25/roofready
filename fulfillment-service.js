// RoofReady Post-Payment Fulfillment Service
// Handles Stripe webhooks and tenant provisioning

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ==================================================
// 1. STRIPE WEBHOOK HANDLER
// ==================================================
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log the event
  await logBillingEvent(event);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ==================================================
// 2. FULFILLMENT HANDLERS
// ==================================================

async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  const metadata = session.metadata || {};
  const tenantId = metadata.tenant_id;
  const planCode = metadata.plan_code || 'starter';
  
  if (tenantId) {
    // Update existing tenant
    await updateTenantSubscription(tenantId, session.customer, session.subscription, planCode);
  } else {
    // Create new tenant
    await createNewTenant(session.customer_email, session.customer, session.subscription, planCode, metadata);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  await syncSubscriptionToDatabase(subscription);
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  await syncSubscriptionToDatabase(subscription);
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();
    
  if (tenant) {
    await supabase
      .from('tenants')
      .update({
        billing_status: 'canceled',
        fulfillment_status: 'suspended',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);
  }
}

async function handleInvoicePaid(invoice) {
  console.log('Invoice paid:', invoice.id);
  
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, billing_status')
    .eq('stripe_customer_id', invoice.customer)
    .single();
    
  if (tenant && tenant.billing_status !== 'active') {
    await supabase
      .from('tenants')
      .update({
        billing_status: 'active',
        fulfillment_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();
    
  if (tenant) {
    await supabase
      .from('tenants')
      .update({
        billing_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);
    
    // TODO: Send dunning email
  }
}

// ==================================================
// 3. TENANT PROVISIONING
// ==================================================

async function createNewTenant(email, stripeCustomerId, stripeSubscriptionId, planCode, metadata) {
  console.log('Creating new tenant for:', email);
  
  // Step 1: Create tenant record
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      company_name: metadata.company_name || 'New Roofing Company',
      company_email: email,
      plan_code: planCode,
      billing_status: 'active',
      fulfillment_status: 'provisioning',
      onboarding_status: 'not_started',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      support_level: getSupportLevel(planCode),
      onboarding_type: getOnboardingType(planCode)
    })
    .select()
    .single();
    
  if (tenantError) {
    console.error('Error creating tenant:', tenantError);
    return;
  }
  
  // Step 2: Create entitlements
  await createEntitlements(tenant.id, planCode);
  
  // Step 3: Create owner user
  await createOwnerUser(tenant.id, email, metadata);
  
  // Step 4: Create default workspace
  await createDefaultWorkspace(tenant.id);
  
  // Step 5: Create onboarding tasks
  await createOnboardingTasks(tenant.id);
  
  // Step 6: Update fulfillment status
  await supabase
    .from('tenants')
    .update({
      fulfillment_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenant.id);
    
  // Step 7: Send welcome emails
  await sendWelcomeEmail(tenant, email, planCode);
  
  console.log('Tenant provisioned successfully:', tenant.id);
}

async function updateTenantSubscription(tenantId, stripeCustomerId, stripeSubscriptionId, planCode) {
  console.log('Updating tenant subscription:', tenantId);
  
  await supabase
    .from('tenants')
    .update({
      plan_code: planCode,
      billing_status: 'active',
      fulfillment_status: 'active',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      support_level: getSupportLevel(planCode),
      onboarding_type: getOnboardingType(planCode),
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);
    
  // Update entitlements
  await updateEntitlements(tenantId, planCode);
  
  console.log('Tenant subscription updated:', tenantId);
}

// ==================================================
// 4. ENTITLEMENTS MANAGEMENT
// ==================================================

async function createEntitlements(tenantId, planCode) {
  const entitlements = getPlanEntitlements(planCode);
  
  const { error } = await supabase
    .from('entitlements')
    .insert({
      tenant_id: tenantId,
      ...entitlements
    });
    
  if (error) {
    console.error('Error creating entitlements:', error);
  }
}

async function updateEntitlements(tenantId, planCode) {
  const entitlements = getPlanEntitlements(planCode);
  
  const { error } = await supabase
    .from('entitlements')
    .update(entitlements)
    .eq('tenant_id', tenantId);
    
  if (error) {
    console.error('Error updating entitlements:', error);
  }
}

function getPlanEntitlements(planCode) {
  const plans = {
    starter: {
      active_jobs_limit: 10,
      crew_users_limit: 2,
      office_admin_limit: 1,
      total_users_limit: 3,
      analytics_enabled: false,
      weather_alerts_enabled: false,
      custom_reporting_enabled: false,
      api_access_enabled: false,
      white_label_enabled: false,
      scheduling_enabled: 'none',
      support_level: 'email',
      onboarding_type: 'self_serve'
    },
    pro: {
      active_jobs_limit: 50,
      crew_users_limit: 10,
      office_admin_limit: 3,
      total_users_limit: 13,
      analytics_enabled: true,
      weather_alerts_enabled: true,
      custom_reporting_enabled: true,
      api_access_enabled: false,
      white_label_enabled: false,
      scheduling_enabled: 'basic',
      support_level: 'priority',
      onboarding_type: 'guided'
    },
    team: {
      active_jobs_limit: 999999, // unlimited
      crew_users_limit: 999999,
      office_admin_limit: 999999,
      total_users_limit: 999999,
      analytics_enabled: true,
      weather_alerts_enabled: true,
      custom_reporting_enabled: true,
      api_access_enabled: true,
      white_label_enabled: true,
      scheduling_enabled: 'advanced',
      support_level: 'dedicated',
      onboarding_type: 'white_glove'
    }
  };
  
  return plans[planCode] || plans.starter;
}

function getSupportLevel(planCode) {
  const levels = {
    starter: 'email',
    pro: 'priority',
    team: 'dedicated'
  };
  return levels[planCode] || 'email';
}

function getOnboardingType(planCode) {
  const types = {
    starter: 'self_serve',
    pro: 'guided',
    team: 'white_glove'
  };
  return types[planCode] || 'self_serve';
}

// ==================================================
// 5. WORKSPACE SETUP
// ==================================================

async function createOwnerUser(tenantId, email, metadata) {
  const { error } = await supabase
    .from('users')
    .insert({
      tenant_id: tenantId,
      email: email,
      full_name: metadata.full_name || 'Account Owner',
      role: 'owner',
      status: 'active'
    });
    
  if (error) {
    console.error('Error creating owner user:', error);
  }
}

async function createDefaultWorkspace(tenantId) {
  // Create default job status columns
  const statusColumns = ['Ready', 'At Risk', 'Blocked', 'Completed'];
  
  // Create default readiness factors
  const readinessFactors = [
    { name: 'Materials', description: 'Material orders and deliveries' },
    { name: 'Crew', description: 'Crew assignment and availability' },
    { name: 'Customer', description: 'Customer confirmation and communication' },
    { name: 'Weather', description: 'Weather forecasts and delays' },
    { name: 'Permit', description: 'Permit status and approvals' }
  ];
  
  // TODO: Store these in database tables for the tenant
  console.log('Creating default workspace for tenant:', tenantId);
}

async function createOnboardingTasks(tenantId) {
  const tasks = [
    { task_key: 'import_jobs', task_name: 'Import Your First Jobs', task_order: 1 },
    { task_key: 'invite_team', task_name: 'Invite Your Team', task_order: 2 },
    { task_key: 'configure_factors', task_name: 'Configure Readiness Factors', task_order: 3 },
    { task_key: 'set_dates', task_name: 'Schedule Install Dates', task_order: 4 }
  ];
  
  for (const task of tasks) {
    const { error } = await supabase
      .from('onboarding_tasks')
      .insert({
        tenant_id: tenantId,
        ...task,
        status: 'pending'
      });
      
    if (error) {
      console.error('Error creating onboarding task:', error);
    }
  }
}

// ==================================================
// 6. EMAIL & COMMUNICATIONS
// ==================================================

async function sendWelcomeEmail(tenant, email, planCode) {
  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  console.log('Sending welcome email to:', email);
  console.log('Tenant:', tenant.company_name);
  console.log('Plan:', planCode);
  
  // Email templates would go here
  const emailData = {
    to: email,
    subject: `Welcome to RoofReady! Your ${planCode} plan is ready`,
    template: 'welcome',
    data: {
      company_name: tenant.company_name,
      plan: planCode,
      login_url: `${process.env.APP_URL}/login`,
      support_email: 'support@roofready.com'
    }
  };
  
  // Send email via your email service
}

// ==================================================
// 7. DATABASE SYNC & LOGGING
// ==================================================

async function syncSubscriptionToDatabase(subscription) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();
    
  if (tenant) {
    await supabase
      .from('subscriptions')
      .upsert({
        tenant_id: tenant.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        stripe_customer_id: subscription.customer,
        plan_code: getPlanCodeFromPriceId(subscription.items.data[0].price.id),
        amount: subscription.items.data[0].price.unit_amount,
        currency: subscription.items.data[0].price.currency,
        billing_interval: subscription.items.data[0].price.recurring.interval,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        status: subscription.status,
        metadata: subscription.metadata
      });
  }
}

async function logBillingEvent(event) {
  const { error } = await supabase
    .from('billing_events')
    .insert({
      event_type: event.type,
      stripe_event_id: event.id,
      stripe_object_type: event.data?.object?.object,
      stripe_object_id: event.data?.object?.id,
      event_data: event,
      processed: false
    });
    
  if (error) {
    console.error('Error logging billing event:', error);
  }
}

function getPlanCodeFromPriceId(priceId) {
  // This would map Stripe price IDs to your plan codes
  // Example: price_123_starter_monthly -> starter
  const priceMappings = {
    [process.env.STRIPE_PRICE_STARTER]: 'starter',
    [process.env.STRIPE_PRICE_PRO]: 'pro',
    [process.env.STRIPE_PRICE_TEAM]: 'team'
  };
  
  return priceMappings[priceId] || 'starter';
}

// ==================================================
// 7. DEMO SYSTEM ENDPOINTS
// ==================================================

// Start a demo session
app.post('/api/demo/start', async (req, res) => {
  try {
    console.log('Starting demo session...');
    
    // Generate demo tenant ID
    const demoId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const demoEmail = `demo+${demoId}@roofready.com`;
    
    // Create demo tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: demoId,
        name: 'Demo Roofing Company',
        email: demoEmail,
        plan_code: 'demo',
        status: 'active',
        is_demo: true,
        demo_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      })
      .select()
      .single();
      
    if (tenantError) {
      console.error('Error creating demo tenant:', tenantError);
      // Try to find existing demo tenant
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_demo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (existingTenant) {
        console.log('Using existing demo tenant:', existingTenant.id);
        await seedDemoData(existingTenant.id);
        
        return res.json({
          success: true,
          tenantId: existingTenant.id,
          token: `demo_${existingTenant.id}_${Date.now()}`,
          message: 'Demo session started'
        });
      }
      
      return res.status(500).json({ error: 'Failed to create demo session' });
    }
    
    // Seed demo data
    await seedDemoData(demoId);
    
    // Return demo session info
    res.json({
      success: true,
      tenantId: demoId,
      token: `demo_${demoId}_${Date.now()}`,
      message: 'Demo session started'
    });
    
  } catch (error) {
    console.error('Demo start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed demo data function
async function seedDemoData(tenantId) {
  console.log(`Seeding demo data for tenant: ${tenantId}`);
  
  // Create demo users
  const demoUsers = [
    { name: 'Office Manager', role: 'office', email: `office+${tenantId}@demo.roofready.com` },
    { name: 'Field Supervisor', role: 'field', email: `field+${tenantId}@demo.roofready.com` },
    { name: 'Sales Rep', role: 'sales', email: `sales+${tenantId}@demo.roofready.com` }
  ];
  
  for (const user of demoUsers) {
    const { error } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        is_demo: true
      });
      
    if (error) {
      console.error(`Error creating demo user ${user.name}:`, error);
    }
  }
  
  // Create demo jobs
  const demoJobs = [
    {
      address: '123 Maple St, Anytown',
      customer_name: 'John & Sarah Miller',
      install_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: 'at_risk',
      crew_assignment: 'Crew A',
      materials_status: 'complete',
      customer_confirmation: 'pending',
      weather_status: 'clear',
      permit_status: 'missing',
      notes: 'Permit application submitted, waiting for approval'
    },
    {
      address: '456 Oak Ave, Springfield',
      customer_name: 'Robert Johnson',
      install_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      status: 'ready',
      crew_assignment: 'Crew B',
      materials_status: 'complete',
      customer_confirmation: 'confirmed',
      weather_status: 'clear',
      permit_status: 'approved',
      notes: 'All systems go for tomorrow'
    },
    {
      address: '789 Pine Rd, Riverside',
      customer_name: 'Maria Garcia',
      install_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'blocked',
      crew_assignment: 'Crew C',
      materials_status: 'delayed',
      customer_confirmation: 'confirmed',
      weather_status: 'monitoring',
      permit_status: 'approved',
      notes: 'Material shipment delayed by supplier'
    }
  ];
  
  for (const job of demoJobs) {
    const { error } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        ...job,
        is_demo: true
      });
      
    if (error) {
      console.error(`Error creating demo job ${job.address}:`, error);
    }
  }
  
  console.log(`Demo data seeded for tenant: ${tenantId}`);
}

// Demo dashboard endpoint
app.get('/api/demo/dashboard/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Verify this is a demo tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('is_demo', true)
      .single();
      
    if (!tenant) {
      return res.status(404).json({ error: 'Demo tenant not found' });
    }
    
    // Get demo jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_demo', true)
      .order('install_date', { ascending: true });
    
    // Get demo users
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_demo', true);
    
    res.json({
      success: true,
      tenant,
      jobs: jobs || [],
      users: users || [],
      stats: {
        totalJobs: jobs?.length || 0,
        readyJobs: jobs?.filter(j => j.status === 'ready').length || 0,
        atRiskJobs: jobs?.filter(j => j.status === 'at_risk').length || 0,
        blockedJobs: jobs?.filter(j => j.status === 'blocked').length || 0
      }
    });
    
  } catch (error) {
    console.error('Demo dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create demo job endpoint
app.post('/api/demo/jobs', async (req, res) => {
  try {
    const { tenantId, jobData } = req.body;
    
    // Verify demo tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('is_demo', true)
      .single();
      
    if (!tenant) {
      return res.status(404).json({ error: 'Demo tenant not found' });
    }
    
    // Create demo job
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        ...jobData,
        is_demo: true,
        status: 'at_risk', // Default status for new demo jobs
        created_at: new Date()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating demo job:', error);
      return res.status(500).json({ error: 'Failed to create demo job' });
    }
    
    res.json({
      success: true,
      job,
      message: 'Demo job created successfully'
    });
    
  } catch (error) {
    console.error('Create demo job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// 8. SERVER STARTUP
// ==================================================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 RoofReady Fulfillment Service running on port ${PORT}`);
  console.log(`📧 Webhook endpoint: /webhooks/stripe`);
});

module.exports = {
  handleCheckoutSessionCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  createNewTenant,
  updateTenantSubscription,
  getPlanEntitlements
};