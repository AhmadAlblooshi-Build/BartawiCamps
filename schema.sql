-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "bed_occupancy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bed_space_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "individual_id" UUID NOT NULL,
    "check_in_date" DATE,
    "check_out_date" DATE,
    "reason_for_leaving" TEXT,
    "is_current" BOOLEAN DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_occupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_spaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "bed_number" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'vacant',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bedspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "bed_number" INTEGER NOT NULL,
    "position_x" DOUBLE PRECISION,
    "position_y" DOUBLE PRECISION,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "label" VARCHAR(100),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bedspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "building_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "floor_label" VARCHAR(20) NOT NULL DEFAULT 'Ground',
    "floor_number" INTEGER NOT NULL DEFAULT 0,
    "room_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "floor_count" INTEGER NOT NULL DEFAULT 2,
    "ground_block_code" VARCHAR(10),
    "upper_block_code" VARCHAR(10),
    "map_x" DECIMAL(10,2),
    "map_y" DECIMAL(10,2),
    "map_width" DECIMAL(10,2),
    "map_height" DECIMAL(10,2),
    "map_rotation" DECIMAL(5,2) DEFAULT 0,
    "map_shape_type" VARCHAR(20) DEFAULT 'rect',
    "map_shape_points" JSONB,
    "label_offset_x" DECIMAL(10,2) DEFAULT 0,
    "label_offset_y" DECIMAL(10,2) DEFAULT -12,
    "is_active" BOOLEAN DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100) DEFAULT 'Dubai',
    "country" VARCHAR(100) DEFAULT 'UAE',
    "total_rooms" INTEGER NOT NULL DEFAULT 0,
    "leasable_rooms" INTEGER NOT NULL DEFAULT 0,
    "map_canvas_width" DECIMAL(10,2) DEFAULT 1400,
    "map_canvas_height" DECIMAL(10,2) DEFAULT 900,
    "map_configured" BOOLEAN DEFAULT false,
    "map_configured_at" TIMESTAMPTZ(6),
    "floorplan_url" TEXT,
    "floorplan_width" INTEGER,
    "floorplan_height" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_normalized" VARCHAR(255),
    "trade_license" VARCHAR(100),
    "contact_person" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "contact_email" VARCHAR(255),
    "address" TEXT,
    "industry" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "related_entity_id" UUID,
    "entity_group_name" VARCHAR(255),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "priority_default" VARCHAR(20) DEFAULT 'medium',
    "is_active" BOOLEAN DEFAULT true,
    "default_team_id" UUID,

    CONSTRAINT "complaint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_id" UUID NOT NULL,
    "user_id" UUID,
    "old_status" VARCHAR(30),
    "new_status" VARCHAR(30),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "complaint_ref" VARCHAR(30) NOT NULL,
    "camp_id" UUID NOT NULL,
    "room_id" UUID,
    "building_id" UUID,
    "category_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "reported_by_user" UUID,
    "reported_by_name" VARCHAR(255),
    "reported_by_room" VARCHAR(20),
    "reported_via" VARCHAR(30) DEFAULT 'staff',
    "assigned_to" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "resolution_notes" TEXT,
    "closed_at" TIMESTAMPTZ(6),
    "image_urls" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "alert_type" VARCHAR(50) NOT NULL,
    "days_until_expiry" INTEGER,
    "is_acknowledged" BOOLEAN DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "company_id" UUID,
    "contract_type" VARCHAR(30) NOT NULL DEFAULT 'monthly',
    "monthly_rent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "auto_renew" BOOLEAN DEFAULT false,
    "renewal_notice_days" INTEGER DEFAULT 60,
    "status" VARCHAR(30) DEFAULT 'active',
    "ejari_number" VARCHAR(100),
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "individual_id" UUID,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "expense_date" DATE NOT NULL,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "payment_method" VARCHAR(50),
    "reference_number" VARCHAR(255),
    "receipt_url" TEXT,
    "approved_by" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "flag_key" VARCHAR(100) NOT NULL,
    "flag_name" VARCHAR(255),
    "description" TEXT,
    "is_enabled" BOOLEAN DEFAULT false,
    "config" JSONB DEFAULT '{}',
    "enabled_at" TIMESTAMPTZ(6),
    "enabled_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individuals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "full_name" VARCHAR(255),
    "owner_name" VARCHAR(255) NOT NULL,
    "mobile_number" VARCHAR(50),
    "nationality" VARCHAR(100),
    "religion" VARCHAR(100),
    "languages" VARCHAR(255),
    "company_name" VARCHAR(255),
    "profession" VARCHAR(100),
    "industry" VARCHAR(100),
    "id_type" VARCHAR(50),
    "id_number" VARCHAR(100),
    "id_copy_on_file" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_phone" VARCHAR(50),
    "emergency_contact_relation" VARCHAR(50),
    "emergency_contact_country" VARCHAR(100),

    CONSTRAINT "individuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_layouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "canvas_width" DECIMAL(10,2) DEFAULT 1400,
    "canvas_height" DECIMAL(10,2) DEFAULT 900,
    "background_color" VARCHAR(20) DEFAULT '#07101f',
    "scale_factor" DECIMAL(6,4) DEFAULT 1.0,
    "north_direction" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "is_configured" BOOLEAN DEFAULT false,
    "configured_at" TIMESTAMPTZ(6),
    "configured_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "map_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "occupancy_id" UUID,
    "month" SMALLINT NOT NULL,
    "year" SMALLINT NOT NULL,
    "individual_id" UUID,
    "owner_name" VARCHAR(255),
    "company_id" UUID,
    "company_name" VARCHAR(255),
    "contract_type" VARCHAR(30),
    "contract_start_date" DATE,
    "contract_end_date" DATE,
    "people_count" INTEGER DEFAULT 0,
    "rent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) DEFAULT (rent - paid),
    "off_days" INTEGER DEFAULT 0,
    "remarks" TEXT,
    "is_locked" BOOLEAN DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "room_tenant_id" UUID,
    "lease_id" UUID,
    "bedspace_id" UUID,

    CONSTRAINT "monthly_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "resource_type" VARCHAR(100),
    "resource_id" UUID,
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "snoozed_until" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "monthly_record_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'cash',
    "payment_date" DATE NOT NULL,
    "reference_number" VARCHAR(255),
    "bank_name" VARCHAR(100),
    "cheque_number" VARCHAR(100),
    "notes" TEXT,
    "received_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "room_id" UUID,
    "building_id" UUID,
    "qr_type" VARCHAR(30) NOT NULL DEFAULT 'complaint',
    "qr_token" VARCHAR(100) NOT NULL,
    "qr_url" TEXT NOT NULL,
    "qr_image_url" TEXT,
    "is_active" BOOLEAN DEFAULT false,
    "scan_count" INTEGER DEFAULT 0,
    "last_scanned_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_occupancy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "individual_id" UUID,
    "company_id" UUID,
    "contract_id" UUID,
    "people_count" INTEGER DEFAULT 0,
    "monthly_rent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "check_in_date" DATE,
    "check_out_date" DATE,
    "reason_for_leaving" TEXT,
    "off_days" INTEGER DEFAULT 0,
    "status" VARCHAR(30) DEFAULT 'active',
    "is_current" BOOLEAN DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "notice_given_at" TIMESTAMPTZ(6),
    "notice_given_by" UUID,
    "intended_vacate_date" DATE,
    "inspection_notes" TEXT,
    "inspection_by" UUID,
    "inspection_at" TIMESTAMPTZ(6),

    CONSTRAINT "room_occupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "block_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "room_number" VARCHAR(20) NOT NULL,
    "sr_number" INTEGER,
    "old_room_number" VARCHAR(20),
    "max_capacity" INTEGER NOT NULL DEFAULT 6,
    "bed_count" INTEGER,
    "standard_rent" DECIMAL(10,2) DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'occupied',
    "fp_x" DECIMAL(10,2),
    "fp_y" DECIMAL(10,2),
    "fp_width" DECIMAL(10,2) DEFAULT 76,
    "fp_height" DECIMAL(10,2) DEFAULT 90,
    "fp_wing" VARCHAR(20),
    "fp_row" INTEGER,
    "fp_col" INTEGER,
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "room_size" VARCHAR(20) DEFAULT 'small',
    "property_type_id" UUID NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "camp_id" UUID NOT NULL,
    "building_id" UUID,
    "room_id" UUID,
    "sensor_type_id" UUID NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "device_name" VARCHAR(255),
    "location_desc" TEXT,
    "manufacturer" VARCHAR(100),
    "model" VARCHAR(100),
    "installation_date" DATE,
    "last_reading_at" TIMESTAMPTZ(6),
    "last_reading_value" DECIMAL(15,4),
    "is_active" BOOLEAN DEFAULT false,
    "status" VARCHAR(30) DEFAULT 'pending',
    "config" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_ingestion_log" (
    "id" BIGSERIAL NOT NULL,
    "device_hw_id" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "ip_address" INET,
    "received_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN DEFAULT false,
    "error_message" TEXT,

    CONSTRAINT "sensor_ingestion_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" BIGSERIAL NOT NULL,
    "device_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "building_id" UUID,
    "room_id" UUID,
    "sensor_type_id" UUID NOT NULL,
    "reading_value" DECIMAL(15,4) NOT NULL,
    "reading_unit" VARCHAR(50),
    "reading_ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_cumulative" BOOLEAN DEFAULT false,
    "delta_value" DECIMAL(15,4),
    "is_anomaly" BOOLEAN DEFAULT false,
    "quality_score" DECIMAL(3,2) DEFAULT 1.0,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id","reading_ts")
);

-- CreateTable
CREATE TABLE "sensor_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(50),
    "description" TEXT,

    CONSTRAINT "sensor_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "plan" VARCHAR(50) DEFAULT 'internal',
    "is_active" BOOLEAN DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "legal_name" VARCHAR(255),
    "trn" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "avatar_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "must_reset_password" BOOLEAN DEFAULT false,
    "custom_permissions" JSONB DEFAULT '[]',
    "invite_token" TEXT,
    "invite_sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "full_name" VARCHAR(255),
    "company_name" VARCHAR(255),
    "is_company" BOOLEAN NOT NULL DEFAULT false,
    "mobile" VARCHAR(50),
    "nationality" VARCHAR(100),
    "id_type" VARCHAR(50),
    "id_number" VARCHAR(100),
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_phone" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "saas_tenant_id" UUID NOT NULL,
    "room_tenant_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "bedspace_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "monthly_rent" DECIMAL(10,2) NOT NULL,
    "contract_type" VARCHAR(30) NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deposit_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "closed_at" TIMESTAMPTZ(6),
    "closure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "monthly_record_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "payment_type" VARCHAR(30) NOT NULL DEFAULT 'rent',
    "cheque_number" VARCHAR(100),
    "cheque_bank" VARCHAR(100),
    "cheque_date" DATE,
    "transfer_reference" VARCHAR(255),
    "transfer_bank" VARCHAR(100),
    "notes" TEXT,
    "logged_by_user_id" UUID,
    "logged_by_name" VARCHAR(255),
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by_name" VARCHAR(255),
    "reversed_reason" TEXT,

    CONSTRAINT "lease_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_writeoffs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "occupancy_id" UUID,
    "individual_id" UUID,
    "company_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "written_off_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "written_off_by" UUID,
    "notes" TEXT,

    CONSTRAINT "balance_writeoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "note_type" VARCHAR(50) DEFAULT 'general',
    "body" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_renewals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "previous_end_date" DATE,
    "new_end_date" DATE NOT NULL,
    "previous_monthly_rent" DECIMAL(10,2),
    "new_monthly_rent" DECIMAL(10,2) NOT NULL,
    "renewed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "renewed_by" UUID,
    "notes" TEXT,

    CONSTRAINT "contract_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "room_id" UUID,
    "category_id" UUID,
    "request_number" VARCHAR(50),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(20) DEFAULT 'medium',
    "status" VARCHAR(50) DEFAULT 'open',
    "reported_by" UUID,
    "reported_by_name" VARCHAR(255),
    "assigned_team_id" UUID,
    "assigned_user_id" UUID,
    "assigned_at" TIMESTAMPTZ(6),
    "image_urls" JSONB DEFAULT '[]',
    "started_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "contract_id" UUID,
    "occupancy_id" UUID,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "scheduled_amount" DECIMAL(10,2) NOT NULL,
    "monthly_record_id" UUID,
    "status" VARCHAR(50) DEFAULT 'scheduled',
    "notes" TEXT,
    "overridden_by" UUID,
    "overridden_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_name" VARCHAR(50),
    "display_color" VARCHAR(20) DEFAULT 'neutral',
    "is_residential" BOOLEAN DEFAULT true,
    "is_leasable" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_deposits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "camp_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "contract_id" UUID,
    "occupancy_id" UUID,
    "individual_id" UUID,
    "company_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) DEFAULT 'AED',
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'pending',
    "collected_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "collected_by" UUID,
    "refunded_amount" DECIMAL(10,2) DEFAULT 0,
    "refunded_at" TIMESTAMPTZ(6),
    "refunded_by" UUID,
    "refund_reason" TEXT,
    "refund_method" VARCHAR(50),
    "forfeited_amount" DECIMAL(10,2) DEFAULT 0,
    "forfeiture_reason" TEXT,
    "receipt_number" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_lead" BOOLEAN DEFAULT false,
    "joined_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id","user_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_name" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_resource" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "bed_spaces_room_id_bed_number_key" ON "bed_spaces"("room_id", "bed_number");

-- CreateIndex
CREATE INDEX "bedspaces_room_id_idx" ON "bedspaces"("room_id");

-- CreateIndex
CREATE INDEX "bedspaces_tenant_id_idx" ON "bedspaces"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bedspaces_room_id_bed_number_key" ON "bedspaces"("room_id", "bed_number");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_camp_id_code_key" ON "blocks"("camp_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_camp_id_code_key" ON "buildings"("camp_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "camps_tenant_id_code_key" ON "camps"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_companies_group" ON "companies"("entity_group_name");

-- CreateIndex
CREATE INDEX "idx_companies_related" ON "companies"("related_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_companies_tenant_name_norm" ON "companies"("tenant_id", "name_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_complaint_ref_key" ON "complaints"("complaint_ref");

-- CreateIndex
CREATE INDEX "idx_complaints_camp" ON "complaints"("camp_id");

-- CreateIndex
CREATE INDEX "idx_complaints_status" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "idx_contracts_room" ON "contracts"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_tenant_id_flag_key_key" ON "feature_flags"("tenant_id", "flag_key");

-- CreateIndex
CREATE UNIQUE INDEX "map_layouts_camp_id_version_key" ON "map_layouts"("camp_id", "version");

-- CreateIndex
CREATE INDEX "idx_monthly_camp" ON "monthly_records"("camp_id");

-- CreateIndex
CREATE INDEX "idx_monthly_period" ON "monthly_records"("year", "month");

-- CreateIndex
CREATE INDEX "idx_monthly_room" ON "monthly_records"("room_id");

-- CreateIndex
CREATE INDEX "idx_monthly_room_tenant" ON "monthly_records"("room_tenant_id");

-- CreateIndex
CREATE INDEX "idx_monthly_lease" ON "monthly_records"("lease_id");

-- CreateIndex
CREATE INDEX "monthly_records_bedspace_id_idx" ON "monthly_records"("bedspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_records_room_id_bedspace_id_month_year_key" ON "monthly_records"("room_id", "bedspace_id", "month", "year");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_payments_date" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "idx_payments_room" ON "payments"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_qr_token_key" ON "qr_codes"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_rooms_block" ON "rooms"("block_id");

-- CreateIndex
CREATE INDEX "idx_rooms_camp" ON "rooms"("camp_id");

-- CreateIndex
CREATE INDEX "idx_rooms_status" ON "rooms"("status");

-- CreateIndex
CREATE INDEX "idx_rooms_size" ON "rooms"("camp_id", "room_size");

-- CreateIndex
CREATE INDEX "idx_rooms_property_type" ON "rooms"("property_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_camp_id_room_number_key" ON "rooms"("camp_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_devices_device_id_key" ON "sensor_devices"("device_id");

-- CreateIndex
CREATE INDEX "idx_sensor_readings_camp" ON "sensor_readings"("camp_id", "reading_ts");

-- CreateIndex
CREATE INDEX "idx_sensor_readings_device" ON "sensor_readings"("device_id", "reading_ts");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_types_name_key" ON "sensor_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "room_tenants_tenant_id_idx" ON "room_tenants"("tenant_id");

-- CreateIndex
CREATE INDEX "room_tenants_full_name_idx" ON "room_tenants"("full_name");

-- CreateIndex
CREATE INDEX "room_tenants_company_name_idx" ON "room_tenants"("company_name");

-- CreateIndex
CREATE INDEX "room_tenants_is_company_idx" ON "room_tenants"("is_company");

-- CreateIndex
CREATE INDEX "leases_saas_tenant_id_idx" ON "leases"("saas_tenant_id");

-- CreateIndex
CREATE INDEX "leases_room_tenant_id_idx" ON "leases"("room_tenant_id");

-- CreateIndex
CREATE INDEX "leases_room_id_idx" ON "leases"("room_id");

-- CreateIndex
CREATE INDEX "leases_bedspace_id_idx" ON "leases"("bedspace_id");

-- CreateIndex
CREATE INDEX "leases_status_idx" ON "leases"("status");

-- CreateIndex
CREATE INDEX "leases_end_date_idx" ON "leases"("end_date");

-- CreateIndex
CREATE INDEX "lease_payments_tenant_id_idx" ON "lease_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "lease_payments_lease_id_idx" ON "lease_payments"("lease_id");

-- CreateIndex
CREATE INDEX "lease_payments_monthly_record_id_idx" ON "lease_payments"("monthly_record_id");

-- CreateIndex
CREATE INDEX "lease_payments_payment_date_idx" ON "lease_payments"("payment_date");

-- CreateIndex
CREATE INDEX "lease_payments_reversed_idx" ON "lease_payments"("reversed");

-- CreateIndex
CREATE INDEX "idx_writeoffs_date" ON "balance_writeoffs"("written_off_at");

-- CreateIndex
CREATE INDEX "idx_writeoffs_room" ON "balance_writeoffs"("room_id");

-- CreateIndex
CREATE INDEX "idx_writeoffs_tenant" ON "balance_writeoffs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_contract_notes_contract" ON "contract_notes"("contract_id");

-- CreateIndex
CREATE INDEX "idx_contract_notes_date" ON "contract_notes"("created_at");

-- CreateIndex
CREATE INDEX "idx_renewals_contract" ON "contract_renewals"("contract_id");

-- CreateIndex
CREATE INDEX "idx_renewals_date" ON "contract_renewals"("renewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_requests_request_number_key" ON "maintenance_requests"("request_number");

-- CreateIndex
CREATE INDEX "idx_maint_status" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "idx_maint_tenant" ON "maintenance_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_schedules_due_date" ON "payment_schedules"("due_date");

-- CreateIndex
CREATE INDEX "idx_schedules_room" ON "payment_schedules"("room_id");

-- CreateIndex
CREATE INDEX "idx_schedules_status" ON "payment_schedules"("status");

-- CreateIndex
CREATE INDEX "idx_schedules_tenant" ON "payment_schedules"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_unique_room_period" ON "payment_schedules"("room_id", "month", "year");

-- CreateIndex
CREATE INDEX "idx_property_types_slug" ON "property_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_property_types_tenant_slug" ON "property_types"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "security_deposits_receipt_number_key" ON "security_deposits"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_deposits_receipt" ON "security_deposits"("receipt_number");

-- CreateIndex
CREATE INDEX "idx_deposits_room" ON "security_deposits"("room_id");

-- CreateIndex
CREATE INDEX "idx_deposits_status" ON "security_deposits"("status");

-- CreateIndex
CREATE INDEX "idx_deposits_tenant" ON "security_deposits"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_team_members_user" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_teams_slug" ON "teams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "uq_teams_tenant_slug" ON "teams"("tenant_id", "slug");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bed_occupancy" ADD CONSTRAINT "bed_occupancy_bed_space_id_fkey" FOREIGN KEY ("bed_space_id") REFERENCES "bed_spaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bed_occupancy" ADD CONSTRAINT "bed_occupancy_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bed_occupancy" ADD CONSTRAINT "bed_occupancy_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bed_occupancy" ADD CONSTRAINT "bed_occupancy_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bed_spaces" ADD CONSTRAINT "bed_spaces_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bedspaces" ADD CONSTRAINT "bedspaces_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bedspaces" ADD CONSTRAINT "bedspaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camps" ADD CONSTRAINT "camps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_related_entity_id_fkey" FOREIGN KEY ("related_entity_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaint_categories" ADD CONSTRAINT "complaint_categories_default_team_id_fkey" FOREIGN KEY ("default_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaint_categories" ADD CONSTRAINT "complaint_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaint_updates" ADD CONSTRAINT "complaint_updates_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaint_updates" ADD CONSTRAINT "complaint_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "complaint_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reported_by_user_fkey" FOREIGN KEY ("reported_by_user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_alerts" ADD CONSTRAINT "contract_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_alerts" ADD CONSTRAINT "contract_alerts_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_alerts" ADD CONSTRAINT "contract_alerts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_enabled_by_fkey" FOREIGN KEY ("enabled_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "individuals" ADD CONSTRAINT "individuals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "map_layouts" ADD CONSTRAINT "map_layouts_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "map_layouts" ADD CONSTRAINT "map_layouts_configured_by_fkey" FOREIGN KEY ("configured_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_occupancy_id_fkey" FOREIGN KEY ("occupancy_id") REFERENCES "room_occupancy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_room_tenant_id_fkey" FOREIGN KEY ("room_tenant_id") REFERENCES "room_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "monthly_records" ADD CONSTRAINT "monthly_records_bedspace_id_fkey" FOREIGN KEY ("bedspace_id") REFERENCES "bedspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_monthly_record_id_fkey" FOREIGN KEY ("monthly_record_id") REFERENCES "monthly_records"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_inspection_by_fkey" FOREIGN KEY ("inspection_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_notice_given_by_fkey" FOREIGN KEY ("notice_given_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_occupancy" ADD CONSTRAINT "room_occupancy_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_devices" ADD CONSTRAINT "sensor_devices_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_devices" ADD CONSTRAINT "sensor_devices_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_devices" ADD CONSTRAINT "sensor_devices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_devices" ADD CONSTRAINT "sensor_devices_sensor_type_id_fkey" FOREIGN KEY ("sensor_type_id") REFERENCES "sensor_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "sensor_devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_sensor_type_id_fkey" FOREIGN KEY ("sensor_type_id") REFERENCES "sensor_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_tenants" ADD CONSTRAINT "room_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_saas_tenant_id_fkey" FOREIGN KEY ("saas_tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_room_tenant_id_fkey" FOREIGN KEY ("room_tenant_id") REFERENCES "room_tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_bedspace_id_fkey" FOREIGN KEY ("bedspace_id") REFERENCES "bedspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_monthly_record_id_fkey" FOREIGN KEY ("monthly_record_id") REFERENCES "monthly_records"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_logged_by_user_id_fkey" FOREIGN KEY ("logged_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_occupancy_id_fkey" FOREIGN KEY ("occupancy_id") REFERENCES "room_occupancy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balance_writeoffs" ADD CONSTRAINT "balance_writeoffs_written_off_by_fkey" FOREIGN KEY ("written_off_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_notes" ADD CONSTRAINT "contract_notes_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_notes" ADD CONSTRAINT "contract_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_renewed_by_fkey" FOREIGN KEY ("renewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "complaint_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_monthly_record_id_fkey" FOREIGN KEY ("monthly_record_id") REFERENCES "monthly_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_occupancy_id_fkey" FOREIGN KEY ("occupancy_id") REFERENCES "room_occupancy"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_types" ADD CONSTRAINT "property_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "individuals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_occupancy_id_fkey" FOREIGN KEY ("occupancy_id") REFERENCES "room_occupancy"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_refunded_by_fkey" FOREIGN KEY ("refunded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

