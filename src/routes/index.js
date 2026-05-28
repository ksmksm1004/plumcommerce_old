const express = require('express');
const pool = require('../db/pool');
const { requireUser, requireAdmin } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const { IMAGE_DIR } = require('../config/env');
const { mockCharge } = require('../services/paymentClient');

const router = express.Router();
const upload = multer({ dest: path.join(IMAGE_DIR, '_tmp') });

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.get('/', (_req, res) => res.redirect('/products'));

router.get('/products', async (req, res) => {
  const { category = '', q = '' } = req.query;
  const [rows] = await pool.query(
    `SELECT id,name,price,category,image FROM products
     WHERE (?='' OR category=?) AND (?='' OR name LIKE CONCAT('%',?,'%'))
     ORDER BY id DESC LIMIT 100`,
    [category, category, q, q]
  );
  res.render('products', { products: rows, category, q });
});

router.get('/product/:id', async (req, res) => {
  const [[product]] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
  if (!product) return res.status(404).send('Not found');
  await pool.query('INSERT INTO view_history (user_id, product_id) VALUES (?,?)', [req.session.user?.id || null, product.id]);
  res.render('product-detail', { product });
});

router.post('/cart/add/:id', async (req, res) => {
  req.session.cart = req.session.cart || [];
  req.session.cart.push(Number(req.params.id));
  res.redirect('/cart');
});

router.get('/cart', async (req, res) => {
  const ids = req.session.cart || [];
  if (!ids.length) return res.render('cart', { items: [], total: 0, charge: null });
  const [items] = await pool.query('SELECT id,name,price FROM products WHERE id IN (?)', [ids]);
  const total = items.reduce((s, i) => s + i.price, 0);
  res.render('cart', { items, total, charge: null });
});

router.post('/checkout', requireUser, async (req, res) => {
  const ids = req.session.cart || [];
  const [items] = ids.length ? await pool.query('SELECT price FROM products WHERE id IN (?)', [ids]) : [[]];
  const total = items.reduce((s, i) => s + i.price, 0);
  const charge = await mockCharge({ amount: total, orderId: `ORDER-${Date.now()}` });
  req.session.cart = [];
  res.render('cart', { items: [], total: 0, charge });
});

router.route('/login')
  .get((_req, res) => res.render('login', { admin: false }))
  .post(async (req, res) => {
    const [[user]] = await pool.query('SELECT id,username FROM users WHERE username=? AND password=?', [req.body.username, req.body.password]);
    if (!user) return res.status(401).send('Invalid credentials');
    req.session.user = user;
    res.redirect('/products');
  });

router.route('/admin/login')
  .get((_req, res) => res.render('login', { admin: true }))
  .post(async (req, res) => {
    if (req.body.username === 'admin' && req.body.password === 'admin123') {
      req.session.admin = { username: 'admin' };
      return res.redirect('/admin');
    }
    res.status(401).send('Invalid admin credentials');
  });

router.get('/admin', requireAdmin, async (_req, res) => {
  const [products] = await pool.query('SELECT id,name,image FROM products ORDER BY id DESC LIMIT 30');
  res.render('admin/dashboard', { products });
});

router.post('/admin/upload', requireAdmin, upload.single('image'), async (req, res) => {
  const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
  const originalPath = path.join(IMAGE_DIR, filename);
  const thumbPath = path.join(IMAGE_DIR, `thumb_${filename}`);
  await sharp(req.file.path).toFile(originalPath);
  await sharp(req.file.path).resize(240).toFile(thumbPath);
  await pool.query('UPDATE products SET image=? WHERE id=?', [filename, req.body.product_id]);
  res.redirect('/admin');
});

router.get('/flash-sale', async (_req, res) => {
  const [products] = await pool.query('SELECT id,name,price,image FROM products ORDER BY RAND() LIMIT 8');
  const endsAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  res.render('flash-sale', { products, endsAt });
});

module.exports = router;
