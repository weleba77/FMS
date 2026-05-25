/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet,
  Clock,
  Filter
} from 'lucide-react';
import { ActivityLog, User } from '../types';

interface AuditTrailsProps {
  logs: ActivityLog[];
  currentUser: User;
}

export function AuditTrails({ logs, currentUser }: AuditTrailsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  
  // Simulated Export Loader
  const [downloading, setDownloading] = useState(false);
  const [downSuccess, setDownSuccess] = useState<string | null>(null);

  // Filters setup based on user search query criteria
  const filteredLogs = logs.filter(log => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      log.username.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.role.toLowerCase().includes(query);

    if (actionFilter === 'All') return matchesSearch;
    return log.action.includes(actionFilter) && matchesSearch;
  });

  // Extract unique action headers to construct dropdown filters
  const uniqueActions = ['All', ...Array.from(new Set(logs.map(l => {
    // Group common action structures: USER_, FILE_, BOX_
    if (l.action.startsWith('USER_')) return 'USER_';
    if (l.action.startsWith('FILE_')) return 'FILE_';
    if (l.action.startsWith('BOX_')) return 'BOX_';
    return l.action;
  })))].slice(0, 8);

  // Export report generator simulated
  const handleExportSim = (format: 'PDF' | 'Excel') => {
    setDownloading(true);
    setDownSuccess(null);
    setTimeout(() => {
      setDownloading(false);
      setDownSuccess(`Export success! Downloaded ICS Ethiopia System Audit Report as "${currentUser.department}_AuditTrail_${Date.now().toString().slice(-4)}.${format === 'PDF' ? 'pdf' : 'xlsx'}" to your local downloads.`);
      setTimeout(() => setDownSuccess(null), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="audit-trails-container">
      
      {/* Upper info card */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white tracking-tight">System Trial Audit Logs Directory</h2>
          <p className="text-xs text-slate-400">Verifiable operator history log</p>
        </div>

        {/* Simulate reporting spreadsheets trigger */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handleExportSim('Excel')}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export Audit to Excel
          </button>
          <button
            onClick={() => handleExportSim('PDF')}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-amber-300" />
            Export reports PDF
          </button>
        </div>
      </div>

      {downSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl flex gap-2.5 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{downSuccess}</span>
        </div>
      )}

      {downloading && (
        <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-center gap-2.5 text-xs text-amber-400 font-medium">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
          <span>Drafting cryptographic integrity checksum signatures and exporting report vectors...</span>
        </div>
      )}

      {/* Query Filters layout */}
      <div className="bg-slate-800/25 border border-slate-750/30 p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search action logs by username, action types, detail specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-705 pl-9 pr-3 py-2 text-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Action Type:
          </span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {uniqueActions.map((act, id) => (
              <option key={id} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comprehensive Paginated Data Table */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 text-center w-10">Ref</th>
                <th className="pb-3">Action Tag</th>
                <th className="pb-3">Details Descriptor</th>
                <th className="pb-3">Encoder/Supervisor</th>
                <th className="pb-3">Dept</th>
                <th className="pb-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/35">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 leading-normal">
                    No matching trails recorded in current directory scope.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let badgeColors = 'bg-slate-700/30 border-slate-605/40 text-slate-300';
                  if (log.action.includes('UPLOAD') || log.action.includes('CREATION')) {
                    badgeColors = 'bg-blue-500/10 border-blue-500/20 text-blue-300';
                  } else if (log.action.includes('APPROVED') || log.action.includes('SUCCESS') || log.action.includes('INIT')) {
                    badgeColors = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
                  } else if (log.action.includes('REJECTED') || log.action.includes('DELETION')) {
                    badgeColors = 'bg-red-500/10 border-red-500/20 text-red-300';
                  } else if (log.action.includes('AUTO_GEN') || log.action.includes('FULL')) {
                    badgeColors = 'bg-amber-500/10 border-amber-500/20 text-amber-300';
                  }

                  return (
                    <tr key={log.id} className="text-slate-300 hover:bg-slate-700/10 transition">
                      <td className="py-3 text-center text-slate-500 font-mono text-[10px]">{log.id.slice(-4).toUpperCase()}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono leading-none ${badgeColors}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-200 max-w-xs sm:max-w-md break-words">{log.details}</td>
                      <td className="py-3 font-mono">@{log.username}</td>
                      <td className="py-3 font-semibold text-slate-400">{log.department}</td>
                      <td className="py-3 text-right text-slate-450 font-mono text-[10px]">
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(log.timestamp).toLocaleString([], { hour12: false })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
