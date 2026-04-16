-- Migration 009: Contract Renewals
-- Purpose: Create audit trail for contract renewals
-- Preserves historical rent amounts and dates for dispute resolution

CREATE TABLE contract_renewals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  previous_end_date     DATE,
  new_end_date          DATE NOT NULL,
  previous_monthly_rent DECIMAL(10,2),
  new_monthly_rent      DECIMAL(10,2) NOT NULL,
  renewed_at            TIMESTAMPTZ DEFAULT NOW(),
  renewed_by            UUID REFERENCES users(id),
  notes                 TEXT
);

CREATE INDEX idx_renewals_contract ON contract_renewals(contract_id);
CREATE INDEX idx_renewals_date     ON contract_renewals(renewed_at);
