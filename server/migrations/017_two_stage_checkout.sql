-- Migration 017: Two-Stage Checkout with Notice Period
-- Modifies occupancy and rooms tables for notice → complete-checkout workflow
-- Date: 2026-04-16

-- Step 1: Add new columns to room_occupancy table
ALTER TABLE room_occupancy
  ADD COLUMN IF NOT EXISTS notice_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notice_given_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intended_vacate_date DATE,
  ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
  ADD COLUMN IF NOT EXISTS inspection_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspection_at TIMESTAMPTZ;

-- Step 2: Add new status value 'notice_given' to occupancy status enum
-- Note: PostgreSQL enums can't be altered directly, so we'll handle this in application validation
-- The status column already exists as VARCHAR, so no schema change needed

-- Step 3: Add new status value 'vacating' to rooms status
-- Note: Same as above, handled via application validation

-- Step 4: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_occupancy_notice_given ON room_occupancy(notice_given_at) WHERE notice_given_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_occupancy_intended_vacate ON room_occupancy(intended_vacate_date) WHERE intended_vacate_date IS NOT NULL;

-- Verification
DO $$
DECLARE
  new_cols INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_cols
  FROM information_schema.columns
  WHERE table_name = 'room_occupancy'
    AND column_name IN ('notice_given_at', 'notice_given_by', 'intended_vacate_date', 'inspection_notes', 'inspection_by', 'inspection_at');

  RAISE NOTICE 'Migration 017 complete: % new columns added to room_occupancy', new_cols;
END $$;
