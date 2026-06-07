import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { MongoClient, Db, WithId } from 'mongodb';

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
  price?: number;
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

// Helper: load local JSON (if exists) for optional one-time migration
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

class MongoDatabase {
  private client: MongoClient;
  private db?: Db;

  constructor() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGO_DB_NAME || 'the_shop_catalog');

      // Optional migration from JSON file if flag set
      if (process.env.MIGRATE_FROM_JSON === 'true') {
        await this.migrateFromJsonIfNeeded();
      }
      await this.seedDefaultOwner();
    }
  }

  // --- Migration helper ---
  private async migrateFromJsonIfNeeded() {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      const users = parsed.users || [];
      const products = parsed.products || [];
      const catalogs = parsed.catalogs || [];
      const settings = parsed.settings || null;

      const usersColl = this.db!.collection('users');
      const productsColl = this.db!.collection('products');
      const catalogsColl = this.db!.collection('catalogs');
      const settingsColl = this.db!.collection('settings');

      // Simple upserts by _id
      for (const u of users) {
        await usersColl.updateOne({ _id: u._id }, { $set: u }, { upsert: true });
      }
      for (const p of products) {
        await productsColl.updateOne({ _id: p._id }, { $set: p }, { upsert: true });
      }
      for (const c of catalogs) {
        await catalogsColl.updateOne({ _id: c._id }, { $set: c }, { upsert: true });
      }
      if (settings) {
        await settingsColl.updateOne({}, { $set: settings }, { upsert: true });
      }

      console.log('Migration from data/db.json to MongoDB completed (MIGRATE_FROM_JSON=true).');
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }

  private async seedDefaultOwner() {
    const usersColl = this.db!.collection<User>('users');
    const ownerEmail = 'owner@gmail.com';
    const existing = await usersColl.findOne({ email: { $regex: new RegExp(`^${ownerEmail}$`, 'i') } });
    if (!existing) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('123456', salt);
      await usersColl.insertOne({
        _id: 'owner-default-id',
        name: 'Shop Owner',
        email: ownerEmail,
        password_hash: hash,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
      });
      console.log('MongoDB seeded with default owner Account (owner@gmail.com / 123456)');
    }
  }

  // --- User APIs ---
  async getUsers(): Promise<User[]> {
    await this.connect();
    return this.db!.collection<User>('users').find().toArray();
  }

  async getUserById(id: string): Promise<User | null> {
    await this.connect();
    return this.db!.collection<User>('users').findOne({ _id: id });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.connect();
    return this.db!.collection<User>('users').findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
  }

  async saveUser(user: User): Promise<User> {
    await this.connect();
    await this.db!.collection<User>('users').updateOne({ _id: user._id }, { $set: user }, { upsert: true });
    return user;
  }

  // --- Product APIs ---
  async getProducts(): Promise<Product[]> {
    await this.connect();
    return this.db!.collection<Product>('products').find({ is_deleted: { $ne: true } }).toArray();
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.connect();
    return this.db!.collection<Product>('products').findOne({ _id: id, is_deleted: { $ne: true } });
  }

  async saveProduct(product: Product): Promise<Product> {
    await this.connect();
    await this.db!.collection<Product>('products').updateOne({ _id: product._id }, { $set: product }, { upsert: true });
    return product;
  }

  // --- Catalog APIs ---
  async getCatalogs(): Promise<Catalog[]> {
    await this.connect();
    return this.db!.collection<Catalog>('catalogs').find().toArray();
  }

  async getCatalogById(id: string): Promise<Catalog | null> {
    await this.connect();
    return this.db!.collection<Catalog>('catalogs').findOne({ _id: id });
  }

  async getCatalogBySlug(slug: string): Promise<Catalog | null> {
    await this.connect();
    return this.db!.collection<Catalog>('catalogs').findOne({ slug });
  }

  async saveCatalog(catalog: Catalog): Promise<Catalog> {
    await this.connect();
    await this.db!.collection<Catalog>('catalogs').updateOne({ _id: catalog._id }, { $set: catalog }, { upsert: true });
    return catalog;
  }

  async deleteCatalog(id: string): Promise<boolean> {
    await this.connect();
    const res = await this.db!.collection<Catalog>('catalogs').deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  // --- Settings ---
  async getSettings(): Promise<Settings> {
    await this.connect();
    const s = await this.db!.collection<Settings>('settings').findOne({});
    if (s) return s;
    const defaultSettings: Settings = {
      shop_name: 'The Apna Bazar Mobile',
      shop_logo: '',
      phone: '+919099396065',
      whatsapp: '+919099396065',
      address: '123 Tech Avenue, Mota Varachha, Surat',
    };
    await this.db!.collection<Settings>('settings').insertOne(defaultSettings as any);
    return defaultSettings;
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    await this.connect();
    await this.db!.collection<Settings>('settings').updateOne({}, { $set: settings }, { upsert: true });
    return settings;
  }
}

// Export a single db instance that matches the previous API surface but backed by Mongo
const mongoDb = new MongoDatabase();

export const db = {
  // User APIs
  getUsers: () => mongoDb.getUsers(),
  getUserById: (id: string) => mongoDb.getUserById(id),
  getUserByEmail: (email: string) => mongoDb.getUserByEmail(email),
  saveUser: (user: User) => mongoDb.saveUser(user),

  // Product APIs
  getProducts: () => mongoDb.getProducts(),
  getProductById: (id: string) => mongoDb.getProductById(id),
  saveProduct: (product: Product) => mongoDb.saveProduct(product),

  // Catalog APIs
  getCatalogs: () => mongoDb.getCatalogs(),
  getCatalogById: (id: string) => mongoDb.getCatalogById(id),
  getCatalogBySlug: (slug: string) => mongoDb.getCatalogBySlug(slug),
  saveCatalog: (catalog: Catalog) => mongoDb.saveCatalog(catalog),
  deleteCatalog: (id: string) => mongoDb.deleteCatalog(id),

  // Settings
  getSettings: () => mongoDb.getSettings(),
  saveSettings: (settings: Settings) => mongoDb.saveSettings(settings),
} as const;

