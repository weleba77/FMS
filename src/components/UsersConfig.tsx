/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { User, UserRole, Department } from '../types';

interface UsersConfigProps {
  currentUser: User;
  token: string;
}

export function UsersConfig({ currentUser, token }: UsersConfigProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New User Registration Fields
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Encoder');
  const [regDept, setRegDept] = useState<Department>('TDP');
  const [regPassword, setRegPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password reset target state
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync users database.');
      }
      setUsers(data.users);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regFullName || !regPassword) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: regUsername.trim(),
          fullName: regFullName.trim(),
          role: regRole,
          department: regDept,
          password: regPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'User registration rejected.');
      }

      setSuccessMsg(`Personnel "${regFullName}" has been added successfully.`);
      setRegUsername('');
      setRegFullName('');
      setRegPassword('');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'suspended') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const targetStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Status toggle failed.');
      }

      fetchUsers();
      setSuccessMsg(`Status for personnel "${data.user.fullName}" set to ${targetStatus}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResetPasswordByAdmin = async (userId: string) => {
    if (!resetNewPassword.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      const res = await fetch(`/api/users/${userId}/reset`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: resetNewPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete password override.');
      }

      setSuccessMsg(`Password for user successfully overriden by Admin.`);
      setResetUserId(null);
      setResetNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6" id="users-config-root">
      
      <div className="space-y-0.5 border-b border-slate-700/60 pb-5">
        <h2 className="text-lg font-bold text-white tracking-tight">Personnel Directory & Role Auth Panel</h2>
        <p className="text-xs text-slate-400">Add secure operator credentials, override password clearances, and lock logins.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-900/35 border border-red-500/50 text-red-155 p-3 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/45 border border-emerald-500/50 text-emerald-250 p-3 rounded-xl flex items-start gap-2.5 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Add secure operator credentials */}
        <div className="space-y-4">
          <div className="bg-slate-800/25 border border-slate-700/30 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <UserPlus className="w-4.5 h-4.5 text-emerald-400" />
              Register Personnel
            </h3>

            <form onSubmit={handleRegisterUser} className="space-y-4" id="register-user-form">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-slate-400">Personnel Full Name</label>
                <input
                  id="reg-fullname-input"
                  type="text"
                  required
                  placeholder="e.g. Tariku Abebe"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-705 px-3.5 py-2.5 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-slate-400">Secure Username</label>
                <input
                  id="reg-username-input"
                  type="text"
                  required
                  placeholder="e.g. tariku_a"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-705 px-3.5 py-2.5 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-slate-400">Initial Key Pass</label>
                <input
                  id="reg-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 px-3.5 py-2.5 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-slate-400 font-mono">Role Clearance</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="Encoder">Encoder</option>
                    <option value="TDP_Supervisor">TDP Supervisor</option>
                    <option value="Visa_Supervisor">Visa Supervisor</option>
                    <option value="Admin">System Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-slate-400 font-mono">Dept Code</label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value as Department)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="TDP">TDP Department</option>
                    <option value="Visa">Visa Department</option>
                    <option value="All">Institutional (All)</option>
                  </select>
                </div>
              </div>

              <button
                id="submit-register-user-btn"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-50 font-medium rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Authenticating and saving...' : 'Confirm Registration'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Section: Registered credentials listings in beautiful tables */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/25 border border-slate-700/30 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4">Users database registry ({users.length})</h3>

            {loading ? (
              <p className="text-xs text-slate-500 text-center py-6">Checking FMS secure file system...</p>
            ) : (
              <div className="space-y-2.5">
                {users.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row gap-3 sm:items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} title={item.status}></span>
                        <h4 className="text-xs font-bold text-white tracking-tight">{item.fullName}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-450 font-mono">
                        <span>Username: <strong>@{item.username}</strong></span>
                        <span>•</span>
                        <span className="text-amber-400">Role: {item.role}</span>
                        <span>•</span>
                        <span>Dept: {item.department}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {/* Password override display */}
                      {resetUserId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            placeholder="New Pass"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-[10px] focus:outline-none"
                          />
                          <button
                            onClick={() => handleResetPasswordByAdmin(item.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-lg text-[10px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setResetUserId(null)}
                            className="bg-slate-700 text-slate-350 p-1 rounded-lg text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResetUserId(item.id);
                            setResetNewPassword('');
                          }}
                          className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs text-slate-300 transition flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4 text-amber-300" />
                          <span>Reset</span>
                        </button>
                      )}

                      {/* Lock Toggle indicator */}
                      {item.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleStatus(item.id, item.status)}
                          className={`px-3 py-1 bg-slate-800 rounded-xl font-bold text-[10px] border transition cursor-pointer ${item.status === 'active' ? 'hover:bg-red-950/20 border-red-500/20 text-red-400' : 'hover:bg-emerald-950/20 border-emerald-500/20 text-emerald-400'}`}
                        >
                          {item.status === 'active' ? 'Lock Account' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
