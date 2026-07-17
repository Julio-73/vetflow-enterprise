-- ==============================================================================
-- VetFlow SaaS Database Performance Indexes (Enterprise Hardening)
-- ==============================================================================
-- This file defines composite and partial indexes optimized for Row Level Security (RLS)
-- and common transactional query patterns (FEFO sorting, unclosed registers, active records).
--

-- 1. Index for FEFO (First-Expired, First-Out) batch sorting
-- Used frequently when querying product stocks and dispatching batches
CREATE INDEX IF NOT EXISTS idx_product_batches_fefo_sort 
ON product_batches (tenant_id, product_id, expiration_date ASC);

-- 2. Index for Patient search & listing filtered by RLS
CREATE INDEX IF NOT EXISTS idx_patients_tenant_rls 
ON patients (tenant_id, is_active);

-- 3. Composite Index for Appointments chronological listing and overlap check
CREATE INDEX IF NOT EXISTS idx_appointments_chronology 
ON appointments (tenant_id, veterinarian_id, appointment_date, status);

-- 4. Index for Clinical Records (EMR) search by patient
CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_search 
ON clinical_records (tenant_id, pet_id, status);

-- 5. Index for Inventory stocks lookup
CREATE INDEX IF NOT EXISTS idx_inventory_stocks_lookup 
ON inventory_stocks (tenant_id, product_id, branch_id);

-- 6. Index for Sales history audit and cash register reconciliation
CREATE INDEX IF NOT EXISTS idx_sales_reconciliation 
ON sales (tenant_id, branch_id, status, created_at);

-- 7. Index for Users lookup by role under RLS
CREATE INDEX IF NOT EXISTS idx_users_role_lookup 
ON users (tenant_id, role, is_active);
