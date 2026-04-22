/**
 * 清除所有監控商品及相關記錄（硬刪除）
 * 執行方式：node server/scripts/clearAllProducts.js
 */
const path = require('path');
process.env.DB_PATH = path.join(__dirname, '../db/beauty_monitor.sqlite');
const { getDB, initDB } = require('../db');

async function main() {
  await initDB();
  const db = getDB();

  const before = db.prepare('SELECT COUNT(*) as c FROM products').get();
  console.log(`\n目前共 ${before.c} 筆商品，開始清除...\n`);

  db.transaction(() => {
    db.prepare('DELETE FROM price_records').run();
    db.prepare('DELETE FROM alerts').run();
    db.prepare('DELETE FROM product_urls').run();
    db.prepare('DELETE FROM products').run();
  })();

  const after = db.prepare('SELECT COUNT(*) as c FROM products').get();
  console.log('✅ 清除完成！');
  console.log(`   products     剩 ${after.c} 筆`);
  console.log(`   price_records / alerts / product_urls 一併清空\n`);
}

main().catch(err => {
  console.error('❌ 執行失敗：', err.message);
  process.exit(1);
});
