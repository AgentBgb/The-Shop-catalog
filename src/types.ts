export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'owner' | 'worker';
  is_active: boolean;
  created_at: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface Catalog {
  _id: string;
  title: string;
  slug: string;
  product_ids: string[];
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface Settings {
  shop_name: string;
  shop_logo: string;
  phone: string;
  whatsapp: string;
  address: string;
}

export interface DashboardStats {
  total_products: number;
  total_catalogs: number;
  total_workers: number;
}
