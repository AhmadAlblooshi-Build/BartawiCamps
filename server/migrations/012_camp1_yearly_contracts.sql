-- Migration 012: Camp 1 Yearly Contracts
-- Purpose: Seed the 6 missing Camp 1 yearly contract records from Excel
-- REQUIRES: Manual input from operations team for actual start/end dates

-- Schema addition for individual contracts
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS individual_id UUID REFERENCES individuals(id),
  ADD CONSTRAINT IF NOT EXISTS contracts_has_entity
    CHECK (company_id IS NOT NULL OR individual_id IS NOT NULL);

-- ===============================================================================
-- MANUAL ACTION REQUIRED:
-- Before running this migration, obtain actual contract dates from ops team for:
-- - A12: Al Junaibi/Hartoshi Cont (AED 2,700/month yearly)
-- - Plus 5 other rooms identified in Camp_Final.xlsx
-- ===============================================================================

/*
-- Template for the yearly contracts (UNCOMMENT AND FILL IN DATES):
INSERT INTO contracts (
  id, camp_id, room_id, individual_id, contract_type,
  monthly_rent, start_date, end_date, status, notes
) VALUES
  -- A12: Al Junaibi/Hartoshi Cont, yearly
  (gen_random_uuid(),
   '4c935f2b-23b9-b94c-99ca-cb2ee0620045',  -- Camp 1
   'eddf1c6a-9f2a-8ca4-7c7d-231d0fc84b95',  -- A12
   (SELECT id FROM individuals WHERE owner_name = 'Al Junaibi/Hartoshi Cont' LIMIT 1),
   'yearly', 2700,
   '2025-XX-XX',  -- TO FILL IN
   '2026-XX-XX',  -- TO FILL IN
   'active',
   'Migrated from Excel yearly-contract flag')
  -- ... Add 5 more rows with dates from ops team ...
;
*/
