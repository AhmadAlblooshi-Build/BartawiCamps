-- Migration 006: Deduplicate Companies
-- Purpose: Merge duplicate company records from inconsistent Excel imports
-- Reduces 79 companies to ~49 actual entities
-- CRITICAL: Review UUID mappings before running in production

BEGIN;

-- Helper: create a temp table of (canonical_id, duplicate_id) pairs
CREATE TEMP TABLE company_dedup_map (
  canonical_id UUID NOT NULL,
  duplicate_id UUID NOT NULL
);

-- ── GROUP 1: Advance Aluminium (canonical: 'ADVANCED ALUMINIUM SYSTEM ADAL LLC')
INSERT INTO company_dedup_map VALUES
  ('cd651d3b-8613-a9d4-c965-5a6640733a8b', 'fd7231ad-503f-333e-90a2-7e3687cda889'),  -- 'Advance Aluminium Systam'
  ('cd651d3b-8613-a9d4-c965-5a6640733a8b', 'af00ac0a-4023-cd17-2954-9a11c811c408');  -- 'Advance Aluminium System'

-- ── GROUP 2: Al Hayat
INSERT INTO company_dedup_map VALUES
  ('d35926ce-48e0-4642-ded1-0988898bdb88', 'bc711af6-0ecc-f350-225d-2e7edafe487b');

-- ── GROUP 3: Al Naami
INSERT INTO company_dedup_map VALUES
  ('240a751f-e4d8-0cdb-cf21-7d0afa7fd732', 'af90354e-6157-1e69-e583-d8982d2148fa');

-- ── GROUP 4: Al Shwifat
INSERT INTO company_dedup_map VALUES
  ('cfd0cafe-3623-380a-c5b3-bd31d7489d5a', 'ae413320-1073-96e1-eb16-8ccf3e51207e');

-- ── GROUP 5: Ambigram
INSERT INTO company_dedup_map VALUES
  ('55728a38-81ce-4ac7-6c03-3b5984030813', '6b1f1fef-740c-13b2-1510-0c7a17883788');

-- ── GROUP 6: Bait Al Lait/Laith
INSERT INTO company_dedup_map VALUES
  ('beb4b1a3-bc4e-810d-b68a-8265fa62afdb', '0e740921-9f36-ea5c-9a4f-42014c1e5ddb');

-- ── GROUP 7: Cool Wood Interior
INSERT INTO company_dedup_map VALUES
  ('956c2b40-1d82-2487-395b-9328d9c6eaab', '9dd093be-c279-4865-c4b4-4630dd854925');

-- ── GROUP 8: Favourite Plus / Favorite Plus
INSERT INTO company_dedup_map VALUES
  ('c1cacbe1-a0ae-5edd-7ccf-2635939a9b30', '8c9e7446-d4b1-8069-f30a-08f48303afb4'),
  ('c1cacbe1-a0ae-5edd-7ccf-2635939a9b30', 'd1743bec-aac7-6741-9010-9f8038bbbd56');

-- ── GROUP 9: GBT Golden Brush
INSERT INTO company_dedup_map VALUES
  ('9319e8da-8ca3-a3f2-dbc3-fdd6812cf955', 'db109df9-79f4-eaf4-5dba-511f67b5877c');

-- ── GROUP 10: Gulf Fidelity (note typo in source)
INSERT INTO company_dedup_map VALUES
  ('ef417706-af53-62e0-3934-d21ac36a23f7', 'd183b95f-5b4b-6691-7d89-617f1cba3225');

-- ── GROUP 11: Hashim Darwish
INSERT INTO company_dedup_map VALUES
  ('24f5d4a5-a737-4358-06b7-cde553770d81', '4809a3c4-7304-8487-26c2-0cc956d76eca');

-- ── GROUP 12: Jubily Supermarket
INSERT INTO company_dedup_map VALUES
  ('73675964-ddfc-b08d-2aa6-846fac3b6656', '3901e018-bf1f-2dc5-7df5-efe74c86d280');

-- ── GROUP 13: Jubily Tea Shop / Jubli
INSERT INTO company_dedup_map VALUES
  ('534e6d8a-5731-1856-7ce6-e3b8a014e045', '3578f07d-b785-ff33-8974-38c9c0ef18e1');

-- ── GROUP 14: MBK
INSERT INTO company_dedup_map VALUES
  ('622a82b6-8b60-0bd6-77ce-5bf7f5c35777', 'ab9737fd-9080-6ecb-5c86-d0984ecc94ea');

-- ── GROUP 15: Mizna
INSERT INTO company_dedup_map VALUES
  ('fd0625c8-32e3-7545-b121-03841e89e235', 'a52fdb30-bf40-5153-da13-14eeae9d1774');

-- ── GROUP 16: New Phoenix
INSERT INTO company_dedup_map VALUES
  ('6538b5c2-7bb4-f77f-881f-df9f150aece2', 'a48b5bbc-ab0f-8626-8b30-c33f6911ffb5');

-- ── GROUP 17: Olive Star
INSERT INTO company_dedup_map VALUES
  ('32736642-00a6-ddd3-024c-d305b53ca4b1', 'f7340e69-b900-f762-bedc-e835668b949a');

-- ── GROUP 18: Raja Jeevannantham
INSERT INTO company_dedup_map VALUES
  ('0c870a3f-3af9-db5a-b663-755b5f7987ad', '16c78be6-7f8d-d148-4af2-c88a87469d84');

-- ── GROUP 19: Reno Space
INSERT INTO company_dedup_map VALUES
  ('bba2ca18-0f7e-ff04-7819-ea51cea63d44', 'f54f7849-38c3-45d4-b6e0-828192e30f9e');

-- ── GROUP 20: Rithi Tech (typo "Serevices")
INSERT INTO company_dedup_map VALUES
  ('23bbb361-032c-0642-0b0f-68f51605a0d2', 'd69eef71-5c6d-f465-2567-f439f5e5d2b8');

-- ── GROUP 21: Tayas Contracting (3 variants, canonical 'TAYAS CONTRACTING LLC')
INSERT INTO company_dedup_map VALUES
  ('a9adebb4-b846-4faa-974f-92a3e23ff66e', 'b89feeee-dab8-2f0f-3a28-c942e56d36c5');  -- 'Tayas Contarcting LLC'

-- ── GROUP 22: Venus
INSERT INTO company_dedup_map VALUES
  ('05fa3468-49f1-2732-dea7-9bfbff53cd57', '380c1586-fb21-3763-2795-19c14981434e');

-- ── GROUP 24: Zaika/Zaiqa Kabab
INSERT INTO company_dedup_map VALUES
  ('4c6cd757-68e6-5e55-1159-293566ac46a7', '4fe94cfe-879d-3245-b2cf-0174a8e1e382');

-- Repoint FKs
UPDATE monthly_records mr SET company_id = dm.canonical_id
  FROM company_dedup_map dm WHERE mr.company_id = dm.duplicate_id;

UPDATE contracts c SET company_id = dm.canonical_id
  FROM company_dedup_map dm WHERE c.company_id = dm.duplicate_id;

UPDATE room_occupancy ro SET company_id = dm.canonical_id
  FROM company_dedup_map dm WHERE ro.company_id = dm.duplicate_id;

-- Delete the duplicates
DELETE FROM companies c
  WHERE c.id IN (SELECT duplicate_id FROM company_dedup_map);

-- Add the uniqueness constraint to prevent new dupes
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_tenant_name_norm
  ON companies(tenant_id, name_normalized);

COMMIT;
