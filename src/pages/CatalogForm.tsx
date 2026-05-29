import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Product } from '../types';
import { 
  ChevronLeft, 
  Save, 
  Search, 
  Check, 
  Layers, 
  Tag, 
  Package,
  FolderMinus
} from 'lucide-react';
import Loader from '../components/Loader';

export default function CatalogForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { 
    currentUser, 
    getProducts, 
    createCatalog, 
    updateCatalog, 
    getCatalogDetails, 
    addToast 
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Product libraries fetch states
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categoriesList = ['Mobiles', 'Laptops', 'Audio', 'Wearables', 'Accessories', 'General'];

  useEffect(() => {
    async function loadCatalogFormAndProducts() {
      setLoading(true);
      
      // Fetch up to 100 products for selection in catalog builder
      const prodRes = await getProducts(1, 100, '', '');
      setAllProducts(prodRes.products || []);

      if (isEdit && id) {
        const catDetails = await getCatalogDetails(id);
        if (catDetails) {
          // Verify worker is authorized to edit
          if (currentUser?.role === 'worker' && catDetails.created_by !== currentUser._id) {
            addToast('Worker accounts can only edit their own created catalogs.', 'error');
            navigate('/catalogs');
            return;
          }
          setTitle(catDetails.title);
          setSelectedIds(catDetails.product_ids || []);
        } else {
          addToast('Catalog requested does not exist.', 'error');
          navigate('/catalogs');
          return;
        }
      }
      setLoading(false);
    }
    loadCatalogFormAndProducts();
  }, [id]);

  const toggleProductSelect = (productId: string) => {
    if (selectedIds.includes(productId)) {
      setSelectedIds(selectedIds.filter((id) => id !== productId));
    } else {
      setSelectedIds([...selectedIds, productId]);
    }
  };

  const handleSelectAllFiltered = () => {
    const freshIds = [...selectedIds];
    filteredProducts.forEach((p) => {
      if (!freshIds.includes(p._id)) {
        freshIds.push(p._id);
      }
    });
    setSelectedIds(freshIds);
    addToast(`Selected all matching products (${filteredProducts.length})`, 'info');
  };

  const handleClearAllFiltered = () => {
    const filteredProductIds = filteredProducts.map((p) => p._id);
    setSelectedIds(selectedIds.filter((id) => !filteredProductIds.includes(id)));
    addToast('Cleared all matching selections', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Catalog Title is required', 'error');
      return;
    }
    if (selectedIds.length === 0) {
      addToast('Select at least one product to include in the catalog', 'error');
      return;
    }

    setSubmitting(true);
    let success = false;
    if (isEdit && id) {
      success = await updateCatalog(id, title.trim(), selectedIds);
    } else {
      success = await createCatalog(title.trim(), selectedIds);
    }
    setSubmitting(false);

    if (success) {
      navigate('/catalogs');
    }
  };

  // Local client side filtering of matching products for selection layout
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                          product.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === '' ? true : product.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <Loader message="Analyzing inventory tables..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" id="catalog-form">
      {/* Back button and page title */}
      <div className="flex items-center space-x-3">
        <Link
          to="/catalogs"
          className="p-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl border border-slate-100 transition-colors"
          id="back-to-catalogs-btn"
        >
          <ChevronLeft className="w-4.5 h-4.5" />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-black text-slate-800" id="catalog-form-hdr-title">
            {isEdit ? 'Re-compile Catalog' : 'Compose Digital Catalog'}
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">
            {isEdit ? 'Edit Mode' : 'Create Mode'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="catalog-form-body">
        {/* Left Hand: Config title and previews list metadata summary (1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-5 shadow" id="catalog-meta-box">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <Layers className="w-4 h-4 mr-1.5 text-indigo-500" />
              1. Catalog Properties
            </h3>

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700">Catalog Title</label>
              <input
                type="text"
                required
                placeholder="Latest Summer Arrivals, Tech Sales..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none"
                id="form-catalog-title-in"
              />
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                slug: {title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'auto-generated'}
              </p>
            </div>

            {/* Custom preview summaries */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-500">Selected Products:</span>
                <span className="font-black text-indigo-600 font-mono">{selectedIds.length} items</span>
              </div>

              {selectedIds.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-slate-50 p-2.5 rounded-2xl bg-slate-50/30 scrollbar-thin">
                  {allProducts
                    .filter((p) => selectedIds.includes(p._id))
                    .map((p) => (
                      <div key={p._id} className="flex items-center space-x-2 text-xs bg-white p-1.5 border border-slate-100/60 rounded-xl shadow-xs">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-300">
                            <Package className="w-3 h-3" />
                          </div>
                        )}
                        <span className="font-bold text-slate-700 truncate flex-1">{p.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleProductSelect(p._id)}
                          className="text-slate-400 hover:text-rose-600 font-bold p-0.5"
                          title="Remove item"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Form actions submitting triggers */}
            <div className="flex items-center space-x-2 pt-4 border-t border-slate-100">
              <Link
                to="/catalogs"
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-center text-sm transition-all"
                id="cancel-catalog-btn"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 font-bold text-sm text-white rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                id="save-catalog-btn"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Sharing...' : isEdit ? 'Update Link' : 'Assemble Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Hand: Product search grid and catalogs selections (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4 shadow flex flex-col justify-between" id="products-selectors-panel">
            {/* Header selection labels */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <Package className="w-4.5 h-4.5 mr-1.5 text-indigo-500" />
                2. Select Items to Include
              </h3>

              {/* Selector action overlays */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-bold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Select All Matches
                </button>
                <button
                  type="button"
                  onClick={handleClearAllFiltered}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-bold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Clear All Matches
                </button>
              </div>
            </div>

            {/* Inline Query Search filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="selection-filters">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Quick search products to select..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                <Tag className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent text-xs py-2.5 text-slate-600 font-bold outline-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selection Grid Board */}
            {allProducts.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center space-y-2">
                <Package className="w-12 h-12 text-slate-200 animate-pulse" />
                <h4 className="text-slate-700 font-bold text-sm">Product library is empty</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  You need to configure and register products in your inventory before composing any catalogs.
                </p>
                <Link to="/products/new" className="text-indigo-600 hover:underline font-bold text-xs">Add Product Page</Link>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center text-slate-300 space-y-2">
                <FolderMinus className="w-10 h-10" />
                <h4 className="text-slate-500 font-bold text-xs">No matching products found</h4>
                <p className="text-[11px] text-slate-400">Toggle or adjust search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[32rem] overflow-y-auto pr-1 select-none border border-slate-50 p-2 rounded-2xl bg-slate-50/20 scrollbar-thin" id="catalog-products-checker-grid">
                {filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p._id);
                  return (
                    <div
                      key={p._id}
                      onClick={() => toggleProductSelect(p._id)}
                      className={`relative border p-3 rounded-2xl cursor-pointer flex items-center space-x-3 transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                      }`}
                      id={`p-checker-${p._id}`}
                    >
                      {/* Left icon wrapper */}
                      <div className="relative w-11 h-11 bg-slate-100 rounded-xl overflow-hidden aspect-square border border-slate-50 flex-shrink-0">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center animate-fade-in" />
                        )}
                      </div>

                      {/* Right metadata */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug truncate" title={p.name}>{p.name}</h4>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-500 font-mono mt-0.5 block">{p.category}</span>
                      </div>

                      {/* Check toggles */}
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'border-slate-250 bg-white'
                      }`} id={`check-icon-${p._id}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
