/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Layers, 
  Info, 
  AlertTriangle, 
  Inbox, 
  Search, 
  FolderIcon, 
  Database,
  ArrowRight,
  ChevronRight,
  ToggleLeft
} from 'lucide-react';
import { FileBox, ClientFolder, SystemConfig, User } from '../types';

interface FileBoxManagerProps {
  boxes: FileBox[];
  folders: ClientFolder[];
  config: SystemConfig;
  currentUser: User;
  onRefresh: () => void;
  token: string;
}

export function FileBoxManager({ boxes, folders, config, currentUser, onRefresh, token }: FileBoxManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBox, setSelectedBox] = useState<FileBox | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'TDP' | 'Visa'>(() => {
    return currentUser.department === 'All' ? 'all' : (currentUser.department as 'TDP' | 'Visa');
  });
  const [isSimulatingOverload, setIsSimulatingOverload] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Filter boxes list
  const filteredBoxes = boxes.filter(box => {
    const matchesSearch = box.boxNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Tab filter
    if (activeTab === 'all') return matchesSearch;
    return box.department === activeTab && matchesSearch;
  });

  // Helper size formatter
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate percentages based on thresholds
  const getCapacityPercentages = (box: FileBox) => {
    const foldersPct = (box.folderCount / config.boxLimitFolders) * 100;
    const filesPct = (box.fileCount / config.boxLimitFiles) * 100;
    const sizePct = (box.totalSize / config.boxLimitSize) * 100;
    
    return {
      foldersPct: Math.min(100, foldersPct),
      filesPct: Math.min(100, filesPct),
      sizePct: Math.min(100, sizePct),
      maxPct: Math.max(foldersPct, filesPct, sizePct)
    };
  };

  // Manual Trigger to simulate folder/file box overflow auto-generation
  const triggerBoxSimulation = async (dept: 'TDP' | 'Visa') => {
    setIsSimulatingOverload(true);
    setSimMessage(null);

    try {
      // Simulate registering multiple client folders to guarantee capacity limit trigger.
      // We make a request to create folders until the capacity overflows and auto-creates a new box!
      const nextIndex = Math.floor(Math.random() * 1000) + 100;
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientName: `Simulated Traveler ${nextIndex}`,
          passportNumber: `EP88${nextIndex}7`,
          fileNumber: `FN-${dept}-SIM-${Date.now().toString().slice(-4)}`,
          department: dept
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      setSimMessage(`Success! Registered a new client folder inside "${dept}" department. The system analyzed Box capacities, incremented metrics, and automatically serialized a new active Box if thresholds were breached.`);
      onRefresh();
    } catch (err: any) {
      setSimMessage(`Simulation alert: ${err.message}`);
    } finally {
      setIsSimulatingOverload(false);
    }
  };

  return (
    <div className="space-y-6" id="box-manager-container">
      
      {/* Simulation Info panel strictly showing off the Automatic box overflow functionality */}
      <div className="bg-slate-800/40 border border-amber-600/30 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              Automatic File Box Cascade System
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              ICS Ethiopia security mandate forces a hard serialization boundary on storage boxes. Currently set limits: 
              <strong> {config.boxLimitFolders} folders</strong>, <strong>{config.boxLimitFiles} papers</strong>, or 
              <strong> {formatBytes(config.boxLimitSize)} size limit</strong>. Once any active physical Box triggers these thresholds, subsequent uploads are automatically allocated to a newly serialized successor Box in real-time.
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {(currentUser.department === 'All' || currentUser.department === 'TDP') && (
              <button
                onClick={() => triggerBoxSimulation('TDP')}
                disabled={isSimulatingOverload}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs px-3.5 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Simulate TDP Upload
              </button>
            )}
            {(currentUser.department === 'All' || currentUser.department === 'Visa') && (
              <button
                onClick={() => triggerBoxSimulation('Visa')}
                disabled={isSimulatingOverload}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs px-3.5 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Simulate Visa Upload
              </button>
            )}
          </div>
        </div>

        {simMessage && (
          <div className="mt-3 text-[11px] font-mono bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/40 text-slate-200">
            {simMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Box selections list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search box numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-850 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Segmented Filter Tab Controllers */}
            {currentUser.department === 'All' && (
              <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 shrink-0 text-xs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${activeTab === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  All Departments
                </button>
                <button
                  onClick={() => setActiveTab('TDP')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${activeTab === 'TDP' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  TDP
                </button>
                <button
                  onClick={() => setActiveTab('Visa')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${activeTab === 'Visa' ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Visa
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBoxes.length === 0 ? (
              <div className="col-span-2 bg-slate-800/25 border border-slate-800/80 p-8 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center">
                <Inbox className="w-10 h-10 text-slate-500 mb-2.5" />
                <p className="text-sm">No synchronized File Boxes matching the current department query exist.</p>
              </div>
            ) : (
              filteredBoxes.map((box) => {
                const { foldersPct, filesPct, sizePct } = getCapacityPercentages(box);
                const averageLoad = (foldersPct + filesPct + sizePct) / 3;

                // Color configuration for safety checks
                let percentageColor = 'bg-emerald-500';
                if (averageLoad >= 90) {
                  percentageColor = 'bg-red-500';
                } else if (averageLoad >= 65) {
                  percentageColor = 'bg-amber-400';
                }

                return (
                  <div 
                    key={box.id}
                    onClick={() => setSelectedBox(box)}
                    className={`bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border p-5 shadow-sm transition cursor-pointer ${selectedBox?.id === box.id ? 'border-amber-400/80 ring-1 ring-amber-400/20' : 'border-slate-700/30'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-0.5">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${box.department === 'TDP' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/25 text-amber-300'}`}>
                          {box.department} DEPT
                        </span>
                        <h4 className="text-base font-bold text-white tracking-tight mt-1">{box.boxNumber}</h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${box.status === 'active' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-700/40 border-slate-600/40 text-slate-400'}`}>
                        {box.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-3.5 my-4">
                      {/* Folders Capacity */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>Folders ({box.folderCount} / {config.boxLimitFolders})</span>
                          <span className="font-mono">{foldersPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full ${foldersPct >= 100 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${foldersPct}%` }}></div>
                        </div>
                      </div>

                      {/* Files Capacity */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>Physical Documents ({box.fileCount} / {config.boxLimitFiles})</span>
                          <span className="font-mono">{filesPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full ${filesPct >= 100 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${filesPct}%` }}></div>
                        </div>
                      </div>

                      {/* Size Capacity */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>Storage size ({formatBytes(box.totalSize)} / {formatBytes(config.boxLimitSize)})</span>
                          <span className="font-mono">{sizePct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full ${sizePct >= 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${sizePct}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-700/60 font-mono">
                      <span>Ref: BOX-{box.id.slice(-4).toUpperCase()}</span>
                      <span className="flex items-center gap-1 hover:text-amber-400">
                        View files <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Box Details & Folder Allocation Table */}
        <div className="space-y-4">
          <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl p-5 shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-3">Box Allocation Viewer</h3>
            
            {!selectedBox ? (
              <div className="flex-1 py-10 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <Database className="w-10 h-10 text-slate-600 mb-2" />
                <span>Select any File Box on the left to review folders and allocated files currently locked within.</span>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">FMS Box Registration</span>
                    <span className="font-bold text-white font-mono">{selectedBox.boxNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Lock Registry Department</span>
                    <span className="font-semibold text-emerald-400">{selectedBox.department} Department</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Folders Stored Inside</span>
                    <span className="font-mono text-white font-bold">{selectedBox.folderCount} limit units</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sealed at Snapshot</span>
                    <span className="text-slate-300 font-mono">{new Date(selectedBox.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <FolderIcon className="w-4 h-4 text-slate-400" />
                    Stored Client Folders ({folders.filter(f => f.boxNumber === selectedBox.boxNumber).length})
                  </h4>

                  <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar space-y-2 pr-1">
                    {folders.filter(f => f.boxNumber === selectedBox.boxNumber).length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-6">No folders registered under this Box number yet.</p>
                    ) : (
                      folders.filter(f => f.boxNumber === selectedBox.boxNumber).map(folder => (
                        <div key={folder.id} className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between hover:bg-slate-700/10 transition text-xs">
                          <div>
                            <p className="font-semibold text-white">{folder.clientName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Doc ref: {folder.fileNumber}</p>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {folder.passportNumber}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
