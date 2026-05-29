import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { 
  PlusCircle,
  LayoutDashboard, 
  Package, 
  BookOpen, 
  Users, 
  Settings as SettingsIcon,
  Store,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentUser } = useApp();

  const baseLinks = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'worker'],
    },
    {
      to: '/products',
      label: 'Products',
      icon: Package,
      roles: ['owner', 'worker'],
    },
    {
      to: '/catalogs',
      label: 'Catalogs',
      icon: BookOpen,
      roles: ['owner', 'worker'],
    },
    {
      to: '/workers',
      label: 'Workers',
      icon: Users,
      roles: ['owner'],
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
      roles: ['owner'],
    },
  ];

  const filteredLinks = baseLinks.filter(
    (link) => currentUser && link.roles.includes(currentUser.role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 w-64 p-4 space-y-6 select-none" id="sidebar-layout-box">
      {/* Sidebar Header Brand block */}
      <div className="flex items-center space-x-3 px-2 py-3 border-b border-slate-800" id="sidebar-branding">
        <div className="p-2 bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 rounded-xl">
          <BookOpen className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-extrabold text-white text-md tracking-tight leading-none">Catalog Hub</h1>
          <span className="text-[10px] text-indigo-400 font-mono font-medium tracking-wider mt-1 uppercase">MANAGER UNIT</span>
        </div>
      </div>

      {/* Navigation group */}
      <nav className="flex-1 flex flex-col space-y-1" id="sidebar-navigation">
        {filteredLinks.map((link) => {
          const IconComponent = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
              id={`nav-link-${link.label.toLowerCase()}`}
            >
              <div className="flex items-center space-x-3">
                <IconComponent className="w-4.5 h-4.5" />
                <span>{link.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </NavLink>
          );
        })}
      </nav>

      {/* Roles & persistence footprint */}
      {currentUser && (
        <div className="p-3.5 bg-slate-800/40 border border-slate-800/80 rounded-2xl flex items-center space-x-3" id="sidebar-footer-credentials">
          <div className="p-2 bg-slate-700/60 rounded-xl text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold mt-0.5">{currentUser.role} Session</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-screen fixed top-0 left-0 z-30" id="desktop-sidebar-pane">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar overlay Drawer backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs md:hidden"
          id="mobile-sidebar-overlay-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 h-full animate-slide-in"
            id="mobile-sidebar-contents"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
