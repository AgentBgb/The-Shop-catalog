import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Product } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Eye, 
  Tag, 
  FolderOpen,
  SlidersHorizontal
} from 'lucide-react';
import Loader from '../components/Loader';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Products() {
  const { currentUser, getProducts, deleteProduct } = useApp();
  const navigate = useNavigate();

  // Filter/Pagination States
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Modal delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Common preloaded category filter buttons
  const categoriesList = ['Mobiles', 'Laptops', 'Audio', 'Wearables', 'Accessories', 'General'];

  const loadProducts = async () => {
    setLoading(true);
    const data = await getProducts(page, limit, search, category);
    setProducts(data.products);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    // Reset page to 1 when changing search/category filters
    setPage(1);
  }, [search, category]);

  useEffect(() => {
    loadProducts();
  }, [page, search, category]);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const success = await deleteProduct(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (success) {
      loadProducts();
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6" id="products-master-view">
      {/* Header controls block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="products-header">
        <div className="flex flex-col space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Master Product Inventory</h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">Catalog Library</p>
        </div>

        {currentUser?.role === 'owner' && (
          <Link
            to="/products/new"
            className="inline-flex items-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white rounded-2xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer text-center"
            id="register-new-product-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Brand Product</span>
          </Link>
        )}
      </div>

      {/* Query Filter and Search cockpit */}
      <div className="bg-white p-5 border border-slate-100 rounded-3xl space-y-4 shadow-xs" id="products-controls">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search product names, details, specs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 hover:border-slate-200 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none"
              id="product-search-input"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56 flex items-center bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl px-3 focus-within:border-indigo-500 focus-within:bg-white transition-all">
            <Tag className="w-4 h-4 text-slate-400 mr-2" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent text-sm py-2.5 text-slate-700 font-semibold outline-none cursor-pointer"
              id="category-dropdown-filter"
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories helper chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2" id="categories-chips-container">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 flex items-center">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            Filter:
          </span>
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
              category === ''
                ? 'bg-slate-800 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            All Unified
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                category === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <Loader message="Gathering inventory spreadsheets..." />
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center flex flex-col items-center justify-center space-y-3" id="blank-product-state">
          <FolderOpen className="w-12 h-12 text-slate-300 animate-bounce" />
          <h3 className="text-slate-800 font-extrabold text-lg">No products found</h3>
          <p className="text-slate-400 text-xs max-w-sm">
            Make sure your search criteria is spelling accurate, or register new items as owner.
          </p>
          {currentUser?.role === 'owner' && (
            <Link
              to="/products/new"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              Add Product Now
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4" id="products-inventory-board">
          {/* Custom Desktop product Grid, fully responsive card listing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="products-cards-grid">
            {products.map((product) => (
              <div
                key={product._id}
                className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md rounded-3xl overflow-hidden flex flex-col justify-between transition-all"
                id={`product-card-${product._id}`}
              >
                {/* Images slide preview */}
                <div className="relative aspect-square bg-slate-100 overflow-hidden" id={`product-img-frame-${product._id}`}>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      id={`product-thumb-${product._id}`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 space-y-1.5" id={`product-no-thumb-${product._id}`}>
                      <Package className="w-10 h-10" />
                      <span className="text-[10px] font-mono">No Photos Saved</span>
                    </div>
                  )}

                  {product.images?.length > 1 && (
                    <span className="absolute bottom-3 right-3 text-[10px] b-font-semibold font-mono bg-slate-900/40 text-white backdrop-blur-xs px-2 py-0.5 rounded-md" id={`images-total-badge-${product._id}`}>
                      +{product.images.length - 1} photos
                    </span>
                  )}

                  <span className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md" id={`product-cat-badge-${product._id}`}>
                    {product.category}
                  </span>
                </div>

                {/* Info and stats parameters */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between" id={`product-info-${product._id}`}>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 leading-tight line-clamp-1" title={product.name} id={`product-name-txt-${product._id}`}>
                      {product.name}
                    </h3>
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed" id={`product-desc-txt-${product._id}`}>
                        {product.description || 'No descriptive summary specified.'}
                      </p>
                      {typeof product.price === 'number' && (
                        <div className="text-sm font-bold text-slate-800 ml-3">₹{product.price.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1" id={`product-actions-${product._id}`}>
                    <span className="text-[10px] font-mono text-slate-400">
                      Modified: {new Date(product.updated_at).toLocaleDateString()}
                    </span>

                    {currentUser?.role === 'owner' ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => navigate(`/products/${product._id}/edit`)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer transition-colors"
                          title="Edit product"
                          id={`edit-prod-btn-${product._id}`}
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(product._id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg cursor-pointer transition-colors"
                          title="Delete product"
                          id={`delete-prod-btn-${product._id}`}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Read Only
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination tools */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100" id="products-pagination">
            <span className="text-xs font-semibold text-slate-400">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} items
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 border border-slate-100 hover:bg-slate-50 bg-white disabled:bg-slate-100 text-slate-500 rounded-xl transition-colors cursor-pointer"
                id="pagination-prev-btn"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <div className="px-3.5 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-800" id="pagination-page-label">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 border border-slate-100 hover:bg-slate-50 bg-white disabled:bg-slate-100 text-slate-500 rounded-xl transition-colors cursor-pointer"
                id="pagination-next-btn"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog modal */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Product from Shop?"
        message="Are you sure you want to remove this product page from your listing permanently? Catalogs referring to this item will automatically hide it."
        confirmText={deleting ? 'Deleting...' : 'Delete Permanently'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
        isDangerous
      />
    </div>
  );
}
