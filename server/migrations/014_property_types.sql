-- Migration 014: Property Types Subsystem
-- Replaces enum room.room_type with first-class admin-manageable entities
-- Date: 2026-04-16

-- Step 1: Create property_types table
CREATE TABLE IF NOT EXISTS property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50), -- For UI display (e.g., 'bed', 'building', 'wrench')
  display_color VARCHAR(20) DEFAULT 'neutral', -- amber|teal|rust|neutral
  is_residential BOOLEAN DEFAULT true,
  is_leasable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_property_types_tenant_slug UNIQUE (tenant_id, slug)
);

-- Step 2: Add property_type_id to rooms table
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS property_type_id UUID REFERENCES property_types(id);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_property_types_tenant ON property_types(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_property_types_slug ON property_types(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_property_type ON rooms(property_type_id);

-- Step 4: Seed 5 default property types for Bartawi tenant
DO $$
DECLARE
  bartawi_tenant_id UUID;
  worker_dorm_id UUID;
  supervisor_id UUID;
  bartawi_staff_id UUID;
  commercial_id UUID;
  service_id UUID;
BEGIN
  -- Get Bartawi tenant ID
  SELECT id INTO bartawi_tenant_id FROM tenants WHERE slug = 'bartawi' LIMIT 1;

  IF bartawi_tenant_id IS NOT NULL THEN
    -- 1. Worker Dorm
    INSERT INTO property_types (id, tenant_id, name, slug, description, icon_name, display_color, is_residential, is_leasable, sort_order)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Worker Dorm',
      'worker-dorm',
      'Standard worker accommodation with shared facilities',
      'bed',
      'neutral',
      true,
      true,
      10
    ) RETURNING id INTO worker_dorm_id;

    -- 2. Supervisor Single
    INSERT INTO property_types (id, tenant_id, name, slug, description, icon_name, display_color, is_residential, is_leasable, sort_order)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Supervisor Single',
      'supervisor-single',
      'Private rooms for supervisors and senior staff',
      'user',
      'amber',
      true,
      true,
      20
    ) RETURNING id INTO supervisor_id;

    -- 3. Bartawi Staff
    INSERT INTO property_types (id, tenant_id, name, slug, description, icon_name, display_color, is_residential, is_leasable, sort_order)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Bartawi Staff',
      'bartawi-staff',
      'Rooms reserved for Bartawi internal staff (non-leasable)',
      'shield',
      'teal',
      true,
      false,
      30
    ) RETURNING id INTO bartawi_staff_id;

    -- 4. Commercial Lease
    INSERT INTO property_types (id, tenant_id, name, slug, description, icon_name, display_color, is_residential, is_leasable, sort_order)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Commercial Lease',
      'commercial-lease',
      'Office or commercial space leased to companies',
      'building',
      'amber',
      false,
      true,
      40
    ) RETURNING id INTO commercial_id;

    -- 5. Service/Utility
    INSERT INTO property_types (id, tenant_id, name, slug, description, icon_name, display_color, is_residential, is_leasable, sort_order)
    VALUES (
      gen_random_uuid(),
      bartawi_tenant_id,
      'Service/Utility',
      'service-utility',
      'Storage, utility rooms, common areas (non-leasable)',
      'wrench',
      'neutral',
      false,
      false,
      50
    ) RETURNING id INTO service_id;

    -- Step 5: Backfill existing rooms - map room_type enum to property_type_id
    -- Note: This assumes room_type column still exists. We'll remove it after backfill.

    -- Map 'standard' → worker-dorm
    UPDATE rooms
    SET property_type_id = worker_dorm_id
    WHERE tenant_id = bartawi_tenant_id
      AND (room_type = 'standard' OR room_type IS NULL)
      AND property_type_id IS NULL;

    -- Map 'bartawi' → bartawi-staff
    UPDATE rooms
    SET property_type_id = bartawi_staff_id
    WHERE tenant_id = bartawi_tenant_id
      AND room_type = 'bartawi'
      AND property_type_id IS NULL;

    -- Map 'commercial' → commercial-lease
    UPDATE rooms
    SET property_type_id = commercial_id
    WHERE tenant_id = bartawi_tenant_id
      AND room_type = 'commercial'
      AND property_type_id IS NULL;

    -- Map 'service' → service-utility
    UPDATE rooms
    SET property_type_id = service_id
    WHERE tenant_id = bartawi_tenant_id
      AND room_type = 'service'
      AND property_type_id IS NULL;

    RAISE NOTICE 'Property types seeded and rooms backfilled for Bartawi tenant';
  ELSE
    RAISE NOTICE 'Bartawi tenant not found, skipping seed data';
  END IF;
END $$;

-- Step 6: Make property_type_id NOT NULL after backfill
-- (Only if all rooms have been assigned a property type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM rooms WHERE property_type_id IS NULL LIMIT 1
  ) THEN
    ALTER TABLE rooms ALTER COLUMN property_type_id SET NOT NULL;
    RAISE NOTICE 'Set property_type_id to NOT NULL';
  ELSE
    RAISE NOTICE 'Some rooms still missing property_type_id, skipping NOT NULL constraint';
  END IF;
END $$;

-- Step 7: Drop old room_type enum column (if exists)
-- Note: Only safe after all rooms have property_type_id assigned
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'room_type'
  ) THEN
    ALTER TABLE rooms DROP COLUMN IF EXISTS room_type;
    RAISE NOTICE 'Dropped room_type enum column';
  END IF;
END $$;

-- Verification queries
DO $$
DECLARE
  type_count INTEGER;
  room_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO type_count FROM property_types WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = 'bartawi');
  SELECT COUNT(*) INTO room_count FROM rooms WHERE property_type_id IS NOT NULL;

  RAISE NOTICE 'Migration 014 complete: % property types created, % rooms mapped', type_count, room_count;
END $$;
