const express  = require('express');
const router   = express.Router();
const logger   = require('../utils/logger');
const { parseNamesWithAI, normalizeName } = require('./scraper');

const MAX_RESULTS_PER_PLATFORM = 40;

function searchUrls(query) {
  const q = encodeURIComponent(query);
  return {
    watsons: `https://www.watsons.com.tw/search?q=${q}`,
    cosmed:  `https://shop.cosmed.com.tw/v2/Search?q=${q}&shopId=2131`,
    poya:    `https://www.poyabuy.com.tw/v2/Search?q=${q}&shopId=40916`,
  };
}

// 搜尋專用爬蟲（與分類頁共用 DOM 邏輯，但使用 networkidle2 等待動態內容）
async function scrapeSearchPage(url, platform) {
  const puppeteer    = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === 'production' ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  // 分段捲動，讓無限滾動的平台載入更多商品
  const autoScroll = async (pg, steps = 5, stepDelay = 1200) => {
    for (let i = 1; i <= steps; i++) {
      await pg.evaluate((ratio) => window.scrollTo(0, document.body.scrollHeight * ratio), i / steps);
      await new Promise(r => setTimeout(r, stepDelay));
    }
    await pg.evaluate(() => window.scrollTo(0, 0));
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    if (platform === 'watsons') {
      await autoScroll(page, 4, 1000);
      return await page.evaluate(() => {
        const extractNums = (text) => {
          if (!text) return [];
          return (text.match(/\d[\d,]*/g) || [])
            .map(s => Number(s.replace(/,/g, '')))
            .filter(n => Number.isFinite(n) && n > 0);
        };
        return Array.from(document.querySelectorAll('.productContainer')).map(el => {
          const name      = el.querySelector('.productName, .name')?.innerText?.trim() || '';
          const priceText = el.querySelector('.afterPromo-price, .productPrice')?.innerText?.trim() || '';
          const origText  = el.querySelector('.afPromo-originPrice, .productOriginalPrice')?.innerText?.trim() || '';
          const numsPrice = extractNums(priceText);
          const numsOrig  = extractNums(origText);
          let price     = numsPrice[0] ?? null;
          let origPrice = numsOrig[0] ?? null;
          if (!origPrice && numsPrice.length >= 2) origPrice = numsPrice[1];
          const imgs = Array.from(el.querySelectorAll('img'));
          const prodImg = imgs.find(i => { const s = i.src || i.dataset?.src || ''; return s.includes('prodcat') || s.includes('publishing'); });
          return { name, price, origPrice, imageUrl: prodImg?.src || '', productUrl: el.querySelector('a[href]')?.href || '' };
        }).filter(p => p.name);
      });
    }

    if (platform === 'cosmed') {
      try { await page.waitForSelector('.product-card__vertical__wrapper', { timeout: 15000 }); } catch {}
      await autoScroll(page, 5, 1200);
      return await page.evaluate(() => {
        const extractFirstNum = (text) => {
          if (!text) return null;
          const m = text.match(/\d[\d,]*/);
          if (!m) return null;
          const n = Number(m[0].replace(/,/g, ''));
          return Number.isFinite(n) && n > 0 ? n : null;
        };
        return Array.from(document.querySelectorAll('.product-card__vertical__wrapper')).map(el => {
          const name      = el.querySelector('[data-qe-id="body-sale-page-title-text"]')?.innerText?.trim() || '';
          const priceText = el.querySelector('[data-qe-id="body-price-text"]')?.innerText?.trim() || '';
          const origText  = el.querySelector('[data-qe-id="body-suggest-price-text"]')?.innerText?.trim() || '';
          const imgs = Array.from(el.querySelectorAll('img'));
          const prodImg = imgs.find(i => (i.src || i.dataset?.src || '').includes('SalePage')) || imgs[0];
          const productUrl = el.closest('a[href]')?.href || el.querySelector('a[href]')?.href || '';
          return { name, price: extractFirstNum(priceText), origPrice: extractFirstNum(origText), imageUrl: prodImg?.src || '', productUrl };
        }).filter(p => p.name);
      });
    }

    if (platform === 'poya') {
      try { await page.waitForSelector('a[href*="SalePage"]', { timeout: 15000 }); } catch {}
      await autoScroll(page, 5, 1200);
      return await page.evaluate(() => {
        const extractPrices = (text) => {
          if (!text) return [];
          const patterns = [/NT\$\s*([\d,]+)/g, /\$\s*([\d,]+)/g, /(\d[\d,]*)\s*元/g];
          const nums = [];
          for (const re of patterns) for (const m of text.matchAll(re)) { const n = Number(m[1].replace(/,/g, '')); if (Number.isFinite(n) && n >= 10 && n < 100000) nums.push(n); }
          return nums;
        };
        const pickName = (text) => {
          if (!text) return '';
          for (const l of text.split('\n').map(s => s.trim()).filter(Boolean)) {
            if (l === '貨到通知') continue;
            if (/^(NT)?\$[\d,]/.test(l)) continue;
            if (/^共\s*\d+\s*項商品/.test(l)) continue;
            if (/^POYA|^寶雅|限定$|特賣|活動/.test(l) && l.length <= 10) continue;
            if (/^\d+$/.test(l)) continue;
            if (l.length >= 3 && l.length <= 120) return l;
          }
          return '';
        };
        const seen = new Set();
        return Array.from(document.querySelectorAll('a[href*="SalePage"]')).filter(c => {
          const h = c.getAttribute('href'); if (seen.has(h)) return false; seen.add(h); return true;
        }).map(card => {
          const text = card.innerText || '';
          const name = pickName(text);
          const prices = extractPrices(text);
          if (!name || prices.length === 0) return null;
          const min = Math.min(...prices), max = Math.max(...prices);
          const imgs = Array.from(card.querySelectorAll('img'));
          const prodImg = imgs.find(i => (i.src || '').includes('SalePage')) || imgs[0];
          return { name, price: min, origPrice: max > min ? max : null, imageUrl: prodImg?.src || '', productUrl: card.href || '' };
        }).filter(Boolean);
      });
    }
    return [];
  } finally {
    await browser.close();
  }
}

// 單次 AI 呼叫：語義分組（跨平台品牌別名合併）
async function groupProductsWithAI(allItems) {
  const apiKey = process.env.GROQ_API_KEY;

  const CAPACITY_RE = /\d+(?:\.\d+)?\s*(?:g|ml|mg|l|kg|oz|入|條|粒|包|支|片|罐|瓶|組|件|副|雙|套)\b/i;
  function extractCapacity(name) {
    const m = name.match(CAPACITY_RE);
    return m ? m[0].replace(/\s+/g, '').toLowerCase() : '';
  }

  async function fallbackGroup() {
    const names = [...new Set(allItems.map(i => i.name))];
    let aiMap = new Map();
    try { aiMap = await parseNamesWithAI(names, 'llama-3.3-70b-versatile'); } catch {}
    const groupMap = new Map();
    for (const item of allItems) {
      const parsed    = aiMap.get(item.name);
      const brand     = parsed?.brand       || '';
      const productType = parsed?.productType || '';
      const spec      = parsed?.spec || extractCapacity(item.name);
      let baseName;
      if (brand && productType)      baseName = `${brand} ${productType}`;
      else if (productType && !brand) baseName = normalizeName(item.name.replace(CAPACITY_RE, '').trim());
      else                            baseName = normalizeName(item.name);
      const key = normalizeName(`${baseName}|${spec}`);
      if (!groupMap.has(key)) groupMap.set(key, { base_name: baseName, brand: brand || '', variant: spec, imageUrl: item.imageUrl || '', watsons: null, cosmed: null, poya: null });
      const g = groupMap.get(key);
      const ex = g[item.platform];
      if (!ex || item.price < ex.price) g[item.platform] = { price: item.price, origPrice: item.origPrice ?? null, url: item.productUrl || '' };
      if (!g.imageUrl && item.imageUrl) g.imageUrl = item.imageUrl;
    }
    return [...groupMap.values()].sort((a, b) => {
      const minA = Math.min(a.watsons?.price ?? Infinity, a.cosmed?.price ?? Infinity, a.poya?.price ?? Infinity);
      const minB = Math.min(b.watsons?.price ?? Infinity, b.cosmed?.price ?? Infinity, b.poya?.price ?? Infinity);
      return minA - minB;
    });
  }

  if (!apiKey || allItems.length === 0) return fallbackGroup();

  const Groq = require('groq-sdk');
  const groq  = new Groq({ apiKey });
  const items = allItems.slice(0, 120);

  const PROMPT = `你是台灣電商商品比對專家。以下是從三個平台搜尋到的商品清單。
請判斷跨平台哪些是「同一支商品」並分組，同時提取品牌與規格。

判斷規則：
- 同一商品 = 相同品牌 + 相同產品名稱 + 相同規格（容量/克數）
- 不同色號視為不同商品（#01 和 #02 是不同商品）
- 品牌別名視為相同（MAYBELLINE=媚比琳, KATE=凱婷, HEME=喜蜜, CANMAKE=井田, Bioderma=貝膚黛瑪, CeraVe=適樂膚）
- 每個平台同一商品只保留最低價那筆（i 值最小的）

輸入格式：i=序號 | platform=平台 | name=商品名 | price=價格
只回傳 JSON 陣列，不要其他文字：
[{"base_name":"品牌+產品名（不含色號/容量）","brand":"品牌","spec":"容量如3g/100ml，沒有填空字串","items":[{"i":序號,"platform":"平台"}]}]

商品清單：
`;
  const listed = items.map((item, i) => `${i} | ${item.platform} | ${item.name} | ${item.price}`).join('\n');

  logger.info(`[搜尋辨識] ${items.length} 筆商品送 llama-3.3-70b-versatile`);

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PROMPT + listed }],
      temperature: 0,
      max_tokens: 4000,
    });

    const text = res.choices[0]?.message?.content?.trim() || '[]';
    const jsonStr = (() => {
      let depth = 0, start = -1;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '[') { if (start === -1) start = i; depth++; }
        else if (text[i] === ']') { if (--depth === 0 && start !== -1) return text.slice(start, i + 1); }
      }
      return null;
    })();

    if (!jsonStr) { logger.warn('[搜尋辨識] AI 回傳非 JSON，使用 fallback'); return fallbackGroup(); }
    const aiGroups = JSON.parse(jsonStr);
    if (!Array.isArray(aiGroups) || aiGroups.length === 0) { logger.warn('[搜尋辨識] AI 回傳空陣列，使用 fallback'); return fallbackGroup(); }

    logger.info(`[搜尋辨識] AI 分出 ${aiGroups.length} 個商品群組`);

    const groups = [];
    for (const ag of aiGroups) {
      if (!ag.items || ag.items.length === 0) continue;
      const group = { base_name: ag.base_name || '', brand: ag.brand || '', variant: ag.spec || '', imageUrl: '', watsons: null, cosmed: null, poya: null };
      for (const ref of ag.items) {
        const item = items[ref.i];
        if (!item) continue;
        const existing = group[item.platform];
        if (!existing || item.price < existing.price) {
          group[item.platform] = { price: item.price, origPrice: item.origPrice ?? null, url: item.productUrl || '' };
        }
        if (!group.imageUrl && item.imageUrl) group.imageUrl = item.imageUrl;
      }
      if (group.watsons || group.cosmed || group.poya) groups.push(group);
    }

    return groups.sort((a, b) => {
      const minA = Math.min(a.watsons?.price ?? Infinity, a.cosmed?.price ?? Infinity, a.poya?.price ?? Infinity);
      const minB = Math.min(b.watsons?.price ?? Infinity, b.cosmed?.price ?? Infinity, b.poya?.price ?? Infinity);
      return minA - minB;
    });

  } catch (err) {
    logger.warn(`[搜尋辨識] AI 失敗 (${err.message})，使用 fallback`);
    return fallbackGroup();
  }
}

// 相關性過濾：商品名稱必須包含查詢字串的至少一個有意義片段
function relevantToQuery(productName, query) {
  if (!productName || !query) return false;
  const name = productName.toLowerCase().replace(/\s+/g, '');
  const q    = query.toLowerCase().replace(/\s+/g, '');

  // 完全包含
  if (name.includes(q)) return true;

  // 按空格分詞後逐段比對（如「3CE 唇釉」→「3CE」或「唇釉」出現即符合）
  for (const token of query.trim().split(/\s+/)) {
    if (token.length >= 2 && name.includes(token.toLowerCase())) return true;
  }

  // 中文 bigram：取查詢字串任意連續兩字，出現在商品名中即符合
  for (let i = 0; i <= q.length - 2; i++) {
    const bg = q.slice(i, i + 2);
    if (/^[a-z0-9]{2}$/.test(bg)) continue; // 純英數 bigram 跳過，避免誤判
    if (name.includes(bg)) return true;
  }

  return false;
}

// POST /api/search  { query }
router.post('/', async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) return res.status(400).json({ error: '請輸入搜尋關鍵字' });

  const urls = searchUrls(query.trim());
  logger.info(`[搜尋] 開始爬取，關鍵字：${query.trim()}`);
  logger.info(`[搜尋] 屈臣氏 → ${urls.watsons}`);
  logger.info(`[搜尋] 康是美 → ${urls.cosmed}`);
  logger.info(`[搜尋] 寶雅   → ${urls.poya}`);

  const [wResult, cResult, pResult] = await Promise.allSettled([
    scrapeSearchPage(urls.watsons, 'watsons'),
    scrapeSearchPage(urls.cosmed,  'cosmed'),
    scrapeSearchPage(urls.poya,    'poya'),
  ]);

  const platformWarnings = [];
  const flatten = (settled, platform) => {
    if (settled.status === 'rejected') {
      logger.warn(`[搜尋] ${platform} 爬取失敗: ${settled.reason?.message}`);
      platformWarnings.push(`${platform}: ${settled.reason?.message || '爬取失敗'}`);
      return [];
    }
    const raw = settled.value || [];
    const filtered = raw.filter(p => p.name && p.price && relevantToQuery(p.name, query.trim()));
    logger.info(`[搜尋] ${platform} 原始 ${raw.length} 筆 → 相關 ${filtered.length} 筆`);
    return filtered.slice(0, MAX_RESULTS_PER_PLATFORM).map(p => ({ ...p, platform }));
  };

  const allItems = [
    ...flatten(wResult, 'watsons'),
    ...flatten(cResult, 'cosmed'),
    ...flatten(pResult, 'poya'),
  ];

  if (allItems.length === 0) return res.json({ groups: [], warnings: platformWarnings, total: 0 });

  const groups = await groupProductsWithAI(allItems);

  logger.info(`[搜尋] 完成，共 ${groups.length} 個商品群組`);
  res.json({ groups, warnings: platformWarnings, total: groups.length });
});

module.exports = router;
