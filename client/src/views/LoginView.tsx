import React, { useState } from 'react';
import { api } from '../api/client';

interface LoginViewProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ username: username.trim(), password });
      if (res.data?.token) {
        localStorage.setItem('ecc_token', res.data.token);
        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="font-display font-extrabold text-3xl tracking-tight text-white">expertise</span>
            <span className="bg-secondary text-white text-xs font-bold px-2 py-0.5 rounded-md tracking-wider">PORTAL</span>
          </div>
          <h1 className="font-display font-bold text-xl text-slate-100">Medical Clearance Management System</h1>
          <p className="text-xs text-slate-400 mt-1">Expertise Contracting Company &bull; Saudi Arabia Operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-sm font-bold text-slate-200 mb-1">Sign in to your account</h2>
          <p className="text-xs text-slate-400 mb-5">Enter your enterprise credentials to access your operational role.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-[18px]">person</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-[18px]">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full mt-2 bg-secondary hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-500">
          <span>Expertise Contracting Company &bull; 3-Tier Enterprise Architecture</span>
        </div>
      </div>
    </div>
  );
};
