-- Migration 019: Emergency Contact Fields
-- Add 4 emergency contact columns to individuals table
-- Date: 2026-04-16

-- Step 1: Add emergency contact columns to individuals table
ALTER TABLE individuals
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50),
  ADD COLUMN IF NOT EXISTS emergency_contact_country VARCHAR(100);

-- Step 2: Add check constraint for valid relations (optional, can be enforced in app)
-- Note: We'll handle enum validation in Zod schemas instead of DB constraints

-- Verification
DO $$
DECLARE
  new_cols INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_cols
  FROM information_schema.columns
  WHERE table_name = 'individuals'
    AND column_name LIKE 'emergency_contact_%';

  RAISE NOTICE 'Migration 019 complete: % emergency contact columns added to individuals', new_cols;
END $$;
