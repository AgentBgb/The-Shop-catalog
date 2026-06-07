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
    <div className="flex flex-col h-full bg-blue-50 border-r border-blue-100 text-blue-900 w-64 p-4 space-y-6 select-none" id="sidebar-layout-box">
      {/* Sidebar Header Brand block */}
      <div className="flex items-center space-x-3 px-2 py-3 border-b border-blue-100" id="sidebar-branding">
        <div className="p-2 bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] rounded-xl">
          <BookOpen className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-extrabold text-blue-900 text-md tracking-tight leading-none">Catalog Hub</h1>
          <span className="text-[10px] text-[#2563EB] font-mono font-medium tracking-wider mt-1 uppercase">MANAGER UNIT</span>
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
                    ? 'bg-[#2563EB] text-white shadow-md'
                    : 'text-[#2563EB] hover:text-blue-900 hover:bg-blue-100'
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
        <div className="p-3.5 bg-blue-50 border border-blue-100/80 rounded-2xl flex items-center space-x-3" id="sidebar-footer-credentials">
          <div className="p-2 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-blue-900 truncate">{currentUser.name}</span>
            <span className="text-[10px] font-mono uppercase text-[#2563EB] font-semibold mt-0.5">{currentUser.role} Session</span>
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
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden"
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
