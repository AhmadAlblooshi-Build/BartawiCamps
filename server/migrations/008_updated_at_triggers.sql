-- Migration 008: Updated At Triggers
-- Purpose: Automatically update updated_at timestamp on all table modifications
-- Removes need for manual timestamp management in application code

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table with updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name
      FROM information_schema.columns
      WHERE column_name = 'updated_at'
        AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
       CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();',
      tbl, tbl
    );
  END LOOP;
END $$;
