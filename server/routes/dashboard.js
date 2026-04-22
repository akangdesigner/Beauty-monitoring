const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// GET /api/dashboard/kpi
router.get('/kpi', (req, res) => {
  const db = getDB();

  const productCount = db.prepare('SELECT COUNT(*) as n FROM products WHERE is_active = 1').get().n;
  const todayAlerts  = db.prepare(`SELECT COUNT(*) as n FROM alerts WHERE date(created_at) = date('now','localtime')`).get().n;
  const unreadAlerts = db.prepare('SELECT COUNT(*) as n FROM alerts WHERE is_read = 0').get().n;

  res.json({
    productCount,
    todayAlerts,
    unreadAlerts,
  });
});

// GET /api/dashboard/summary
router.get('/summary', (req, res) => {
  const db = getDB();

  const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
  const result = products.map(p => {
    const getPlatformData = (pf) => {
      const price = db.prepare(`
        SELECT price, original_price, discount_label, scraped_at FROM price_records
        WHERE product_id = ? AND platform = ?
        ORDER BY scraped_at DESC LIMIT 1
      `).get(p.id, pf);

      const prevPrice = db.prepare(`
        SELECT price FROM price_records
        WHERE product_id = ? AND platform = ?
        ORDER BY scraped_at DESC LIMIT 1 OFFSET 1
      `).get(p.id, pf);

      const gift = db.prepare(`
        SELECT gift_description FROM gift_records
        WHERE product_id = ? AND platform = ? AND is_active = 1
        ORDER BY scraped_at DESC LIMIT 1
      `).get(p.id, pf);

      const urlRecord = db.prepare('SELECT url FROM product_urls WHERE product_id=? AND platform=?').get(p.id, pf);

      return {
        price:         price?.price ?? null,
        prevPrice:     prevPrice?.price ?? null,
        originalPrice: price?.original_price ?? null,
        discountLabel: price?.discount_label ?? null,
        gift:          gift?.gift_description ?? null,
        updatedAt:     price?.scraped_at ?? null,
        productUrl:    urlRecord?.url ?? null,
      };
    };

    return {
      ...p,
      watsons: getPlatformData('watsons'),
      cosmed:  getPlatformData('cosmed'),
      poya:    getPlatformData('poya'),
    };
  });

  res.json(result);
});

module.exports = router;
