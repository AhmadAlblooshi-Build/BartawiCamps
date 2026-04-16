-- Migration 021: Create Admin User
-- Creates Ahmad Al-Mansoori as the CEO admin user with full access
-- Date: 2026-04-16

DO $$
DECLARE
  bartawi_tenant_id UUID;
  admin_role_id UUID;
  new_user_id UUID;
  password_hash TEXT;
BEGIN
  -- Get Bartawi tenant ID
  SELECT id INTO bartawi_tenant_id FROM tenants WHERE slug = 'bartawi' LIMIT 1;

  IF bartawi_tenant_id IS NULL THEN
    RAISE NOTICE 'Bartawi tenant not found, skipping admin user creation';
    RETURN;
  END IF;

  -- Get Admin role ID
  SELECT id INTO admin_role_id 
  FROM roles 
  WHERE tenant_id = bartawi_tenant_id AND name = 'Admin' 
  LIMIT 1;

  IF admin_role_id IS NULL THEN
    RAISE NOTICE 'Admin role not found, skipping admin user creation';
    RETURN;
  END IF;

  -- Check if user already exists
  SELECT id INTO new_user_id 
  FROM users 
  WHERE email = 'ahmad@bartawi.com'
  LIMIT 1;

  IF new_user_id IS NOT NULL THEN
    RAISE NOTICE 'Admin user ahmad@bartawi.com already exists';
    RETURN;
  END IF;

  -- bcrypt hash for password "Bartawi2026!"
  -- Generated with: bcrypt.hashSync('Bartawi2026!', 10)
  password_hash := '$2b$10$C2I4c.o37dt3CGT4w60XpOpGXCQXsVPzKTKpnXGrt1t27hE4VEDTy';

  -- Create admin user
  INSERT INTO users (
    id, 
    tenant_id, 
    email, 
    password_hash, 
    full_name, 
    role_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    bartawi_tenant_id,
    'ahmad@bartawi.com',
    password_hash,
    'Ahmad Al-Mansoori',
    admin_role_id,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;

  RAISE NOTICE 'Admin user created: ahmad@bartawi.com (Ahmad Al-Mansoori)';
  RAISE NOTICE 'Password: Bartawi2026!';
  RAISE NOTICE 'Role: Admin (full access to all 453 rooms across 2 camps)';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating admin user: %', SQLERRM;
END $$;
