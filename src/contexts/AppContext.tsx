import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Product, Catalog, Settings, DashboardStats } from '../types';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextProps {
  token: string | null;
  currentUser: { _id: string; name: string; email: string; role: 'owner' | 'worker' } | null;
  settings: Settings | null;
  toasts: ToastMessage[];
  loading: boolean;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  getSettings: () => Promise<Settings>;
  updateSettings: (data: Partial<Settings>) => Promise<boolean>;
  getStats: () => Promise<DashboardStats | null>;
  getWorkers: () => Promise<User[]>;
  createWorker: (workerData: any) => Promise<boolean>;
  toggleWorkerStatus: (id: string, active: boolean) => Promise<boolean>;
  getProducts: (page: number, limit: number, search: string, category: string) => Promise<{ products: Product[]; total: number }>;
  getProductDetails: (id: string) => Promise<Product | null>;
  createProduct: (productData: any) => Promise<boolean>;
  updateProduct: (id: string, productData: any) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getCatalogs: () => Promise<Catalog[]>;
  getCatalogDetails: (id: string) => Promise<Catalog | null>;
  createCatalog: (title: string, product_ids: string[]) => Promise<boolean>;
  updateCatalog: (id: string, title: string, product_ids: string[]) => Promise<boolean>;
  deleteCatalog: (id: string) => Promise<boolean>;
  getPublicCatalogBySlug: (slug: string) => Promise<{ catalog: Catalog; products: Product[]; settings: Settings } | null>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('catalog_token'));
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('catalog_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-loaded Shop settings on boot (non-blocking)
  useEffect(() => {
    getSettings().catch(() => {});
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Automatically set Content-Type to application/json if sending a payload
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Invalidate expired sessions
      logout();
      addToast('Session expired. Please log in again.', 'error');
      throw new Error('Unauthorized session expired');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    return response.json();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Corrected relative path to be handled on same Express backend nicely
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      const userPayload = {
        _id: res.user?._id || 'default',
        name: res.user?.name || 'User',
        email: res.user?.email || email,
        role: res.role,
      };

      setToken(res.access_token);
      setCurrentUser(userPayload);
      localStorage.setItem('catalog_token', res.access_token);
      localStorage.setItem('catalog_user', JSON.stringify(userPayload));
      
      // Load settings immediately on login
      await getSettings();
      addToast('Successfully signed in!', 'success');
      setLoading(false);
      return true;
    } catch (err: any) {
      addToast(err.message || 'Login failed. Provide correct email and password.', 'error');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('catalog_token');
    localStorage.removeItem('catalog_user');
    addToast('Logged out successfully.', 'info');
  };

  const getSettings = async (): Promise<Settings> => {
    try {
      const res = await apiFetch('/api/settings');
      setSettings(res);
      return res;
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      throw err;
    }
  };

  const updateSettings = async (data: Partial<Settings>): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setSettings(res);
      addToast('Shop configuration saved successfully.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to update shop settings.', 'error');
      return false;
    }
  };

  const getStats = async (): Promise<DashboardStats | null> => {
    try {
      return await apiFetch('/api/dashboard/stats');
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      return null;
    }
  };

  const getWorkers = async (): Promise<User[]> => {
    try {
      return await apiFetch('/api/workers');
    } catch (err: any) {
      addToast(err.message || 'Failed to load workers list.', 'error');
      return [];
    }
  };

  const createWorker = async (workerData: any): Promise<boolean> => {
    try {
      await apiFetch('/api/workers', {
        method: 'POST',
        body: JSON.stringify(workerData),
      });
      addToast('New worker registered successfully.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to create worker account.', 'error');
      return false;
    }
  };

  const toggleWorkerStatus = async (id: string, active: boolean): Promise<boolean> => {
    try {
      await apiFetch(`/api/workers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: active }),
      });
      addToast('Worker activation status updated.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to update worker status.', 'error');
      return false;
    }
  };

  const getProducts = async (
    page: number,
    limit: number,
    search: string,
    category: string
  ): Promise<{ products: Product[]; total: number }> => {
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
      });
      const res = await apiFetch(`/api/products?${query.toString()}`);
      return {
        products: res.products || [],
        total: res.total || 0,
      };
    } catch (err: any) {
      addToast(err.message || 'Failed to load products list.', 'error');
      return { products: [], total: 0 };
    }
  };

  const getProductDetails = async (id: string): Promise<Product | null> => {
    try {
      return await apiFetch(`/api/products/${id}`);
    } catch (err) {
      return null;
    }
  };

  const createProduct = async (productData: any): Promise<boolean> => {
    try {
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      addToast('Product created successfully.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to create new product.', 'error');
      return false;
    }
  };

  const updateProduct = async (id: string, productData: any): Promise<boolean> => {
    try {
      await apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
      addToast('Product catalog information updated.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to update product details.', 'error');
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      addToast('Product page removed from catalog.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to delete product page.', 'error');
      return false;
    }
  };

  const getCatalogs = async (): Promise<Catalog[]> => {
    try {
      return await apiFetch('/api/catalogs');
    } catch (err: any) {
      addToast(err.message || 'Failed to load catalogs list.', 'error');
      return [];
    }
  };

  const getCatalogDetails = async (id: string): Promise<Catalog | null> => {
    try {
      return await apiFetch(`/api/catalogs/${id}`);
    } catch (err) {
      return null;
    }
  };

  const createCatalog = async (title: string, product_ids: string[]): Promise<boolean> => {
    try {
      await apiFetch('/api/catalogs', {
        method: 'POST',
        body: JSON.stringify({ title, product_ids }),
      });
      addToast('Digital sharing catalog published.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to build shareable catalog.', 'error');
      return false;
    }
  };

  const updateCatalog = async (id: string, title: string, product_ids: string[]): Promise<boolean> => {
    try {
      await apiFetch(`/api/catalogs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, product_ids }),
      });
      addToast('Catalog updated successfully.', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to update selected catalog.', 'error');
      return false;
    }
  };

  const deleteCatalog = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/catalogs/${id}`, {
        method: 'DELETE',
      });
      addToast('Shareable catalog removed from index.', 'info');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to delete shareable catalog.', 'error');
      return false;
    }
  };

  const getPublicCatalogBySlug = async (slug: string): Promise<{ catalog: Catalog; products: Product[]; settings: Settings } | null> => {
    try {
      const res = await apiFetch(`/api/public/catalogs/${slug}`);
      return res;
    } catch (err) {
      console.error('Failed to resolve public catalog slug:', err);
      return null;
    }
  };

  return (
    <AppContext.Provider
      value={{
        token,
        currentUser,
        settings,
        toasts,
        loading,
        addToast,
        removeToast,
        login,
        logout,
        getSettings,
        updateSettings,
        getStats,
        getWorkers,
        createWorker,
        toggleWorkerStatus,
        getProducts,
        getProductDetails,
        createProduct,
        updateProduct,
        deleteProduct,
        getCatalogs,
        getCatalogDetails,
        createCatalog,
        updateCatalog,
        deleteCatalog,
        getPublicCatalogBySlug,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be accessed inside an AppProvider wrapper');
  }
  return context;
}
