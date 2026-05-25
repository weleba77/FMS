/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { FileBoxManager } from './components/FileBoxManager';
import { FolderManager } from './components/FolderManager';
import { FileManager } from './components/FileManager';
import { AuditTrails } from './components/AuditTrails';
import { UsersConfig } from './components/UsersConfig';
import { BackupRegistry } from './components/BackupRegistry';
import { User, FileBox, ClientFolder, ActivityLog, SystemConfig, DashboardStats } from './types';
import { ShieldAlert, AlertCircle, Building, Menu, X } from 'lucide-react';

export default function App() {
  // Session Access state
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ics_fms_token');
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ics_fms_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Current active navigation pane
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Directory synchronizations
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<SystemConfig>({
    boxLimitFolders: 5,
    boxLimitFiles: 20,
    boxLimitSize: 50 * 1024 * 1024 // 50MB
  });
  const [boxes, setBoxes] = useState<FileBox[]>([]);
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Selected sub-directory folder view
  const [selectedFolder, setSelectedFolder] = useState<ClientFolder | null>(null);
  
  // Mobile layouts view sidebar trigger
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (token) {
      syncFmsDatabase();
    }
  }, [token]);

  const syncFmsDatabase = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [statsRes, configRes, boxesRes, foldersRes, logsRes] = await Promise.all([
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/config', { headers }),
        fetch('/api/boxes', { headers }),
        fetch('/api/folders', { headers }),
        fetch('/api/logs', { headers })
      ]);

      if (statsRes.status === 401) {
        handleLogout();
        return;
      }

      const safeParseJson = async (res: Response): Promise<any> => {
        try {
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.toLowerCase().includes("application/json")) {
            return {};
          }
          return await res.json();
        } catch {
          return {};
        }
      };

      const [statsData, configData, boxesData, foldersData, logsData] = await Promise.all([
        safeParseJson(statsRes),
        safeParseJson(configRes),
        safeParseJson(boxesRes),
        safeParseJson(foldersRes),
        safeParseJson(logsRes)
      ]);

      if (statsRes.ok && statsData && statsData.stats) {
        setStats(statsData.stats);
      }
      if (configRes.ok && configData && configData.config) {
        setConfig(configData.config);
      }
      if (boxesRes.ok && boxesData && boxesData.boxes) {
        setBoxes(boxesData.boxes);
      }
      if (foldersRes.ok && foldersData && foldersData.folders) {
        setFolders(foldersData.folders);
        
        // If a folder was selected, keep its local ref updated
        if (selectedFolder) {
          const updated = foldersData.folders.find((f: ClientFolder) => f.id === selectedFolder.id);
          if (updated) setSelectedFolder(updated);
        }
      }
      if (logsRes.ok && logsData && logsData.logs) {
        setActivityLogs(logsData.logs);
      }
    } catch (err) {
      console.error("FMS Synchronization Failure:", err);
    }
  };

  const handleLoginSuccess = (newToken: string, user: User) => {
    localStorage.setItem('ics_fms_token', newToken);
    localStorage.setItem('ics_fms_user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);
    setActiveTab('dashboard');
    setSelectedFolder(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('ics_fms_token');
    localStorage.removeItem('ics_fms_user');
    setToken(null);
    setCurrentUser(null);
    setSelectedFolder(null);
  };

  // Switch tabs safely, closing mobile navigation side overlays
  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    
    // Reset viewable folders selections when selecting other core directory tabs
    if (tab !== 'folders') {
      setSelectedFolder(null);
    }
  };

  if (!token || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Active View router mapping
  const renderActiveView = () => {
    if (selectedFolder) {
      return (
        <FileManager
          folder={selectedFolder}
          currentUser={currentUser}
          token={token}
          onBack={() => setSelectedFolder(null)}
          onRefresh={syncFmsDatabase}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return stats ? (
          <DashboardOverview 
            stats={stats} 
            currentUser={currentUser} 
            onNavigate={(tab) => handleSelectTab(tab)}
          />
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">Connecting to metrics database...</p>
        );
      case 'boxes':
        return (
          <FileBoxManager
            boxes={boxes}
            folders={folders}
            config={config}
            currentUser={currentUser}
            onRefresh={syncFmsDatabase}
            token={token}
          />
        );
      case 'folders':
        return (
          <FolderManager
            folders={folders}
            currentUser={currentUser}
            onRefresh={syncFmsDatabase}
            onSelectFolder={(f) => setSelectedFolder(f)}
            selectedFolder={selectedFolder}
            token={token}
          />
        );
      case 'logs':
        return (
          <AuditTrails
            logs={activityLogs}
            currentUser={currentUser}
          />
        );
      case 'users':
        return (
          <UsersConfig
            currentUser={currentUser}
            token={token}
          />
        );
      case 'backups':
        return (
          <BackupRegistry
            currentUser={currentUser}
            token={token}
          />
        );
      default:
        return (
          <div className="text-center py-10 bg-slate-900 border text-white rounded-2xl">
            View pane not fully loaded yet.
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans" id="portal-frame-root">
      
      {/* Desktop Navigation Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          activeTab={activeTab}
          currentUser={currentUser}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Sidebar overlay draws */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" id="mobile-sidebar-overlay">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="relative flex flex-col w-64 bg-blue-950 border-r border-blue-900">
            <div className="p-4 border-b border-blue-900 flex justify-between items-center bg-blue-950">
              <span className="text-white font-bold font-mono">FMS Menu</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              currentUser={currentUser}
              onSelectTab={handleSelectTab}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Content pane right container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Mobile quick actions navigation header bar */}
        <header className="md:hidden bg-blue-950 border-b border-blue-900 p-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-white tracking-widest font-mono uppercase">ICS ETHIOPIA</h1>
          </div>
        </header>

        {/* Dynamic content rendering frame */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
