import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Store, LogOut, Menu, UserCheck, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { currentUser, settings, logout } = useApp();

  return (
    <nav className="sticky top-0 z-40 w-full h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center justify-between shadow-xs" id="app-navbar">
      {/* Brand & Toggle Logo */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
            id="mobile-sidebar-toggle-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        {settings?.shop_logo ? (
          <img
            src={settings.shop_logo}
            alt="Logo"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-slate-100"
            id="navbar-shop-logo"
          />
        ) : (
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg" id="navbar-shop-logo-placeholder">
            <Store className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 tracking-tight leading-tight" id="navbar-shop-name">
            {settings?.shop_name || 'My Shop'}
          </span>
        </div>
      </div>

      {/* User settings status */}
      {currentUser && (
        <div className="flex items-center space-x-4" id="navbar-user-actions">
          <div className="hidden sm:flex flex-col text-right">
            <div className="flex items-center space-x-1.5 justify-end">
              <span className="text-sm font-semibold text-slate-700" id="navbar-user-name">{currentUser.name}</span>
              {currentUser.role === 'owner' ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                  Owner
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">
                  Worker
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium" id="navbar-user-email">{currentUser.email}</span>
          </div>

          <div className="h-8 w-px bg-slate-100 hidden sm:block" />

          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
}
