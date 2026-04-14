-- RoofReady Post-Payment Fulfillment Database Schema
-- Created: 2026-04-14
-- Purpose: Store tenant accounts, subscriptions, entitlements, and usage data

-- ==================================================
-- 1. TENANTS TABLE (Companies/Organizations)
-- ==================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    company_address TEXT,
    
    -- Billing & Subscription
    plan_code VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter, pro, team
    billing_status VARCHAR(50) NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, unpaid, canceled
    fulfillment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, provisioning, active, limited, suspended
    onboarding_status VARCHAR(50) NOT NULL DEFAULT 'not_started', -- not_started, in_progress, complete
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    billing_interval VARCHAR(20), -- month, year
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Support & Onboarding
    support_level VARCHAR(50) DEFAULT 'email', -- email, priority, dedicated
    onboarding_type VARCHAR(50) DEFAULT 'self_serve', -- self_serve, guided, white_glove
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_tenants_billing_status (billing_status),
    INDEX idx_tenants_fulfillment_status (fulfillment_status),
    INDEX idx_tenants_plan_code (plan_code)
);

-- ==================================================
-- 2. SUBSCRIPTIONS TABLE (Subscription History)
-- ==================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Stripe Data
    stripe_subscription_id VARCHAR(255) NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    
    -- Plan Details
    plan_code VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    billing_interval VARCHAR(20) NOT NULL,
    
    -- Period Details
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    
    -- Status
    status VARCHAR(50) NOT NULL, -- active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_subscriptions_tenant_id (tenant_id),
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_stripe_id (stripe_subscription_id)
);

-- ==================================================
-- 3. ENTITLEMENTS TABLE (Plan Features & Limits)
-- ==================================================
CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Job Limits
    active_jobs_limit INTEGER NOT NULL DEFAULT 10,
    archived_jobs_limit INTEGER DEFAULT 1000,
    
    -- User Limits
    crew_users_limit INTEGER NOT NULL DEFAULT 2,
    office_admin_limit INTEGER NOT NULL DEFAULT 1,
    total_users_limit INTEGER NOT NULL DEFAULT 3,
    
    -- Feature Flags
    analytics_enabled BOOLEAN DEFAULT FALSE,
    weather_alerts_enabled BOOLEAN DEFAULT FALSE,
    custom_reporting_enabled BOOLEAN DEFAULT FALSE,
    api_access_enabled BOOLEAN DEFAULT FALSE,
    white_label_enabled BOOLEAN DEFAULT FALSE,
    scheduling_enabled VARCHAR(20) DEFAULT 'none', -- none, basic, advanced
    
    -- Support & Onboarding
    support_level VARCHAR(50) DEFAULT 'email',
    onboarding_type VARCHAR(50) DEFAULT 'self_serve',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    UNIQUE (tenant_id),
    INDEX idx_entitlements_tenant_id (tenant_id)
);

-- ==================================================
-- 4. TENANT_USAGE TABLE (Current Usage Counters)
-- ==================================================
CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Usage Counters
    active_jobs_count INTEGER DEFAULT 0,
    total_users_count INTEGER DEFAULT 0,
    api_calls_this_period INTEGER DEFAULT 0,
    exports_this_period INTEGER DEFAULT 0,
    reports_this_period INTEGER DEFAULT 0,
    
    -- Period Tracking
    period_start TIMESTAMP DEFAULT NOW(),
    period_end TIMESTAMP DEFAULT NOW() + INTERVAL '1 month',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    UNIQUE (tenant_id),
    INDEX idx_tenant_usage_tenant_id (tenant_id)
);

-- ==================================================
-- 5. USERS TABLE (All Users Across Tenants)
-- ==================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- User Info
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    
    -- Auth
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    
    -- Roles
    role VARCHAR(50) NOT NULL DEFAULT 'crew', -- owner, admin, office, crew
    permissions JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, invited, suspended, deleted
    
    -- Stripe (for owner)
    stripe_customer_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    
    -- Indexes
    UNIQUE (tenant_id, email),
    INDEX idx_users_tenant_id (tenant_id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
);

-- ==================================================
-- 6. ONBOARDING_TASKS TABLE (Guided Onboarding)
-- ==================================================
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Task Details
    task_key VARCHAR(100) NOT NULL, -- import_jobs, invite_team, configure_factors, etc.
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_order INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_onboarding_tasks_tenant_id (tenant_id),
    INDEX idx_onboarding_tasks_status (status),
    UNIQUE (tenant_id, task_key)
);

-- ==================================================
-- 7. BILLING_EVENTS TABLE (Audit Log for Billing)
-- ==================================================
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL, -- subscription_created, payment_succeeded, payment_failed, subscription_updated, subscription_canceled
    stripe_event_id VARCHAR(255),
    stripe_object_type VARCHAR(100), -- checkout.session, customer.subscription, invoice, etc.
    stripe_object_id VARCHAR(255),
    
    -- Data
    event_data JSONB NOT NULL,
    
    -- Processing Status
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_billing_events_tenant_id (tenant_id),
    INDEX idx_billing_events_event_type (event_type),
    INDEX idx_billing_events_stripe_event_id (stripe_event_id),
    INDEX idx_billing_events_processed (processed)
);

-- ==================================================
-- 8. AUDIT_LOGS TABLE (Security & Compliance)
-- ==================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- login, create_job, update_job, invite_user, etc.
    resource_type VARCHAR(100), -- job, user, subscription, etc.
    resource_id VARCHAR(255),
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_audit_logs_tenant_id (tenant_id),
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_created_at (created_at)
);

-- ==================================================
-- 9. PLAN ENTITLEMENTS TEMPLATE (Default Plans)
-- ==================================================
INSERT INTO entitlements (tenant_id, active_jobs_limit, crew_users_limit, office_admin_limit, total_users_limit, analytics_enabled, weather_alerts_enabled, custom_reporting_enabled, api_access_enabled, white_label_enabled, scheduling_enabled, support_level, onboarding_type)
SELECT 
    NULL as tenant_id,
    10 as active_jobs_limit,
    2 as crew_users_limit,
    1 as office_admin_limit,
    3 as total_users_limit,
    FALSE as analytics_enabled,
    FALSE as weather_alerts_enabled,
    FALSE as custom_reporting_enabled,
    FALSE as api_access_enabled,
    FALSE as white_label_enabled,
    'none' as scheduling_enabled,
    'email' as support_level,
    'self_serve' as onboarding_type
WHERE NOT EXISTS (SELECT 1 FROM entitlements WHERE tenant_id IS NULL AND active_jobs_limit = 10);

INSERT INTO entitlements (tenant_id, active_jobs_limit, crew_users_limit, office_admin_limit, total_users_limit, analytics_enabled, weather_alerts_enabled, custom_reporting_enabled, api_access_enabled, white_label_enabled, scheduling_enabled, support_level, onboarding_type)
SELECT 
    NULL as tenant_id,
    50 as active_jobs_limit,
    10 as crew_users_limit,
    3 as office_admin_limit,
    13 as total_users_limit,
    TRUE as analytics_enabled,
    TRUE as weather_alerts_enabled,
    TRUE as custom_reporting_enabled,
    FALSE as api_access_enabled,
    FALSE as white_label_enabled,
    'basic' as scheduling_enabled,
    'priority' as support_level,
    'guided' as onboarding_type
WHERE NOT EXISTS (SELECT 1 FROM entitlements WHERE tenant_id IS NULL AND active_jobs_limit = 50);

INSERT INTO entitlements (tenant_id, active_jobs_limit, crew_users_limit, office_admin_limit, total_users_limit, analytics_enabled, weather_alerts_enabled, custom_reporting_enabled, api_access_enabled, white_label_enabled, scheduling_enabled, support_level, onboarding_type)
SELECT 
    NULL as tenant_id,
    999999 as active_jobs_limit, -- "unlimited"
    999999 as crew_users_limit,
    999999 as office_admin_limit,
    999999 as total_users_limit,
    TRUE as analytics_enabled,
    TRUE as weather_alerts_enabled,
    TRUE as custom_reporting_enabled,
    TRUE as api_access_enabled,
    TRUE as white_label_enabled,
    'advanced' as scheduling_enabled,
    'dedicated' as support_level,
    'white_glove' as onboarding_type
WHERE NOT EXISTS (SELECT 1 FROM entitlements WHERE tenant_id IS NULL AND active_jobs_limit = 999999);

-- ==================================================
-- 10. DEFAULT ONBOARDING TASKS TEMPLATE
-- ==================================================
INSERT INTO onboarding_tasks (tenant_id, task_key, task_name, task_description, task_order, status)
SELECT 
    NULL as tenant_id,
    'import_jobs' as task_key,
    'Import Your First Jobs' as task_name,
    'Upload your current roofing jobs or add them manually' as task_description,
    1 as task_order,
    'pending' as status
WHERE NOT EXISTS (SELECT 1 FROM onboarding_tasks WHERE tenant_id IS NULL AND task_key = 'import_jobs');

INSERT INTO onboarding_tasks (tenant_id, task_key, task_name, task_description, task_order, status)
SELECT 
    NULL as tenant_id,
    'invite_team' as task_key,
    'Invite Your Team' as task_name,
    'Add office staff and field crew members' as task_description,
    2 as task_order,
    'pending' as status
WHERE NOT EXISTS (SELECT 1 FROM onboarding_tasks WHERE tenant_id IS NULL AND task_key = 'invite_team');

INSERT INTO onboarding_tasks (tenant_id, task_key, task_name, task_description, task_order, status)
SELECT 
    NULL as tenant_id,
    'configure_factors' as task_key,
    'Configure Readiness Factors' as task_name,
    'Set up materials, crew, customer, weather, and permit tracking' as task_description,
    3 as task_order,
    'pending' as status
WHERE NOT EXISTS (SELECT 1 FROM onboarding_tasks WHERE tenant_id IS NULL AND task_key = 'configure_factors');

INSERT INTO onboarding_tasks (tenant_id, task_key, task_name, task_description, task_order, status)
SELECT 
    NULL as tenant_id,
    'set_dates' as task_key,
    'Schedule Install Dates' as task_name,
    'Add install dates to your upcoming jobs' as task_description,
    4 as task_order,
    'pending' as status
WHERE NOT EXISTS (SELECT 1 FROM onboarding_tasks WHERE tenant_id IS NULL AND task_key = 'set_dates');

-- ==================================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ==================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON entitlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_usage_updated_at BEFORE UPDATE ON tenant_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_tasks_updated_at BEFORE UPDATE ON onboarding_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 12. HELPER FUNCTIONS
-- ==================================================
CREATE OR REPLACE FUNCTION check_tenant_limit(
    p_tenant_id UUID,
    p_limit_type VARCHAR(50),
    p_current_count INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    -- Get the limit for the tenant
    SELECT 
        CASE p_limit_type
            WHEN 'active_jobs' THEN e.active_jobs_limit
            WHEN 'crew_users' THEN e.crew_users_limit
            WHEN 'office_admin' THEN e.office_admin_limit
            WHEN 'total_users' THEN e.total_users_limit
            ELSE NULL
        END INTO v_limit
    FROM tenants t
    JOIN entitlements e ON t.id = e.tenant_id
    WHERE t.id = p_tenant_id
      AND t.billing_status = 'active'
      AND t.fulfillment_status = 'active';
    
    -- If limit is NULL or 999999 (unlimited), return TRUE
    IF v_limit IS NULL OR v_limit = 999999 THEN
        RETURN TRUE;
    END IF;
    
    -- Check if current count is under limit
    RETURN p_current_count < v_limit;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 13. VIEW FOR TENANT OVERVIEW
-- ==================================================
CREATE OR REPLACE VIEW tenant_overview AS
SELECT 
    t.id,
    t.company_name,
    t.plan_code,
    t.billing_status,
    t.fulfillment_status,
    t.onboarding_status,
    t.support_level,
    t.current_period_start,
    t.current_period_end,
    
    -- Entitlements
    e.active_jobs_limit,
    e.crew_users_limit,
    e.office_admin_limit,
    e.total_users_limit,
    e.analytics_enabled,
    e.weather_alerts_enabled,
    e.custom_reporting_enabled,
    e.api_access_enabled,
    e.white_label_enabled,
    e.scheduling_enabled,
    
    -- Usage
    COALESCE(u.active_j