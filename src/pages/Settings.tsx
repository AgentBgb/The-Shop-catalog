import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { 
  Store, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Save, 
  Upload, 
  Image as ImageIcon,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import Loader from '../components/Loader';

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, settings, updateSettings, addToast, getSettings } = useApp();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Shop configurations fields
  const [shopName, setShopName] = useState('');
  const [logo, setLogo] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    // Owner authorization lock
    if (currentUser && currentUser.role !== 'owner') {
      addToast('Shop configuration edit locks are restricted to Owners only.', 'error');
      navigate('/dashboard', { replace: true });
    } else {
      async function loadConf() {
        setLoading(true);
        const data = await getSettings();
        setShopName(data.shop_name || '');
        setLogo(data.shop_logo || '');
        setPhone(data.phone || '');
        setWhatsapp(data.whatsapp || '');
        setAddress(data.address || '');
        setLoading(false);
      }
      loadConf();
    }
  }, [currentUser]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('File must be an image format.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogo(reader.result);
          addToast('Logo parsed. Ready to save!', 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      addToast('Shop Name is required.', 'error');
      return;
    }

    setSubmitting(true);
    const success = await updateSettings({
      shop_name: shopName.trim(),
      shop_logo: logo,
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      address: address.trim(),
    });
    setSubmitting(false);
  };

  if (loading) {
    return <Loader message="Accessing global settings variables..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="settings-view">
      {/* Header controls block */}
      <div className="flex flex-col space-y-1" id="settings-header">
        <h2 className="text-xl md:text-2xl font-black text-slate-800">Shop Configurations</h2>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">Meta Branding Parameters</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs" id="settings-form">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
          <Store className="w-5 h-5 mr-1.5 text-indigo-500" />
          Store Identity Parameters
        </h3>

        {/* Logo and Shop details flex layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo Picker block */}
          <div className="md:col-span-1 flex flex-col items-center space-y-3 p-4 border border-slate-100 rounded-2xl bg-slate-50/50" id="logo-uploader-card">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shop Logo</label>
            <div className="relative w-32 h-32 rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-xs group flex items-center justify-center">
              {logo ? (
                <img
                  src={logo}
                  alt="Shop Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  id="logo-preview"
                />
              ) : (
                <div className="text-slate-350 flex flex-col items-center justify-center space-y-1.5">
                  <Store className="w-8 h-8 text-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">No Logo</span>
                </div>
              )}
              {/* Hover Trigger layer */}
              <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-bold space-x-1.5">
                <Upload className="w-4 h-4" />
                <span>Upload logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-normal">
              Click photo to swap logo. Best dimension is square size 512x512.
            </p>
          </div>

          {/* Shop particulars block */}
          <div className="md:col-span-2 space-y-4" id="identity-particulars">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700">Shop Name</label>
              <input
                type="text"
                required
                placeholder="ABC Electronics & Spares"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 transition-all outline-none"
                id="shop-name-input"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700">Store Front Location Location Address</label>
              <textarea
                placeholder="123 Tech Avenue, Silicon Valley Mall, First Floor Suite A"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="min-h-[84px] px-4 py-2.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 transition-all outline-none resize-none"
                id="address-input"
              />
            </div>
          </div>
        </div>

        {/* Contact info channels */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
            <Phone className="w-4.5 h-4.5 mr-1.5 text-emerald-500" />
            Customer Contact Routing Options
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <Store className="w-4 h-4 mr-1 text-slate-400" />
                Customer Support Support Dial Code
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="+14155551234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 transition-all outline-none"
                  id="phone-input"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">E.g., +14155552671. Ensure including country prefix dials.</p>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <MessageSquare className="w-4 h-4 mr-1 text-emerald-400" />
                WhatsApp Message Link Target (Mobile Number Only)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="14155551234"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 transition-all outline-none"
                  id="whatsapp-input"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">E.g. 14155552671 (Numbers only, omit plus symbols or spaces).</p>
            </div>
          </div>
        </div>

        {/* Submit Actions Button Toolbar */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-end" id="settings-form-actions">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 font-bold text-sm text-white rounded-2xl shadow-lg shadow-indigo-600/25 transition-all flex items-center space-x-2 cursor-pointer"
            id="save-settings-btn"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Applying parameters...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
