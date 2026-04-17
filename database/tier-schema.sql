-- RoofReady Tier Logic Database Schema
-- Run this in Supabase SQL Editor

-- ==================================================
-- 1. JOBS TABLE (Updated with calculated status)
-- ==================================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Job Details
    address VARCHAR(500) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    install_date DATE NOT NULL,
    crew_assignment VARCHAR(100),
    
    -- Status (auto-calculated from readiness factors)
    status VARCHAR(50) NOT NULL DEFAULT 'at_risk',
    status_calculated_at TIMESTAMP,
    status_override BOOLEAN DEFAULT FALSE,
    status_override_reason TEXT,
    
    -- Metadata
    notes TEXT,
    priority VARCHAR(50) DEFAULT 'normal',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    -- Indexes
    CONSTRAINT valid_status CHECK (status IN ('ready', 'at_risk', 'blocked', 'completed'))
);

-- ==================================================
-- 2. READINESS_FACTORS TABLE (Inputs for status calculation)
-- ==================================================
CREATE TABLE IF NOT EXISTS readiness_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Factor Details
    name VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'warning',
    owner VARCHAR(255),
    due_date DATE,
    notes TEXT,
    required BOOLEAN DEFAULT TRUE,
    
    -- Status Calculation Metadata
    last_updated_by UUID REFERENCES users(id),
    last_updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_state CHECK (state IN ('complete', 'warning', 'blocked'))
);

-- ==================================================
-- 3. UPDATE EXISTING TENANTS TABLE WITH DEMO FIELD
-- ==================================================
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- ==================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_install_date ON jobs(install_date);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_readiness_factors_job_id ON readiness_factors(job_id);
CREATE INDEX IF NOT EXISTS idx_readiness_factors_state ON readiness_factors(state);
CREATE INDEX IF NOT EXISTS idx_readiness_factors_due_date ON readiness_factors(due_date);

-- ==================================================
-- 5. FUNCTION TO CALCULATE JOB STATUS
-- ==================================================
CREATE OR REPLACE FUNCTION calculate_job_status(job_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    factor_record RECORD;
    has_blocked BOOLEAN := FALSE;
    has_warning BOOLEAN := FALSE;
    all_complete BOOLEAN := TRUE;
BEGIN
    -- Check all readiness factors for this job
    FOR factor_record IN 
        SELECT state, required 
        FROM readiness_factors 
        WHERE job_id = $1
    LOOP
        IF factor_record.required THEN
            IF factor_record.state = 'blocked' THEN
                has_blocked := TRUE;
            ELSIF factor_record.state = 'warning' THEN
                has_warning := TRUE;
            ELSIF factor_record.state != 'complete' THEN
                all_complete := FALSE;
            END IF;
        END IF;
    END LOOP;
    
    -- Apply status rules
    IF has_blocked THEN
        RETURN 'blocked';
    ELSIF has_warning OR NOT all_complete THEN
        RETURN 'at_risk';
    ELSIF all_complete THEN
        RETURN 'ready';
    ELSE
        RETURN 'at_risk';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 6. TRIGGER TO AUTO-UPDATE JOB STATUS WHEN FACTORS CHANGE
-- ==================================================
CREATE OR REPLACE FUNCTION update_job_status_from_factors()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new status
    DECLARE
        new_status VARCHAR(50);
    BEGIN
        new_status := calculate_job_status(
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.job_id
                ELSE NEW.job_id
            END
        );
        
        -- Update the job
        UPDATE jobs 
        SET 
            status = new_status,
            status_calculated_at = NOW(),
            updated_at = NOW()
        WHERE id = (
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.job_id
                ELSE NEW.job_id
            END
        );
    END;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_job_status
AFTER INSERT OR UPDATE OR DELETE ON readiness_factors
FOR EACH ROW EXECUTE FUNCTION update_job_status_from_factors();

-- ==================================================
-- 7. TRIGGER FOR JOBS UPDATED_AT
-- ==================================================
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_readiness_factors_updated_at BEFORE UPDATE ON readiness_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 8. INSERT SAMPLE DATA FOR TESTING
-- ==================================================
INSERT INTO jobs (tenant_id, address, customer_name, install_date, crew_assignment, status, notes)
VALUES 
(
    (SELECT id FROM tenants WHERE company_name = 'Demo Company' LIMIT 1),
    '123 Maple St, Anytown',
    'John & Sarah Miller',
    '2026-04-22',
    'Crew A',
    'at_risk',
    'Sample job for testing'
),
(
    (SELECT id FROM tenants WHERE company_name = 'Demo Company' LIMIT 1),
    '456 Oak Ave, Springfield',
    'Robert Johnson',
    '2026-04-18',
    'Crew B',
    'ready',
    'Another sample job'
)
ON CONFLICT DO NOTHING;

-- Insert readiness factors for sample jobs
DO $$
DECLARE
    job1_id UUID;
    job2_id UUID;
BEGIN
    -- Get job IDs
    SELECT id INTO job1_id FROM jobs WHERE address = '123 Maple St, Anytown' LIMIT 1;
    SELECT id INTO job2_id FROM jobs WHERE address = '456 Oak Ave, Springfield' LIMIT 1;
    
    -- Job 1: At Risk (has warnings)
    INSERT INTO readiness_factors (job_id, name, state, owner, due_date, notes, required)
    VALUES 
    (job1_id, 'Materials', 'warning', 'Office Manager', '2026-04-20', 'Supplier delivery pending', true),
    (job1_id, 'Crew', 'complete', 'Field Supervisor', '2026-04-21', 'Crew A assigned', true),
    (job1_id, 'Customer', 'warning', 'Sales Rep', '2026-04-21', 'Awaiting confirmation', true),
    (job1_id, 'Weather', 'complete', 'System', '2026-04-22', 'Clear forecast', true),
    (job1_id, 'Permit', 'warning', 'Office Manager', '2026-04-19', 'Under review', true)
    ON CONFLICT DO NOTHING;
    
    -- Job 2: Ready (all complete)
    INSERT INTO readiness_factors (job_id, name, state, owner, due_date, notes, required)
    VALUES 
    (job2_id, 'Materials', 'complete', 'Office Manager', '2026-04-16', 'Delivered on site', true),
    (job2_id, 'Crew', 'complete', 'Field Supervisor', '2026-04-17', 'Crew B assigned', true),
    (job2_id, 'Customer', 'complete', 'Sales Rep', '2026-04-17', 'Confirmed via email', true),
    (job2_id, 'Weather', 'complete', 'System', '2026-04-18', 'Clear forecast', true),
    (job2_id, 'Permit', 'complete', 'Office Manager', '2026-04-15', 'Approved', true)
    ON CONFLICT DO NOTHING;
END $$;

-- ==================================================
-- 9. VERIFICATION QUERY
-- ==================================================
SELECT '✅ Tier Logic Database setup complete!' as message;

SELECT 
    'Tables:' as section,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('jobs', 'readiness_factors');

SELECT 
    'Sample jobs:' as section,
    COUNT(*) as job_count,
    STRING_AGG(status, ', ') as statuses
FROM jobs;

SELECT 
    'Sample factors:' as section,
    COUNT(*) as factor_count,
    STRING_AGG(DISTINCT state, ', ') as states
FROM readiness_factors;

-- Test the status calculation
SELECT 
    'Status calculation test:' as section,
    j.address,
    j.status as current_status,
    calculate_job_status(j.id) as calculated_status,
    CASE 
        WHEN j.status = calculate_job_status(j.id) THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as verification
FROM jobs j
ORDER BY j.created_at;