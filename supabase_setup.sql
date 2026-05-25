-- ==========================================
-- ICS ETHIOPIA FILE MANAGEMENT SYSTEM (FMS)
-- SUPABASE / POSTGRESQL DATABASE SCHEMA SETUP
-- ==========================================

-- This SQL script creates all the tables, indexes, and constraints required for
-- the ICS Ethiopia FMS. You can copy-paste and run this entire script directly
-- in your Supabase SQL Editor.

-- Protect schemas by running everything in public or a dedicated schema.
-- Ensure we clean up any conflicting names if restarting.

-- -------------------------------------------------------------
-- 1. UNIFIED SYSTEM GENERAL SNAPSHOT TABLE (fms_store)
-- -------------------------------------------------------------
-- This table is utilized by the FMS real-time background sync engine to replicate
-- the complete system snapshot. It enables 1-click cloud restoration, active
-- local cache initialization on boot, and fully-managed offline capability.

CREATE TABLE IF NOT EXISTS public.fms_store (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.fms_store IS 'Stores the total workspace state snapshots for instant cache synchronization and disaster recovery backups.';


-- -------------------------------------------------------------
-- 2. DISCRETE RELATIONAL TABLES (For direct relational querying)
-- -------------------------------------------------------------

-- A. Users and Authentication overrides
CREATE TABLE IF NOT EXISTS public.fms_users (
    id text PRIMARY KEY,
    username text UNIQUE NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('Admin', 'TDP_Supervisor', 'Visa_Supervisor', 'Encoder')),
    department text NOT NULL CHECK (department IN ('All', 'TDP', 'Visa')),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. Encrypted/Secure Password Storage 
CREATE TABLE IF NOT EXISTS public.fms_user_passwords (
    user_id text REFERENCES public.fms_users(id) ON DELETE CASCADE PRIMARY KEY,
    password_hash text NOT NULL
);

-- C. Physical File Storage Boxes (Archival assignment matrix)
CREATE TABLE IF NOT EXISTS public.fms_boxes (
    id text PRIMARY KEY,
    box_number text UNIQUE NOT NULL,
    department text NOT NULL CHECK (department IN ('TDP', 'Visa')),
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'full', 'inactive')),
    folder_count integer DEFAULT 0 NOT NULL,
    file_count integer DEFAULT 0 NOT NULL,
    total_size bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D. Client Digital Folders (Passport registry files)
CREATE TABLE IF NOT EXISTS public.fms_folders (
    id text PRIMARY KEY,
    client_name text NOT NULL,
    passport_number text NOT NULL,
    file_number text UNIQUE NOT NULL,
    department text NOT NULL CHECK (department IN ('TDP', 'Visa')),
    box_id text REFERENCES public.fms_boxes(id) ON DELETE SET NULL,
    box_number text NOT NULL,
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'archived', 'inactive')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- E. Uploaded Documents (Binary payload frames & statuses)
CREATE TABLE IF NOT EXISTS public.fms_files (
    id text PRIMARY KEY,
    folder_id text REFERENCES public.fms_folders(id) ON DELETE CASCADE NOT NULL,
    folder_name text NOT NULL,
    box_number text NOT NULL,
    client_name text NOT NULL,
    department text NOT NULL CHECK (department IN ('TDP', 'Visa')),
    file_name text NOT NULL,
    file_type text NOT NULL CHECK (file_type IN ('passport', 'visa', 'ticket', 'contract', 'other')),
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    content text NOT NULL, -- Holds Base64 file contents or URL paths
    uploaded_by text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text DEFAULT 'Pending Approval' NOT NULL CHECK (status IN ('Pending Approval', 'Approved', 'Rejected')),
    reviewed_by text,
    reviewed_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    version_history jsonb DEFAULT '[]'::jsonb NOT NULL
);

-- F. Action Logs (Compliance immutable audit trails)
CREATE TABLE IF NOT EXISTS public.fms_activity_logs (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    username text NOT NULL,
    role text NOT NULL,
    department text NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- G. Global Systems Restrictions & Threshold parameters
CREATE TABLE IF NOT EXISTS public.fms_config (
    id text PRIMARY KEY DEFAULT 'global_config',
    box_limit_folders integer DEFAULT 5 NOT NULL,
    box_limit_files integer DEFAULT 15 NOT NULL,
    box_limit_size bigint DEFAULT 10485760 NOT NULL, -- 10 MB in bytes
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- H. Historical Secured Archives Snapshot Backup Snapshots
CREATE TABLE IF NOT EXISTS public.fms_backups (
    id text PRIMARY KEY,
    backup_name text NOT NULL,
    description text,
    data text NOT NULL, -- Complete base64 or raw serialized string
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- -------------------------------------------------------------
-- 3. SPEED OPTIMIZATION INDEX TARGETING
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_folders_passport ON public.fms_folders(passport_number);
CREATE INDEX IF NOT EXISTS idx_folders_box ON public.fms_folders(box_id);
CREATE INDEX IF NOT EXISTS idx_files_folder ON public.fms_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON public.fms_files(status);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.fms_activity_logs(timestamp DESC);


-- -------------------------------------------------------------
-- 4. SEED SAMPLE TEST PROFILES (To jumpstart environments)
-- -------------------------------------------------------------
INSERT INTO public.fms_users (id, username, full_name, role, department, active, created_at)
VALUES 
('u-1', 'admin', 'System Administrator', 'Admin', 'All', true, now()),
('u-2', 'tdpsup', 'Elias TDP Supervisor', 'TDP_Supervisor', 'TDP', true, now()),
('u-3', 'visasup', 'Hana Visa Supervisor', 'Visa_Supervisor', 'Visa', true, now()),
('u-4', 'tdpenc', 'Daniel TDP Encoder', 'Encoder', 'TDP', true, now()),
('u-5', 'visaenc', 'Yared Visa Encoder', 'Encoder', 'Visa', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fms_user_passwords (user_id, password_hash)
VALUES
('u-1', 'admin123'),
('u-2', 'tdp123'),
('u-3', 'visa123'),
('u-4', 'tdpenc123'),
('u-5', 'visaenc123')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.fms_config (id, box_limit_folders, box_limit_files, box_limit_size)
VALUES ('global_config', 5, 15, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Initial default stores setup
INSERT INTO public.fms_store (id, data) 
VALUES ('fms_workspace', '{
  "users": [
    {"id": "u-1", "username": "admin", "fullName": "System Administrator", "role": "Admin", "department": "All", "active": true, "createdAt": "2026-05-25T10:18:44Z"},
    {"id": "u-2", "username": "tdpsup", "fullName": "Elias TDP Supervisor", "role": "TDP_Supervisor", "department": "TDP", "active": true, "createdAt": "2026-05-25T10:18:44Z"},
    {"id": "u-3", "username": "visasup", "fullName": "Hana Visa Supervisor", "role": "Visa_Supervisor", "department": "Visa", "active": true, "createdAt": "2026-05-25T10:18:44Z"},
    {"id": "u-4", "username": "tdpenc", "fullName": "Daniel TDP Encoder", "role": "Encoder", "department": "TDP", "active": true, "createdAt": "2026-05-25T10:18:44Z"},
    {"id": "u-5", "username": "visaenc", "fullName": "Yared Visa Encoder", "role": "Encoder", "department": "Visa", "active": true, "createdAt": "2026-05-25T10:18:44Z"}
  ],
  "userPasswords": {
    "u-1": "admin123",
    "u-2": "tdp123",
    "u-3": "visa123",
    "u-4": "tdpenc123",
    "u-5": "visaenc123"
  },
  "config": {
    "boxLimitFolders": 5,
    "boxLimitFiles": 15,
    "boxLimitSize": 10485760
  },
  "boxes": [
    {"id": "b-tdp-1", "boxNumber": "TDP-BOX-001", "department": "TDP", "status": "active", "folderCount": 2, "fileCount": 4, "totalSize": 220000, "createdAt": "2026-05-25T10:18:44Z"},
    {"id": "b-visa-1", "boxNumber": "VISA-BOX-001", "department": "Visa", "status": "active", "folderCount": 2, "fileCount": 2, "totalSize": 110000, "createdAt": "2026-05-25T10:18:44Z"}
  ],
  "folders": [
    {"id": "f-tdp-1", "clientName": "Abebe Bikila", "passportNumber": "EP1234567", "fileNumber": "FN-TDP-2026-001", "department": "TDP", "boxNumber": "TDP-BOX-001", "boxId": "b-tdp-1", "createdAt": "2026-05-25T10:18:44Z", "status": "active"},
    {"id": "f-tdp-2", "clientName": "Derartu Tulu", "passportNumber": "EP7654321", "fileNumber": "FN-TDP-2026-002", "department": "TDP", "boxNumber": "TDP-BOX-001", "boxId": "b-tdp-1", "createdAt": "2026-05-25T10:18:44Z", "status": "active"},
    {"id": "f-visa-1", "clientName": "Lelisa Desisa", "passportNumber": "EP1122334", "fileNumber": "FN-VISA-2026-001", "department": "Visa", "boxNumber": "VISA-BOX-001", "boxId": "b-visa-1", "createdAt": "2026-05-25T10:18:44Z", "status": "active"},
    {"id": "f-visa-2", "clientName": "Tirunesh Dibaba", "passportNumber": "EP4433221", "fileNumber": "FN-VISA-2026-002", "department": "Visa", "boxNumber": "VISA-BOX-001", "boxId": "b-visa-1", "createdAt": "2026-05-25T10:18:44Z", "status": "active"}
  ],
  "files": [],
  "logs": [
    {"id": "l-init", "userId": "u-1", "username": "admin", "role": "Admin", "department": "All", "action": "SYSTEM_INIT", "details": "Initialized physical archives synchronization store correctly.", "timestamp": "2026-05-25T10:18:44Z"}
  ]
}')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 5. DISABLE ROW LEVEL SECURITY (RLS) FOR DEVELOPMENT SYNC
-- -------------------------------------------------------------
-- This ensures the anon/public connection can seamlessly synchronize databases without policy blocks
ALTER TABLE IF EXISTS public.fms_store DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_user_passwords DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_boxes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fms_backups DISABLE ROW LEVEL SECURITY;

