/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Download, 
  Server,
  Cloud,
  Check
} from 'lucide-react';
import { SystemBackup, User } from '../types';

interface BackupRegistryProps {
  currentUser: User;
  token: string;
}

export function BackupRegistry({ currentUser, token }: BackupRegistryProps) {
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Backup State
  const [backupName, setBackupName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Restoring state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Supabase specific states
  const [activeTab, setActiveTab] = useState<'backups' | 'supabase'>('backups');
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchSupabaseStatus();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch backup checkpoints.');
      }
      setBackups(data.backups);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupabaseStatus = async () => {
    setCheckingSupabase(true);
    try {
      const res = await fetch('/api/supabase/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch Supabase status:", err);
    } finally {
      setCheckingSupabase(false);
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupName.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ backupName, description })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save system checkpoint.');
      }

      setSuccessMsg(`System checkpoint snapshot "${backupName}" secured successfully.`);
      setBackupName('');
      setDescription('');
      fetchBackups();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreCheckpoint = async (backupId: string, backupName: string) => {
    const confirmation = window.confirm(`CRITICAL WARNING: Are you absolutely sure you wish to restore the entire FMS database to snapshot "${backupName}"? This will overwrite all recent users, client folders, and documents created since then.`);
    if (!confirmation) return;

    setRestoringId(backupId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/backups/${backupId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Restore checkpoint failed.');
      }

      setSuccessMsg(`System state restored successfully! Reloading session properties...`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
      setRestoringId(null);
    }
  };

  const handleSupabasePull = async () => {
    const confirmRestore = window.confirm("WARNING: Pulling from Supabase Cloud will OVERWRITE all local folders, files, and users with the cloud state. Do you wish to continue?");
    if (!confirmRestore) return;

    setSyncingSupabase(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/supabase/pull', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to pull dataset from Supabase.');
      }
      setSuccessMsg("Successfully pulled system state from Supabase! Reloading workspace parameters...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handleSupabasePush = async () => {
    const confirmBackup = window.confirm("You are about to push your local database schema state directly up to Supabase Cloud, overwriting any current cloud state. Do you wish to continue?");
    if (!confirmBackup) return;

    setSyncingSupabase(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/supabase/push', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to push dataset to Supabase.');
      }
      setSuccessMsg("Local FMS state successfully pushed and synchronized to Supabase Cloud database!");
      fetchSupabaseStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSyncingSupabase(false);
    }
  };

  return (
    <div className="space-y-6" id="backup-registry-root">
      
      <div className="space-y-1.5 border-b border-blue-100 pb-5">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Institutional Database & Snapshot Manager</h2>
        <p className="text-xs text-slate-500">Manage complete state checkpoints locally or replicate information down into your Supabase cloud backend.</p>
      </div>

      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'backups' 
              ? 'border-blue-600 text-blue-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Database className="w-4 h-4" />
          FMS Snapshot Backups
        </button>
        <button
          onClick={() => setActiveTab('supabase')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'supabase' 
              ? 'border-blue-600 text-blue-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Cloud className="w-4 h-4" />
          Supabase Replication Engine
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-2.5 text-xs shadow-sm shadow-emerald-50/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === 'backups' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Left Grid: Create snapshot checkpoint form */}
          <div className="space-y-4">
            <div className="bg-white border border-blue-50 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-4.5 h-4.5 text-blue-600" />
                Capture Checkpoint
              </h3>

              <form onSubmit={handleCreateBackup} className="space-y-4" id="capture-backup-form">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 font-mono">Checkpoint Frame Label</label>
                  <input
                    id="backup-name-input"
                    type="text"
                    required
                    placeholder="e.g. Prior to June Auditing"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 font-mono">Context Explanation Note</label>
                  <textarea
                    id="backup-desc-input"
                    placeholder="Describe changes or auditing environment notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                  />
                </div>

                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-[11px] text-blue-700 leading-normal flex items-start gap-2">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Snapshots serialize the full database states (users, folders, logs) securely to allow 1-click historical rolls.</span>
                </div>

                <button
                  id="submit-backup-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Packing byte frames...' : 'Commit System Snapshot'}
                </button>
              </form>
            </div>
          </div>

          {/* Right column: List available checkpoint snapshot files with dynamic details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-blue-50 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">Secured Checkpoint Snapshots ({backups.length})</h3>

              {loading ? (
                <p className="text-xs text-slate-500 text-center py-6">Checking FMS secure file system...</p>
              ) : backups.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center">
                  <Database className="w-10 h-10 mb-2.5 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-400">No previous checkpoint snapshots archived yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Capture your first state image using the inputs on the left.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {backups.map((bk) => (
                    <div 
                      key={bk.id} 
                      className="bg-slate-50/55 border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row gap-3 sm:items-center justify-between hover:border-blue-100 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h4 className="text-xs font-bold text-slate-800 tracking-tight">{bk.backupName}</h4>
                        </div>
                        
                        {bk.description && (
                          <p className="text-slate-500 text-xs leading-normal max-w-sm sm:max-w-md break-words">{bk.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>ID: {bk.id.toUpperCase()}</span>
                          <span>•</span>
                          <span>Committed: {new Date(bk.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex gap-2">
                        <button
                          onClick={() => handleRestoreCheckpoint(bk.id, bk.backupName)}
                          disabled={!!restoringId}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          id={`restore-checkpoint-${bk.id}`}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${restoringId === bk.id ? 'animate-spin' : ''}`} />
                          {restoringId === bk.id ? 'Applying files...' : 'Restore State'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {checkingSupabase ? (
            <div className="text-center py-12 text-slate-500">
              <RotateCcw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-600" />
              <p className="text-xs font-semibold">Inspecting database connections...</p>
            </div>
          ) : !supabaseStatus?.config.isConfigured ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 max-w-4xl" id="supabase-unconfigured">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
                  <Cloud className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-800">Supabase Cloud Connection: Not Configured</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Integrate the ICS Ethiopia File Management System with your online Supabase database. This creates a secure, resilient, cloud replication layer that stores operational state (client folders, file metadata, boxes, audit trails) in real-time.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-4">
                <h4 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider font-mono">Configuration Process Guidelines:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white border border-slate-100 p-4 rounded-xl space-y-2 shadow-sm">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[9px] font-mono">STEP 1</span>
                    <p className="font-semibold text-slate-700">Add credentials to Secrets</p>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Click on the <strong>Secrets Panel</strong> in AI Studio and specify your Supabase project parameters:
                    </p>
                    <pre className="bg-slate-50 p-2.5 rounded-lg text-[10px] font-mono border border-slate-150 text-slate-600 block whitespace-pre overflow-x-auto">
{`SUPABASE_URL="https://your-proj.supabase.co"
SUPABASE_KEY="your-anon-or-service-role-key"`}
                    </pre>
                  </div>

                  <div className="bg-white border border-slate-100 p-4 rounded-xl space-y-2 shadow-sm">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[9px] font-mono">STEP 2</span>
                    <p className="font-semibold text-slate-700">Provision Table Schema</p>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Copy the contents of the generated project file <code className="bg-slate-150 px-1 py-0.5 rounded font-mono text-[11px]">supabase_setup.sql</code> and execute them in your <strong>Supabase SQL Editor</strong> to construct all necessary FMS tables:
                    </p>
                    <pre className="bg-slate-50 p-2.5 rounded-lg text-[10px] font-mono border border-slate-150 text-slate-600 block max-h-[140px] overflow-y-auto">
{`CREATE TABLE fms_store (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone 
    DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: See the 'supabase_setup.sql' file for
-- the complete 8 relational tables (fms_users, 
-- fms_boxes, fms_folders, fms_files, etc.)`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : supabaseStatus.connection.status === "table_missing" ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-6 space-y-4 max-w-4xl" id="supabase-table-missing">
              <div className="flex items-start gap-3.5">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-800">Connection Succeeded but Table is Absent</h4>
                  <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                    Our servers connected to your Supabase project API successfully, but the required table <strong>fms_store</strong> does not exist in your Supabase schema yet.
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-amber-200/50 space-y-3.5 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Run in your Supabase project dashboard:</p>
                <pre className="bg-slate-50 p-3.5 rounded-lg text-[10px] font-mono border border-slate-150 text-slate-600 block overflow-x-auto">
{`CREATE TABLE fms_store (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);`}
                </pre>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={fetchSupabaseStatus}
                    disabled={checkingSupabase}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin' : ''}`} />
                    Test Connection Audit Again
                  </button>
                </div>
              </div>
            </div>
          ) : supabaseStatus.connection.status === "error" ? (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-6 space-y-4 max-w-4xl" id="supabase-error">
              <div className="flex items-start gap-3.5">
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-800">Supabase Connection Failed</h4>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Authentication or request dispatching to Supabase has failed. See details below.
                  </p>
                  <p className="text-xs font-mono bg-white p-3 rounded-lg border border-red-100 text-red-800 font-semibold max-w-2xl mt-2">
                    {supabaseStatus.connection.message}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={fetchSupabaseStatus}
                  disabled={checkingSupabase}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Connection
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-blue-50 rounded-2xl p-6 space-y-6 max-w-4xl shadow-sm" id="supabase-connected-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-5.5 h-5.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">Supabase Cloud Sync is active</h4>
                      <span className="bg-emerald-100 text-emerald-850 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">REPLICATING</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono tracking-tight break-all">Connected: {supabaseStatus.config.url}</p>
                  </div>
                </div>
                <button
                  onClick={fetchSupabaseStatus}
                  disabled={checkingSupabase}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150 rounded-xl text-xs font-semibold tracking-tight transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${checkingSupabase ? 'animate-spin' : ''}`} />
                  Query Sync Health
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-blue-50/70 p-5 rounded-2xl bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Download className="w-4 h-4 text-blue-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pull Database State</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Replace current local state storage with the golden snapshot stored in your Supabase database. This overwrites all profiles, logs, and files.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-150">
                    <button
                      onClick={handleSupabasePull}
                      disabled={syncingSupabase}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {syncingSupabase ? 'Accessing Cloud Backend...' : 'Pull Cloud Snapshot'}
                    </button>
                  </div>
                </div>

                <div className="border border-blue-50/70 p-5 rounded-2xl bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Server className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Push Database State</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Force fully backup and push the current local file system database state up into the remote Supabase database store.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-150">
                    <button
                      onClick={handleSupabasePush}
                      disabled={syncingSupabase}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Server className="w-4 h-4" />
                      {syncingSupabase ? 'Synching Cloud Catalog...' : 'Push Local to Cloud'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2.5 max-w-3xl">
                <Lock className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-blue-900">Background Replica Pipeline Connected</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Database changes (such as client folder registrations, box assignment changes, auditor approvals, and actions logs) now write dynamically to both your local JSON storage and replicate to your cloud Supabase database in the background!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
