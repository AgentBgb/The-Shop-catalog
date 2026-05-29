import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';

export default function DashboardLayout() {
  const { currentUser, token, loading } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If there's no auth token, redirect to login
  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" id="dashboard-layout-root">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main viewport Container */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0" id="main-content-flow">
        {/* Navbar */}
        <Navbar onToggleSidebar={() => setIsSidebarOpen(true)} />

        {/* Dynamic Nested Content page with scrolling support */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto" id="dashboard-outlet-container">
          {loading && <Loader fullPage />}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
