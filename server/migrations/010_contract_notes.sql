-- Migration 010: Contract Notes
-- Purpose: Create proper table for contract case notes
-- Separate from automated alerts for legal disputes, negotiations, etc.

CREATE TABLE contract_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  note_type       VARCHAR(50) DEFAULT 'general',
  -- Types: general | legal | dispute | renewal_discussion | rent_negotiation | payment_arrangement
  body            TEXT NOT NULL,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_notes_contract ON contract_notes(contract_id);
CREATE INDEX idx_contract_notes_date     ON contract_notes(created_at);
