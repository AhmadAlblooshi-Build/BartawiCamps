# Database Migrations Guide

This document describes the migration strategy for the Bartawi CMS database schema.

---

## Overview

We use **numbered SQL migration files** instead of Prisma Migrate to maintain full control over production deployments and data transformations.

**Migration Files Location:** `server/migrations/`

**Naming Convention:** `NNN_descriptive_name.sql` (e.g., `002_balance_writeoffs.sql`)

---

## Migration Workflow

### First-Time Setup (Development)

1. **Start PostgreSQL container:**
   ```bash
   docker-compose up -d
   ```

2. **Run ALL migrations in order:**
   ```bash
   cd server

   # Run each migration sequentially
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/002_balance_writeoffs.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/003_notification_snooze.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/004_uniqueness_constraints.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/005_must_reset_password.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/006_dedupe_companies.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/007_company_related_entity.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/008_updated_at_triggers.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/009_contract_renewals.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/010_contract_notes.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/011_trim_whitespace.sql
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/013_room_size.sql

   # Skip 012 - requires manual data (see Camp 1 Contracts section below)
   ```

3. **Introspect database to update Prisma schema:**
   ```bash
   npx prisma db pull
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

5. **Verify migration status:**
   ```bash
   docker exec bartawi_postgres psql -U bartawi -d bartawi_cms -c "\dt"
   ```

---

### Adding a New Migration

1. **Create the SQL file:**
   ```bash
   # Next available number after 013 is 014
   touch migrations/014_your_feature_name.sql
   ```

2. **Write the migration SQL:**
   ```sql
   -- migrations/014_your_feature_name.sql
   BEGIN;

   -- Your schema changes here
   ALTER TABLE your_table ADD COLUMN new_column VARCHAR(255);

   -- Add indexes
   CREATE INDEX idx_your_index ON your_table(new_column);

   -- Data transformations (if needed)
   UPDATE your_table SET new_column = 'default' WHERE new_column IS NULL;

   COMMIT;
   ```

3. **Test locally first:**
   ```bash
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/014_your_feature_name.sql
   ```

4. **Update Prisma schema:**
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

5. **Commit both files:**
   ```bash
   git add migrations/014_your_feature_name.sql
   git add prisma/schema.prisma
   git commit -m "feat: add 014 migration - your feature name"
   ```

---

### Production Deployment

**⚠️ CRITICAL: Always test migrations in staging first!**

#### Step 1: Pre-Deployment Checklist

- [ ] Migration tested in local development
- [ ] Migration tested in staging environment
- [ ] Database backup completed
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)
- [ ] Team notified

#### Step 2: Create Database Backup

```bash
# SSH into production server
ssh production-server

# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec bartawi_postgres pg_dump -U bartawi -d bartawi_cms > backup_${TIMESTAMP}.sql

# Verify backup file
ls -lh backup_${TIMESTAMP}.sql
```

#### Step 3: Apply Migration

```bash
# Copy migration file to server
scp migrations/014_your_feature_name.sql production-server:/tmp/

# SSH into server
ssh production-server

# Apply migration
docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < /tmp/014_your_feature_name.sql

# Verify success
echo $?  # Should return 0
```

#### Step 4: Update Application

```bash
# Pull latest code
git pull origin main

# Regenerate Prisma Client
cd server
npx prisma db pull
npx prisma generate

# Restart application
pm2 restart bartawi-api

# Verify application health
curl http://localhost:3001/healthz
```

#### Step 5: Post-Deployment Verification

- [ ] Health check passes (`/healthz` returns 200)
- [ ] Application starts without errors
- [ ] Key endpoints functional
- [ ] No Prisma Client errors in logs
- [ ] Data integrity verified

---

### Rollback Procedure

If a migration fails or causes issues:

1. **Stop the application:**
   ```bash
   pm2 stop bartawi-api
   ```

2. **Restore from backup:**
   ```bash
   # Drop current database
   docker exec bartawi_postgres psql -U bartawi -c "DROP DATABASE bartawi_cms;"

   # Recreate database
   docker exec bartawi_postgres psql -U bartawi -c "CREATE DATABASE bartawi_cms;"

   # Restore backup
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Revert code:**
   ```bash
   git revert HEAD
   ```

4. **Restart application:**
   ```bash
   pm2 start bartawi-api
   ```

---

## Migration Best Practices

### DO:
- ✅ Wrap all migrations in `BEGIN;` ... `COMMIT;` for atomicity
- ✅ Test migrations on a copy of production data
- ✅ Add comments explaining complex transformations
- ✅ Create indexes for new foreign keys
- ✅ Use `IF NOT EXISTS` for idempotent migrations (when possible)
- ✅ Keep migrations small and focused (one feature per migration)
- ✅ Document any manual steps required

### DON'T:
- ❌ Run migrations directly on production without testing
- ❌ Modify existing migration files (create new ones instead)
- ❌ Delete old migration files (breaks git history)
- ❌ Skip backups before running migrations
- ❌ Deploy code before migrating database
- ❌ Use `DROP COLUMN` without confirming it's not used in code

---

## Common Migration Patterns

### Adding a Column with Default

```sql
BEGIN;

ALTER TABLE your_table
  ADD COLUMN new_column VARCHAR(255) DEFAULT 'default_value';

COMMENT ON COLUMN your_table.new_column IS 'Description of what this column stores';

CREATE INDEX idx_your_table_new_column ON your_table(new_column);

COMMIT;
```

### Adding a Foreign Key

```sql
BEGIN;

-- Add column
ALTER TABLE child_table
  ADD COLUMN parent_id UUID;

-- Populate data (if needed)
UPDATE child_table
  SET parent_id = (SELECT id FROM parent_table WHERE ...)
  WHERE ...;

-- Add constraint
ALTER TABLE child_table
  ADD CONSTRAINT fk_child_parent
  FOREIGN KEY (parent_id) REFERENCES parent_table(id)
  ON DELETE CASCADE;

-- Add index
CREATE INDEX idx_child_parent ON child_table(parent_id);

COMMIT;
```

### Creating a New Table

```sql
BEGIN;

CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_new_table_tenant ON new_table(tenant_id);
CREATE INDEX idx_new_table_active ON new_table(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE new_table IS 'Description of what this table stores';
COMMENT ON COLUMN new_table.name IS 'Description of this field';

COMMIT;
```

### Data Migration

```sql
BEGIN;

-- Create temporary column
ALTER TABLE your_table
  ADD COLUMN new_format_column VARCHAR(255);

-- Transform data
UPDATE your_table
  SET new_format_column = UPPER(TRIM(old_column))
  WHERE old_column IS NOT NULL;

-- Verify transformation
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM your_table
  WHERE old_column IS NOT NULL AND new_format_column IS NULL;

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Data migration failed: % rows not transformed', bad_count;
  END IF;
END $$;

-- Drop old column (only after verification!)
-- ALTER TABLE your_table DROP COLUMN old_column;

COMMIT;
```

---

## Partition Management

### Sensor Readings

Sensor readings use **monthly partitions** (YYYY_MM format).

**Auto-Creation:** The `partitionCron` job automatically creates next month's partition on the 25th of each month at 3:00 AM Dubai time.

**Manual Creation:**
```sql
-- Create partition for May 2026
CREATE TABLE IF NOT EXISTS sensor_readings_2026_05
  PARTITION OF sensor_readings
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

### Audit Logs

Audit logs use **yearly partitions** (YYYY format).

**Auto-Creation:** The `partitionCron` job automatically creates next year's partition in December.

**Manual Creation:**
```sql
-- Create partition for 2027
CREATE TABLE IF NOT EXISTS audit_logs_2027
  PARTITION OF audit_logs
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

---

## Special Cases

### Migration 012: Camp 1 Yearly Contracts

**Status:** Template ready, requires manual data

**File:** `migrations/012_camp1_yearly_contracts.sql`

**Issue:** Contains placeholder dates (`2025-XX-XX`, `2026-XX-XX`) because actual contract dates are not in Excel exports.

**Required Action:**
1. Obtain actual contract start/end dates from ops team for 6 contracts:
   - A12: Al Junaibi/Hartoshi Cont
   - A14: Al Quraidi Contracting
   - A21: Al Quraidi Contracting (2nd room)
   - A30: Senan Alabadi Cont
   - A31: Al Tannoor Center Cont
   - A38: Al Tannoor Center Cont (2nd room)

2. Update migration file with real dates
3. Run migration:
   ```bash
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms < migrations/012_camp1_yearly_contracts.sql
   ```

**Why Important:** These 6 contracts represent ~AED 345,000/year in revenue. Without proper tracking, they won't appear in contract expiry alerts.

---

## Troubleshooting

### "Relation already exists" Error

**Cause:** Migration was partially applied or schema was manually changed.

**Solution:** Check if the table/column exists and skip that statement:
```bash
# Check if table exists
docker exec bartawi_postgres psql -U bartawi -d bartawi_cms -c "\d table_name"

# If exists, manually apply only the missing parts of the migration
```

### Prisma Client Not Updating

**Cause:** Prisma schema out of sync with database.

**Solution:**
```bash
npx prisma db pull  # Introspect database
npx prisma generate # Regenerate client
```

### Migration Hangs

**Cause:** Table lock due to active connections.

**Solution:**
1. Stop application: `pm2 stop bartawi-api`
2. Check for blocking queries:
   ```sql
   SELECT pid, query, state
   FROM pg_stat_activity
   WHERE datname = 'bartawi_cms' AND state != 'idle';
   ```
3. Kill blocking sessions if safe:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = 'bartawi_cms' AND state != 'idle';
   ```
4. Re-run migration

### Backup Restore Fails

**Cause:** Database version mismatch or corrupted backup.

**Solution:**
1. Check PostgreSQL version matches:
   ```bash
   docker exec bartawi_postgres psql -V
   ```
2. Verify backup file integrity:
   ```bash
   head -100 backup_file.sql
   ```
3. Try partial restore with `--single-transaction`:
   ```bash
   docker exec -i bartawi_postgres psql -U bartawi -d bartawi_cms --single-transaction < backup_file.sql
   ```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Run Migrations

on:
  push:
    branches: [main]
    paths:
      - 'server/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd server
          for file in migrations/*.sql; do
            psql $DATABASE_URL < $file || echo "Migration $file already applied"
          done

      - name: Verify schema
        run: |
          cd server
          npx prisma db pull
          npx prisma generate
```

---

## Migration Tracking

We currently use **manual tracking** via git history.

To see which migrations have been applied:

```bash
# Check git log for migration commits
git log --oneline --grep="migration" -- migrations/

# Check database for specific tables/columns
docker exec bartawi_postgres psql -U bartawi -d bartawi_cms -c "\d+ table_name"
```

**Future Enhancement:** Consider adding a `schema_migrations` table to track applied migrations programmatically.

---

## Contact

For migration questions or issues:
- **Development:** Check this README first
- **Production Issues:** Create incident ticket and notify DevOps
- **Schema Design Questions:** Discuss with Tech Lead

---

**Last Updated:** April 16, 2026
**Maintained By:** Engineering Team
