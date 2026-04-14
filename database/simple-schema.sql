-- RoofReady Simplified Database Schema
-- Run this in Supabase SQL Editor

-- ==================================================
-- 1. TENANTS TABLE (Companies/Organizations)
-- ==================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    
    -- Billing & Subscription
    plan_code VARCHAR(50) NOT NULL DEFAULT 'starter',
    billing_status VARCHAR(50) NOT NULL DEFAULT 'trialing',
    fulfillment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    onboarding_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    billing_interval VARCHAR(20),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Support & Onboarding
    support_level VARCHAR(50) DEFAULT 'email',
    onboarding_type VARCHAR(50) DEFAULT 'self_serve',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ==================================================
-- 2. ENTITLEMENTS TABLE (Plan Features & Limits)
-- ==================================================
CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Job Limits
    active_jobs_limit INTEGER NOT NULL DEFAULT 10,
    
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
    scheduling_enabled VARCHAR(20) DEFAULT 'none',
    
    -- Support & Onboarding
    support_level VARCHAR(50) DEFAULT 'email',
    onboarding_type VARCHAR(50) DEFAULT 'self_serve',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (tenant_id)
);

-- ==================================================
-- 3. USERS TABLE (All Users Across Tenants)
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
    
    -- Roles
    role VARCHAR(50) NOT NULL DEFAULT 'crew',
    permissions JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    
    UNIQUE (tenant_id, email)
);

-- ==================================================
-- 4. ONBOARDING_TASKS TABLE (Guided Onboarding)
-- ==================================================
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Task Details
    task_key VARCHAR(100) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_order INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (tenant_id, task_key)
);

-- ==================================================
-- 5. BILLING_EVENTS TABLE (Audit Log for Billing)
-- ==================================================
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,
    stripe_event_id VARCHAR(255),
    stripe_object_type VARCHAR(100),
    stripe_object_id VARCHAR(255),
    
    -- Data
    event_data JSONB NOT NULL,
    
    -- Processing Status
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- ==================================================
-- 6. CREATE INDEXES
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_tenants_billing_status ON tenants(billing_status);
CREATE INDEX IF NOT EXISTS idx_tenants_fulfillment_status ON tenants(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan_code ON tenants(plan_code);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id ON tenants(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_tenant_id ON onboarding_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON onboarding_tasks(status);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events(processed);

-- ==================================================
-- 7. INSERT DEFAULT PLAN TEMPLATES
-- ==================================================
INSERT INTO entitlements (tenant_id, active_jobs_limit, crew_users_limit, office_admin_limit, total_users_limit, analytics_enabled, weather_alerts_enabled, custom_reporting_enabled, api_access_enabled, white_label_enabled, scheduling_enabled, support_level, onboarding_type)
VALUES 
(NULL, 10, 2, 1, 3, FALSE, FALSE, FALSE, FALSE, FALSE, 'none', 'email', 'self_serve'),
(NULL, 50, 10, 3, 13, TRUE, TRUE, TRUE, FALSE, FALSE, 'basic', 'priority', 'guided'),
(NULL, 999999, 999999, 999999, 999999, TRUE, TRUE, TRUE, TRUE, TRUE, 'advanced', 'dedicated', 'white_glove')
ON CONFLICT DO NOTHING;

-- ==================================================
-- 8. INSERT DEFAULT ONBOARDING TASKS TEMPLATE
-- ==================================================
INSERT INTO onboarding_tasks (tenant_id, task_key, task_name, task_description, task_order, status)
VALUES 
(NULL, 'import_jobs', 'Import Your First Jobs', 'Upload your current roofing jobs or add them manually', 1, 'pending'),
(NULL, 'invite_team', 'Invite Your Team', 'Add office staff and field crew members', 2, 'pending'),
(NULL, 'configure_factors', 'Configure Readiness Factors', 'Set up materials, crew, customer, weather, and permit tracking', 3, 'pending'),
(NULL, 'set_dates', 'Schedule Install Dates', 'Add install dates to your upcoming jobs', 4, 'pending')
ON CONFLICT DO NOTHING;

-- ==================================================
-- 9. CREATE UPDATED_AT TRIGGER FUNCTION
-- ==================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==================================================
-- 10. CREATE TRIGGERS FOR UPDATED_AT
-- ==================================================
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON entitlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_tasks_updated_at BEFORE UPDATE ON onboarding_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 11. VERIFICATION QUERY
-- ==================================================
SELECT '✅ Database setup complete!' as message;

SELECT 
    'Tables created:' as section,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'entitlements', 'users', 'onboarding_tasks', 'billing_events');

SELECT 
    'Plan templates:' as section,
    COUNT(*) as plan_count
FROM entitlements 
WHERE tenant_id IS NULL;

SELECT 
    'Onboarding tasks:' as section,
    COUNT(*) as task_count
FROM onboarding_tasks 
WHERE tenant_id IS NULL;