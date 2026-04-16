-- Migration 018: Maintenance Requests & Teams Subsystem
-- Separate maintenance from complaints with auto-routing to teams
-- Date: 2026-04-16

-- Step 1: Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_teams_tenant_slug UNIQUE (tenant_id, slug)
);

-- Step 2: Create team_members junction table
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Step 3: Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,

  -- Optional link to complaint category (for auto-routing)
  category_id UUID REFERENCES complaint_categories(id) ON DELETE SET NULL,

  -- Auto-generated request number: BT-MR-YYYY-NNNNNN
  request_number VARCHAR(50) UNIQUE,

  -- Request details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- State machine: open → assigned → in_progress → blocked → resolved → closed | cancelled
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'blocked', 'resolved', 'closed', 'cancelled')),

  -- Reporter information
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_by_name VARCHAR(255), -- Free text for non-user reporters

  -- Assignment
  assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Attachments (array of URLs)
  image_urls JSONB DEFAULT '[]'::JSONB,

  -- Resolution
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add default_team_id to complaint_categories for auto-routing
ALTER TABLE complaint_categories
  ADD COLUMN IF NOT EXISTS default_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Step 5: Create sequence for maintenance request numbers
CREATE SEQUENCE IF NOT EXISTS maint_request_seq START 1;

-- Step 6: Create trigger function for auto-generating request numbers
CREATE OR REPLACE FUNCTION generate_maint_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := 'BT-MR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('maint_request_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Attach trigger
DROP TRIGGER IF EXISTS trg_maint_number ON maintenance_requests;
CREATE TRIGGER trg_maint_number
  BEFORE INSERT ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_maint_request_number();

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_maint_tenant ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maint_room ON maintenance_requests(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maint_assigned_team ON maintenance_requests(assigned_team_id) WHERE assigned_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maint_assigned_user ON maintenance_requests(assigned_user_id) WHERE assigned_user_id IS NOT NULL;

-- Step 9: Add updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_teams ON teams;
CREATE TRIGGER set_updated_at_teams
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_maint ON maintenance_requests;
CREATE TRIGGER set_updated_at_maint
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Seed 6 default teams for Bartawi tenant
DO $$
DECLARE
  bartawi_tenant_id UUID;
  plumbing_team_id UUID;
  electrical_team_id UUID;
  hvac_team_id UUID;
  cleaning_team_id UUID;
  general_team_id UUID;
  security_team_id UUID;
BEGIN
  -- Get Bartawi tenant ID
  SELECT id INTO bartawi_tenant_id FROM tenants WHERE slug = 'bartawi' LIMIT 1;

  IF bartawi_tenant_id IS NOT NULL THEN
    -- 1. Plumbing Team
    INSERT INTO teams (id, tenant_id, name, slug, description, icon_name)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Plumbing',
      'plumbing',
      'Water leaks, pipes, toilets, drains',
      'wrench'
    ) RETURNING id INTO plumbing_team_id;

    -- 2. Electrical Team
    INSERT INTO teams (id, tenant_id, name, slug, description, icon_name)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Electrical',
      'electrical',
      'Power, lighting, outlets, circuit breakers',
      'lightning'
    ) RETURNING id INTO electrical_team_id;

    -- 3. HVAC Team
    INSERT INTO teams (id, tenant_id, name, slug, description, icon_name)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'HVAC',
      'hvac',
      'AC units, ventilation, cooling systems',
      'fan'
    ) RETURNING id INTO hvac_team_id;

    -- 4. Cleaning Team
    INSERT INTO teams (id, tenant_id, name, slug, description, icon_name)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Cleaning',
      'cleaning',
      'Common areas, hygiene, pest control',
      'broom'
    ) RETURNING id INTO cleaning_team_id;

    -- 5. General Maintenance Team
    INSERT INTO teams (id, tenant_id, name, slug, description, icon_name)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'General Maintenance',
      'general-maintenance',
      'Doors, windows, paint, furniture repairs',
      'hammer'
    ) RETURNING id INTO general_team_id;

    -- 6. Security Team
    INSERT INTO teams (id, tenant_id, name, slug, description, icon_name)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Security',
      'security',
      'Access control, CCTV, security incidents',
      'shield'
    ) RETURNING id INTO security_team_id;

    -- Step 11: Map existing complaint categories to default teams
    -- Note: This assumes categories exist from earlier migrations

    -- Water Issue, Plumbing → Plumbing team
    UPDATE complaint_categories
    SET default_team_id = plumbing_team_id
    WHERE tenant_id = bartawi_tenant_id
      AND name IN ('Water Issue', 'Plumbing');

    -- Electricity → Electrical team
    UPDATE complaint_categories
    SET default_team_id = electrical_team_id
    WHERE tenant_id = bartawi_tenant_id
      AND name = 'Electricity';

    -- AC / Cooling → HVAC team
    UPDATE complaint_categories
    SET default_team_id = hvac_team_id
    WHERE tenant_id = bartawi_tenant_id
      AND name IN ('AC / Cooling', 'HVAC');

    -- Hygiene, Cleaning → Cleaning team
    UPDATE complaint_categories
    SET default_team_id = cleaning_team_id
    WHERE tenant_id = bartawi_tenant_id
      AND name IN ('Hygiene', 'Cleaning');

    -- Maintenance → General Maintenance team
    UPDATE complaint_categories
    SET default_team_id = general_team_id
    WHERE tenant_id = bartawi_tenant_id
      AND name = 'Maintenance';

    -- Security → Security team
    UPDATE complaint_categories
    SET default_team_id = security_team_id
    WHERE tenant_id = bartawi_tenant_id
      AND name = 'Security';

    RAISE NOTICE 'Migration 018 complete: 6 teams seeded and categories mapped for Bartawi';
  ELSE
    RAISE NOTICE 'Bartawi tenant not found, skipping seed data';
  END IF;
END $$;
