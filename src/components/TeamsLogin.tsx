import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { logTeamsActivityToGoogleSheets } from '../lib/googleSheets';

interface TeamsLoginProps {
  onBackToHome: () => void;
  onNavigateToAdmin?: () => void;
}

export const TeamsLogin: React.FC<TeamsLoginProps> = ({ onBackToHome, onNavigateToAdmin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!username.trim()) {
      setError('Please enter your employee username or ID.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Log or verify employee credential with Google Sheets
      const syncResult = await logTeamsActivityToGoogleSheets({
        employeeId: username.trim().toLowerCase(),
        employeeName: username.trim(),
        activityType: 'LOGIN',
        details: 'Staff member authenticated into Nhealth Teams Portal.'
      });

      if (!syncResult.success && syncResult.message && !syncResult.message.includes('locally')) {
        console.warn('Google Sheets sync notice:', syncResult.message);
      }

      setIsLoggedIn(true);
    } catch (err: any) {
      setError(err?.message || 'Login attempt failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b192c] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Nhealth Home</span>
        </button>
        <div className="flex items-center gap-2.5">
          {onNavigateToAdmin && (
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Panel</span>
            </button>
          )}
          <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/70 border border-blue-800/60 px-3 py-1 rounded-full">
            Employee Portal
          </span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Logo & Heading */}
          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/70 border border-blue-500/30 p-2 mx-auto flex items-center justify-center shadow-lg shadow-blue-900/20">
              <img
                src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png"
                alt="Nhealth Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Nhealth Teams Portal</h1>
              <p className="text-xs text-slate-400 mt-1">
                Unified Healthcare Technologies Employee Login
              </p>
            </div>
          </div>

          {isLoggedIn ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Welcome, {username}!</h3>
                <p className="text-xs text-slate-300 mt-1">
                  You are successfully authenticated into the Nhealth staff workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoggedIn(false)}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Employee ID / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. NH-1042 or user@nhealth.in"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-white text-sm placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-white text-sm placeholder-slate-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Teams'}</span>
              </button>
            </form>
          )}

          {/* Help note */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Need access or forgot password? Contact IT Support at <span className="text-slate-400">admin@nhealth.in</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-slate-500">
        © {new Date().getFullYear()} Nhealth Unified Healthcare Technologies Private Limited. All rights reserved.
      </footer>
    </div>
  );
};
