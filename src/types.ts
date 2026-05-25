/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'TDP_Supervisor' | 'Visa_Supervisor' | 'Encoder';
export type Department = 'TDP' | 'Visa' | 'All';
export type FileStatus = 'Pending Approval' | 'Approved' | 'Rejected';
export type FileDocType = 'passport' | 'visa' | 'ticket' | 'contract' | 'other';
export type BoxStatus = 'active' | 'full';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  department: Department;
  active: boolean;
  createdAt: string;
}

export interface FileBox {
  id: string;
  boxNumber: string;
  department: 'TDP' | 'Visa';
  status: BoxStatus;
  folderCount: number;
  fileCount: number;
  totalSize: number; // in bytes
  createdAt: string;
}

export interface ClientFolder {
  id: string;
  clientName: string;
  passportNumber: string;
  fileNumber: string;
  department: 'TDP' | 'Visa';
  boxNumber: string; // The box number (e.g., TDP-BOX-001) that contains this folder
  boxId: string;     // The foreign key ID of the box
  createdAt: string;
  status: 'active' | 'archived';
}

export interface FileVersion {
  version: number;
  fileName: string;
  fileSize: number;
  content: string; // base64 representation of file for preview
  uploadedBy: string;
  uploadedAt: string;
}

export interface UploadedFile {
  id: string;
  folderId: string;
  folderName: string; // denormalized for search
  boxNumber: string;  // denormalized box number
  clientName: string; // denormalized client name
  department: 'TDP' | 'Visa';
  fileName: string;
  fileType: FileDocType;
  mimeType: string;
  fileSize: number;
  content: string; // base64 representation of the current active version preview/download
  uploadedBy: string;
  uploadedAt: string;
  status: FileStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  version: number;
  versionHistory: FileVersion[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  department: Department;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemConfig {
  boxLimitFolders: number;
  boxLimitFiles: number;
  boxLimitSize: number; // in bytes
}

export interface SystemBackup {
  id: string;
  backupName: string;
  createdAt: string;
  description: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalDepartments: number;
  totalFiles: number;
  activeFileBoxes: number;
  totalStorageUsed: number; // in bytes
  pendingApprovals: number;
  approvedFiles: number;
  rejectedFiles: number;
  tdpBoxCount: number;
  visaBoxCount: number;
  tdpFolderCount: number;
  visaFolderCount: number;
  encoderPerformance: Array<{
    encoderName: string;
    uploadsCount: number;
    approvedCount: number;
    pendingCount: number;
  }>;
  recentLogs: ActivityLog[];
}
