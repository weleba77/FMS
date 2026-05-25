/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Lock, KeyRound, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { IcsLogo } from './IcsLogo';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // Self-Service Reset View
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetFullName, setResetFullName] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!username || !password) {
      setError('Please provide both username and password.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setShouldShake(true);
          setTimeout(() => setShouldShake(false), 500);
        }
        throw new Error(data.error || 'Identity authentication failed.');
      }

      setSuccess('Access granted. Authenticating session...');
      setTimeout(() => {
        onLoginSuccess(data.token, data.user);
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!resetUsername || !resetFullName || !resetNewPassword) {
      setError('Please complete all identification verification fields.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: resetUsername,
          fullName: resetFullName,
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Target user info mismatch.');
      }

      setSuccess(data.message || 'Password updated! Please log in with your new password.');
      setIsResetMode(false);
      setUsername(resetUsername);
      setPassword('');
      setResetUsername('');
      setResetFullName('');
      setResetNewPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans" id="login-screen-root">
      {/* Dynamic Ambient Background Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-4">
          <IcsLogo variant="full" theme="light" />
        </div>
        <h2 className="mt-2 text-center text-sm font-semibold tracking-wider text-slate-500 uppercase font-mono">
          {isResetMode ? 'Self-Service Password Reset Registry' : 'Secure Enterprise Portal Login'}
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-blue-100 sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2.5 text-sm" id="auth-error-alert">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-250 text-emerald-800 p-3 rounded-xl flex items-start gap-2.5 text-sm" id="auth-success-alert">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {!isResetMode ? (
            <form onSubmit={handleLogin} className={`space-y-5 ${shouldShake ? 'animate-shake' : ''}`} id="login-form">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
                  Username
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter FMS username"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  id="submit-login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 transition"
                >
                  {loading ? 'Verifying Credentials...' : 'Sign In To Workspace'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4" id="reset-form">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex gap-2.5 text-xs">
                <Info className="w-5 h-5 shrink-0 text-amber-600" />
                <span>
                  Enter your accounts <strong>Username</strong> and <strong>Full Name</strong> exactly as registered to verify identity and declare a new password reset.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
                  Username Context
                </label>
                <input
                  id="reset-username"
                  type="text"
                  required
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  placeholder="e.g. tdpenc"
                  className="mt-1 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
                  As-Registered Full Name
                </label>
                <input
                  id="reset-fullName"
                  type="text"
                  required
                  value={resetFullName}
                  onChange={(e) => setResetFullName(e.target.value)}
                  placeholder="e.g. Daniel TDP Encoder"
                  className="mt-1 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 font-mono">
                  Brand New Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="reset-newpassword"
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Provide secure passwords"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="submit-reset-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 transition"
                >
                  {loading ? 'Verifying Identity...' : 'Apply Password Override'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full py-2.5 px-4 text-center rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel and Return to Portal Login
                </button>
              </div>
            </form>
          )}

          {/* Secure Hint Info and Preset Accounts to facilitate testing seamlessly */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-500 space-y-2">
            <div className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 text-slate-600 shadow-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
                <div className="leading-relaxed">
                  <span className="text-slate-905 font-bold">Admin:</span> <span className="text-slate-500">admin / admin123</span>
                </div>
                <div className="leading-relaxed">
                  <span className="text-blue-700 font-semibold">TDP Sup:</span> <span className="text-slate-500">tdpsup / tdp123</span>
                </div>
                <div className="leading-relaxed">
                  <span className="text-blue-700 font-semibold">Visa Sup:</span> <span className="text-slate-500">visasup / visa123</span>
                </div>
                <div className="leading-relaxed break-all">
                  <span className="text-slate-905 font-bold">TDP Enc:</span> <span className="text-slate-500">tdpenc / tdpenc123</span>
                </div>
              </div>
              <div className="text-center text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-200/60 font-sans tracking-wide leading-relaxed">
                Each profile is automatically isolated according to the RBAC matrices.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[11px] text-slate-500">
          <p>© 2026 ICS Ethiopia File Management System (FMS). All rights reserved.</p>
          <p className="mt-1">Federal Democratic Republic of Ethiopia Ministry of Immigration Document Clearance Center</p>
        </div>
      </div>
    </div>
  );
}
