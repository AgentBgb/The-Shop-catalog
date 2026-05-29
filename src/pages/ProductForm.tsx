import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import ImageUploader from '../components/ImageUploader';
import { ChevronLeft, Save, ShoppingBag, EyeOff, LayoutGrid } from 'lucide-react';
import Loader from '../components/Loader';

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { currentUser, createProduct, updateProduct, getProductDetails, addToast } = useApp();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mobiles');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const defaultCategories = ['Mobiles', 'Laptops', 'Audio', 'Wearables', 'Accessories', 'General'];

  useEffect(() => {
    // Only Owners can mutate products
    if (currentUser && currentUser.role !== 'owner') {
      addToast('Worker accounts are restricted to view permissions only', 'error');
      navigate('/products', { replace: true });
    }
  }, [currentUser]);

  useEffect(() => {
    async function loadProduct() {
      if (id) {
        setLoading(true);
        const prod = await getProductDetails(id);
        if (prod) {
          setName(prod.name);
          setDescription(prod.description);
          setImages(prod.images || []);
          
          if (defaultCategories.includes(prod.category)) {
            setCategory(prod.category);
            setShowCustomCat(false);
          } else {
            setCategory('Other');
            setCustomCategory(prod.category);
            setShowCustomCat(true);
          }
        } else {
          addToast('Product requested does not exist', 'error');
          navigate('/products');
        }
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Product name is required', 'error');
      return;
    }

    const finalCategory = showCustomCat ? customCategory.trim() || 'Other' : category;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category: finalCategory,
      images, // Base64 or standard URLs
    };

    setSubmitting(true);
    let success = false;
    if (isEdit && id) {
      success = await updateProduct(id, payload);
    } else {
      success = await createProduct(payload);
    }
    setSubmitting(false);

    if (success) {
      navigate('/products');
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCategory(val);
    if (val === 'Other') {
      setShowCustomCat(true);
    } else {
      setShowCustomCat(false);
    }
  };

  if (loading) {
    return <Loader message="Fetching product listing metadata..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="product-form-container">
      {/* Back button header anchor */}
      <div className="flex items-center space-x-3">
        <Link
          to="/products"
          className="p-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl border border-slate-100 transition-colors"
          id="back-to-products-btn"
        >
          <ChevronLeft className="w-4.5 h-4.5" />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-black text-slate-800" id="product-form-title">
            {isEdit ? 'Re-configure Product' : 'Register New Product'}
          </h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">
            {isEdit ? 'Edit Mode' : 'Create Mode'}
          </p>
        </div>
      </div>

      {/* Main product card form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs" id="product-card-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column Left: text details */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700">Product Name</label>
              <input
                type="text"
                required
                placeholder="Samsung Galaxy A55 5G"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none"
                id="form-product-name"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700">General Category Tag</label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="px-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-semibold text-slate-700 transition-all outline-none cursor-pointer"
                id="form-product-category"
              >
                {defaultCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">Other / Custom</option>
              </select>
            </div>

            {/* Custom Category Input if requested */}
            {showCustomCat && (
              <div className="flex flex-col space-y-1 animate-slide-in">
                <label className="text-sm font-semibold text-slate-700">Specify Custom Category</label>
                <input
                  type="text"
                  placeholder="Smartphones, Hardware, Books..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none"
                  id="form-product-custom-category"
                />
              </div>
            )}
          </div>

          {/* Description full-size input */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-slate-700">Product Description</label>
            <textarea
              placeholder="Provide a comprehensive breakdown of specifications, package variants, storage dimensions, warranty status, colors, and capabilities."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-full min-h-[140px] px-4 py-3 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-medium text-slate-800 transition-all outline-none resize-none"
              id="form-product-description"
            />
          </div>
        </div>

        {/* Column Right (multiple images drop and slide previews) */}
        <div className="pt-4 border-t border-slate-100">
          <ImageUploader images={images} onChange={setImages} maxImages={5} />
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100" id="form-actions-toolbar">
          <Link
            to="/products"
            className="px-5 py-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            id="cancel-product-form-btn"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 font-bold text-sm text-white rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2 cursor-pointer"
            id="save-product-btn"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Processing...' : isEdit ? 'Update Details' : 'Publish Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
