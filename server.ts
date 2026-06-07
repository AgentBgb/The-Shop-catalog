import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
let createViteServer: any;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  import('vite').then(m => {
    createViteServer = m.createServer;
  }).catch(e => console.error('Vite import failed.'));
}
import { v2 as cloudinary } from 'cloudinary';
import { db, User, Product, Catalog, Settings } from './server/db.js';
const app = express();
// Allow overriding the port via environment variable. Default to 8080 per user request.
const PORT = parseInt(process.env.PORT || '8080', 10);

// Setup JSON body parsing with large limit for image upload
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Setup local uploads storage and serving
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
const uploadsDir = isVercel
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}
app.use('/uploads', express.static(uploadsDir));

// Configure Cloudinary if credentials exist
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = !!(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary successfully configured.');
} else {
  console.log('Cloudinary keys not detected. Applet is falling back to server local uploads storage (/uploads/*).');
}

// JWT configurations
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'default-jwt-secret-key-shop-catalog';
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '1440', 10);

// Simple logging for request auditing
app.use((req, res, next) => {
  // Avoid logging a noisy stream of Vite / node_modules requests in dev.
  // These are static ESM module requests (icons, assets) and don't need
  // to appear in the main audit stream.
  const noisyPrefixes = ['/node_modules/', '/@vite/', '/@fs/', '/favicon.ico', '/assets/', '/uploads/'];
  const url = req.originalUrl || req.url || '';
  if (!noisyPrefixes.some(p => url.startsWith(p))) {
    console.log(`[AUDIT] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Helper: Base64 image uploader
async function handleImageUpload(base64Str: string): Promise<string> {
  if (!base64Str) return '';
  // If it's a base64 data URL, upload that data (or fallback to local)
  if (base64Str.startsWith('data:image/')) {
    if (isCloudinaryConfigured) {
      try {
        const res = await cloudinary.uploader.upload(base64Str, {
          folder: 'shop_catalogs',
        });
        return res.secure_url;
      } catch (e) {
        console.error('Cloudinary upload failure for base64 image, attempting local fallback:', e);
      }
    }

    try {
      const match = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!match) return base64Str;
      const ext = match[1] || 'png';
      const data = match[2];
      const buffer = Buffer.from(data, 'base64');
      const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      return `/uploads/${filename}`;
    } catch (err) {
      console.error('Local image save operation failed for base64:', err);
      return 'https://picsum.photos/seed/placeholder/600/400';
    }
  }

  // Non-base64 input: it might be a full URL (http/https) or a local uploads path.
  // If it's a remote URL, return as-is. If it's a local file path and Cloudinary is configured,
  // attempt to upload the local file and return the Cloudinary URL.
  const trimmed = base64Str.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Treat paths beginning with /uploads or relative uploads paths as local files
  const possibleLocal = trimmed.startsWith('/uploads') || trimmed.startsWith('uploads') || trimmed.startsWith('.') || path.isAbsolute(trimmed);
  if (possibleLocal) {
    const localPath = path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed.startsWith('/') ? trimmed.substr(1) : trimmed);
    if (fs.existsSync(localPath)) {
      if (isCloudinaryConfigured) {
        try {
          const res = await cloudinary.uploader.upload(localPath, { folder: 'shop_catalogs' });
          return res.secure_url;
        } catch (e) {
          console.error('Cloudinary upload failure for local file, returning local path:', e);
          return trimmed;
        }
      }
      return trimmed;
    }
    // If file doesn't exist, return as-is
    return trimmed;
  }

  // Otherwise, just return the input unchanged
  return trimmed;
}

// Authentication Middleware
interface CustomRequest extends express.Request {
  user?: {
    _id: string;
    role: 'owner' | 'worker';
    email: string;
    name: string;
  };
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Token is invalid or expired' });
      return;
    }
    (req as CustomRequest).user = decoded;
    next();
  });
}

function ownerRequired(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const user = (req as CustomRequest).user;
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Unauthorized. Owner privilege required.' });
    return;
  }
  next();
}

function workerOrOwnerRequired(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const user = (req as CustomRequest).user;
  if (!user || (user.role !== 'owner' && user.role !== 'worker')) {
    res.status(403).json({ error: 'Unauthorized. Authentication Required.' });
    return;
  }
  next();
}

// -------------------------------------------------------------
// Authentication Endpoint
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'Your account has been deactivated' });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Generate User JWT Token
  const tokenPayload = {
    _id: user._id,
    role: user.role,
    email: user.email,
    name: user.name,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, {
    expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`,
  });

  res.json({
    access_token: accessToken,
    token_type: 'bearer',
    role: user.role,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    }
  });
});

// Support standard redundant FastAPI-style /auth/login for direct compliance
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.getUserByEmail(email);
  if (!user || !user.is_active || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const accessToken = jwt.sign({ _id: user._id, role: user.role, email: user.email, name: user.name }, JWT_SECRET_KEY, {
    expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`,
  });
  res.json({ access_token: accessToken, token_type: 'bearer', role: user.role });
});

// -------------------------------------------------------------
// Worker Management APIs (Owner Only)
// -------------------------------------------------------------
app.post('/api/workers', authenticateToken, ownerRequired, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Worker email address is already in use' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newWorker: User = {
    _id: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    email,
    password_hash: passwordHash,
    role: 'worker',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  await db.saveUser(newWorker);
  res.status(201).json({
    _id: newWorker._id,
    name: newWorker.name,
    email: newWorker.email,
    role: newWorker.role,
    is_active: newWorker.is_active,
    created_at: newWorker.created_at,
  });
});

// Supports redundant path /workers
app.post('/workers', authenticateToken, ownerRequired, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }
  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Worker email already exists' });
    return;
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const newWorker: User = {
    _id: `worker_${Date.now()}`,
    name,
    email,
    password_hash: passwordHash,
    role: 'worker',
    is_active: true,
    created_at: new Date().toISOString(),
  };
  await db.saveUser(newWorker);
  res.status(201).json(newWorker);
});

app.get('/api/workers', authenticateToken, ownerRequired, async (req, res) => {
  const users = await db.getUsers();
  const workers = users.filter(u => u.role === 'worker');
  res.json(workers.map(w => ({
    _id: w._id,
    name: w.name,
    email: w.email,
    is_active: w.is_active,
    created_at: w.created_at,
  })));
});

// Supports redundant path /workers
app.get('/workers', authenticateToken, ownerRequired, async (req, res) => {
  const users = await db.getUsers();
  const workers = users.filter(u => u.role === 'worker');
  res.json(workers);
});

app.patch('/api/workers/:id/status', authenticateToken, ownerRequired, async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const worker = await db.getUserById(id);
  if (!worker || worker.role !== 'worker') {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }

  worker.is_active = typeof is_active === 'boolean' ? is_active : !worker.is_active;
  await db.saveUser(worker);

  res.json({
    _id: worker._id,
    name: worker.name,
    email: worker.email,
    is_active: worker.is_active,
  });
});

// Supports redundant path /workers/{id}/status
app.patch('/workers/:id/status', authenticateToken, ownerRequired, async (req, res) => {
  const { id } = req.params;
  const worker = await db.getUserById(id);
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }
  worker.is_active = typeof req.body.is_active === 'boolean' ? req.body.is_active : !worker.is_active;
  await db.saveUser(worker);
  res.json(worker);
});

// -------------------------------------------------------------
// Product APIs (Owner only for mutations, Owner/Worker for read)
// -------------------------------------------------------------
// Helper: migrate a product's local images to Cloudinary when configured
async function migrateProductImages(product: Product | null): Promise<void> {
  if (!product || !product.images || !isCloudinaryConfigured) return;
  let updated = false;
  const newImages: string[] = [];
  for (const img of product.images) {
    if (!img) continue;
    // If likely a local path, attempt to upload
    if (img.startsWith('/uploads') || img.startsWith('uploads') || !img.startsWith('http://') && !img.startsWith('https://')) {
      try {
        const uploaded = await handleImageUpload(img);
        if (uploaded && uploaded !== img) {
          newImages.push(uploaded);
          updated = true;
          continue;
        }
      } catch (e) {
        console.error('Failed to migrate product image to Cloudinary:', e);
      }
    }
    newImages.push(img);
  }

  if (updated) {
    product.images = newImages;
    try {
      await db.saveProduct(product);
    } catch (e) {
      console.error('Failed to save product after migrating images:', e);
    }
  }
}

app.post('/api/products', authenticateToken, ownerRequired, async (req, res) => {
  const { name, description, category, images, price } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Product name is required' });
    return;
  }

  try {
    const uploadedUrls: string[] = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img) {
          const url = await handleImageUpload(img);
          uploadedUrls.push(url);
        }
      }
    }

    const newProduct: Product = {
      _id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      description: description || '',
      price: typeof price === 'number' ? price : undefined,
      category: category || 'General',
      images: uploadedUrls,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.saveProduct(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(550).json({ error: 'Failed to process product creation images' });
  }
});

// GET /api/products (pagination, search, category filter)
app.get('/api/products', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const search = (req.query.search as string || '').toLowerCase();
  const category = (req.query.category as string || '').toLowerCase();

  let products = await db.getProducts();

  if (category) {
    products = products.filter(p => p.category.toLowerCase() === category);
  }

  if (search) {
    products = products.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.description.toLowerCase().includes(search)
    );
  }

  const total = products.length;
  const startIndex = (page - 1) * limit;
  const paginated = products.slice(startIndex, startIndex + limit);
  // Attempt to migrate images for returned products in the background (await briefly to persist)
  for (const p of paginated) {
    // best-effort migration
    // eslint-disable-next-line no-await-in-loop
    await migrateProductImages(p);
  }

  res.json({
    total,
    page,
    limit,
    products: paginated,
  });
});

app.get('/api/products/:id', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const product = await db.getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  await migrateProductImages(product);
  res.json(product);
});

app.put('/api/products/:id', authenticateToken, ownerRequired, async (req, res) => {
  const { id } = req.params;
  const product = await db.getProductById(id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const { name, description, category, images, price } = req.body;

  try {
    const uploadedUrls: string[] = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img) {
          const url = await handleImageUpload(img);
          uploadedUrls.push(url);
        }
      }
    }

  product.name = name !== undefined ? name : product.name;
  product.description = description !== undefined ? description : product.description;
  product.category = category !== undefined ? category : product.category;
  product.price = typeof price === 'number' ? price : product.price;
    if (images !== undefined) {
      product.images = uploadedUrls;
    }
    product.updated_at = new Date().toISOString();

    await db.saveProduct(product);
    res.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product. Image processing layer error.' });
  }
});

app.delete('/api/products/:id', authenticateToken, ownerRequired, async (req, res) => {
  const product = await db.getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Soft delete representation
  product.is_deleted = true;
  product.updated_at = new Date().toISOString();
  await db.saveProduct(product);

  res.json({ success: true, message: 'Product soft deleted successfully' });
});

// -------------------------------------------------------------
// Catalog APIs (Owner and Workers both create, update, delete own/all)
// -------------------------------------------------------------
app.post('/api/catalogs', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const { title, product_ids } = req.body;
  if (!title || !product_ids || !Array.isArray(product_ids)) {
    res.status(400).json({ error: 'Catalog title and product IDs array are required' });
    return;
  }

  const user = (req as CustomRequest).user!;
  
  // Create randomized slug to avoid conflicts and represent sharing URL
  const randomSuffix = Math.random().toString(36).substr(2, 5);
  const baseSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = `${baseSlug || 'catalog'}-${randomSuffix}`;

  const newCatalog: Catalog = {
    _id: `catalog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title,
    slug,
    product_ids,
    created_by: user._id,
    created_by_name: user.name,
    created_at: new Date().toISOString(),
  };

  await db.saveCatalog(newCatalog);
  res.status(201).json(newCatalog);
});

// GET /api/catalogs
// Owner: Returns all catalogs.
// Worker: Returns own catalogs only.
app.get('/api/catalogs', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const user = (req as CustomRequest).user!;
  const catalogs = await db.getCatalogs();

  if (user.role === 'owner') {
    res.json(catalogs);
  } else {
    // Filter catalogs created by this worker only
    const owned = catalogs.filter(c => c.created_by === user._id);
    res.json(owned);
  }
});

app.get('/api/catalogs/:id', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const { id } = req.params;
  const user = (req as CustomRequest).user!;
  const catalog = await db.getCatalogById(id);

  if (!catalog) {
    res.status(404).json({ error: 'Catalog not found' });
    return;
  }

  // Security check: worker can only read their own created catalog
  if (user.role === 'worker' && catalog.created_by !== user._id) {
    res.status(403).json({ error: 'Access forbidden. This is not your catalog.' });
    return;
  }

  res.json(catalog);
});

app.put('/api/catalogs/:id', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const { id } = req.params;
  const user = (req as CustomRequest).user!;
  const catalog = await db.getCatalogById(id);

  if (!catalog) {
    res.status(404).json({ error: 'Catalog not found' });
    return;
  }

  // Security check: worker can only update their own created catalog, owner can update anything
  if (user.role === 'worker' && catalog.created_by !== user._id) {
    res.status(403).json({ error: 'Access forbidden. You can only modify your own catalogs.' });
    return;
  }

  const { title, product_ids } = req.body;
  
  if (title !== undefined) {
    catalog.title = title;
  }
  if (product_ids !== undefined && Array.isArray(product_ids)) {
    catalog.product_ids = product_ids;
  }

  await db.saveCatalog(catalog);
  res.json(catalog);
});

app.delete('/api/catalogs/:id', authenticateToken, workerOrOwnerRequired, async (req, res) => {
  const { id } = req.params;
  const user = (req as CustomRequest).user!;
  const catalog = await db.getCatalogById(id);

  if (!catalog) {
    res.status(404).json({ error: 'Catalog not found' });
    return;
  }

  // Security check: worker can only delete their own catalog, owner can delete any catalog
  if (user.role === 'worker' && catalog.created_by !== user._id) {
    res.status(403).json({ error: 'Access forbidden. You can only delete your own catalogs.' });
    return;
  }

  await db.deleteCatalog(id);
  res.json({ success: true, message: 'Catalog deleted successfully' });
});

// -------------------------------------------------------------
// Public APIs (No authentication required)
// -------------------------------------------------------------
app.get('/api/public/catalogs/:slug', async (req, res) => {
  const { slug } = req.params;
  const catalog = await db.getCatalogBySlug(slug);

  if (!catalog) {
    res.status(404).json({ error: 'Catalog resource not found' });
    return;
  }

  // Get full details of active products in catalog
  const productsArr = await Promise.all(catalog.product_ids.map(async (pId) => await db.getProductById(pId)));
  const products = productsArr.filter((p): p is Product => !!p && !p.is_deleted);

  const settings = await db.getSettings();

  // Attempt to migrate images for returned products
  for (const p of products) {
    // eslint-disable-next-line no-await-in-loop
    await migrateProductImages(p);
  }

  res.json({
    catalog: {
      _id: catalog._id,
      title: catalog.title,
      slug: catalog.slug,
      created_at: catalog.created_at,
    },
    products: products,
    settings,
  });
});

// Directly support FastAPI-style `/public/catalogs/{slug}` without `/api` prefix
app.get('/public/catalogs/:slug', async (req, res) => {
  const catalog = await db.getCatalogBySlug(req.params.slug);
  if (!catalog) {
    res.status(404).json({ error: 'Catalog not found' });
    return;
  }
  const productsArr = await Promise.all(catalog.product_ids.map(async (pId) => await db.getProductById(pId)));
  const products = productsArr.filter((p): p is Product => !!p && !p.is_deleted);
  const settings = await db.getSettings();
  for (const p of products) {
    // eslint-disable-next-line no-await-in-loop
    await migrateProductImages(p);
  }
  res.json({ catalog, products, settings });
});

// -------------------------------------------------------------
// Settings APIs
// -------------------------------------------------------------
app.get('/api/settings', async (req, res) => {
  let settings = await db.getSettings();

  try {
    // If shop_logo is a local uploads path, attempt to migrate it to Cloudinary
    if (isCloudinaryConfigured && settings && settings.shop_logo && (settings.shop_logo.startsWith('/uploads') || settings.shop_logo.startsWith('uploads'))) {
      const localPath = path.join(process.cwd(), settings.shop_logo.startsWith('/') ? settings.shop_logo.substr(1) : settings.shop_logo);
      if (fs.existsSync(localPath)) {
        try {
          const resUpload = await cloudinary.uploader.upload(localPath, { folder: 'shop_catalogs' });
          settings.shop_logo = resUpload.secure_url;
          // Persist updated settings back to DB
          await db.saveSettings(settings);
        } catch (e) {
          console.error('Failed to migrate local shop_logo to Cloudinary:', e);
        }
      }
    }
  } catch (err) {
    console.error('Error while attempting settings migration:', err);
  }

  res.json(settings);
});

app.put('/api/settings', authenticateToken, ownerRequired, async (req, res) => {
  const { shop_name, shop_logo, phone, whatsapp, address } = req.body;
  const currentSettings = await db.getSettings();

  try {
    let logoUrl = currentSettings.shop_logo;
    if (shop_logo && shop_logo.startsWith('data:image/')) {
      logoUrl = await handleImageUpload(shop_logo);
    } else if (shop_logo !== undefined) {
      logoUrl = shop_logo;
    }

    const updatedSettings: Settings = {
      shop_name: shop_name !== undefined ? shop_name : currentSettings.shop_name,
      shop_logo: logoUrl,
      phone: phone !== undefined ? phone : currentSettings.phone,
      whatsapp: whatsapp !== undefined ? whatsapp : currentSettings.whatsapp,
      address: address !== undefined ? address : currentSettings.address,
    };

    await db.saveSettings(updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to process settings updates. Logo upload failure.' });
  }
});

// -------------------------------------------------------------
// Dashboard API
// -------------------------------------------------------------
app.get('/api/dashboard/stats', authenticateToken, ownerRequired, async (req, res) => {
  const products = await db.getProducts();
  const catalogs = await db.getCatalogs();
  const users = await db.getUsers();

  const totalProducts = products.length;
  const totalCatalogs = catalogs.length;
  const totalWorkers = users.filter(u => u.role === 'worker').length;

  res.json({
    total_products: totalProducts,
    total_catalogs: totalCatalogs,
    total_workers: totalWorkers,
  });
});

// Support FastAPI style for workers too
app.get('/dashboard/stats', authenticateToken, ownerRequired, async (req, res) => {
  const products = await db.getProducts();
  const catalogs = await db.getCatalogs();
  const users = await db.getUsers();

  res.json({
    total_products: products.length,
    total_catalogs: catalogs.length,
    total_workers: users.filter(u => u.role === 'worker').length,
  });
});

// -------------------------------------------------------------
// Fast API Swagger and ReDoc Route Handlers
// -------------------------------------------------------------
app.get('/api/swagger', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Product Catalog API', version: '1.0.0' },
    paths: {},
  });
});

app.get('/swagger', (req, res) => {
  res.send(`
    <html>
      <head><title>Swagger API Specs</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1>Swagger API Reference</h1>
        <p>This Express server dynamically routes FastAPI-compatible endpoints. Here are the active routes:</p>
        <ul>
          <li><strong>POST /api/auth/login</strong> - Log in as Owner or Worker</li>
          <li><strong>POST /api/workers</strong> - Create worker accounts (Owner only)</li>
          <li><strong>GET /api/workers</strong> - List shop workers</li>
          <li><strong>PATCH /api/workers/:id/status</strong> - Toggle worker account status</li>
          <li><strong>GET /api/products</strong> - Search with pagination & category filtering</li>
          <li><strong>POST /api/products</strong> - Save multiple-image products</li>
          <li><strong>GET /api/public/catalogs/:slug</strong> - Public catalog reader (No Auth)</li>
        </ul>
      </body>
    </html>
  `);
});

app.get('/redoc', (req, res) => {
  res.redirect('/swagger');
});

// -------------------------------------------------------------
// Vite Single-Page Application Fallback Middleware
// -------------------------------------------------------------
async function startViteServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    if (!createViteServer) {
      const { createServer } = await import('vite');
      createViteServer = createServer;
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Prevent noisy console errors from lucide-react missing/invalid source maps by
    // intercepting requests for its .map files and returning empty responses.
    // This is a dev-only workaround for versions of lucide-react that reference
    // source maps which aren't present or are malformed.
    app.use((req, res, next) => {
      try {
        let url = req.originalUrl || req.url || '';
        // Normalize Windows backslashes which may appear in some resolved paths
        url = String(url).replace(/\\/g, '/');
        const lower = url.toLowerCase();

        // If this looks like a node_modules or vite-resolved file map request,
        // short-circuit with 204. This is a dev-only suppression for packages
        // (like lucide-react) that reference missing or malformed .map files.
        if (lower.endsWith('.map') && (lower.includes('node_modules') || lower.includes('/@fs/') || lower.includes('/@id/'))) {
          res.status(204).end();
          return;
        }
      } catch (e) {
        // swallow middleware errors to avoid breaking dev server
      }
      next();
    });
    app.use(vite.middlewares);
    console.log('Vite loaded in Development Mode Middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static assets (but skip /api routes to let API handlers take priority)
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      express.static(distPath)(req, res, next);
    });
    // SPA fallback: Redirect non-API routes to index.html for client-side routing
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production Single-Page Application assets mounted.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    const host = '0.0.0.0';
    console.log(`Express application active on http://${host}:${PORT}`);
    // Helpful reminder for local access using localhost
    if (host === '0.0.0.0') {
      console.log(`Also accessible on http://localhost:${PORT}`);
    }
  });
}

// Start Vite Server or Export App for Vercel
if (process.env.VERCEL) {
  // When running on Vercel, we just export the Express app for Serverless Functions
  console.log('Exporting Express app for Vercel...');
} else {
  startViteServer().catch(err => {
    console.error('Initialization failure during Vite middleware boot:', err);
  });
}

export default app;
