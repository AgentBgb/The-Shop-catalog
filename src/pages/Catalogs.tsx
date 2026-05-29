import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Catalog } from '../types';
import { 
  BookOpen, 
  Plus, 
  Copy, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Users, 
  Layers, 
  Calendar,
  Compass,
  Check
} from 'lucide-react';
import Loader from '../components/Loader';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Catalogs() {
  const { currentUser, getCatalogs, deleteCatalog, addToast } = useApp();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Link copying status tracking state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCatalogs = async () => {
    setLoading(true);
    const data = await getCatalogs();
    setCatalogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  const handleCopyLink = (slug: string, id: string) => {
    const origin = window.location.origin;
    const shareableUrl = `${origin}/catalog/${slug}`;
    
    navigator.clipboard.writeText(shareableUrl).then(
      () => {
        setCopiedId(id);
        addToast('Catalog customer URL copied to clipboard!', 'success');
        setTimeout(() => setCopiedId(null), 2000);
      },
      () => {
        addToast('Failed to copy. Please manually select the URL.', 'error');
      }
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const success = await deleteCatalog(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (success) {
      loadCatalogs();
    }
  };

  return (
    <div className="space-y-6" id="catalogs-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="catalogs-header">
        <div className="flex flex-col space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Visual Digital Catalogs</h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">Shareable Customer Portals</p>
        </div>

        <Link
          to="/catalogs/new"
          className="inline-flex items-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white rounded-2xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer text-center"
          id="create-new-catalog-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Compose New Catalog</span>
        </Link>
      </div>

      {loading ? (
        <Loader message="Fetching published active catalogs..." />
      ) : catalogs.length === 0 ? (
        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center flex flex-col items-center justify-center space-y-3" id="blank-catalog-state">
          <Compass className="w-12 h-12 text-slate-300 animate-bounce" />
          <h3 className="text-slate-800 font-extrabold text-lg">No catalogs published yet</h3>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
            There are no shareable visual catalogues created. Compile your products library to create a digital store link!
          </p>
          <Link
            to="/catalogs/new"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            id="catalogs-create-shortcut-btn"
          >
            Create Your First Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="catalogs-grid-cards">
          {catalogs.map((catalog) => (
            <div
              key={catalog._id}
              className="bg-white border border-slate-100 hover:border-slate-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:shadow-xs transition-all duration-300"
              id={`catalog-card-${catalog._id}`}
            >
              {/* Card Meta Content */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md" id={`badge-item-count-${catalog._id}`}>
                    {catalog.product_ids?.length || 0} Products Selected
                  </span>
                  
                  {currentUser?.role === 'owner' && (
                    <span className="text-[10px] flex items-center text-slate-400 space-x-1 font-medium">
                      <Users className="w-3.5 h-3.5 mr-0.5 text-slate-300" />
                      <span className="truncate max-w-[90px]">{catalog.created_by_name || 'Owner'}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 leading-tight text-base" id={`catalog-title-txt-${catalog._id}`}>
                    {catalog.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
                    <Calendar className="w-3 h-3 text-slate-300" />
                    <span>Created {new Date(catalog.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Slug link display drawer */}
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between space-x-2" id={`catalog-slug-drawer-${catalog._id}`}>
                  <span className="text-xs text-slate-500 font-semibold truncate select-all">
                    /catalog/{catalog.slug}
                  </span>
                  <button
                    onClick={() => handleCopyLink(catalog.slug, catalog._id)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      copiedId === catalog._id 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-100 hover:text-indigo-600'
                    }`}
                    title="Copy Customer Shareable Link"
                    id={`copy-catalog-btn-${catalog._id}`}
                  >
                    {copiedId === catalog._id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action buttons drawer footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1" id={`catalog-footer-actions-${catalog._id}`}>
                <a
                  href={`/catalog/${catalog.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  id={`preview-catalog-link-${catalog._id}`}
                >
                  <span>Customer Shop Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Workers can edit their own, owner can edit/delete all */}
                {((currentUser?.role === 'worker' && catalog.created_by === currentUser._id) || 
                  currentUser?.role === 'owner') && (
                  <div className="flex items-center space-x-1">
                    <Link
                      to={`/catalogs/${catalog._id}/edit`}
                      className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                      title="Edit catalog title & compositions"
                      id={`edit-catalog-btn-${catalog._id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteId(catalog._id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                      title="Delete catalog"
                      id={`delete-catalog-btn-${catalog._id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Catalog Confirm modal */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Customer Catalog?"
        message="Are you sure you want to delete this shared catalog link? Anyone attempting to use the public link will get an access error of 'Catalog Not Found'."
        confirmText={deleting ? 'Deleting...' : 'Delete Permanently'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        isDangerous
      />
    </div>
  );
}
