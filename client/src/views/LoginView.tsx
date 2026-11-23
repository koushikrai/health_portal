import React, { useState } from 'react';
import { api } from '../api/client';

interface LoginViewProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.response?.data?.error || 'Invalid credentials. Please verify username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#181A31] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/expertise-bg-canvas.png')" }}
    >
      {/* Ambient gradient overlay to harmonize canvas elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#181A31]/40 via-transparent to-[#181A31]/80 pointer-events-none"></div>
      
      {/* Subtle radial glow in center */}
      <div className="absolute w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none -top-24"></div>
      <div className="absolute w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -bottom-24"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center">
            <img
              src="/expertise-logo-trans.png"
              alt="Expertise"
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_4px_16px_rgba(234,88,12,0.35)] select-none transition-transform hover:scale-105 duration-300"
            />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] text-slate-300 uppercase mt-1 drop-shadow-sm">
              Inspiring Excellence
            </span>
          </div>

          <h1 className="font-display font-bold text-lg sm:text-xl text-white mt-3 tracking-tight">
            Workforce Health &amp; Compliance System
          </h1>
          <p className="text-xs text-slate-300/80 mt-0.5">
            Expertise Contracting Company &bull; Saudi Arabia Operations
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#12142B]/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/70">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-white">Sign in to your account</h2>
              <p className="text-xs text-slate-400">Enter enterprise credentials to access your portal</p>
            </div>
            <span className="material-symbols-outlined text-orange-400 text-2xl">verified_user</span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/70 text-red-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">person</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hr, central, badr, admin"
                  className="w-full bg-[#1A1D3B]/90 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1D3B]/90 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full mt-2 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

        {/* Corporate Security Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400 space-y-1">
          <p>Expertise Contracting Company &bull; 3-Tier Enterprise Architecture</p>
          <p className="text-[10px] text-slate-500">
            Protected under Saudi Aramco &amp; SABIC Industrial Cybersecurity Standards
          </p>
        </div>
      </div>
    </div>
  );
};
