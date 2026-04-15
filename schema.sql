
-- ────────────────────────────────────────────────────────────────
-- 1. MULTI-TENANCY
-- ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  plan            VARCHAR(50)  DEFAULT 'internal',
  is_active       BOOLEAN      DEFAULT true,
  settings        JSONB        DEFAULT '{}',
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 2. USERS & RBAC
-- ────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  avatar_url      TEXT,
  is_active       BOOLEAN     DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  is_system       BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource        VARCHAR(100) NOT NULL,
  action          VARCHAR(50)  NOT NULL,
  description     TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id         UUID REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id   UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  assigned_by     UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- ────────────────────────────────────────────────────────────────
-- 3. CAMP STRUCTURE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE camps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  code            VARCHAR(20)  NOT NULL,
  address         TEXT,
  city            VARCHAR(100) DEFAULT 'Dubai',
  country         VARCHAR(100) DEFAULT 'UAE',
  total_rooms     INTEGER      NOT NULL DEFAULT 0,
  leasable_rooms  INTEGER      NOT NULL DEFAULT 0,
  -- Map canvas config (updated when layout paper is processed)
  map_canvas_width  DECIMAL(10,2) DEFAULT 1400,
  map_canvas_height DECIMAL(10,2) DEFAULT 900,
  map_configured    BOOLEAN       DEFAULT false,
  map_configured_at TIMESTAMPTZ,
  is_active       BOOLEAN      DEFAULT true,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Physical buildings (A/AA = one 2-floor building in Camp 2, one building per letter-pair)
CREATE TABLE buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  code            VARCHAR(20)  NOT NULL,
  name            VARCHAR(100) NOT NULL,
  floor_count     INTEGER      NOT NULL DEFAULT 2,
  ground_block_code VARCHAR(10),
  upper_block_code  VARCHAR(10),
  -- Map geometry: POPULATED WHEN LAYOUT PAPER IS PROCESSED
  map_x           DECIMAL(10,2),
  map_y           DECIMAL(10,2),
  map_width       DECIMAL(10,2),
  map_height      DECIMAL(10,2),
  map_rotation    DECIMAL(5,2) DEFAULT 0,
  map_shape_type  VARCHAR(20)  DEFAULT 'rect',
  map_shape_points JSONB,
  label_offset_x  DECIMAL(10,2) DEFAULT 0,
  label_offset_y  DECIMAL(10,2) DEFAULT -12,
  is_active       BOOLEAN      DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(camp_id, code)
);

-- Blocks = sections of a building by floor (A=ground, AA=first floor, etc.)
CREATE TABLE blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  camp_id         UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  code            VARCHAR(20) NOT NULL,
  floor_label     VARCHAR(20) NOT NULL DEFAULT 'Ground',
  floor_number    INTEGER     NOT NULL DEFAULT 0,
  room_count      INTEGER     NOT NULL DEFAULT 0,
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(camp_id, code)
);

-- Rooms
CREATE TABLE rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        UUID NOT NULL REFERENCES blocks(id)    ON DELETE CASCADE,
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  camp_id         UUID NOT NULL REFERENCES camps(id)     ON DELETE CASCADE,
  room_number     VARCHAR(20)  NOT NULL,
  sr_number       INTEGER,
  old_room_number VARCHAR(20),
  room_type       VARCHAR(30)  NOT NULL DEFAULT 'standard',
  -- standard | bartawi | commercial | service
  max_capacity    INTEGER      NOT NULL DEFAULT 6,
  bed_count       INTEGER,
  standard_rent   DECIMAL(10,2) DEFAULT 0,
  status          VARCHAR(30)  NOT NULL DEFAULT 'occupied',
  -- occupied | vacant | maintenance | bartawi_use
  -- Map position within floor plan: POPULATED FROM PAPER
  fp_x            DECIMAL(10,2),
  fp_y            DECIMAL(10,2),
  fp_width        DECIMAL(10,2) DEFAULT 76,
  fp_height       DECIMAL(10,2) DEFAULT 90,
  fp_wing         VARCHAR(20),
  fp_row          INTEGER,
  fp_col          INTEGER,
  notes           TEXT,
  is_active       BOOLEAN      DEFAULT true,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(camp_id, room_number)
);

-- Bed spaces (Camp 1 individual tracking — auto-created when room has bed_count set)
CREATE TABLE bed_spaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number      INTEGER     NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'vacant',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, bed_number)
);

-- ────────────────────────────────────────────────────────────────
-- 4. TENANT ENTITIES (Companies & Individuals)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  name_normalized VARCHAR(255),
  trade_license   VARCHAR(100),
  contact_person  VARCHAR(255),
  contact_phone   VARCHAR(50),
  contact_email   VARCHAR(255),
  address         TEXT,
  industry        VARCHAR(100),
  is_active       BOOLEAN     DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE individuals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name       VARCHAR(255),
  owner_name      VARCHAR(255) NOT NULL,
  mobile_number   VARCHAR(50),
  nationality     VARCHAR(100),
  religion        VARCHAR(100),
  languages       VARCHAR(255),
  company_name    VARCHAR(255),
  profession      VARCHAR(100),
  industry        VARCHAR(100),
  id_type         VARCHAR(50),
  id_number       VARCHAR(100),
  id_copy_on_file BOOLEAN     DEFAULT false,
  is_active       BOOLEAN     DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 5. CONTRACTS (Camp 2 formal contracts)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  company_id      UUID REFERENCES companies(id),
  contract_type   VARCHAR(30) NOT NULL DEFAULT 'monthly',
  -- monthly | yearly | ejari | bgc
  monthly_rent    DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  auto_renew      BOOLEAN     DEFAULT false,
  renewal_notice_days INTEGER DEFAULT 60,
  status          VARCHAR(30) DEFAULT 'active',
  -- active | expired | terminated | legal_dispute | pending_renewal
  ejari_number    VARCHAR(100),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 6. OCCUPANCY
-- ────────────────────────────────────────────────────────────────
CREATE TABLE room_occupancy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  camp_id         UUID NOT NULL REFERENCES camps(id),
  individual_id   UUID REFERENCES individuals(id),
  company_id      UUID REFERENCES companies(id),
  contract_id     UUID REFERENCES contracts(id),
  people_count    INTEGER     DEFAULT 0,
  monthly_rent    DECIMAL(10,2) NOT NULL DEFAULT 0,
  check_in_date   DATE,
  check_out_date  DATE,
  reason_for_leaving TEXT,
  off_days        INTEGER     DEFAULT 0,
  status          VARCHAR(30) DEFAULT 'active',
  -- active | checked_out | legal_dispute
  is_current      BOOLEAN     DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bed_occupancy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_space_id    UUID NOT NULL REFERENCES bed_spaces(id),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  individual_id   UUID NOT NULL REFERENCES individuals(id),
  check_in_date   DATE,
  check_out_date  DATE,
  reason_for_leaving TEXT,
  is_current      BOOLEAN     DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 7. FINANCIAL RECORDS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE monthly_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  occupancy_id    UUID REFERENCES room_occupancy(id),
  month           SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            SMALLINT    NOT NULL,
  -- Camp 1
  individual_id   UUID REFERENCES individuals(id),
  owner_name      VARCHAR(255),
  -- Camp 2
  company_id      UUID REFERENCES companies(id),
  company_name    VARCHAR(255),
  contract_type   VARCHAR(30),
  -- Both camps
  people_count    INTEGER     DEFAULT 0,
  rent            DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid            DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance         DECIMAL(10,2) GENERATED ALWAYS AS (rent - paid) STORED,
  off_days        INTEGER     DEFAULT 0,
  remarks         TEXT,
  is_locked       BOOLEAN     DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, month, year)
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_record_id UUID NOT NULL REFERENCES monthly_records(id),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  amount          DECIMAL(10,2) NOT NULL,
  payment_method  VARCHAR(50)  NOT NULL DEFAULT 'cash',
  -- cash | cheque | bank_transfer | card
  payment_date    DATE         NOT NULL,
  reference_number VARCHAR(255),
  bank_name       VARCHAR(100),
  cheque_number   VARCHAR(100),
  notes           TEXT,
  received_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  is_active       BOOLEAN     DEFAULT true
);

CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  category_id     UUID NOT NULL REFERENCES expense_categories(id),
  amount          DECIMAL(10,2) NOT NULL,
  description     TEXT         NOT NULL,
  expense_date    DATE         NOT NULL,
  month           SMALLINT     NOT NULL,
  year            SMALLINT     NOT NULL,
  payment_method  VARCHAR(50),
  reference_number VARCHAR(255),
  receipt_url     TEXT,
  approved_by     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 8. COMPLAINTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE complaint_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            VARCHAR(100) NOT NULL,
  priority_default VARCHAR(20) DEFAULT 'medium',
  is_active       BOOLEAN     DEFAULT true
);

CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_ref   VARCHAR(30)  UNIQUE NOT NULL,
  camp_id         UUID NOT NULL REFERENCES camps(id),
  room_id         UUID REFERENCES rooms(id),
  building_id     UUID REFERENCES buildings(id),
  category_id     UUID REFERENCES complaint_categories(id),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  status          VARCHAR(30)  NOT NULL DEFAULT 'open',
  -- open | in_progress | resolved | closed
  priority        VARCHAR(20)  NOT NULL DEFAULT 'medium',
  -- low | medium | high | urgent
  reported_by_user  UUID REFERENCES users(id),
  reported_by_name  VARCHAR(255),
  reported_by_room  VARCHAR(20),
  reported_via      VARCHAR(30) DEFAULT 'staff',
  -- staff | qr_code | mobile_app (dormant: qr_code and mobile_app)
  assigned_to     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id),
  resolution_notes TEXT,
  image_urls      JSONB        DEFAULT '[]',
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE complaint_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  old_status      VARCHAR(30),
  new_status      VARCHAR(30),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 9. QR CODES (DORMANT — tenant self-service, activated by feature flag)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE qr_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  room_id         UUID REFERENCES rooms(id),
  building_id     UUID REFERENCES buildings(id),
  qr_type         VARCHAR(30)  NOT NULL DEFAULT 'complaint',
  qr_token        VARCHAR(100) UNIQUE NOT NULL,
  qr_url          TEXT         NOT NULL,
  qr_image_url    TEXT,
  is_active       BOOLEAN      DEFAULT false,
  scan_count      INTEGER      DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 10. IOT SENSOR PIPELINE (DORMANT — activated when hardware connected)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE sensor_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL UNIQUE,
  unit            VARCHAR(50),
  description     TEXT
);

CREATE TABLE sensor_devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  building_id     UUID REFERENCES buildings(id),
  room_id         UUID REFERENCES rooms(id),
  sensor_type_id  UUID NOT NULL REFERENCES sensor_types(id),
  device_id       VARCHAR(100) NOT NULL UNIQUE,
  device_name     VARCHAR(255),
  location_desc   TEXT,
  manufacturer    VARCHAR(100),
  model           VARCHAR(100),
  installation_date DATE,
  last_reading_at TIMESTAMPTZ,
  last_reading_value DECIMAL(15,4),
  is_active       BOOLEAN     DEFAULT false,
  status          VARCHAR(30) DEFAULT 'pending',
  -- pending | active | fault | offline
  config          JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned table for high-volume sensor data
CREATE TABLE sensor_readings (
  id              BIGSERIAL,
  device_id       UUID NOT NULL REFERENCES sensor_devices(id),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  building_id     UUID REFERENCES buildings(id),
  room_id         UUID REFERENCES rooms(id),
  sensor_type_id  UUID NOT NULL REFERENCES sensor_types(id),
  reading_value   DECIMAL(15,4) NOT NULL,
  reading_unit    VARCHAR(50),
  reading_ts      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_cumulative   BOOLEAN     DEFAULT false,
  delta_value     DECIMAL(15,4),
  is_anomaly      BOOLEAN     DEFAULT false,
  quality_score   DECIMAL(3,2) DEFAULT 1.0,
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, reading_ts)
) PARTITION BY RANGE (reading_ts);

-- Monthly partitions (add more as needed)
CREATE TABLE sensor_readings_2026_04 PARTITION OF sensor_readings FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE sensor_readings_2026_05 PARTITION OF sensor_readings FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE sensor_readings_2026_06 PARTITION OF sensor_readings FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE sensor_readings_2026_07 PARTITION OF sensor_readings FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE sensor_readings_2026_08 PARTITION OF sensor_readings FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE sensor_readings_2026_09 PARTITION OF sensor_readings FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE sensor_readings_2026_10 PARTITION OF sensor_readings FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE sensor_readings_2026_11 PARTITION OF sensor_readings FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE sensor_readings_2026_12 PARTITION OF sensor_readings FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE sensor_readings_default  PARTITION OF sensor_readings DEFAULT;

-- Sensor ingestion log (all inbound API calls from hardware)
CREATE TABLE sensor_ingestion_log (
  id              BIGSERIAL PRIMARY KEY,
  device_hw_id    VARCHAR(100),
  payload         JSONB       NOT NULL,
  ip_address      INET,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  processed       BOOLEAN     DEFAULT false,
  error_message   TEXT
);

-- ────────────────────────────────────────────────────────────────
-- 11. MAP CONFIGURATION (populated from paper layout)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE map_layouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  version         INTEGER     NOT NULL DEFAULT 1,
  canvas_width    DECIMAL(10,2) DEFAULT 1400,
  canvas_height   DECIMAL(10,2) DEFAULT 900,
  background_color VARCHAR(20) DEFAULT '#07101f',
  scale_factor    DECIMAL(6,4) DEFAULT 1.0,
  north_direction INTEGER     DEFAULT 0,
  is_active       BOOLEAN     DEFAULT true,
  is_configured   BOOLEAN     DEFAULT false,
  configured_at   TIMESTAMPTZ,
  configured_by   UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(camp_id, version)
);

-- ────────────────────────────────────────────────────────────────
-- 12. CONTRACT ALERTS & NOTIFICATIONS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE contract_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES contracts(id),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  alert_type      VARCHAR(50) NOT NULL,
  -- expiring_90d | expiring_60d | expiring_30d | expired | renewed
  days_until_expiry INTEGER,
  is_acknowledged BOOLEAN     DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  type            VARCHAR(100) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT,
  resource_type   VARCHAR(100),
  resource_id     UUID,
  is_read         BOOLEAN     DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 13. FEATURE FLAGS (toggle dormant features)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  flag_key        VARCHAR(100) NOT NULL,
  flag_name       VARCHAR(255),
  description     TEXT,
  is_enabled      BOOLEAN     DEFAULT false,
  config          JSONB       DEFAULT '{}',
  enabled_at      TIMESTAMPTZ,
  enabled_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, flag_key)
);

-- ────────────────────────────────────────────────────────────────
-- 14. AUDIT LOG
-- ────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id              BIGSERIAL,
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(100),
  resource_id     UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- ────────────────────────────────────────────────────────────────
-- 15. INDEXES
-- ────────────────────────────────────────────────────────────────
CREATE INDEX idx_rooms_camp       ON rooms(camp_id);
CREATE INDEX idx_rooms_block      ON rooms(block_id);
CREATE INDEX idx_rooms_status     ON rooms(status);
CREATE INDEX idx_rooms_type       ON rooms(room_type);
CREATE INDEX idx_monthly_room     ON monthly_records(room_id);
CREATE INDEX idx_monthly_camp     ON monthly_records(camp_id);
CREATE INDEX idx_monthly_period   ON monthly_records(year, month);
CREATE INDEX idx_monthly_balance  ON monthly_records(balance) WHERE balance > 0;
CREATE INDEX idx_payments_room    ON payments(room_id);
CREATE INDEX idx_payments_date    ON payments(payment_date);
CREATE INDEX idx_contracts_room   ON contracts(room_id);
CREATE INDEX idx_contracts_expiry ON contracts(end_date) WHERE status = 'active';
CREATE INDEX idx_complaints_camp  ON complaints(camp_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_occupancy_room   ON room_occupancy(room_id) WHERE is_current = true;
CREATE INDEX idx_sensor_readings_device ON sensor_readings(device_id, reading_ts);
CREATE INDEX idx_sensor_readings_camp   ON sensor_readings(camp_id, reading_ts);
CREATE INDEX idx_notifications_user     ON notifications(user_id, is_read);
CREATE INDEX idx_audit_resource         ON audit_logs(resource_type, resource_id);
