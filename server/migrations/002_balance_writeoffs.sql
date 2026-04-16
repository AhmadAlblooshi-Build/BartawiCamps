-- Migration 002: Balance Writeoffs
-- Purpose: Track balance write-offs when tenants checkout with outstanding balances
-- Ensures financial audit trail compliance

CREATE TABLE balance_writeoffs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id           UUID NOT NULL REFERENCES rooms(id),
  camp_id           UUID NOT NULL REFERENCES camps(id),
  occupancy_id      UUID REFERENCES room_occupancy(id),
  individual_id     UUID REFERENCES individuals(id),
  company_id        UUID REFERENCES companies(id),
  amount            DECIMAL(10,2) NOT NULL,
  reason            TEXT NOT NULL,
  written_off_at    TIMESTAMPTZ DEFAULT NOW(),
  written_off_by    UUID REFERENCES users(id),
  notes             TEXT
);

CREATE INDEX idx_writeoffs_tenant ON balance_writeoffs(tenant_id);
CREATE INDEX idx_writeoffs_room   ON balance_writeoffs(room_id);
CREATE INDEX idx_writeoffs_date   ON balance_writeoffs(written_off_at);
