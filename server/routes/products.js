const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const fs   = require('fs');
const path = require('path');

const OWN_BRANDS_FILE = path.join(__dirname, '../own-brands.json');
function loadOwnBrands() {
  try { return JSON.parse(fs.readFileSync(OWN_BRANDS_FILE, 'utf8')); } catch { return []; }
}
function saveOwnBrands(brands) {
  fs.writeFileSync(OWN_BRANDS_FILE, JSON.stringify(brands));
}

// GET /api/products/own-brands
router.get('/own-brands', (req, res) => res.json(loadOwnBrands()));

// PUT /api/products/own-brands
router.put('/own-brands', (req, res) => {
  const brands = (req.body.brands || []).map(b => b.trim()).filter(Boolean);
  saveOwnBrands(brands);
  res.json({ ok: true, brands });
});

// GET /api/products
router.get('/', (req, res) => {
  const db = getDB();
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY brand, name').all();
  const result = products.map(p => ({
    ...p,
    urls: db.prepare('SELECT * FROM product_urls WHERE product_id = ?').all(p.id),
  }));
  res.json(result);
});

// POST /api/products
router.post('/', (req, res) => {
  const db = getDB();
  const { name, brand, category = 'skincare', emoji = '✨', urls = [] } = req.body;
  if (!name) return res.status(400).json({ error: '商品名稱為必填' });

  const id = uuidv4();
  db.prepare('INSERT INTO products (id, name, brand, category, emoji) VALUES (?, ?, ?, ?, ?)').run(id, name, brand, category, emoji);

  urls.forEach(({ platform, url, platform_sku }) => {
    db.prepare('INSERT INTO product_urls (id, product_id, platform, url, platform_sku) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), id, platform, url, platform_sku || null);
  });

  res.status(201).json({ id, name, brand, category });
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const db = getDB();
  const { name, brand, category, emoji } = req.body;
  db.prepare('UPDATE products SET name=?, brand=?, category=?, emoji=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?').run(name, brand, category, emoji, req.params.id);
  res.json({ ok: true });
});

// PATCH /api/products/:id — 更新商品基本資料（名稱、品牌、品類、圖片、自訂售價）
router.patch('/:id', (req, res) => {
  const db = getDB();
  const { name, brand, base_name, category, emoji, image_url, own_price } = req.body;
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '找不到商品' });
  db.prepare(`
    UPDATE products SET
      name       = ?,
      brand      = ?,
      base_name  = ?,
      category   = ?,
      emoji      = ?,
      image_url  = ?,
      own_price  = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    name      ?? p.name,
    brand     ?? p.brand,
    base_name ?? p.base_name,
    category  ?? p.category,
    emoji     ?? p.emoji,
    image_url !== undefined ? (image_url || null) : p.image_url,
    own_price !== undefined ? (own_price  || null) : p.own_price,
    req.params.id
  );
  res.json({ ok: true });
});

// PATCH /api/products/:id/star — 切換重點商品
router.patch('/:id/star', (req, res) => {
  const db = getDB();
  const p = db.prepare('SELECT is_starred FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: '找不到商品' });
  const next = p.is_starred ? 0 : 1;
  db.prepare('UPDATE products SET is_starred = ? WHERE id = ?').run(next, req.params.id);
  res.json({ ok: true, is_starred: next });
});

// DELETE /api/products/all — 清空全部商品（硬刪除，含價格記錄與監控網址）
router.delete('/all', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM price_records').run();
  db.prepare('DELETE FROM product_urls').run();
  const result = db.prepare('DELETE FROM products').run();
  res.json({ ok: true, deleted: result.changes });
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
