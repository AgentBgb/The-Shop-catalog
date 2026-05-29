import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { 
  Package, 
  BookOpen, 
  Users, 
  ArrowRight, 
  Store, 
  Plus, 
  Share2, 
  Layers, 
  Compass, 
  ExternalLink 
} from 'lucide-react';
import Loader from '../components/Loader';
import { DashboardStats, Catalog } from '../types';

export default function Dashboard() {
  const { currentUser, getStats, getCatalogs, settings } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ownCatalogs, setOwnCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      if (currentUser?.role === 'owner') {
        const data = await getStats();
        setStats(data);
      } else {
        // Workers can only see catalogs they made
        const catalogs = await getCatalogs();
        setOwnCatalogs(catalogs);
      }
      setLoading(false);
    }
    loadDashboard();
  }, [currentUser]);

  if (loading) {
    return <Loader message="Analyzing shop telemetry..." />;
  }

  return (
    <div className="space-y-6" id="dashboard-hub">
      {/* Welcome Banner Card */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-3xl text-white relative overflow-hidden shadow-lg border border-indigo-950" id="dashboard-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300">
              <Store className="w-4 h-4" />
              <span>{settings?.shop_name || 'Electronics Boutique'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-100">{currentUser?.name}</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Use this admin terminal to edit products, publish visual catalogs, and coordinate worker accounts. Share dynamic digital catalogs directly to WhatsApp!
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/catalogs/new"
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm px-4 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 text-white transition-all cursor-pointer"
              id="dash-create-catalog-nav-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Catalog</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Owner Dashboard Content */}
      {currentUser?.role === 'owner' && (
        <div className="space-y-6" id="owner-elements">
          {/* Quick Metrics Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="stats-grid-cards">
            {/* Stat 1 */}
            <div className="bg-white p-5 border border-slate-100 rounded-3xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cataloged Products</span>
                <p className="text-3xl font-black text-slate-800">{stats?.total_products || 0}</p>
                <Link to="/products" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors pt-2 space-x-1 cursor-pointer">
                  <span>Browse Catalog library</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Package className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white p-5 border border-slate-100 rounded-3xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Catalogs</span>
                <p className="text-3xl font-black text-slate-800">{stats?.total_catalogs || 0}</p>
                <Link to="/catalogs" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors pt-2 space-x-1 cursor-pointer">
                  <span>View published links</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white p-5 border border-slate-100 rounded-3xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Workers</span>
                <p className="text-3xl font-black text-slate-800">{stats?.total_workers || 0}</p>
                <Link to="/workers" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors pt-2 space-x-1 cursor-pointer">
                  <span>Manage active workers</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Command cards */}
          <div className="bg-white p-6 border border-slate-100 rounded-3xl space-y-4" id="owner-shortcuts-panel">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Owner Short Action Panel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/products/new" className="p-4 bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-left hover:bg-indigo-50/20 group transition-all cursor-pointer">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all mb-3">
                  <Package className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">Register new product</h4>
                <p className="text-xs text-slate-400 mt-1">Upload multiple photos & category tags.</p>
              </Link>

              <Link to="/workers" className="p-4 bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-left hover:bg-indigo-50/20 group transition-all cursor-pointer">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all mb-3">
                  <span className="text-sm font-bold"><Users className="w-5 h-5" /></span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">Create Worker Account</h4>
                <p className="text-xs text-slate-400 mt-1">Register shop assistant logins.</p>
              </Link>

              <Link to="/catalogs/new" className="p-4 bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-left hover:bg-indigo-50/20 group transition-all cursor-pointer">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">Build Catalog</h4>
                <p className="text-xs text-slate-400 mt-1">Compile products to shareable links.</p>
              </Link>

              <Link to="/settings" className="p-4 bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-left hover:bg-indigo-50/20 group transition-all cursor-pointer">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all mb-3">
                  <Store className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">Update Shop Settings</h4>
                <p className="text-xs text-slate-400 mt-1">Configure shop name, logo, & phone.</p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Worker Dashboard Content */}
      {currentUser?.role === 'worker' && (
        <div className="space-y-6" id="worker-elements">
          {/* General Worker Metrics Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-5 border border-slate-100 rounded-3xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Created Catalogs</span>
                <p className="text-3xl font-black text-slate-800">{ownCatalogs.length}</p>
                <Link to="/catalogs" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-2 space-x-1 cursor-pointer">
                  <span>Manage my catalogs</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-100 rounded-3xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Product Library</span>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Browse products, examine details, and select units to generate dynamic visual catalogues for client outreach.
                </p>
                <Link to="/products" className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-800 pt-3 space-x-1 cursor-pointer">
                  <span>View all products</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* List of worker-owned catalogs */}
          <div className="bg-white p-6 border border-slate-100 rounded-3xl space-y-4" id="worker-catalogs-panel">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">My Published Catalogs</h3>
              <Link to="/catalogs/new" className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">Create new</Link>
            </div>

            {ownCatalogs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <Compass className="w-10 h-10 text-slate-300 mb-2 animate-bounce" />
                <h4 className="text-slate-700 font-bold text-sm">No catalogs composed yet</h4>
                <p className="text-xs text-slate-400 mt-1">Get started by creating your first shareable customer collection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="worker-catalogs-grid">
                {ownCatalogs.slice(0, 4).map((catalog) => (
                  <div key={catalog._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 line-clamp-1">{catalog.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Created: {new Date(catalog.created_at).toLocaleDateString()}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-2">{catalog.product_ids.length} Selected items</p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50">
                      <a
                        href={`/catalog/${catalog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        <span>Preview Shop Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <Link
                        to={`/catalogs/${catalog._id}/edit`}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
