import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Catalogs from './pages/Catalogs';
import CatalogForm from './pages/CatalogForm';
import Workers from './pages/Workers';
import Settings from './pages/Settings';
import PublicCatalog from './pages/PublicCatalog';

// Icons for dynamic toast items
import { X, CheckCircle, AlertOctagon, Info } from 'lucide-react';

function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full" id="global-toasts">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-2xl shadow-lg border text-sm font-semibold flex items-start space-x-3 transition-all duration-300 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-800'
              : 'bg-indigo-50 border-indigo-100 text-indigo-800'
          }`}
          id={`toast-elem-${toast.id}`}
        >
          {/* Badge Icon depending on toast types */}
          <div className="flex-shrink-0 mt-0.5" id={`toast-icon-${toast.id}`}>
            {toast.type === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />}
            {toast.type === 'error' && <AlertOctagon className="w-4.5 h-4.5 text-rose-600" />}
            {toast.type === 'info' && <Info className="w-4.5 h-4.5 text-indigo-600" />}
          </div>

          <div className="flex-1 leading-snug">{toast.message}</div>

          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-100/40 rounded-lg cursor-pointer"
            id={`close-toast-btn-${toast.id}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function MainRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public customer facing routes */}
        <Route path="/catalog/:slug" element={<PublicCatalog />} />

        {/* Authentication access route */}
        <Route path="/login" element={<Login />} />

        {/* Internal management dashboard workspace routes protected by DashboardLayout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/catalogs" element={<Catalogs />} />
          <Route path="/catalogs/new" element={<CatalogForm />} />
          <Route path="/catalogs/:id/edit" element={<CatalogForm />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/api/*" element={<div className="p-8 text-sm font-semibold text-rose-600">Dynamic API Route Failure or Swagger Not Found</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Floating alert/toasts overlay elements wrapper */}
      <ToastContainer />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRoutes />
    </AppProvider>
  );
}
