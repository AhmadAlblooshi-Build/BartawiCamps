-- Migration 007: Company Related Entity
-- Purpose: Add self-referencing relationship for companies undergoing legal restructuring
-- Example: HHM's 3 legal entities can be linked for rollup reporting

ALTER TABLE companies
  ADD COLUMN related_entity_id UUID REFERENCES companies(id),
  ADD COLUMN entity_group_name VARCHAR(255);

CREATE INDEX idx_companies_related ON companies(related_entity_id);
CREATE INDEX idx_companies_group ON companies(entity_group_name);

COMMENT ON COLUMN companies.related_entity_id IS
  'Points to the canonical/parent entity when this company is a legal rename or related entity. NULL for standalone.';
COMMENT ON COLUMN companies.entity_group_name IS
  'Display name for the entity group. Used in rollup reports.';

-- Wire up HHM — pick HHM Building Contracting LLC as canonical parent
UPDATE companies
  SET entity_group_name = 'HHM Group'
  WHERE id = 'fb61c310-3513-b50e-fea3-49a77ee1cc4d';  -- HHM Building Contracting LLC

UPDATE companies
  SET related_entity_id = 'fb61c310-3513-b50e-fea3-49a77ee1cc4d',
      entity_group_name = 'HHM Group'
  WHERE id IN (
    'd20cc1b0-40de-b53d-aa5a-7cc754e4410c',  -- HHM Bld Contracting
    '85e1dace-2653-b3b1-bc4f-cdff507261a0'   -- HHM ELECTROMECHANICAL LLC
  );
