/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  User, 
  UserRole, 
  Department, 
  FileBox, 
  ClientFolder, 
  UploadedFile, 
  ActivityLog, 
  SystemConfig,
  DashboardStats,
  SystemBackup,
  FileVersion,
  FileStatus,
  FileDocType
} from "./src/types";

const app = express();
const PORT = 3000;

// Maximum payload size for base64 file uploads (e.g. 10MB)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// File-based DB location
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper interface for DB scheme
interface DatabaseSchema {
  users: User[];
  userPasswords: Record<string, string>; // userId -> password
  boxes: FileBox[];
  folders: ClientFolder[];
  files: UploadedFile[];
  logs: ActivityLog[];
  config: SystemConfig;
  backups: { id: string; backupName: string; createdAt: string; description: string; data: string }[];
}

// Default state helper
const getInitialSchema = (): DatabaseSchema => {
  const users: User[] = [
    { id: "u-1", username: "admin", fullName: "System Administrator", role: "Admin", department: "All", active: true, createdAt: new Date().toISOString() },
    { id: "u-2", username: "tdpsup", fullName: "Elias TDP Supervisor", role: "TDP_Supervisor", department: "TDP", active: true, createdAt: new Date().toISOString() },
    { id: "u-3", username: "visasup", fullName: "Hana Visa Supervisor", role: "Visa_Supervisor", department: "Visa", active: true, createdAt: new Date().toISOString() },
    { id: "u-4", username: "tdpenc", fullName: "Daniel TDP Encoder", role: "Encoder", department: "TDP", active: true, createdAt: new Date().toISOString() },
    { id: "u-5", username: "visaenc", fullName: "Yared Visa Encoder", role: "Encoder", department: "Visa", active: true, createdAt: new Date().toISOString() }
  ];

  const userPasswords: Record<string, string> = {
    "u-1": "admin123",
    "u-2": "tdp123",
    "u-3": "visa123",
    "u-4": "tdpenc123",
    "u-5": "visaenc123"
  };

  const config: SystemConfig = {
    boxLimitFolders: 5,        // Small folders limit for interactive demoing of box overflow
    boxLimitFiles: 15,         // Small files limit for demoing box overflow
    boxLimitSize: 10 * 1024 * 1024 // 10MB limit for box overflow
  };

  // Let's seed pre-created default boxes so the app looks ready
  const boxes: FileBox[] = [
    { id: "b-tdp-1", boxNumber: "TDP-BOX-001", department: "TDP", status: "active", folderCount: 2, fileCount: 4, totalSize: 220000, createdAt: new Date().toISOString() },
    { id: "b-visa-1", boxNumber: "VISA-BOX-001", department: "Visa", status: "active", folderCount: 2, fileCount: 2, totalSize: 110000, createdAt: new Date().toISOString() }
  ];

  // Seed folders
  const folders: ClientFolder[] = [
    { id: "f-tdp-1", clientName: "Abebe Bikila", passportNumber: "EP1234567", fileNumber: "FN-TDP-2026-001", department: "TDP", boxNumber: "TDP-BOX-001", boxId: "b-tdp-1", createdAt: new Date().toISOString(), status: "active" },
    { id: "f-tdp-2", clientName: "Derartu Tulu", passportNumber: "EP7654321", fileNumber: "FN-TDP-2026-002", department: "TDP", boxNumber: "TDP-BOX-001", boxId: "b-tdp-1", createdAt: new Date().toISOString(), status: "active" },
    { id: "f-visa-1", clientName: "Lelisa Desisa", passportNumber: "EP1122334", fileNumber: "FN-VISA-2026-001", department: "Visa", boxNumber: "VISA-BOX-001", boxId: "b-visa-1", createdAt: new Date().toISOString(), status: "active" },
    { id: "f-visa-2", clientName: "Tirunesh Dibaba", passportNumber: "EP4433221", fileNumber: "FN-VISA-2026-002", department: "Visa", boxNumber: "VISA-BOX-001", boxId: "b-visa-1", createdAt: new Date().toISOString(), status: "active" }
  ];

  // Custom empty base64 PDF templates for demonstration previews
  const pdfBase64 = "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDYKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDYKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgIDAgNTk1IDg0Ml0KL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNCAwIFIKPj4KPj4KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDU4Cj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZCAoVENTIEV0aGlvcGlhIEZNUyAtIERvY3VtZW50IFByZXZpZXcpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNzAgMDAwMDAgbiAKMDAwMDAwMDEzNCAwMDAwMCBuIAowMDAwMDAwMjg2IDAwMDAwIG4gCjAwMDAwMDAzNTYgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgowCiUlRU9G";

  // Seed files
  const files: UploadedFile[] = [
    {
      id: "fi-1",
      folderId: "f-tdp-1",
      folderName: "Abebe Bikila",
      boxNumber: "TDP-BOX-001",
      clientName: "Abebe Bikila",
      department: "TDP",
      fileName: "Passport_Abebe_Bikila.pdf",
      fileType: "passport",
      mimeType: "application/pdf",
      fileSize: 45000,
      content: pdfBase64,
      uploadedBy: "Daniel TDP Encoder",
      uploadedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: "Approved",
      reviewedBy: "Elias TDP Supervisor",
      reviewedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      version: 1,
      versionHistory: [
        { version: 1, fileName: "Passport_Abebe_Bikila.pdf", fileSize: 45000, content: pdfBase64, uploadedBy: "Daniel TDP Encoder", uploadedAt: new Date(Date.now() - 3600000 * 4).toISOString() }
      ]
    },
    {
      id: "fi-2",
      folderId: "f-tdp-1",
      folderName: "Abebe Bikila",
      boxNumber: "TDP-BOX-001",
      clientName: "Abebe Bikila",
      department: "TDP",
      fileName: "Visa_Application_Form.pdf",
      fileType: "visa",
      mimeType: "application/pdf",
      fileSize: 55000,
      content: pdfBase64,
      uploadedBy: "Daniel TDP Encoder",
      uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: "Pending Approval",
      reviewedBy: null,
      reviewedAt: null,
      version: 1,
      versionHistory: [
        { version: 1, fileName: "Visa_Application_Form.pdf", fileSize: 55000, content: pdfBase64, uploadedBy: "Daniel TDP Encoder", uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString() }
      ]
    },
    {
      id: "fi-3",
      folderId: "f-tdp-2",
      folderName: "Derartu Tulu",
      boxNumber: "TDP-BOX-001",
      clientName: "Derartu Tulu",
      department: "TDP",
      fileName: "Flight_Booking_Derartu.pdf",
      fileType: "ticket",
      mimeType: "application/pdf",
      fileSize: 60000,
      content: pdfBase64,
      uploadedBy: "Daniel TDP Encoder",
      uploadedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: "Approved",
      reviewedBy: "Elias TDP Supervisor",
      reviewedAt: new Date(Date.now() - 3600000 * 4.5).toISOString(),
      version: 1,
      versionHistory: [
        { version: 1, fileName: "Flight_Booking_Derartu.pdf", fileSize: 60000, content: pdfBase64, uploadedBy: "Daniel TDP Encoder", uploadedAt: new Date(Date.now() - 3600000 * 5).toISOString() }
      ]
    },
    {
      id: "fi-4",
      folderId: "f-tdp-2",
      folderName: "Derartu Tulu",
      boxNumber: "TDP-BOX-001",
      clientName: "Derartu Tulu",
      department: "TDP",
      fileName: "Service_Contract_Derartu.pdf",
      fileType: "contract",
      mimeType: "application/pdf",
      fileSize: 60000,
      content: pdfBase64,
      uploadedBy: "Daniel TDP Encoder",
      uploadedAt: new Date(Date.now() - 3600000).toISOString(),
      status: "Pending Approval",
      reviewedBy: null,
      reviewedAt: null,
      version: 1,
      versionHistory: [
        { version: 1, fileName: "Service_Contract_Derartu.pdf", fileSize: 60000, content: pdfBase64, uploadedBy: "Daniel TDP Encoder", uploadedAt: new Date(Date.now() - 3600000).toISOString() }
      ]
    },
    {
      id: "fi-5",
      folderId: "f-visa-1",
      folderName: "Lelisa Desisa",
      boxNumber: "VISA-BOX-001",
      clientName: "Lelisa Desisa",
      department: "Visa",
      fileName: "Lelisa_Passport.pdf",
      fileType: "passport",
      mimeType: "application/pdf",
      fileSize: 50000,
      content: pdfBase64,
      uploadedBy: "Yared Visa Encoder",
      uploadedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
      status: "Approved",
      reviewedBy: "Hana Visa Supervisor",
      reviewedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      version: 1,
      versionHistory: [
        { version: 1, fileName: "Lelisa_Passport.pdf", fileSize: 50000, content: pdfBase64, uploadedBy: "Yared Visa Encoder", uploadedAt: new Date(Date.now() - 3600000 * 7).toISOString() }
      ]
    },
    {
      id: "fi-6",
      folderId: "f-visa-1",
      folderName: "Lelisa Desisa",
      boxNumber: "VISA-BOX-001",
      clientName: "Lelisa Desisa",
      department: "Visa",
      fileName: "Visa_Doc_Lelisa.pdf",
      fileType: "visa",
      mimeType: "application/pdf",
      fileSize: 60000,
      content: pdfBase64,
      uploadedBy: "Yared Visa Encoder",
      uploadedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: "Pending Approval",
      reviewedBy: null,
      reviewedAt: null,
      version: 1,
      versionHistory: [
        { version: 1, fileName: "Visa_Doc_Lelisa.pdf", fileSize: 60000, content: pdfBase64, uploadedBy: "Yared Visa Encoder", uploadedAt: new Date(Date.now() - 3600000 * 3).toISOString() }
      ]
    }
  ];

  const logs: ActivityLog[] = [
    { id: "log-1", userId: "u-1", username: "admin", role: "Admin", department: "All", action: "SYSTEM_INIT", details: "Database seeded and initialized successfully.", timestamp: new Date(Date.now() - 3600000 * 10).toISOString() },
    { id: "log-2", userId: "u-4", username: "tdpenc", role: "Encoder", department: "TDP", action: "FOLDER_CREATION", details: "Client folder created for Abebe Bikila (FN-TDP-2026-001)", timestamp: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: "log-3", userId: "u-4", username: "tdpenc", role: "Encoder", department: "TDP", action: "FILE_UPLOAD", details: "Uploaded file Passport_Abebe_Bikila.pdf to Abebe Bikila folder.", timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: "log-4", userId: "u-2", username: "tdpsup", role: "TDP_Supervisor", department: "TDP", action: "FILE_APPROVAL", details: "Approved file Passport_Abebe_Bikila.pdf for client Abebe Bikila", timestamp: new Date(Date.now() - 3600000 * 3).toISOString() }
  ];

  return {
    users,
    userPasswords,
    boxes,
    folders,
    files,
    logs,
    config,
    backups: []
  };
};

// =============================================================
// REAL-TIME SUPABASE SYNCHRONIZATION SUPPORT
// =============================================================
import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const key = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();
  const urlPlaceholder = /your[-_.]?project[-_.]?id|your-project|your-supabase|supabase\.co/.test(url.toLowerCase()) && url.toLowerCase().includes("your");
  const keyPlaceholder = /^your[-_.]?/.test(key.toLowerCase()) || key.toLowerCase().includes("your-supabase") || key.toLowerCase().includes("your-anon") || key.toLowerCase().includes("your-service");
  const isConfigured = Boolean(url && key && !urlPlaceholder && !keyPlaceholder);

  return {
    url,
    key,
    isConfigured,
    isPlaceholder: !isConfigured && Boolean(url || key)
  };
};

const getSupabaseClient = () => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
    }
  }
  return supabaseClient;
};

// Test connection AND verify fms_store table availability
const testSupabaseConnection = async () => {
  const client = getSupabaseClient();
  if (!client) {
    const config = getSupabaseConfig();
    return {
      status: "unconfigured",
      configured: false,
      message: config.isPlaceholder
        ? "Supabase credentials are configured but still using placeholder values. Replace SUPABASE_URL and SUPABASE_KEY with your actual project values."
        : "Supabase credentials are not configured in your environment keys."
    };
  }
  try {
    const { data, error } = await client
      .from("fms_store")
      .select("id")
      .eq("id", "fms_workspace")
      .limit(1);

    if (error) {
      if (error.code === "42P01") {
        return {
          status: "table_missing",
          configured: true,
          message: "Connected to Supabase successfully, but the 'fms_store' table is missing from your public schema.",
          sqlHelp: `CREATE TABLE fms_store (\n  id text PRIMARY KEY,\n  data jsonb NOT NULL,\n  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL\n);`
        };
      }
      throw error;
    }

    return {
      status: "connected",
      configured: true,
      message: "Ready! Cloud dataset replication layer is active.",
      hasRecord: data.length > 0
    };
  } catch (err: any) {
    console.error("Supabase live replication test failure:", err);
    return {
      status: "error",
      configured: true,
      message: `Failed connection test: ${err.message || "Unknown error"}`
    };
  }
};

// Async replication loaders and savers
const loadDbFromSupabase = async (): Promise<DatabaseSchema | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("fms_store")
      .select("data")
      .eq("id", "fms_workspace")
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.code === "42P01") {
        return null;
      }
      console.warn("Could not read database registry from Supabase:", error);
      return null;
    }
    if (data && data.data) {
      return data.data as DatabaseSchema;
    }
  } catch (err) {
    console.error("Error reading database from Supabase:", err);
  }
  return null;
};

const saveDbToSupabase = async (db: DatabaseSchema): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    // 1. Maintain Master Snapshot Replicas in fms_store
    const { error: storeErr } = await client
      .from("fms_store")
      .upsert({
        id: "fms_workspace",
        data: db,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (storeErr) {
      console.warn("[Supabase Sync] Could not write fms_store backup: ", storeErr);
    }

    // 2. Prepare mapping payloads for distinct relational PostgreSQL tables
    const usersData = (db.users || []).map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName,
      role: u.role,
      department: u.department,
      active: u.active,
      created_at: u.createdAt || new Date().toISOString()
    }));

    const passwordsData = Object.entries(db.userPasswords || {}).map(([userId, pwd]) => ({
      user_id: userId,
      password_hash: pwd
    }));

    const boxesData = (db.boxes || []).map(b => ({
      id: b.id,
      box_number: b.boxNumber,
      department: b.department,
      status: b.status,
      folder_count: b.folderCount,
      file_count: b.fileCount,
      total_size: b.totalSize,
      created_at: b.createdAt || new Date().toISOString()
    }));

    const foldersData = (db.folders || []).map(f => ({
      id: f.id,
      client_name: f.clientName,
      passport_number: f.passportNumber,
      file_number: f.fileNumber,
      department: f.department,
      box_id: f.boxId || null,
      box_number: f.boxNumber,
      status: f.status,
      created_at: f.createdAt || new Date().toISOString()
    }));

    const filesData = (db.files || []).map(f => ({
      id: f.id,
      folder_id: f.folderId,
      folder_name: f.folderName,
      box_number: f.boxNumber,
      client_name: f.clientName,
      department: f.department,
      file_name: f.fileName,
      file_type: f.fileType,
      mime_type: f.mimeType,
      file_size: f.fileSize,
      content: f.content,
      uploaded_by: f.uploadedBy,
      uploaded_at: f.uploadedAt || new Date().toISOString(),
      status: f.status,
      reviewed_by: f.reviewedBy || null,
      reviewed_at: f.reviewedAt || null,
      version: f.version || 1,
      version_history: f.versionHistory || []
    }));

    const logsData = (db.logs || []).map(l => ({
      id: l.id,
      user_id: l.userId,
      username: l.username,
      role: l.role,
      department: l.department,
      action: l.action,
      details: l.details,
      timestamp: l.timestamp || new Date().toISOString()
    }));

    // 3. Perform asynchronous batch upserts towards distinct columns, handling gracefully in case of mismatches
    const syncTasks = [];

    if (usersData.length > 0) {
      syncTasks.push(
        client.from("fms_users").upsert(usersData, { onConflict: "id" })
          .then(({ error }: any) => { if (error) console.error("[Supabase Sync] Replicating 'fms_users' failed:", error); })
          .catch((err: any) => console.error(err))
      );
    }

    if (passwordsData.length > 0) {
      syncTasks.push(
        client.from("fms_user_passwords").upsert(passwordsData, { onConflict: "user_id" })
          .then(({ error }: any) => { if (error) console.error("[Supabase Sync] Replicating 'fms_user_passwords' failed:", error); })
          .catch((err: any) => console.error(err))
      );
    }

    if (boxesData.length > 0) {
      syncTasks.push(
        client.from("fms_boxes").upsert(boxesData, { onConflict: "id" })
          .then(({ error }: any) => { if (error) console.error("[Supabase Sync] Replicating 'fms_boxes' failed:", error); })
          .catch((err: any) => console.error(err))
      );
    }

    if (foldersData.length > 0) {
      syncTasks.push(
        client.from("fms_folders").upsert(foldersData, { onConflict: "id" })
          .then(({ error }: any) => { if (error) console.error("[Supabase Sync] Replicating 'fms_folders' failed:", error); })
          .catch((err: any) => console.error(err))
      );
    }

    if (filesData.length > 0) {
      syncTasks.push(
        client.from("fms_files").upsert(filesData, { onConflict: "id" })
          .then(({ error }: any) => { if (error) console.error("[Supabase Sync] Replicating 'fms_files' failed:", error); })
          .catch((err: any) => console.error(err))
      );
    }

    if (logsData.length > 0) {
      syncTasks.push(
        client.from("fms_activity_logs").upsert(logsData, { onConflict: "id" })
          .then(({ error }: any) => { if (error) console.error("[Supabase Sync] Replicating 'fms_activity_logs' failed:", error); })
          .catch(() => {})
      );
    }

    await Promise.all(syncTasks);
    return true;
  } catch (err) {
    console.error("Error writing database to Supabase:", err);
    return false;
  }
};

// Robust database helper with file synchronization
const loadDb = (): DatabaseSchema => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const dataStr = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(dataStr);
      if (db && typeof db === "object") {
        // Guarantee all schema parts exist to protect against deep undefined property traps
        db.users = db.users || [];
        db.userPasswords = db.userPasswords || {};
        db.boxes = db.boxes || [];
        db.folders = db.folders || [];
        db.files = db.files || [];
        db.logs = db.logs || [];
        db.config = db.config || { boxLimitFolders: 5, boxLimitFiles: 15, boxLimitSize: 10 * 1024 * 1024 };
        db.backups = db.backups || [];
        return db as DatabaseSchema;
      }
    }
  } catch (err) {
    console.error("Error reading database file, loading initial schema:", err);
  }
  const initial = getInitialSchema();
  saveDb(initial);
  return initial;
};

const saveDb = (db: DatabaseSchema) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    
    // Background async replication to active Supabase Cloud Integration
    const { isConfigured } = getSupabaseConfig();
    if (isConfigured) {
      saveDbToSupabase(db).then((success) => {
        if (success) {
          console.log("[Supabase Sync] Replicated database changes to Supabase cloud table.");
        } else {
          console.warn("[Supabase Sync] Background replication failed. Check schema compatibility.");
        }
      }).catch(err => {
        console.error("[Supabase Sync] Background sync thread error:", err);
      });
    }
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
};

// Activity logging helper
const writeLog = (db: DatabaseSchema, userId: string, username: string, role: UserRole, department: Department, action: string, details: string) => {
  const newLog: ActivityLog = {
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    username,
    role,
    department,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db.logs.unshift(newLog);
  // Keep logs at 1000 max for memory
  if (db.logs.length > 1000) {
    db.logs = db.logs.slice(0, 1000);
  }
};

// Security middleware checking simple Bearer/Session headers
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Valid authorization token is required." });
  }
  const token = authHeader.split(" ")[1];
  
  // Simulated Simple JWT verification:
  // Base64 decoded string containing uId|username|role|dept
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [id, username, role, department, fullName] = decoded.split("|");
    if (!id || !username || !role) {
      return res.status(401).json({ error: "Invalid sessions. Please log in again." });
    }
    
    // Check if user is active in current DB
    const db = loadDb();
    const activeUser = db.users.find(u => u.id === id);
    if (!activeUser || !activeUser.active) {
      return res.status(403).json({ error: "Your account has been deactivated or does not exist." });
    }

    req.user = {
      id,
      username,
      role: role as UserRole,
      department: department as Department,
      fullName
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session token manipulation detected. Authentication failed." });
  }
};

// Express Custom type augmentation
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: UserRole;
        department: Department;
        fullName: string;
      };
    }
  }
}

// -------------------------------------------------------------
// BACKEND API ENDPOINTS
// -------------------------------------------------------------

// Post: Authenticate User
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const db = loadDb();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  if (!user.active) {
    return res.status(403).json({ error: "This account has been deactivated. Contact Admin." });
  }

  const registeredPassword = db.userPasswords[user.id];
  if (registeredPassword !== password) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  // Create simple auth token from credentials (base64 encoded profile data)
  const tokenPayload = `${user.id}|${user.username}|${user.role}|${user.department}|${user.fullName}`;
  const token = Buffer.from(tokenPayload).toString("base64");

  writeLog(db, user.id, user.username, user.role, user.department, "USER_LOGIN", "Logged into the system successfully.");
  saveDb(db);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      active: user.active
    }
  });
});

// Post: Self-Service Password Reset
app.post("/api/auth/reset-password", (req, res) => {
  const { username, fullName, newPassword } = req.body;
  if (!username || !fullName || !newPassword) {
    return res.status(400).json({ error: "All fields are required to verify identity." });
  }

  const db = loadDb();
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase() && 
         u.fullName.toLowerCase() === fullName.toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ error: "User verification details did not match our records." });
  }

  db.userPasswords[user.id] = newPassword;
  writeLog(db, user.id, user.username, user.role, user.department, "PASSWORD_RESET", "Password was reset successfully.");
  saveDb(db);

  return res.json({ success: true, message: "Your password has been reset successfully. Please proceed to login." });
});

// GET: Current Authenticated User profile
app.get("/api/auth/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// GET: List all users (Admin only)
app.get("/api/users", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "FMS Access Denied. Requires Administrator privileges." });
  }
  const db = loadDb();
  return res.json({ users: db.users });
});

// POST: Register User (Admin only)
app.post("/api/users", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "FMS Access Denied. Requires Administrator privileges." });
  }

  const { username, fullName, role, department, password } = req.body;
  if (!username || !fullName || !role || !department || !password) {
    return res.status(400).json({ error: "All fields are required to create a new user profile." });
  }

  const db = loadDb();
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "Username is already taken." });
  }

  const newId = `u-${Math.random().toString(36).substr(2, 9)}`;
  const newUser: User = {
    id: newId,
    username,
    fullName,
    role,
    department,
    active: true,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.userPasswords[newId] = password;

  writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "USER_CREATION", `Created new user ${username} (${fullName}) with role ${role}.`);
  saveDb(db);

  return res.status(201).json({ user: newUser });
});

// PUT: Reset user password (Admin only)
app.put("/api/users/:id/reset", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "FMS Access Denied." });
  }

  const { id } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "New password is required." });
  }

  const db = loadDb();
  const targetUser = db.users.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: "User profile not found." });
  }

  db.userPasswords[id] = password;
  writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "ADMIN_PASSWORD_RESET", `Admin reset password for user ${targetUser.username}.`);
  saveDb(db);

  return res.json({ success: true, message: `Password reset successfully for ${targetUser.fullName}.` });
});

// PUT: Toggle active status of user (Admin only)
app.put("/api/users/:id/status", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "FMS Access Denied." });
  }

  const { id } = req.params;
  const db = loadDb();
  const targetUser = db.users.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: "You cannot deactivate your own Administrator account." });
  }

  targetUser.active = !targetUser.active;
  writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "USER_STATUS_TOGGLE", `Admin toggled status of user ${targetUser.username} to ${targetUser.active ? "Active" : "Inactive"}.`);
  saveDb(db);

  return res.json({ user: targetUser });
});

// GET: Boxes list
app.get("/api/boxes", authMiddleware, (req, res) => {
  const db = loadDb();
  const userRole = req.user?.role;
  const userDept = req.user?.department;

  let boxes = db.boxes;
  // Role based departmental checks
  if (userRole === "TDP_Supervisor") {
    boxes = boxes.filter(b => b.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    boxes = boxes.filter(b => b.department === "Visa");
  } else if (userRole === "Encoder") {
    if (userDept === "TDP") {
      boxes = boxes.filter(b => b.department === "TDP");
    } else if (userDept === "Visa") {
      boxes = boxes.filter(b => b.department === "Visa");
    }
  }

  return res.json({ boxes });
});

// Helper: Get or Create current active Box for department
const getOrCreateActiveBox = (db: DatabaseSchema, dept: 'TDP' | 'Visa', adminId: string, adminUser: string, adminRole: UserRole, adminDept: Department): FileBox => {
  const deptBoxes = db.boxes
    .filter(b => b.department === dept)
    .sort((a, b) => b.boxNumber.localeCompare(a.boxNumber));

  let activeBox = deptBoxes.find(b => b.status === "active");

  const checkOverflow = (box: FileBox) => {
    // Check constraints
    const hasFolderLimit = box.folderCount >= db.config.boxLimitFolders;
    const hasFileLimit = box.fileCount >= db.config.boxLimitFiles;
    const hasSizeLimit = box.totalSize >= db.config.boxLimitSize;

    return hasFolderLimit || hasFileLimit || hasSizeLimit;
  };

  if (activeBox && checkOverflow(activeBox)) {
    // Mark old box as full
    activeBox.status = "full";
    writeLog(db, "system", "SYSTEM", "Admin", dept, "BOX_FULL_NOTIFICATION", `${dept} active Box ${activeBox.boxNumber} has reached its designated capacity limit.`);
    activeBox = undefined;
  }

  if (!activeBox) {
    // Determine box number serialization
    let nextIndex = 1;
    if (deptBoxes.length > 0) {
      const topBoxNum = deptBoxes[0].boxNumber; // e.g. "TDP-BOX-002"
      const match = topBoxNum.match(/\d+$/);
      if (match) {
        nextIndex = parseInt(match[0], 10) + 1;
      }
    }

    const pad = (num: number, size: number) => {
      let s = num + "";
      while (s.length < size) s = "0" + s;
      return s;
    };

    const newBoxNum = `${dept.toUpperCase()}-BOX-${pad(nextIndex, 3)}`;
    const newId = `box-${dept.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    const newBox: FileBox = {
      id: newId,
      boxNumber: newBoxNum,
      department: dept,
      status: "active",
      folderCount: 0,
      fileCount: 0,
      totalSize: 0,
      createdAt: new Date().toISOString()
    };

    db.boxes.push(newBox);
    writeLog(db, adminId, adminUser, adminRole, adminDept, "BOX_AUTO_GEN", `Capacity threshold triggered automatic creation of a new box: ${newBoxNum}.`);
    return newBox;
  }

  return activeBox;
};

// GET: Client folders with query filters
app.get("/api/folders", authMiddleware, (req, res) => {
  const { search, department, status, boxNumber } = req.query;
  const db = loadDb();
  const userRole = req.user?.role;
  const userDept = req.user?.department;

  let folders = db.folders;

  // Filter based on roles / departments
  if (userRole === "TDP_Supervisor") {
    folders = folders.filter(f => f.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    folders = folders.filter(f => f.department === "Visa");
  } else if (userRole === "Encoder") {
    if (userDept === "TDP") {
      folders = folders.filter(f => f.department === "TDP");
    } else if (userDept === "Visa") {
      folders = folders.filter(f => f.department === "Visa");
    }
  }

  // Frontend query criteria filters
  if (department && department !== "All") {
    folders = folders.filter(f => f.department === department);
  }
  if (status) {
    folders = folders.filter(f => f.status === status);
  }
  if (boxNumber) {
    folders = folders.filter(f => f.boxNumber === boxNumber);
  }

  if (search) {
    const s = String(search).toLowerCase();
    folders = folders.filter(
      f => f.clientName.toLowerCase().includes(s) || 
           f.passportNumber.toLowerCase().includes(s) || 
           f.fileNumber.toLowerCase().includes(s) || 
           f.boxNumber.toLowerCase().includes(s)
    );
  }

  return res.json({ folders });
});

// POST: Add Client Folder (Checks automatic active Box limit)
app.post("/api/folders", authMiddleware, (req, res) => {
  const { clientName, passportNumber, fileNumber, department } = req.body;
  if (!clientName || !passportNumber || !fileNumber || !department) {
    return res.status(400).json({ error: "Missing required client attributes. All fields are required." });
  }

  // Check department isolation
  if (req.user?.role === "Encoder" && req.user.department !== department) {
    return res.status(403).json({ error: `Encoder restricted. You cannot create folders folders in ${department} department.` });
  }
  if (req.user?.role === "TDP_Supervisor" && department !== "TDP") {
    return res.status(403).json({ error: "Access denied to Visa department for TDP Supervisor." });
  }
  if (req.user?.role === "Visa_Supervisor" && department !== "Visa") {
    return res.status(403).json({ error: "Access denied to TDP department for Visa Supervisor." });
  }

  const db = loadDb();

  // Validate duplicate folder
  const duplicate = db.folders.some(
    f => f.fileNumber.toLowerCase() === fileNumber.toLowerCase() || 
         f.passportNumber.toLowerCase() === passportNumber.toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({ error: "A client folder with this passport number or file number already exists." });
  }

  // Retrieve current active Box (and auto escalate if Box has reached limit)
  const activeBox = getOrCreateActiveBox(
    db, 
    department as "TDP" | "Visa", 
    req.user!.id, 
    req.user!.username, 
    req.user!.role, 
    req.user!.department
  );

  const folderId = `f-${department.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
  const newFolder: ClientFolder = {
    id: folderId,
    clientName,
    passportNumber,
    fileNumber,
    department: department as "TDP" | "Visa",
    boxNumber: activeBox.boxNumber,
    boxId: activeBox.id,
    createdAt: new Date().toISOString(),
    status: "active"
  };

  db.folders.push(newFolder);

  // Increment folder index inside DB file boxes
  const dbBox = db.boxes.find(b => b.id === activeBox.id);
  if (dbBox) {
    dbBox.folderCount += 1;
  }

  writeLog(db, req.user!.id, req.user!.username, req.user!.role, req.user!.department, "FOLDER_CREATION", `Created client folder for ${clientName} (${fileNumber}) allocated inside ${activeBox.boxNumber}.`);
  saveDb(db);

  return res.status(201).json({ folder: newFolder });
});

// GET: All active files with filters
app.get("/api/files", authMiddleware, (req, res) => {
  const { folderId, search, status, fileType, boxNumber } = req.query;
  const db = loadDb();
  const userRole = req.user?.role;
  const userDept = req.user?.department;

  let items = db.files;

  // Department Restriction
  if (userRole === "TDP_Supervisor") {
    items = items.filter(i => i.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    items = items.filter(i => i.department === "Visa");
  } else if (userRole === "Encoder") {
    if (userDept === "TDP") {
      items = items.filter(i => i.department === "TDP");
    } else if (userDept === "Visa") {
      items = items.filter(i => i.department === "Visa");
    }
  }

  if (folderId) {
    items = items.filter(i => i.folderId === folderId);
  }
  if (status) {
    items = items.filter(i => i.status === status);
  }
  if (fileType) {
    items = items.filter(i => i.fileType === fileType);
  }
  if (boxNumber) {
    items = items.filter(i => i.boxNumber === boxNumber);
  }

  if (search) {
    const s = String(search).toLowerCase();
    items = items.filter(
      i => i.fileName.toLowerCase().includes(s) || 
           i.clientName.toLowerCase().includes(s) || 
           i.boxNumber.toLowerCase().includes(s) || 
           i.fileType.toLowerCase().includes(s)
    );
  }

  // Avoid piping massive file raw base64 contents down the grid queries to save network and speed
  const mappedFiles = items.map(f => {
    const { content, ...rest } = f;
    return { ...rest, hasContent: !!content };
  });

  return res.json({ files: mappedFiles });
});

// GET: Single file detailed (Includes content for previews)
app.get("/api/files/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const file = db.files.find(f => f.id === id);
  if (!file) {
    return res.status(404).json({ error: "Requested document was not found." });
  }

  // Department boundaries check
  const userRole = req.user?.role;
  const userDept = req.user?.department;
  if (userRole === "TDP_Supervisor" && file.department !== "TDP") {
    return res.status(403).json({ error: "Access denied to Visa document files." });
  }
  if (userRole === "Visa_Supervisor" && file.department !== "Visa") {
    return res.status(403).json({ error: "Access denied to TDP document files." });
  }
  if (userRole === "Encoder") {
    if (userDept === "TDP" && file.department !== "TDP") {
      return res.status(403).json({ error: "Access denied. TDP Encoder restricted to TDP files." });
    }
    if (userDept === "Visa" && file.department !== "Visa") {
      return res.status(403).json({ error: "Access denied. Visa Encoder restricted to Visa files." });
    }
  }

  return res.json({ file });
});

// POST: Upload/Create File
app.post("/api/files", authMiddleware, (req, res) => {
  const { folderId, fileName, fileType, mimeType, content, fileSize } = req.body;
  if (!folderId || !fileName || !fileType || !content || !fileSize) {
    return res.status(400).json({ error: "Missing essential attributes for file upload." });
  }

  const db = loadDb();
  const folder = db.folders.find(f => f.id === folderId);
  if (!folder) {
    return res.status(404).json({ error: "Client folder context was not found." });
  }

  // Check department isolation
  if (req.user?.role === "Encoder" && req.user.department !== folder.department) {
    return res.status(403).json({ error: `Encoder isolation failure. You cannot upload to ${folder.department} folder.` });
  }

  // Find related active box and verify box limits before uploading
  const box = db.boxes.find(b => b.id === folder.boxId);
  if (box) {
    // If the folder's box is marked active, but is full because of another encoder's parallel actions, escalate!
    const folderLimit = db.config.boxLimitFolders;
    const fileLimit = db.config.boxLimitFiles;
    const sizeLimit = db.config.boxLimitSize;

    const isBoxOverflown = 
      box.fileCount >= fileLimit || 
      (box.totalSize + fileSize) >= sizeLimit;

    if (isBoxOverflown) {
      // Create new active Box
      box.status = "full";
      writeLog(db, "system", "SYSTEM", "Admin", folder.department, "BOX_FULL_NOTIFICATION", `Capacity threshold triggered full status on ${box.boxNumber}.`);
      
      const newBox = getOrCreateActiveBox(db, folder.department, req.user!.id, req.user!.username, req.user!.role, req.user!.department);
      
      // Migrate folder's box ID to prevent blocking subsequent encoders
      folder.boxId = newBox.id;
      folder.boxNumber = newBox.boxNumber;
      
      const prevBox = db.boxes.find(b => b.id === box.id);
      if (prevBox) prevBox.folderCount = Math.max(0, prevBox.folderCount - 1);
      newBox.folderCount += 1;
    }
  }

  const fileId = `fi-${Math.random().toString(36).substr(2, 9)}`;
  const newFile: UploadedFile = {
    id: fileId,
    folderId,
    folderName: folder.clientName,
    boxNumber: folder.boxNumber,
    clientName: folder.clientName,
    department: folder.department,
    fileName,
    fileType: fileType as FileDocType,
    mimeType: mimeType || "application/octet-stream",
    fileSize,
    content,
    uploadedBy: req.user!.fullName,
    uploadedAt: new Date().toISOString(),
    status: "Pending Approval",
    reviewedBy: null,
    reviewedAt: null,
    version: 1,
    versionHistory: [
      {
        version: 1,
        fileName,
        fileSize,
        content,
        uploadedBy: req.user!.fullName,
        uploadedAt: new Date().toISOString()
      }
    ]
  };

  db.files.push(newFile);

  // Accumulate stat counters on parent file box
  const targetBox = db.boxes.find(b => b.boxNumber === folder.boxNumber);
  if (targetBox) {
    targetBox.fileCount += 1;
    targetBox.totalSize += fileSize;
  }

  writeLog(db, req.user!.id, req.user!.username, req.user!.role, req.user!.department, "FILE_UPLOAD", `Uploaded document ${fileName} (${fileType}) to ${folder.clientName}. Waiting for Supervisor approval.`);
  saveDb(db);

  return res.status(201).json({ file: newFile });
});

// POST: Upload New Version of File
app.post("/api/files/:id/version", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { fileName, fileSize, content, mimeType } = req.body;
  if (!content || !fileSize) {
    return res.status(400).json({ error: "New version must include file content bytes." });
  }

  const db = loadDb();
  const file = db.files.find(f => f.id === id);
  if (!file) {
    return res.status(404).json({ error: "Target document not found." });
  }

  // Restriction: Encoders can edit/version only if own upload or within department, but Approved files cannot be deleted/modified.
  // Wait, the prompt says "Encoder restrictions: Cannot delete approved files".
  if (req.user?.role === "Encoder" && file.status === "Approved") {
    return res.status(403).json({ error: "Access Denied. Encoders cannot submit new versions for already approved files." });
  }

  const nextVersion = file.version + 1;
  const newVersion: FileVersion = {
    version: nextVersion,
    fileName: fileName || file.fileName,
    fileSize,
    content,
    uploadedBy: req.user!.fullName,
    uploadedAt: new Date().toISOString()
  };

  // Capture sizing adjustments inside Box metrics
  const sizeDifference = fileSize - file.fileSize;
  const parentBox = db.boxes.find(b => b.boxNumber === file.boxNumber);
  if (parentBox) {
    parentBox.totalSize += sizeDifference;
  }

  // Update original file record
  file.version = nextVersion;
  file.fileName = fileName || file.fileName;
  file.fileSize = fileSize;
  file.content = content;
  file.mimeType = mimeType || file.mimeType;
  file.uploadedBy = req.user!.fullName;
  file.uploadedAt = new Date().toISOString();
  file.status = "Pending Approval"; // Reset approval flow for check!
  file.versionHistory.push(newVersion);

  writeLog(db, req.user!.id, req.user!.username, req.user!.role, req.user!.department, "FILE_VERSION_UPGRADE", `Uploaded version ${nextVersion} for file ${file.fileName}. Status reset to Pending.`);
  saveDb(db);

  return res.json({ file });
});

// PUT: Rename File
app.put("/api/files/:id/rename", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { newName } = req.body;
  if (!newName) {
    return res.status(400).json({ error: "New file name is required." });
  }

  const db = loadDb();
  const file = db.files.find(f => f.id === id);
  if (!file) {
    return res.status(404).json({ error: "Document not found." });
  }

  // Supervisors and admins permission checkpoint
  const userRole = req.user?.role;
  if (userRole === "Encoder") {
    return res.status(403).json({ error: "Access Denied. Encoders do not have permission to rename files." });
  }
  if (userRole === "TDP_Supervisor" && file.department !== "TDP") {
    return res.status(403).json({ error: "Access Denied. You are restricted to TDP department files." });
  }
  if (userRole === "Visa_Supervisor" && file.department !== "Visa") {
    return res.status(403).json({ error: "Access Denied. You are restricted to Visa department files." });
  }

  const oldName = file.fileName;
  file.fileName = newName;

  writeLog(db, req.user!.id, req.user!.username, req.user!.role, req.user!.department, "FILE_RENAME", `Renamed document "${oldName}" to "${newName}".`);
  saveDb(db);

  return res.json({ file });
});

// PUT: Review File (Approve/Reject)
app.put("/api/files/:id/review", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Approved or Rejected
  if (!status || (status !== "Approved" && status !== "Rejected")) {
    return res.status(400).json({ error: "Review verdict must be either 'Approved' or 'Rejected'." });
  }

  const db = loadDb();
  const file = db.files.find(f => f.id === id);
  if (!file) {
    return res.status(404).json({ error: "Target document not found." });
  }

  // Authorization checkpoints
  const userRole = req.user?.role;
  if (userRole === "Encoder") {
    return res.status(403).json({ error: "Encoders are forbidden from performing file approvals." });
  }
  if (userRole === "TDP_Supervisor" && file.department !== "TDP") {
    return res.status(403).json({ error: "TDP Supervisor restricted to TDP domain." });
  }
  if (userRole === "Visa_Supervisor" && file.department !== "Visa") {
    return res.status(403).json({ error: "Visa Supervisor restricted to Visa domain." });
  }

  file.status = status as FileStatus;
  file.reviewedBy = req.user!.fullName;
  file.reviewedAt = new Date().toISOString();

  writeLog(db, req.user!.id, req.user!.username, req.user!.role, req.user!.department, `FILE_VERDICT_${status.toUpperCase()}`, `File "${file.fileName}" for client ${file.clientName} was ${status} by ${req.user!.fullName}.`);
  saveDb(db);

  return res.json({ file });
});

// DELETE: File (Admin only)
app.delete("/api/files/:id", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Deletion restricted. Only Administrators can delete registered records." });
  }

  const { id } = req.params;
  const db = loadDb();
  const index = db.files.findIndex(f => f.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Document not found." });
  }

  const file = db.files[index];

  // Adjust parent Box sizing counters
  const box = db.boxes.find(b => b.boxNumber === file.boxNumber);
  if (box) {
    box.fileCount = Math.max(0, box.fileCount - 1);
    box.totalSize = Math.max(0, box.totalSize - file.fileSize);
  }

  db.files.splice(index, 1);
  writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "FILE_DELETION", `Deleted document "${file.fileName}" belonging to client ${file.clientName}.`);
  saveDb(db);

  return res.json({ success: true, message: "File was successfully purged from the file repository." });
});

// GET: Dashboard Stats
app.get("/api/dashboard/stats", authMiddleware, (req, res) => {
  const db = loadDb();
  const userRole = req.user?.role;
  const userDept = req.user?.department;

  const totalUsers = db.users.length;
  const totalDepartments = 2; // TDP and Visa
  
  // Scoped file lists based on permissions
  let files = db.files;
  let folders = db.folders;
  let boxes = db.boxes;

  if (userRole === "TDP_Supervisor") {
    files = files.filter(f => f.department === "TDP");
    folders = folders.filter(f => f.department === "TDP");
    boxes = boxes.filter(b => b.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    files = files.filter(f => f.department === "Visa");
    folders = folders.filter(f => f.department === "Visa");
    boxes = boxes.filter(b => b.department === "Visa");
  } else if (userRole === "Encoder") {
    if (userDept === "TDP") {
      files = files.filter(f => f.department === "TDP");
      folders = folders.filter(f => f.department === "TDP");
      boxes = boxes.filter(b => b.department === "TDP");
    } else if (userDept === "Visa") {
      files = files.filter(f => f.department === "Visa");
      folders = folders.filter(f => f.department === "Visa");
      boxes = boxes.filter(b => b.department === "Visa");
    }
  }

  const totalFiles = files.length;
  const activeFileBoxes = boxes.filter(b => b.status === "active").length;
  
  const totalStorageUsed = files.reduce((acc, current) => acc + current.fileSize, 0);
  const pendingApprovals = files.filter(f => f.status === "Pending Approval").length;
  const approvedFiles = files.filter(f => f.status === "Approved").length;
  const rejectedFiles = files.filter(f => f.status === "Rejected").length;

  let tdpBoxCount = db.boxes.filter(b => b.department === "TDP").length;
  let visaBoxCount = db.boxes.filter(b => b.department === "Visa").length;
  
  let tdpFolderCount = db.folders.filter(f => f.department === "TDP").length;
  let visaFolderCount = db.folders.filter(f => f.department === "Visa").length;

  if (userRole === "TDP_Supervisor" || (userRole === "Encoder" && userDept === "TDP")) {
    visaBoxCount = 0;
    visaFolderCount = 0;
  } else if (userRole === "Visa_Supervisor" || (userRole === "Encoder" && userDept === "Visa")) {
    tdpBoxCount = 0;
    tdpFolderCount = 0;
  }

  // Calculate encoder metric performance for supervisors
  let encodersList = db.users.filter(u => u.role === "Encoder");
  if (userRole === "TDP_Supervisor") {
    encodersList = encodersList.filter(u => u.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    encodersList = encodersList.filter(u => u.department === "Visa");
  } else if (userRole === "Encoder") {
    if (userDept === "TDP") {
      encodersList = encodersList.filter(u => u.department === "TDP");
    } else if (userDept === "Visa") {
      encodersList = encodersList.filter(u => u.department === "Visa");
    }
  }

  const encoderPerformance = encodersList.map(encoder => {
    const encUploads = db.files.filter(f => f.uploadedBy === encoder.fullName);
    return {
      encoderName: encoder.fullName,
      uploadsCount: encUploads.length,
      approvedCount: encUploads.filter(f => f.status === "Approved").length,
      pendingCount: encUploads.filter(f => f.status === "Pending Approval").length
    };
  });

  // Scoped audit trails
  let filteredLogs = db.logs;
  if (userRole === "TDP_Supervisor") {
    filteredLogs = filteredLogs.filter(l => l.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    filteredLogs = filteredLogs.filter(l => l.department === "Visa");
  } else if (userRole === "Encoder") {
    filteredLogs = filteredLogs.filter(l => l.userId === req.user?.id);
  }

  const recentLogs = filteredLogs.slice(0, 15);

  const stats: DashboardStats = {
    totalUsers,
    totalDepartments,
    totalFiles,
    activeFileBoxes,
    totalStorageUsed,
    pendingApprovals,
    approvedFiles,
    rejectedFiles,
    tdpBoxCount,
    visaBoxCount,
    tdpFolderCount,
    visaFolderCount,
    encoderPerformance,
    recentLogs
  };

  return res.json({ stats });
});

// GET: Activity Logs Audit Trail
app.get("/api/logs", authMiddleware, (req, res) => {
  const db = loadDb();
  const userRole = req.user?.role;
  const userDept = req.user?.department;

  let logs = db.logs;
  if (userRole === "TDP_Supervisor") {
    logs = logs.filter(l => l.department === "TDP");
  } else if (userRole === "Visa_Supervisor") {
    logs = logs.filter(l => l.department === "Visa");
  } else if (userRole === "Encoder") {
    logs = logs.filter(l => l.userId === req.user?.id);
  }

  return res.json({ logs });
});

// GET: System Capacity Configs (Admin only)
app.get("/api/config", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }
  const db = loadDb();
  return res.json({ config: db.config });
});

// POST: Modify System Configs (Admin only)
app.post("/api/config", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }

  const { boxLimitFolders, boxLimitFiles, boxLimitSize } = req.body;
  if (!boxLimitFolders || !boxLimitFiles || !boxLimitSize) {
    return res.status(400).json({ error: "Value inputs cannot be empty." });
  }

  const db = loadDb();
  db.config = {
    boxLimitFolders: Number(boxLimitFolders),
    boxLimitFiles: Number(boxLimitFiles),
    boxLimitSize: Number(boxLimitSize)
  };

  writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "CONFIG_MODIFICATION", `Admin updated system thresholds. Folder limit: ${boxLimitFolders}, File limit: ${boxLimitFiles}, Size: ${boxLimitSize} bytes`);
  saveDb(db);

  return res.json({ config: db.config });
});

// GET: Backup snapshots list (Admin only)
app.get("/api/backups", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }
  const db = loadDb();
  const headers = db.backups.map(b => ({
    id: b.id,
    backupName: b.backupName,
    createdAt: b.createdAt,
    description: b.description
  }));
  return res.json({ backups: headers });
});

// POST: Trigger Backup snapshot (Admin only)
app.post("/api/backups", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }

  const { backupName, description } = req.body;
  if (!backupName) {
    return res.status(400).json({ error: "Backup name is required." });
  }

  const db = loadDb();
  
  // Serializing current DB data minus the backup logs themselves to avoid recursive bloat
  const snapshotData = {
    users: db.users,
    userPasswords: db.userPasswords,
    boxes: db.boxes,
    folders: db.folders,
    files: db.files,
    logs: db.logs,
    config: db.config
  };

  const backupId = `bk-${Math.random().toString(36).substr(2, 9)}`;
  const newBackup = {
    id: backupId,
    backupName,
    createdAt: new Date().toISOString(),
    description: description || "Manual system backup snapshot",
    data: JSON.stringify(snapshotData)
  };

  db.backups.push(newBackup);
  writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "BACKUP_CREATION", `Created system backup snapshot: ${backupName}`);
  saveDb(db);

  return res.status(201).json({ backup: { id: backupId, backupName, createdAt: newBackup.createdAt, description: newBackup.description } });
});

// POST: Restore system Snapshot (Admin only)
app.post("/api/backups/:id/restore", authMiddleware, (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }

  const { id } = req.params;
  const db = loadDb();
  const backup = db.backups.find(b => b.id === id);
  if (!backup) {
    return res.status(404).json({ error: "Backup snapshot was not found." });
  }

  try {
    const restoredData = JSON.parse(backup.data) as DatabaseSchema;
    
    // Maintain Admin's current backups records intact
    const currentBackups = db.backups;

    // Apply snapshot restore
    db.users = restoredData.users || db.users;
    db.userPasswords = restoredData.userPasswords || db.userPasswords;
    db.boxes = restoredData.boxes || db.boxes;
    db.folders = restoredData.folders || db.folders;
    db.files = restoredData.files || db.files;
    db.logs = restoredData.logs || db.logs;
    db.config = restoredData.config || db.config;
    db.backups = currentBackups; // Preserve backups array

    writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "BACKUP_RESTORE", `Restored database system using snapshot: ${backup.backupName}`);
    saveDb(db);

    return res.json({ success: true, message: "System state has been restored to the selected checkpoint." });
  } catch (err) {
    return res.status(500).json({ error: `System restore failed. The snapshot content might be corrupted.` });
  }
});

// =============================================================
// SUPABASE OPERATIONAL CONTROLLER ENDPOINTS (Admin only)
// =============================================================

// GET: Supabase integration credentials and connection state
app.get("/api/supabase/status", authMiddleware, async (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }
  const config = getSupabaseConfig();
  const statusInfo = await testSupabaseConnection();
  return res.json({
    config: {
      url: config.url,
      isConfigured: config.isConfigured
    },
    connection: statusInfo
  });
});

// POST: Overwrite local caching database with latest state pulled from Supabase cloud
app.post("/api/supabase/pull", authMiddleware, async (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }
  
  try {
    const cloudDb = await loadDbFromSupabase();
    if (!cloudDb) {
      return res.status(404).json({ error: "No system state found in your Supabase connection. Verify table schema exists or perform an initial Push first." });
    }
    
    fs.writeFileSync(DB_FILE, JSON.stringify(cloudDb, null, 2), "utf-8");
    
    const db = loadDb();
    writeLog(db, req.user.id, req.user.username, req.user.role, req.user.department, "SUPABASE_PULL", "Pulled entire system database from Supabase cloud registry.");
    saveDb(db);
    
    return res.json({ success: true, message: "Successfully synchronized local FMS file system cache from active Supabase cloud schema." });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed pulling dataset state: ${err.message || err}` });
  }
});

// POST: Backup current FMS database directly into Supabase cloud table as active sync state
app.post("/api/supabase/push", authMiddleware, async (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Access Denied." });
  }
  
  try {
    const localDb = loadDb();
    const success = await saveDbToSupabase(localDb);
    if (!success) {
      return res.status(500).json({ error: "Pushed sync to Supabase was declined. Verify postgres permissions and table columns." });
    }
    
    writeLog(localDb, req.user.id, req.user.username, req.user.role, req.user.department, "SUPABASE_PUSH", "Pushed local database to online Supabase replication database.");
    saveDb(localDb);
    
    return res.json({ success: true, message: "Local system database successfully replicated and secured into Supabase Cloud state row." });
  } catch (err: any) {
    return res.status(500).json({ error: `Replication push exception: ${err.message || err}` });
  }
});

// Global error handling middleware to guarantee API routes always return JSON rather than HTML on unhandled exceptions
app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[REST API Uncaught Exception]:", err);
  res.status(500).json({
    error: err.message || "An unexpected internal database or server error occurred has been registered.",
    details: err.toString()
  });
});

// -------------------------------------------------------------
// SERVING THE WEB RECOVERY SPA APP
// -------------------------------------------------------------

async function initializeServer() {
  // Attempt to pre-load from Supabase database to synchronize local cache directory on startup
  try {
    const { isConfigured } = getSupabaseConfig();
    if (isConfigured) {
      console.log("[Supabase Sync] Synchronizing cloud database with local cache directory on boot...");
      const cloudDb = await loadDbFromSupabase();
      if (cloudDb) {
        fs.writeFileSync(DB_FILE, JSON.stringify(cloudDb, null, 2), "utf-8");
        console.log("[Supabase Sync] Successfully restored and seeded local cache from Supabase.");
      } else {
        console.log("[Supabase Sync] No existing cloud dataset found in Supabase workspace. Seeding empty cloud tables with local database replica...");
        const localDb = loadDb();
        const pushSuccess = await saveDbToSupabase(localDb);
        if (pushSuccess) {
          console.log("[Supabase Sync] Auto-seed success! Synced all local files, users, folders, boxes, and logs to Supabase.");
        } else {
          console.warn("[Supabase Sync] Auto-seed background push was declined. Please verify table permissions/RSL policies.");
        }
      }
    } else {
      console.log("[Supabase Sync] Cloud database connection is unconfigured. Operating locally.");
    }
  } catch (err) {
    console.error("[Supabase Sync] Error during startup database pull:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ICS Ethiopia FMS] Server is successfully running at http://localhost:${PORT}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[ICS Ethiopia FMS] Port ${PORT} is already in use. Stop the running instance or change PORT before restarting.`);
    } else {
      console.error("[ICS Ethiopia FMS] Server error during startup:", err);
    }
    process.exit(1);
  });
}

initializeServer().catch(err => {
  console.error("Critical error starting ICS FMS Server:", err);
});
