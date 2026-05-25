/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  FolderClosed, 
  History, 
  Users2, 
  Database, 
  LogOut,
  ShieldAlert,
  CalendarCheck
} from 'lucide-react';
import { User, UserRole } from '../types';
import { IcsLogo } from './IcsLogo';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onSelectTab, currentUser, onLogout }: SidebarProps) {
  
  // Navigation lists with role checks
  const getNavItems = () => {
    const items = [
      { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
      { id: 'boxes', label: 'File Boxes Monitoring', icon: Layers },
      { id: 'folders', label: 'Client File Folders', icon: FolderClosed },
      { id: 'logs', label: 'System Trail Audit Logs', icon: History }
    ];

    if (currentUser.role === 'Admin') {
      items.push(
        { id: 'users', label: 'Personnel Management', icon: Users2 },
        { id: 'backups', label: 'Backup & Recovery Snapshot', icon: Database }
      );
    }

    return items;
  };

  return (
    <aside className="bg-blue-950 border-r border-blue-900 w-64 min-h-screen flex flex-col justify-between" id="app-sidebar">
      <div>
        {/* Institutional Branding Header Block */}
        <div className="p-5 border-b border-blue-900/80 flex items-center justify-center">
          <IcsLogo variant="compact" theme="dark" />
        </div>

        {/* Current Active User Profile Segment */}
        <div className="mx-4 my-5 bg-blue-900/30 p-4 rounded-xl border border-blue-800/40 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center font-bold text-white text-xs ring-1 ring-blue-700/50 uppercase">
              {currentUser.username.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{currentUser.fullName}</p>
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border leading-none inline-block mt-0.5 ${currentUser.role === 'Admin' ? 'bg-indigo-400/20 border-indigo-400/30 text-indigo-200' : currentUser.role.includes('Supervisor') ? 'bg-amber-400/20 border-amber-400/30 text-amber-200' : 'bg-blue-400/20 border-blue-400/30 text-blue-200'}`}>
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-900/60 flex justify-between text-[10px] text-blue-300 font-mono">
            <span>Isolation Dept:</span>
            <span className="font-bold text-white">{currentUser.department}</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="px-3 space-y-1">
          {getNavItems().map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer select-none transition ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40' : 'text-blue-200 hover:text-white hover:bg-blue-900/40'}`}
                id={`sidebar-nav-${item.id}`}
              >
                <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-300'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer element: Logout trigger */}
      <div className="p-4 border-t border-blue-900/60 space-y-3">
        <div className="text-[10px] text-blue-400 text-center font-mono">
          <CalendarCheck className="w-3.5 h-3.5 mx-auto mb-1 text-blue-500" />
          <span>Server Epoch: 2026</span>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-900/50 hover:bg-red-955/40 border border-blue-800/65 hover:border-red-500/30 text-xs font-bold rounded-xl text-blue-200 hover:text-red-200 transition cursor-pointer"
          id="sidebar-logout-btn"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Personnel Session</span>
        </button>
      </div>
    </aside>
  );
}
