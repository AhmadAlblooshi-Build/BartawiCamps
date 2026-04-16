-- Migration 011: Trim Whitespace
-- Purpose: Clean trailing/leading whitespace from seed data
-- Ensures consistent search and matching behavior

UPDATE companies SET
  name = TRIM(name),
  name_normalized = TRIM(UPPER(name))
  WHERE name LIKE ' %' OR name LIKE '% ';

UPDATE individuals SET
  owner_name = TRIM(owner_name),
  full_name = TRIM(full_name)
  WHERE owner_name LIKE '% ' OR full_name LIKE '% ';

UPDATE monthly_records SET
  owner_name = TRIM(owner_name),
  company_name = TRIM(company_name)
  WHERE owner_name LIKE '% ' OR company_name LIKE '% ';

UPDATE rooms SET
  old_room_number = TRIM(REGEXP_REPLACE(old_room_number, '\s+', ' ', 'g'))
  WHERE old_room_number IS NOT NULL;
