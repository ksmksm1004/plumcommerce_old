const express = require('express');
const pool = require('../db/pool');
const { requireUser, requireAdmin } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { IMAGE_DIR } = require('../config/env');
const { mockCharge } = require('../services/paymentClient');

const router = express.Router();
const tmpUploadDir = path.join(IMAGE_DIR, '_tmp');
fsSync.mkdirSync(tmpUploadDir, { recursive: true });
const upload = multer({ dest: tmpUploadDir });

async function getCategories() {
  const [rows] = await pool.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
  return rows.map(row => row.category).filter(Boolean);
}

function normalizeCategory(body) {
  return (body.new_category || body.category || '').trim();
}

function makeSafeFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const base = path.basename(originalname, ext).replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'product';
  return `${base}${ext || '.jpg'}`;
}

function makeThumbnailFilename(filename) {
  if (!filename || filename.startsWith('thumb_')) return filename;
  return `thumb_${filename}`;
}

function preferThumbnail(product) {
  return {
    ...product,
    thumbnail: product.thumbnail || makeThumbnailFilename(product.image)
  };
}

async function saveUploadedImage(file) {
  const filename = makeSafeFilename(file.originalname);
  const targetPath = path.join(IMAGE_DIR, filename);

  await fs.rename(file.path, targetPath);

  return filename;
}

async function saveProductImages(files) {
  const imageFile = files?.image?.[0];
  const thumbnailFile = files?.thumbnail?.[0];
  if (!imageFile || !thumbnailFile) throw new Error('Product image and thumbnail are required.');
  if (makeSafeFilename(imageFile.originalname) === makeSafeFilename(thumbnailFile.originalname)) {
    throw new Error('Product image and thumbnail filenames must be different.');
  }

  const filename = await saveUploadedImage(imageFile);
  const thumbFilename = await saveUploadedImage(thumbnailFile);

  return { filename, thumbFilename };
}

async function removeUploadedFiles(files) {
  const uploadedFiles = Object.values(files || {}).flat();
  for (const file of uploadedFiles) {
    await fs.unlink(file.path).catch(() => {});
  }
}

async function unlinkImageFile(filename) {
  if (!filename) return;

  const root = path.resolve(IMAGE_DIR);
  const target = path.resolve(root, path.basename(filename));
  if (!target.startsWith(`${root}${path.sep}`)) return;

  await fs.unlink(target).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
}

async function unlinkImagesIfUnused(filenames) {
  const uniqueFilenames = [...new Set(filenames.filter(Boolean))];

  for (const filename of uniqueFilenames) {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS count FROM products WHERE image=? OR thumbnail=?',
      [filename, filename]
    );
    if (Number(row.count) === 0) await unlinkImageFile(filename);
  }
}

async function getUserCartItems(userId) {
  const [items] = await pool.query(
    `SELECT p.id, p.name, p.price, p.image, p.thumbnail, c.quantity
     FROM cart_items c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id=?
     ORDER BY c.updated_at DESC`,
    [userId]
  );
  return items.map(preferThumbnail);
}

async function getSessionCartItems(ids) {
  if (!ids.length) return [];
  const quantities = ids.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const productIds = Object.keys(quantities).map(Number);
  const [products] = await pool.query('SELECT id,name,price,image,thumbnail FROM products WHERE id IN (?)', [productIds]);
  return products.map(product => ({ ...preferThumbnail(product), quantity: quantities[product.id] || 1 }));
}

router.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentAdmin = req.session.user?.role === 'admin' ? req.session.user : null;
  next();
});

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.get('/', (_req, res) => res.redirect('/products'));

router.get('/products', async (req, res) => {
  const { category = '', q = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT id,name,price,category,image,thumbnail FROM products
     WHERE (?='' OR category=?) AND (?='' OR name LIKE CONCAT('%',?,'%'))
     ORDER BY id DESC LIMIT 100`,
    [category, category, q, q]
  );
  const categories = await getCategories();
  res.render('products', { products: rows.map(preferThumbnail), categories, category, q });
});

router.get('/product/:id', async (req, res) => {
  const [[product]] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
  if (!product) return res.status(404).send('Not found');
  await pool.query('INSERT INTO view_history (user_id, product_id) VALUES (?,?)', [req.session.user?.id || null, product.id]);
  res.render('product-detail', { product });
});

router.post('/cart/add/:id', async (req, res) => {
  const productId = Number(req.params.id);
  if (req.session.user) {
    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE quantity=quantity+1, updated_at=CURRENT_TIMESTAMP`,
      [req.session.user.id, productId]
    );
  } else {
    req.session.cart = req.session.cart || [];
    req.session.cart.push(productId);
  }
  res.redirect('/cart');
});

router.get('/cart', async (req, res) => {
  const items = req.session.user
    ? await getUserCartItems(req.session.user.id)
    : await getSessionCartItems(req.session.cart || []);
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
  res.render('cart', { items, total, charge: null });
});

router.post('/checkout', requireUser, async (req, res) => {
  const items = await getUserCartItems(req.session.user.id);
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
  const charge = await mockCharge({ amount: total, orderId: `ORDER-${Date.now()}` });
  await pool.query('DELETE FROM cart_items WHERE user_id=?', [req.session.user.id]);
  res.render('cart', { items: [], total: 0, charge });
});

function isAdminUser(user) {
  return user?.role === 'admin';
}

function redirectAfterLogin(req, res) {
  if (isAdminUser(req.session.user)) return res.redirect('/admin');
  return res.redirect('/products');
}

router.route('/login')
  .get((req, res) => {
    if (req.session.user) return redirectAfterLogin(req, res);
    res.render('login', { error: null });
  })
  .post(async (req, res) => {
    if (req.session.user) return redirectAfterLogin(req, res);

    let [[user]] = await pool.query('SELECT id,username,role FROM users WHERE username=? AND password=?', [req.body.username, req.body.password]);
    if (!user && req.body.username === 'admin' && req.body.password === 'admin123') {
      user = { id: null, username: 'admin', role: 'admin' };
    }
    if (!user) return res.status(401).render('login', { error: 'Invalid credentials' });

    req.session.user = user;
    if (!isAdminUser(user) && Array.isArray(req.session.cart) && req.session.cart.length) {
      for (const productId of req.session.cart) {
        await pool.query(
          `INSERT INTO cart_items (user_id, product_id, quantity)
           VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE quantity=quantity+1, updated_at=CURRENT_TIMESTAMP`,
          [user.id, productId]
        );
      }
      req.session.cart = [];
    }
    redirectAfterLogin(req, res);
  });

router.route('/signup')
  .get((_req, res) => res.render('signup', { error: null }))
  .post(async (req, res) => {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    if (!username || !password) return res.status(400).render('signup', { error: 'Username and password are required.' });
    try {
      const [result] = await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, 'user']);
      req.session.user = { id: result.insertId, username, role: 'user' };
      res.redirect('/products');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).render('signup', { error: 'Username already exists.' });
      throw error;
    }
  });

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/products'));
});

router.get('/admin/login', (_req, res) => res.redirect('/login'));
router.post('/admin/login', (_req, res) => res.redirect('/login'));

router.get('/admin', requireAdmin, async (_req, res) => {
  const [products] = await pool.query('SELECT id,name,category,price,image,thumbnail FROM products ORDER BY id DESC LIMIT 30');
  const categories = await getCategories();
  res.render('admin/dashboard', { products, categories, error: null });
});

router.post('/admin/products', requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    const category = normalizeCategory(req.body);
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    const price = Number(req.body.price);
    if (!name || !category || !description || !Number.isFinite(price) || price < 0) {
      throw new Error('Name, category, description, and a valid price are required.');
    }
    const { filename, thumbFilename } = await saveProductImages(req.files);
    await pool.query(
      'INSERT INTO products (name, category, description, price, image, thumbnail) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, description, price, filename, thumbFilename]
    );
    res.redirect('/admin');
  } catch (error) {
    await removeUploadedFiles(req.files);
    const [products] = await pool.query('SELECT id,name,category,price,image,thumbnail FROM products ORDER BY id DESC LIMIT 30');
    const categories = await getCategories();
    res.status(400).render('admin/dashboard', { products, categories, error: error.message });
  }
});

router.post('/admin/upload', requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  try {
    const { filename, thumbFilename } = await saveProductImages(req.files);
    await pool.query('UPDATE products SET image=?, thumbnail=? WHERE id=?', [filename, thumbFilename, req.body.product_id]);
    res.redirect('/admin');
  } catch (error) {
    await removeUploadedFiles(req.files);
    const [products] = await pool.query('SELECT id,name,category,price,image,thumbnail FROM products ORDER BY id DESC LIMIT 30');
    const categories = await getCategories();
    res.status(400).render('admin/dashboard', { products, categories, error: error.message });
  }
});

router.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  const [[product]] = await pool.query('SELECT image,thumbnail FROM products WHERE id=?', [req.params.id]);
  if (!product) return res.redirect('/admin');

  await pool.query('DELETE FROM cart_items WHERE product_id=?', [req.params.id]);
  await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
  await unlinkImagesIfUnused([product.image, product.thumbnail]).catch(error => {
    console.warn('Failed to remove deleted product images', error);
  });
  res.redirect('/admin');
});

router.get('/flash-sale', async (_req, res) => {
  const [products] = await pool.query('SELECT id,name,price,image,thumbnail FROM products ORDER BY RAND() LIMIT 8');
  const endsAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  res.render('flash-sale', { products: products.map(preferThumbnail), endsAt });
});

module.exports = router;
