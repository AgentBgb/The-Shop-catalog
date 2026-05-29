import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { v2 as cloudinary } from 'cloudinary';
import { db, User, Product, Catalog, Settings } from './server/db.js';

const app = express();
const PORT = 3000;

// Setup JSON body parsing with large limit for image upload
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Setup local uploads storage and serving
const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
  console.log(`[AUDIT] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Helper: Base64 image uploader
async function handleImageUpload(base64Str: string): Promise<string> {
  if (!base64Str) return '';
  if (!base64Str.startsWith('data:image/')) {
    // If it's already a URL, return directly
    return base64Str;
  }

  if (isCloudinaryConfigured) {
    try {
      const res = await cloudinary.uploader.upload(base64Str, {
        folder: 'shop_catalogs',
      });
      return res.secure_url;
    } catch (e) {
      console.error('Cloudinary upload failure, attempting local fallback:', e);
    }
  }

  // Fallback to local files
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
    console.error('Local image save operation failed:', err);
    return 'https://picsum.photos/seed/placeholder/600/400';
  }
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
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.getUserByEmail(email);
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
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.getUserByEmail(email);
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
app.post('/api/workers', authenticateToken, ownerRequired, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const existing = db.getUserByEmail(email);
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

  db.saveUser(newWorker);
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
app.post('/workers', authenticateToken, ownerRequired, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }
  const existing = db.getUserByEmail(email);
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
  db.saveUser(newWorker);
  res.status(201).json(newWorker);
});

app.get('/api/workers', authenticateToken, ownerRequired, (req, res) => {
  const workers = db.getUsers().filter(u => u.role === 'worker');
  res.json(workers.map(w => ({
    _id: w._id,
    name: w.name,
    email: w.email,
    is_active: w.is_active,
    created_at: w.created_at,
  })));
});

// Supports redundant path /workers
app.get('/workers', authenticateToken, ownerRequired, (req, res) => {
  const workers = db.getUsers().filter(u => u.role === 'worker');
  res.json(workers);
});

app.patch('/api/workers/:id/status', authenticateToken, ownerRequired, (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const worker = db.getUserById(id);
  if (!worker || worker.role !== 'worker') {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }

  worker.is_active = typeof is_active === 'boolean' ? is_active : !worker.is_active;
  db.saveUser(worker);

  res.json({
    _id: worker._id,
    name: worker.name,
    email: worker.email,
    is_active: worker.is_active,
  });
});

// Supports redundant path /workers/{id}/status
app.patch('/workers/:id/status', authenticateToken, ownerRequired, (req, res) => {
  const { id } = req.params;
  const worker = db.getUserById(id);
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }
  worker.is_active = typeof req.body.is_active === 'boolean' ? req.body.is_active : !worker.is_active;
  db.saveUser(worker);
  res.json(worker);
});

// -------------------------------------------------------------
// Product APIs (Owner only for mutations, Owner/Worker for read)
// -------------------------------------------------------------
app.post('/api/products', authenticateToken, ownerRequired, async (req, res) => {
  const { name, description, category, images } = req.body;
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
      category: category || 'General',
      images: uploadedUrls,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveProduct(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(550).json({ error: 'Failed to process product creation images' });
  }
});

// GET /api/products (pagination, search, category filter)
app.get('/api/products', authenticateToken, workerOrOwnerRequired, (req, res) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const search = (req.query.search as string || '').toLowerCase();
  const category = (req.query.category as string || '').toLowerCase();

  let products = db.getProducts();

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

  res.json({
    total,
    page,
    limit,
    products: paginated,
  });
});

app.get('/api/products/:id', authenticateToken, workerOrOwnerRequired, (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

app.put('/api/products/:id', authenticateToken, ownerRequired, async (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const { name, description, category, images } = req.body;

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
    if (images !== undefined) {
      product.images = uploadedUrls;
    }
    product.updated_at = new Date().toISOString();

    db.saveProduct(product);
    res.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product. Image processing layer error.' });
  }
});

app.delete('/api/products/:id', authenticateToken, ownerRequired, (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Soft delete representation
  product.is_deleted = true;
  product.updated_at = new Date().toISOString();
  db.saveProduct(product);

  res.json({ success: true, message: 'Product soft deleted successfully' });
});

// -------------------------------------------------------------
// Catalog APIs (Owner and Workers both create, update, delete own/all)
// -------------------------------------------------------------
app.post('/api/catalogs', authenticateToken, workerOrOwnerRequired, (req, res) => {
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

  db.saveCatalog(newCatalog);
  res.status(201).json(newCatalog);
});

// GET /api/catalogs
// Owner: Returns all catalogs.
// Worker: Returns own catalogs only.
app.get('/api/catalogs', authenticateToken, workerOrOwnerRequired, (req, res) => {
  const user = (req as CustomRequest).user!;
  const catalogs = db.getCatalogs();

  if (user.role === 'owner') {
    res.json(catalogs);
  } else {
    // Filter catalogs created by this worker only
    const owned = catalogs.filter(c => c.created_by === user._id);
    res.json(owned);
  }
});

app.get('/api/catalogs/:id', authenticateToken, workerOrOwnerRequired, (req, res) => {
  const { id } = req.params;
  const user = (req as CustomRequest).user!;
  const catalog = db.getCatalogById(id);

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

app.put('/api/catalogs/:id', authenticateToken, workerOrOwnerRequired, (req, res) => {
  const { id } = req.params;
  const user = (req as CustomRequest).user!;
  const catalog = db.getCatalogById(id);

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

  db.saveCatalog(catalog);
  res.json(catalog);
});

app.delete('/api/catalogs/:id', authenticateToken, workerOrOwnerRequired, (req, res) => {
  const { id } = req.params;
  const user = (req as CustomRequest).user!;
  const catalog = db.getCatalogById(id);

  if (!catalog) {
    res.status(404).json({ error: 'Catalog not found' });
    return;
  }

  // Security check: worker can only delete their own catalog, owner can delete any catalog
  if (user.role === 'worker' && catalog.created_by !== user._id) {
    res.status(403).json({ error: 'Access forbidden. You can only delete your own catalogs.' });
    return;
  }

  db.deleteCatalog(id);
  res.json({ success: true, message: 'Catalog deleted successfully' });
});

// -------------------------------------------------------------
// Public APIs (No authentication required)
// -------------------------------------------------------------
app.get('/api/public/catalogs/:slug', (req, res) => {
  const { slug } = req.params;
  const catalog = db.getCatalogBySlug(slug);

  if (!catalog) {
    res.status(404).json({ error: 'Catalog resource not found' });
    return;
  }

  // Get full details of active products in catalog
  const products = catalog.product_ids
    .map(pId => db.getProductById(pId))
    .filter((p): p is Product => p !== undefined);

  res.json({
    catalog: {
      _id: catalog._id,
      title: catalog.title,
      slug: catalog.slug,
      created_at: catalog.created_at,
    },
    products: products,
    settings: db.getSettings(),
  });
});

// Directly support FastAPI-style `/public/catalogs/{slug}` without `/api` prefix
app.get('/public/catalogs/:slug', (req, res) => {
  const catalog = db.getCatalogBySlug(req.params.slug);
  if (!catalog) {
    res.status(404).json({ error: 'Catalog not found' });
    return;
  }
  const products = catalog.product_ids
    .map(pId => db.getProductById(pId))
    .filter((p): p is Product => p !== undefined);
  res.json({ catalog, products, settings: db.getSettings() });
});

// -------------------------------------------------------------
// Settings APIs
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', authenticateToken, ownerRequired, async (req, res) => {
  const { shop_name, shop_logo, phone, whatsapp, address } = req.body;
  const currentSettings = db.getSettings();

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

    db.saveSettings(updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to process settings updates. Logo upload failure.' });
  }
});

// -------------------------------------------------------------
// Dashboard API
// -------------------------------------------------------------
app.get('/api/dashboard/stats', authenticateToken, ownerRequired, (req, res) => {
  const totalProducts = db.getProducts().length;
  const totalCatalogs = db.getCatalogs().length;
  const totalWorkers = db.getUsers().filter(u => u.role === 'worker').length;

  res.json({
    total_products: totalProducts,
    total_catalogs: totalCatalogs,
    total_workers: totalWorkers,
  });
});

// Support FastAPI style for workers too
app.get('/dashboard/stats', authenticateToken, ownerRequired, (req, res) => {
  res.json({
    total_products: db.getProducts().length,
    total_catalogs: db.getCatalogs().length,
    total_workers: db.getUsers().filter(u => u.role === 'worker').length,
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite loaded in Development Mode Middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production Single-Page Application assets mounted.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express application active on http://0.0.0.0:${PORT}`);
  });
}

startViteServer().catch(err => {
  console.error('Initialization failure during Vite middleware boot:', err);
});
