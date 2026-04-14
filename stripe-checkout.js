// RoofReady Stripe Checkout Integration
// Frontend checkout and backend API endpoints

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
// 1. CHECKOUT SESSION CREATION
// ==================================================
app.post('/api/checkout/session', async (req, res) => {
  try {
    const { plan, email, companyName, fullName, tenantId } = req.body;
    
    // Validate plan
    const validPlans = ['starter', 'pro', 'team'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Get Stripe price ID for the plan
    const priceId = getStripePriceId(plan);
    if (!priceId) {
      return res.status(400).json({ error: 'Plan not configured' });
    }
    
    // Create or get customer
    let customerId;
    if (tenantId) {
      // Existing tenant - get their Stripe customer ID
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', tenantId)
        .single();
        
      if (tenant?.stripe_customer_id) {
        customerId = tenant.stripe_customer_id;
      }
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      customer: customerId,
      customer_email: !customerId ? email : undefined,
      metadata: {
        tenant_id: tenantId || '',
        plan_code: plan,
        company_name: companyName || '',
        full_name: fullName || '',
        email: email
      },
      subscription_data: {
        metadata: {
          plan_code: plan,
          tenant_id: tenantId || ''
        }
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ==================================================
// 2. PORTAL SESSION (BILLING MANAGEMENT)
// ==================================================
app.post('/api/billing/portal', async (req, res) => {
  try {
    const { tenantId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    // Get tenant's Stripe customer ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', tenantId)
      .single();
      
    if (!tenant?.stripe_customer_id) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.APP_URL}/billing`,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// ==================================================
// 3. PLAN DETAILS & PRICING
// ==================================================
app.get('/api/plans', async (req, res) => {
  try {
    const plans = {
      starter: {
        name: 'Starter',
        price: 99,
        interval: 'month',
        description: 'Small owner-operator teams',
        features: [
          'Up to 10 active jobs',
          '2 crew users',
          '1 office admin',
          'Job readiness dashboard',
          'Materials & crew tracking',
          'Email support',
          'Mobile dashboard',
          'Self-serve onboarding'
        ],
        limits: {
          active_jobs: 10,
          crew_users: 2,
          office_admins: 1,
          total_users: 3
        }
      },
      pro: {
        name: 'Pro',
        price: 199,
        interval: 'month',
        description: 'Growing production teams',
        features: [
          'Up to 50 active jobs',
          '10 crew users',
          '3 office admins',
          'Advanced analytics',
          'Weather delay alerts',
          'Custom reporting',
          'Priority support',
          'Team collaboration',
          'Guided onboarding'
        ],
        limits: {
          active_jobs: 50,
          crew_users: 10,
          office_admins: 3,
          total_users: 13
        }
      },
      team: {
        name: 'Team',
        price: 349,
        interval: 'month',
        description: 'Multi-crew or multi-location roofers',
        features: [
          'Unlimited active jobs',
          'Unlimited users',
          'Advanced analytics',
          'Weather delay alerts',
          'Custom reporting',
          'API access',
          'White-label dashboard',
          'Advanced scheduling',
          'Dedicated support',
          'White-glove onboarding'
        ],
        limits: {
          active_jobs: 999999, // unlimited
          crew_users: 999999,
          office_admins: 999999,
          total_users: 999999
        }
      }
    };
    
    res.json(plans);
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// ==================================================
// 4. TENANT SUBSCRIPTION STATUS
// ==================================================
app.get('/api/tenant/:tenantId/subscription', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        entitlements (*),
        tenant_usage (*)
      `)
      .eq('id', tenantId)
      .single();
      
    if (error) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Get subscription from Stripe if we have a subscription ID
    let subscription = null;
    if (tenant.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
      } catch (stripeError) {
        console.error('Error fetching subscription from Stripe:', stripeError);
      }
    }
    
    res.json({
      tenant,
      subscription,
      isActive: tenant.billing_status === 'active' && tenant.fulfillment_status === 'active',
      canUpgrade: true, // Add logic based on current plan
      canDowngrade: tenant.plan_code !== 'starter',
      nextBillingDate: tenant.current_period_end,
      trialEnds: tenant.trial_end
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// ==================================================
// 5. UPGRADE/DOWNGRADE HANDLING
// ==================================================
app.post('/api/subscription/change', async (req, res) => {
  try {
    const { tenantId, newPlan, prorationBehavior = 'create_prorations' } = req.body;
    
    if (!tenantId || !newPlan) {
      return res.status(400).json({ error: 'Tenant ID and new plan required' });
    }
    
    // Get tenant's Stripe subscription ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', tenantId)
      .single();
      
    if (!tenant?.stripe_subscription_id) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
    
    // Get new price ID
    const newPriceId = getStripePriceId(newPlan);
    if (!newPriceId) {
      return res.status(400).json({ error: 'New plan not configured' });
    }
    
    // Update subscription
    const updatedSubscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: prorationBehavior,
        metadata: {
          ...subscription.metadata,
          plan_code: newPlan
        }
      }
    );
    
    // Update tenant in database
    await supabase
      .from('tenants')
      .update({
        plan_code: newPlan,
        support_level: getSupportLevel(newPlan),
        onboarding_type: getOnboardingType(newPlan),
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);
      
    // Update entitlements
    await updateEntitlements(tenantId, newPlan);
    
    res.json({
      success: true,
      subscription: updatedSubscription,
      immediateChange: prorationBehavior === 'always_invoice'
    });
  } catch (error) {
    console.error('Error changing subscription:', error);
    res.status(500).json({ error: 'Failed to change subscription' });
  }
});

// ==================================================
// 6. HELPER FUNCTIONS
// ==================================================
function getStripePriceId(plan) {
  const priceMap = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM
  };
  return priceMap[plan];
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
      scheduling_enabled: 'none'
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
      scheduling_enabled: 'basic'
    },
    team: {
      active_jobs_limit: 999999,
      crew_users_limit: 999999,
      office_admin_limit: 999999,
      total_users_limit: 999999,
      analytics_enabled: true,
      weather_alerts_enabled: true,
      custom_reporting_enabled: true,
      api_access_enabled: true,
      white_label_enabled: true,
      scheduling_enabled: 'advanced'
    }
  };
  
  return plans[planCode] || plans.starter;
}

// ==================================================
// 7. SERVER STARTUP
// ==================================================
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 RoofReady Stripe Checkout API running on port ${PORT}`);
  console.log(`💳 Endpoints: /api/checkout/session, /api/billing/portal, /api/plans`);
});

module.exports = {
  getStripePriceId,
  getPlanEntitlements
};