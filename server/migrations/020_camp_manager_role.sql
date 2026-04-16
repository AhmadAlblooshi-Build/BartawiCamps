-- Migration 020: Camp Manager Role
-- Proper permission seeding for Camp Manager role (between Admin and Staff)
-- Date: 2026-04-16

DO $$
DECLARE
  bartawi_tenant_id UUID;
  camp_manager_role_id UUID;
  perm_count INTEGER;
BEGIN
  -- Get Bartawi tenant ID
  SELECT id INTO bartawi_tenant_id FROM tenants WHERE slug = 'bartawi' LIMIT 1;

  IF bartawi_tenant_id IS NULL THEN
    RAISE NOTICE 'Bartawi tenant not found, skipping Camp Manager role creation';
    RETURN;
  END IF;

  -- Check if Camp Manager role already exists
  SELECT id INTO camp_manager_role_id
  FROM roles
  WHERE tenant_id = bartawi_tenant_id AND name = 'Camp Manager'
  LIMIT 1;

  IF camp_manager_role_id IS NOT NULL THEN
    RAISE NOTICE 'Camp Manager role already exists, skipping creation';
    RETURN;
  END IF;

  -- Step 1: Create Camp Manager role
  INSERT INTO roles (id, tenant_id, name, description, is_system, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    bartawi_tenant_id,
    'Camp Manager',
    'Manages day-to-day camp operations: check-in/out, complaints, maintenance, reports',
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO camp_manager_role_id;

  -- Step 2: Grant permissions to Camp Manager role
  -- Use separate resource and action columns (not resource_action)

  -- Rooms (read, write)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'rooms' AND p.action IN ('read', 'write')
  ON CONFLICT DO NOTHING;

  -- Payments (read, write)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'payments' AND p.action IN ('read', 'write')
  ON CONFLICT DO NOTHING;

  -- Complaints (read, write, resolve)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'complaints' AND p.action IN ('read', 'write', 'resolve')
  ON CONFLICT DO NOTHING;

  -- Maintenance (read, write, resolve)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'maintenance' AND p.action IN ('read', 'write', 'resolve')
  ON CONFLICT DO NOTHING;

  -- Contracts (read, write)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'contracts' AND p.action IN ('read', 'write')
  ON CONFLICT DO NOTHING;

  -- Reports (read, export)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'reports' AND p.action IN ('read', 'export')
  ON CONFLICT DO NOTHING;

  -- Deposits (read, write)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'deposits' AND p.action IN ('read', 'write')
  ON CONFLICT DO NOTHING;

  -- Property Types (read only)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'property_types' AND p.action = 'read'
  ON CONFLICT DO NOTHING;

  -- Teams (read only)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'teams' AND p.action = 'read'
  ON CONFLICT DO NOTHING;

  -- Map (read only)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'map' AND p.action = 'read'
  ON CONFLICT DO NOTHING;

  -- Sensors (read only)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT camp_manager_role_id, p.id
  FROM permissions p
  WHERE p.resource = 'sensors' AND p.action = 'read'
  ON CONFLICT DO NOTHING;

  -- Count permissions granted
  SELECT COUNT(*) INTO perm_count
  FROM role_permissions
  WHERE role_id = camp_manager_role_id;

  RAISE NOTICE 'Migration 020 complete: Camp Manager role created with % permissions', perm_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating Camp Manager role: %', SQLERRM;
END $$;

-- Verification: Count permissions granted to Camp Manager
DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.name = 'Camp Manager'
    AND r.tenant_id IN (SELECT id FROM tenants WHERE slug = 'bartawi');

  RAISE NOTICE 'Camp Manager role has % permissions granted', perm_count;
END $$;
