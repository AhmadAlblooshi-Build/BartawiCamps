-- Migration 015: Security Deposits Subsystem
-- State machine for deposit collection, refund, and forfeiture tracking
-- Date: 2026-04-16

-- Step 1: Create security_deposits table
CREATE TABLE IF NOT EXISTS security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Link to either contract or occupancy (at least one required)
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  occupancy_id UUID REFERENCES room_occupancy(id) ON DELETE SET NULL,

  -- Tenant information (optional, auto-resolved from contract/occupancy)
  individual_id UUID REFERENCES individuals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Deposit details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) DEFAULT 'AED',
  payment_method VARCHAR(50), -- cash|cheque|bank_transfer|other
  payment_reference VARCHAR(255), -- Cheque number, transfer ref, etc.

  -- State machine: pending → held → partially_refunded → refunded | forfeited
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'partially_refunded', 'refunded', 'forfeited')),

  -- Collection tracking
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  collected_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Refund tracking
  refunded_amount DECIMAL(10, 2) DEFAULT 0 CHECK (refunded_amount >= 0),
  refunded_at TIMESTAMPTZ,
  refunded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  refund_reason TEXT,
  refund_method VARCHAR(50), -- cash|cheque|bank_transfer

  -- Forfeiture tracking
  forfeited_amount DECIMAL(10, 2) DEFAULT 0 CHECK (forfeited_amount >= 0),
  forfeiture_reason TEXT,

  -- Auto-generated receipt number: BT-DEP-YYYY-NNNNNN
  receipt_number VARCHAR(50) UNIQUE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT deposits_has_link CHECK (contract_id IS NOT NULL OR occupancy_id IS NOT NULL),
  CONSTRAINT deposits_refund_math CHECK (refunded_amount + forfeited_amount <= amount)
);

-- Step 2: Create sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS deposit_receipt_seq START 1;

-- Step 3: Create trigger function for auto-generating receipt numbers
CREATE OR REPLACE FUNCTION generate_deposit_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'BT-DEP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('deposit_receipt_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Attach trigger to security_deposits table
DROP TRIGGER IF EXISTS trg_deposit_receipt_number ON security_deposits;
CREATE TRIGGER trg_deposit_receipt_number
  BEFORE INSERT ON security_deposits
  FOR EACH ROW
  EXECUTE FUNCTION generate_deposit_receipt_number();

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deposits_tenant ON security_deposits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposits_room ON security_deposits(room_id);
CREATE INDEX IF NOT EXISTS idx_deposits_contract ON security_deposits(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_occupancy ON security_deposits(occupancy_id) WHERE occupancy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_status ON security_deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_receipt ON security_deposits(receipt_number);

-- Step 6: Add updated_at trigger (reuse existing function from migration 008)
DROP TRIGGER IF EXISTS set_updated_at_deposits ON security_deposits;
CREATE TRIGGER set_updated_at_deposits
  BEFORE UPDATE ON security_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 015 complete: security_deposits table created with auto-receipt generation';
END $$;
