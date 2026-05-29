import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Catalog, Product, Settings } from '../types';
import { 
  Store, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  Compass,
  Tag
} from 'lucide-react';
import Loader from '../components/Loader';

export default function PublicCatalog() {
  const { slug } = useParams<{ slug: string }>();
  const { getPublicCatalogBySlug } = useApp();

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Active slideshow index per product (holds product._id -> photo index map)
  const [slideshowIndices, setSlideshowIndices] = useState<Record<string, number>>({});

  // Product inspection details Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalImageIdx, setModalImageIdx] = useState(0);

  useEffect(() => {
    async function loadPublicCatalog() {
      if (slug) {
        setLoading(true);
        const data = await getPublicCatalogBySlug(slug);
        if (data) {
          setCatalog(data.catalog);
          setProducts(data.products || []);
          setSettings(data.settings);
          
          // Seed slide indexes
          const indexes: Record<string, number> = {};
          (data.products || []).forEach((p) => {
            indexes[p._id] = 0;
          });
          setSlideshowIndices(indexes);
        }
        setLoading(false);
      }
    }
    loadPublicCatalog();
  }, [slug]);

  const slideNext = (productId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details modal
    setSlideshowIndices((prev) => {
      const current = prev[productId] || 0;
      const next = current === totalImages - 1 ? 0 : current + 1;
      return { ...prev, [productId]: next };
    });
  };

  const slidePrev = (productId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details modal
    setSlideshowIndices((prev) => {
      const current = prev[productId] || 0;
      const next = current === 0 ? totalImages - 1 : current - 1;
      return { ...prev, [productId]: next };
    });
  };

  const getWhatsAppLink = (product: Product) => {
    if (!settings?.whatsapp) return '#';
    const cleanNum = settings.whatsapp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello! I saw your catalog "${catalog?.title || 'Catalog'}" and I am interested in this product:\n\n*${product.name}*\nCategory: ${product.category}\n\nCan you please check availability value? Thank you!`
    );
    return `https://wa.me/${cleanNum}?text=${message}`;
  };

  const getGeneralWhatsAppLink = () => {
    if (!settings?.whatsapp) return '#';
    const cleanNum = settings.whatsapp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello! I am browsing your shared catalog "${catalog?.title || 'Collection'}" and had a few general questions about your items.`
    );
    return `https://wa.me/${cleanNum}?text=${message}`;
  };

  const handleOpenProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalImageIdx(0);
  };

  if (loading) {
    return <Loader message="Opening digital catalog storefront..." />;
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white" id="public-catalog-missing">
        <div className="p-4 bg-slate-800 rounded-full text-indigo-400 mb-4 animate-bounce">
          <Store className="w-12 h-12" />
        </div>
        <h2 className="text-xl md:text-2xl font-black">Catalog Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
          The shared catalog link you are trying to access is expired, has been deleted by the owner, or is spelling incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="customer-storefront">
      {/* 1. Header Banner */}
      <header className="sticky top-0 bg-white border-b border-slate-100 z-30 shadow-xs px-4 py-3 md:px-8" id="customer-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            {settings?.shop_logo ? (
              <img
                src={settings.shop_logo}
                alt={settings.shop_name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-2xl object-cover border border-slate-100 shadow-xs"
                id="customer-brand-logo"
              />
            ) : (
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl" id="customer-brand-logo-placeholder">
                <Store className="w-6 h-6" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="font-extrabold text-slate-800 tracking-tight text-lg leading-tight" id="customer-shop-title">
                {settings?.shop_name || 'Electronics Hub'}
              </h1>
              {settings?.address && (
                <span className="text-[10px] text-slate-400 font-medium flex items-center mt-0.5 max-w-xs md:max-w-md truncate" id="customer-shop-address">
                  <MapPin className="w-3 h-3 text-slate-300 mr-1" />
                  {settings.address}
                </span>
              )}
            </div>
          </div>

          {/* Core Support Hotline anchors */}
          <div className="flex items-center space-x-2" id="customer-brand-hotlines">
            {settings?.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-2xl transition-all"
                title="Call Shop"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
            {settings?.whatsapp && (
              <a
                href={getGeneralWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm rounded-2xl shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
                id="general-whatsapp-cta"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Text Storefront</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 2. Secondary Catalog Title Area */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white py-8 px-4 text-center border-b border-indigo-950 relative overflow-hidden" id="customer-catalog-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto space-y-2">
          <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase font-mono bg-indigo-505/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Customer Digital Showcase
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" id="customer-catalog-title">
            {catalog.title}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Browse our selections below. Click any product to inspect detailed specifications and contact our shop operators directly!
          </p>
        </div>
      </div>

      {/* 3. Products Shelf Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:px-8" id="customer-products-shelf">
        {products.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center space-y-3" id="catalog-shelf-empty">
            <Package className="w-14 h-14 text-slate-200 animate-pulse" />
            <h3 className="text-slate-700 font-extrabold text-sm">No items inside this catalog</h3>
            <p className="text-xs text-slate-400">The owner hasn't added products to this catalog folder yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="public-shelf-grid">
            {products.map((product) => {
              const activeImgIdx = slideshowIndices[product._id] || 0;
              const hasImages = product.images && product.images.length > 0;
              const activeImage = hasImages ? product.images[activeImgIdx] : '';

              return (
                <div
                  key={product._id}
                  onClick={() => handleOpenProductModal(product)}
                  className="bg-white border border-slate-100 hover:border-slate-250 cursor-pointer rounded-3xl overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between group transition-all duration-300"
                  id={`shelf-item-${product._id}`}
                >
                  {/* Photo slider block */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden" id={`shelf-item-preview-${product._id}`}>
                    {hasImages ? (
                      <img
                        src={activeImage}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform group-hover:scale-103 duration-500"
                        id={`shelf-item-img-${product._id}`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 space-y-1" id={`shelf-item-noimg-${product._id}`}>
                        <Package className="w-12 h-12" />
                        <span className="text-[10px] uppercase font-mono">No Photos</span>
                      </div>
                    )}

                    {/* Left/Right floating slider triggers */}
                    {hasImages && product.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => slidePrev(product._id, product.images.length, e)}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-white/70 hover:bg-white text-slate-700 backdrop-blur-xs rounded-full shadow-xs hover:scale-110 transition-all cursor-pointer z-10"
                          id={`shelf-slide-prev-${product._id}`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => slideNext(product._id, product.images.length, e)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-white/70 hover:bg-white text-slate-700 backdrop-blur-xs rounded-full shadow-xs hover:scale-110 transition-all cursor-pointer z-10"
                          id={`shelf-slide-next-${product._id}`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <span className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md" id={`shelf-item-tag-${product._id}`}>
                      {product.category}
                    </span>

                    {hasImages && product.images.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1" id={`shelf-slideshow-indicators-${product._id}`}>
                        {product.images.map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              i === activeImgIdx ? 'bg-indigo-600 w-3' : 'bg-slate-300/60'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text descriptions */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between" id={`shelf-item-details-${product._id}`}>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1 text-sm border-b border-dashed border-slate-50 pb-1" id={`shelf-name-txt-${product._id}`}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed" id={`shelf-desc-txt-${product._id}`}>
                        {product.description || 'Tap product to view full specifications.'}
                      </p>
                    </div>

                    {/* Direct Contact Button CTA */}
                    <div className="grid grid-cols-1 pt-2" id={`shelf-item-actions-${product._id}`}>
                      {settings?.whatsapp ? (
                        <a
                          href={getWhatsAppLink(product)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} // Overwrite container modal click
                          className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-55 border border-emerald-100 text-emerald-700 hover:text-white hover:bg-emerald-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Inquire on WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 text-center py-2 flex items-center justify-center bg-slate-50 rounded-xl">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Tap to view details
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. Product Details sheet modal overlay */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          id="product-details-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden w-full max-w-3xl border border-slate-100 flex flex-col shadow-2xl relative animate-zoom-in"
            id="modal-card"
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 p-1.5 bg-slate-900/15 group-hover:bg-slate-900/40 hover:bg-slate-50 text-slate-700 rounded-full transition-colors cursor-pointer"
              id="close-modal-btn"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Product Photos */}
              <div className="bg-slate-100 aspect-square md:aspect-auto flex flex-col justify-between p-4 relative min-h-[300px]">
                {selectedProduct.images?.[modalImageIdx] ? (
                  <img
                    src={selectedProduct.images[modalImageIdx]}
                    alt={selectedProduct.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain mx-auto"
                    id="modal-primary-image"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-350">
                    <Package className="w-14 h-14" />
                    <span className="text-xs uppercase font-mono tracking-wider font-bold mt-1">No Photos Saved</span>
                  </div>
                )}

                {/* Left/Right Floating modal image triggers */}
                {selectedProduct.images?.length > 1 && (
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between">
                    <button
                      onClick={() => setModalImageIdx(prev => prev === 0 ? selectedProduct.images.length - 1 : prev - 1)}
                      className="p-1.5 bg-white/80 hover:bg-white text-slate-705 rounded-full shadow-xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setModalImageIdx(prev => prev === selectedProduct.images.length - 1 ? 0 : prev + 1)}
                      className="p-1.5 bg-white/80 hover:bg-white text-slate-705 rounded-full shadow-xs cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Thumbnails list inside modal */}
                {selectedProduct.images?.length > 1 && (
                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-center space-x-2">
                    {selectedProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setModalImageIdx(idx)}
                        className={`w-9 h-9 border rounded-lg overflow-hidden bg-white shadow-xs transition-colors cursor-pointer ${
                          idx === modalImageIdx ? 'border-indigo-600 scale-103' : 'border-slate-200'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Specifications & CTAs */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md inline-block">
                      {selectedProduct.category}
                    </span>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                      {selectedProduct.name}
                    </h3>
                  </div>

                  <div className="space-y-2 border-t border-slate-50 pt-4 h-48 overflow-y-auto pr-1 text-slate-650 scrollbar-thin">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Product Description</p>
                    <p className="text-xs font-medium leading-relaxed whitespace-pre-line text-slate-600">
                      {selectedProduct.description || 'No descriptive catalog summary listed for this product.'}
                    </p>
                  </div>
                </div>

                {/* Contact CTA buttons drawer */}
                <div className="pt-4 border-t border-slate-100 space-y-2" id="modal-ctas">
                  {settings?.whatsapp && (
                    <a
                      href={getWhatsAppLink(selectedProduct)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm rounded-2xl shadow-md flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                      id="modal-whatsapp-cta"
                    >
                      <MessageSquare className="w-4.5 h-4.5 fill-white" />
                      <span>Place WhatsApp Order</span>
                    </a>
                  )}

                  {settings?.phone && (
                    <a
                      href={`tel:${settings.phone}`}
                      className="w-full py-3 border border-slate-100 hover:bg-slate-50 text-slate-700 font-bold text-xs md:text-sm rounded-2xl flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                      id="modal-phone-cta"
                    >
                      <Phone className="w-4.5 h-4.5" />
                      <span>Call {settings.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Clean Humble Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-center text-xs space-y-1.5" id="customer-footer">
        <p className="font-semibold text-slate-300">
          Powered by {settings?.shop_name || 'Our Shop'} Digital Catalog System
        </p>
        <p className="text-[10px] text-slate-500 max-w-sm mx-auto px-4 leading-normal">
          Direct outreach ordering enabled. Tap WhatsApp order triggers to automatically format product orders and chat with the shop operators.
        </p>
      </footer>
    </div>
  );
}
