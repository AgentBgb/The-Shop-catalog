import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Mail, Lock, Store, LayoutGrid, Chrome } from 'lucide-react';

export default function Login() {
  const { login, token, currentUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated and cached, redirect immediately
  if (token && currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const success = await login(email, password);
    setSubmitting(false);

    if (success) {
      navigate('/dashboard', { replace: true });
    }
  };

  const fillCredentials = (type: 'owner' | 'worker') => {
    if (type === 'owner') {
      setEmail('owner@gmail.com');
      setPassword('123456');
    } else {
      // Find or invent worker login if necessary, or just provide standard placeholder
      setEmail('worker@gmail.com');
      setPassword('123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" id="login-root-container">
      {/* Visual glowing layout cards */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_50%)]" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-8 flex flex-col space-y-6" id="login-card">
        {/* Branding banner */}
        <div className="text-center flex flex-col items-center space-y-2">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Shop Catalog Hub</h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">Management Terminal</p>
        </div>

        {/* Authenticate form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          <div className="relative flex flex-col space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                placeholder="owner@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none"
                id="login-email-input"
              />
            </div>
          </div>

          <div className="relative flex flex-col space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none"
                id="login-password-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all text-center tracking-wide flex items-center justify-center cursor-pointer"
            id="login-submit-btn"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast Account logins */}
        <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2.5" id="login-helper-box">
          <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Demo Login Presets</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('owner')}
              className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 text-xs font-bold text-slate-600 rounded-xl transition-all cursor-pointer text-center"
              id="fill-owner-btn"
            >
              Fill Owner Demo
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('worker')}
              className="px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100 hover:border-emerald-100 text-xs font-bold text-slate-600 rounded-xl transition-all cursor-pointer text-center"
              id="fill-worker-btn"
            >
              Fill Worker Preset
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 font-mono">
            Default credentials: owner@gmail.com / 123456
          </p>
        </div>
      </div>
    </div>
  );
}
