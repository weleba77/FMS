/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Folder, 
  FileText, 
  Layers, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Users, 
  ArrowUpRight,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { DashboardStats, User } from '../types';

interface DashboardOverviewProps {
  stats: DashboardStats;
  currentUser: User;
  onNavigate: (tab: string) => void;
}

export function DashboardOverview({ stats, currentUser, onNavigate }: DashboardOverviewProps) {
  // Simple format size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6" id="dashboard-overview-container">
      {/* Visual greeting card banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-6 rounded-2xl border border-blue-500/20 shadow-lg relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full border border-white/20 uppercase tracking-widest font-mono font-semibold">
              {currentUser.role.replace('_', ' ')} Portal
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white mt-2">
              Melkam Ken, {currentUser.fullName}!
            </h2>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl bg-blue-900/10 p-1.5 rounded">
              Welcome to the ICS Ethiopia File Management System. Access is secure and isolated at the 
              <strong> {currentUser.department === 'All' ? 'Institutional' : `${currentUser.department} Departmental`}</strong> clearance level.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => onNavigate('folders')}
              className="bg-white hover:bg-blue-50 text-blue-700 text-xs px-4 py-2.5 rounded-xl font-bold shadow-md transition cursor-pointer"
            >
              Browse Client Folders
            </button>
            {currentUser.role === 'Encoder' && (
              <button 
                onClick={() => onNavigate('folders')} // We trigger direct creation modal there
                className="bg-blue-900 hover:bg-blue-950 text-white text-xs px-4 py-2.5 rounded-xl font-bold shadow-md transition cursor-pointer"
              >
                + Register Client Folder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Bento Grid cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Files Stat */}
        <div className="bg-white border border-blue-100 p-5 rounded-2xl shadow-sm flex items-start justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Total Documents</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{stats.totalFiles}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{stats.approvedFiles} Approved</span>
              <span>•</span>
              <span>{stats.pendingApprovals} Pending</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Active File Boxes Stat */}
        <div className="bg-white border border-blue-100 p-5 rounded-2xl shadow-sm flex items-start justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Active Boxes</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{stats.activeFileBoxes}</p>
            <p className="text-xs text-slate-500">
              {currentUser.department === 'TDP' ? (
                <span>Assigned TDP Boxes: <span className="font-semibold text-blue-600">{stats.tdpBoxCount}</span></span>
              ) : currentUser.department === 'Visa' ? (
                <span>Assigned Visa Boxes: <span className="font-semibold text-blue-600">{stats.visaBoxCount}</span></span>
              ) : (
                <span>Total assigned: <span className="font-semibold text-blue-600">{stats.tdpBoxCount + stats.visaBoxCount}</span> across teams</span>
              )}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Layers className="w-6 h-6 text-blue-650" />
          </div>
        </div>

        {/* Client Folders Tracker */}
        <div className="bg-white border border-blue-100 p-5 rounded-2xl shadow-sm flex items-start justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Client Folders</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {currentUser.department === 'TDP' ? stats.tdpFolderCount : 
               currentUser.department === 'Visa' ? stats.visaFolderCount : 
               (stats.tdpFolderCount + stats.visaFolderCount)}
            </p>
            <p className="text-xs text-slate-500">
              {currentUser.department === 'TDP' ? `TDP: ${stats.tdpFolderCount} folders` :
               currentUser.department === 'Visa' ? `Visa: ${stats.visaFolderCount} folders` :
               `TDP: ${stats.tdpFolderCount} folders • Visa: ${stats.visaFolderCount} folders`}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Folder className="w-6 h-6 text-blue-700" />
          </div>
        </div>

        {/* Storage Size utilization */}
        <div className="bg-white border border-blue-100 p-5 rounded-2xl shadow-sm flex items-start justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Capacity Utilized</span>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {formatBytes(stats.totalStorageUsed)}
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 min-w-[120px]">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (stats.totalStorageUsed / (50 * 1024 * 1024)) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <HardDrive className="w-6 h-6 text-blue-800" />
          </div>
        </div>
      </div>

      {/* Visual grids for actions / status checks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left widget: Pending reviews & encoder indicators */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Encoder Performance (Supervisors and Admin See this) */}
          {currentUser.role !== 'Encoder' && (
            <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-800">Encoder Upload Performance Metrics</h3>
                  <p className="text-xs text-slate-500">Operational tracking statistics for physical file digitizers</p>
                </div>
                <Users className="w-5 h-5 text-slate-500" />
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-blue-100 text-slate-500 font-bold font-mono text-[10px] uppercase tracking-wider">
                      <th className="pb-2.5">Encoder Personnel</th>
                      <th className="pb-2.5 text-center">Total Uploads</th>
                      <th className="pb-2.5 text-center text-blue-700">Approved</th>
                      <th className="pb-2.5 text-center text-amber-600">Pending Validation</th>
                      <th className="pb-2.5 text-right">FMS Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.encoderPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 leading-normal">
                          No encoder registration metrics synchronized yet.
                        </td>
                      </tr>
                    ) : (
                      stats.encoderPerformance.map((item, idx) => (
                        <tr key={idx} className="text-slate-700 hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-slate-800">{item.encoderName}</td>
                          <td className="py-3 text-center font-bold">{item.uploadsCount}</td>
                          <td className="py-3 text-center text-blue-700 font-mono font-bold">{item.approvedCount}</td>
                          <td className="py-3 text-center text-amber-600 font-mono font-bold">{item.pendingCount}</td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-250">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending validations list or Quick guidelines workflow details */}
          <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">ICS Departmental Document Integrity Policy</h3>
                <p className="text-xs text-slate-500">Mandated document types for comprehensive clearance audits</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-blue-605" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { type: 'Passport', icon: '🛂', desc: 'Required scan page', color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
                { type: 'Visa Document', icon: '📝', desc: 'Host nation papers', color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
                { type: 'Tickets', icon: '✈️', desc: 'Travel bookings data', color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
                { type: 'Contracts', icon: '🤝', desc: 'Legally binding deal', color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
                { type: 'Other Files', icon: '📂', desc: 'Misc supporting slips', color: 'border-blue-200 bg-blue-50/50 text-blue-900' }
              ].map((item, index) => (
                <div key={index} className={`p-3 rounded-xl border ${item.color} text-center space-y-1`}>
                  <div className="text-xl">{item.icon}</div>
                  <h4 className="text-xs font-bold">{item.type}</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right widget: Recent Activity Logs Panel */}
        <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 border-b border-blue-50 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-800">System Trail Audit Logs</h3>
              <p className="text-xs text-slate-500">Verifiable operator history log</p>
            </div>
            <Activity className="w-5 h-5 text-blue-605 shrink-0" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
            {stats.recentLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs text-slate-400">
                No recent transactions or activity logged in current scope.
              </div>
            ) : (
              stats.recentLogs.map((log) => {
                // Color formatting logic based on action tags
                let badgeColor = 'bg-slate-50 border-slate-200 text-slate-600';
                if (log.action.includes('UPLOAD')) {
                  badgeColor = 'bg-blue-55 text-blue-700 border-blue-200';
                } else if (log.action.includes('APPROVED') || log.action.includes('SUCCESS') || log.action.includes('INIT')) {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-250';
                } else if (log.action.includes('REJECTED') || log.action.includes('DELETION')) {
                  badgeColor = 'bg-red-50 text-red-700 border-red-200';
                } else if (log.action.includes('AUTO_GEN') || log.action.includes('FULL')) {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-250';
                }

                return (
                  <div key={log.id} className="text-xs bg-slate-50/50 p-2.5 rounded-xl border border-blue-50 space-y-1.5 hover:border-blue-100 transition">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${badgeColor}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-normal">{log.details}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Operator: <strong>@{log.username}</strong></span>
                      <span className="italic font-semibold text-blue-700 font-mono">{log.department} DEPT</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
