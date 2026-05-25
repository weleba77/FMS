/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FolderPlus, 
  Search, 
  Users, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Filter,
  UserCheck,
  Package,
  X
} from 'lucide-react';
import { ClientFolder, User } from '../types';

interface FolderManagerProps {
  folders: ClientFolder[];
  currentUser: User;
  onRefresh: () => void;
  onSelectFolder: (folder: ClientFolder) => void;
  selectedFolder: ClientFolder | null;
  token: string;
}

export function FolderManager({ folders, currentUser, onRefresh, onSelectFolder, selectedFolder, token }: FolderManagerProps) {
  // Filters & searches
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<'All' | 'TDP' | 'Visa'>('All');
  
  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [department, setDepartment] = useState<'TDP' | 'Visa'>('TDP');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill random mock test values to streamline rapid evaluations
  const handleAutoFill = () => {
    const ethiopianNames = [
      'Almaz Ayana', 'Kenenisa Bekele', 'Haile Gebrselassie', 'Yidnekachew Tessema', 
      'Aster Aweke', 'Mulatu Astatke', 'Solomon Barega', 'Gotytom Gebreslase'
    ];
    const chosenName = ethiopianNames[Math.floor(Math.random() * ethiopianNames.length)];
    const passportRandom = 'EP' + (Math.floor(Math.random() * 8999999) + 1000000);
    const fileNumber = `FN-${department}-2026-${Math.floor(Math.random() * 899) + 100}`;
    
    setClientName(chosenName);
    setPassportNumber(passportRandom);
    setFileNumber(fileNumber);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!clientName || !passportNumber || !fileNumber) {
      setErrorMsg('All client attributes must be completed.');
      setSubmitting(false);
      return;
    }

    try {
      const targetDept = currentUser.role === 'Encoder' ? currentUser.department : department;
      if (targetDept === 'All') {
        setErrorMsg('Please select a specific department (TDP or Visa).');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientName,
          passportNumber,
          fileNumber,
          department: targetDept
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create client folder.');
      }

      setSuccessMsg(`Folder created and assigned automatically inside active box "${data.folder.boxNumber}"!`);
      
      // Reset inputs
      setClientName('');
      setPassportNumber('');
      setFileNumber('');
      onRefresh();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Enforce department restrictions on listings
  const viewableFolders = folders.filter(f => {
    // Role-based filtering
    if (currentUser.role === 'TDP_Supervisor' && f.department !== 'TDP') return false;
    if (currentUser.role === 'Visa_Supervisor' && f.department !== 'Visa') return false;
    if (currentUser.role === 'Encoder' && currentUser.department !== 'All' && f.department !== currentUser.department) return false;

    // Search matches by Name, passport number, file number, or box number
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      f.clientName.toLowerCase().includes(query) ||
      f.passportNumber.toLowerCase().includes(query) ||
      f.fileNumber.toLowerCase().includes(query) ||
      f.boxNumber.toLowerCase().includes(query);

    // Filter by Dept dropdown selector
    if (deptFilter === 'All') return matchesSearch;
    return f.department === deptFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" id="folder-manager-container">
      
      {/* Header operations row */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Departmental Client Folders Directory</h2>
          <p className="text-xs text-slate-400">Search and manage client envelopes, view active box lock statuses</p>
        </div>

        {/* Action Button: Encoders (or Admin) can register dossiers */}
        {currentUser.role !== 'TDP_Supervisor' && currentUser.role !== 'Visa_Supervisor' && (
          <button
            onClick={() => {
              // Pre-select restricted encoder departments if applicable
              if (currentUser.role === 'Encoder' && currentUser.department !== 'All') {
                setDepartment(currentUser.department as 'TDP' | 'Visa');
              }
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer shrink-0"
            id="open-create-folder-btn"
          >
            <FolderPlus className="w-4 h-4" />
            Create Client Folder
          </button>
        )}
      </div>

      {/* Filter and Search Box inputs Row */}
      <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 p-4 rounded-xl flex flex-col md:flex-row gap-3">
        
        {/* Search Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Search by client name, file key, passport # or box number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700/80 pl-9 pr-3 py-2 text-slate-200 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Department isolated filter selection */}
        {currentUser.department === 'All' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter Department:
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="bg-slate-900 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Departments</option>
              <option value="TDP">TDP Department</option>
              <option value="Visa">Visa Department</option>
            </select>
          </div>
        )}
      </div>

      {/* Folders display list directory grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {viewableFolders.length === 0 ? (
          <div className="col-span-full py-12 bg-slate-800/20 border border-slate-700/35 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center">
            <p className="text-sm font-medium">No registered client folders matched the search criteria.</p>
            <p className="text-xs text-slate-500 mt-1">Adjust search filter criteria or register a new client profile.</p>
          </div>
        ) : (
          viewableFolders.map((folder) => {
            const isSelected = selectedFolder?.id === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => onSelectFolder(folder)}
                className={`group bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between cursor-pointer ${isSelected ? 'border-amber-400 bg-slate-800/60 shadow-md ring-1 ring-amber-400/20' : 'border-slate-700/40'}`}
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${folder.department === 'TDP' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/25 text-amber-300'}`}>
                      {folder.department}
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono font-semibold flex items-center gap-1 hover:text-white">
                      <Package className="w-3 h-3 text-slate-400" />
                      {folder.boxNumber}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight pt-1.5 group-hover:text-amber-300 transition">
                    {folder.clientName}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono leading-tight">
                    <div className="bg-slate-900/40 p-1.5 rounded border border-slate-800/80">
                      <span className="text-[9px] text-slate-500 block">PASSPORT NO</span>
                      <span className="text-slate-300 font-semibold">{folder.passportNumber}</span>
                    </div>
                    <div className="bg-slate-900/40 p-1.5 rounded border border-slate-800/80">
                      <span className="text-[9px] text-slate-500 block">FILE INDEX</span>
                      <span className="text-slate-300 font-semibold">{folder.fileNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-700/50 mt-4">
                  <span>Registered: {new Date(folder.createdAt).toLocaleDateString()}</span>
                  <span className="text-amber-400 group-hover:translate-x-1 duration-150 inline-flex items-center gap-1 font-semibold">
                    Open Documents <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Client Folder Modal Container */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="folder-create-modal">
          <div className="bg-slate-850 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-700/60 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Register New Client Folder Directory</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              
              {errorMsg && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-xl flex gap-2.5 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl flex gap-2.5 text-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Quick Preset Data auto fill button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  ⚡ Autofill Ethiopian Tester Data
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Traveler / Client Full Name</label>
                <input
                  id="folder-clientName-input"
                  type="text"
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Passport Number</label>
                  <input
                    id="folder-passport-input"
                    type="text"
                    required
                    placeholder="e.g. EP1234567"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Ministry File Index ID</label>
                  <input
                    id="folder-fileNumber-input"
                    type="text"
                    required
                    placeholder="e.g. FN-TDP-2026-001"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Department selection */}
              {currentUser.department === 'All' ? (
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Assigned Department</label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className={`border rounded-xl p-3 flex items-center gap-2.5 cursor-pointer transition ${department === 'TDP' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-200' : 'border-slate-700 hover:bg-slate-700/30 text-slate-400'}`}>
                      <input 
                        type="radio" 
                        name="deptAssign" 
                        checked={department === 'TDP'} 
                        onChange={() => setDepartment('TDP')} 
                        className="accent-emerald-500"
                      />
                      <div className="text-left text-xs">
                        <span className="font-bold block text-white">TDP Department</span>
                        Traveler Clearance
                      </div>
                    </label>

                    <label className={`border rounded-xl p-3 flex items-center gap-2.5 cursor-pointer transition ${department === 'Visa' ? 'bg-amber-500/10 border-amber-500 text-amber-200' : 'border-slate-700 hover:bg-slate-700/30 text-slate-400'}`}>
                      <input 
                        type="radio" 
                        name="deptAssign" 
                        checked={department === 'Visa'} 
                        onChange={() => setDepartment('Visa')}
                        className="accent-amber-500"
                      />
                      <div className="text-left text-xs">
                        <span className="font-bold block text-white">Visa Department</span>
                        Work and Travel Visas
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <span>Authorized Isolation Force: Dossier will be locked into your default <strong>{currentUser.department} Office Code</strong>.</span>
                </div>
              )}

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                ⭐ <strong>Capacity Check:</strong> The system automatically evaluates current box limits. If TDP or Visa boxes are full, a new box is generated during submission without physical delay!
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs rounded-xl font-medium transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  id="submit-create-folder-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating dossier entry...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
