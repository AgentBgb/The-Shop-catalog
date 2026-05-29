import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  _id: string;
  name: string;
  email: string;
  password_hash: string;
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

export interface DatabaseState {
  users: User[];
  products: Product[];
  catalogs: Catalog[];
  settings: Settings;
}

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = {
      users: [],
      products: [],
      catalogs: [],
      settings: {
        shop_name: 'ABC Electronics',
        shop_logo: '',
        phone: '+1234567890',
        whatsapp: '+1234567890',
        address: '123 Tech Avenue, Silicon Valley',
      },
    };
    this.load();
    this.seed();
  }

  private load() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.state = {
          users: parsed.users || [],
          products: parsed.products || [],
          catalogs: parsed.catalogs || [],
          settings: parsed.settings || {
            shop_name: 'ABC Electronics',
            shop_logo: '',
            phone: '+1234567890',
            whatsapp: '+1234567890',
            address: '123 Tech Avenue, Silicon Valley',
          },
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to load database, using empty state:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save database:', e);
    }
  }

  private seed() {
    // Seed default owner account if no users exist
    const ownerEmail = 'owner@gmail.com';
    const existingOwner = this.state.users.find(u => u.email.toLowerCase() === ownerEmail.toLowerCase());
    
    if (!existingOwner) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('123456', salt);
      const defaultOwner: User = {
        _id: 'owner-default-id',
        name: 'Shop Owner',
        email: ownerEmail,
        password_hash: hash,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      
      this.state.users.push(defaultOwner);
      this.save();
      console.log('Database seeded with default owner Account (owner@gmail.com / 123456)');
    }
  }

  // User APIs
  getUsers(): User[] {
    return this.state.users;
  }

  getUserById(id: string): User | undefined {
    return this.state.users.find(u => u._id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  saveUser(user: User): User {
    const idx = this.state.users.findIndex(u => u._id === user._id);
    if (idx >= 0) {
      this.state.users[idx] = user;
    } else {
      this.state.users.push(user);
    }
    this.save();
    return user;
  }

  // Product APIs
  getProducts(): Product[] {
    // Exclude soft deleted products by default
    return this.state.products.filter(p => !p.is_deleted);
  }

  getProductById(id: string): Product | undefined {
    const p = this.state.products.find(p => p._id === id);
    return p && !p.is_deleted ? p : undefined;
  }

  saveProduct(product: Product): Product {
    const idx = this.state.products.findIndex(p => p._id === product._id);
    if (idx >= 0) {
      this.state.products[idx] = product;
    } else {
      this.state.products.push(product);
    }
    this.save();
    return product;
  }

  // Catalog APIs
  getCatalogs(): Catalog[] {
    return this.state.catalogs;
  }

  getCatalogById(id: string): Catalog | undefined {
    return this.state.catalogs.find(c => c._id === id);
  }

  getCatalogBySlug(slug: string): Catalog | undefined {
    return this.state.catalogs.find(c => c.slug === slug);
  }

  saveCatalog(catalog: Catalog): Catalog {
    const idx = this.state.catalogs.findIndex(c => c._id === catalog._id);
    if (idx >= 0) {
      this.state.catalogs[idx] = catalog;
    } else {
      this.state.catalogs.push(catalog);
    }
    this.save();
    return catalog;
  }

  deleteCatalog(id: string): boolean {
    const idx = this.state.catalogs.findIndex(c => c._id === id);
    if (idx >= 0) {
      this.state.catalogs.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Settings APIs
  getSettings(): Settings {
    return this.state.settings;
  }

  saveSettings(settings: Settings): Settings {
    this.state.settings = settings;
    this.save();
    return this.state.settings;
  }
}

export const db = new Database();
