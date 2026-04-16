-- Migration 016: Payment Schedules Subsystem
-- Forward-looking billing calendar (not retroactive like monthly_records)
-- Date: 2026-04-16

-- Step 1: Create payment_schedules table
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Link to either contract or occupancy (at least one required)
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  occupancy_id UUID REFERENCES room_occupancy(id) ON DELETE CASCADE,

  -- Period covered by this scheduled payment
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),

  -- Payment details
  due_date DATE NOT NULL,
  scheduled_amount DECIMAL(10, 2) NOT NULL CHECK (scheduled_amount > 0),

  -- Link to actual monthly_record once created by cron
  monthly_record_id UUID REFERENCES monthly_records(id) ON DELETE SET NULL,

  -- Status: scheduled|billed|paid|partial|overdue|waived|cancelled
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'billed', 'paid', 'partial', 'overdue', 'waived', 'cancelled')),

  notes TEXT,

  -- Override tracking (for manual adjustments)
  overridden_by UUID REFERENCES users(id) ON DELETE SET NULL,
  overridden_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT schedules_has_link CHECK (contract_id IS NOT NULL OR occupancy_id IS NOT NULL),
  CONSTRAINT schedules_unique_room_period UNIQUE (room_id, month, year)
);

-- Step 2: Create indexes for cron job queries
CREATE INDEX IF NOT EXISTS idx_schedules_tenant ON payment_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedules_room ON payment_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_contract ON payment_schedules(contract_id) WHERE contract_id IS NOT NULL;

-- Step 3: Add updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_schedules ON payment_schedules;
CREATE TRIGGER set_updated_at_schedules
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 016 complete: payment_schedules table created';
END $$;
