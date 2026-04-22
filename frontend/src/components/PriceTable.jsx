import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'

const PF_LABEL = { watsons: '屈臣氏', cosmed: '康是美', poya: '寶雅' }
const CATEGORY_LABEL = { skincare: '保養', makeup: '彩妝', haircare: '洗護', 唇膏: '唇膏', other: '其他' }
const PF_CLASS = { watsons: 'pb-watsons', cosmed: 'pb-cosmed', poya: 'pb-poya' }

function PriceCell({ pl, isMin, isMax }) {
  if (!pl?.price) return <td className="price-cell"><div className="price-num" style={{ color: 'var(--text-muted)' }}>—</div></td>
  const pct = pl.prevPrice && pl.price !== pl.prevPrice
    ? ((pl.price - pl.prevPrice) / pl.prevPrice * 100).toFixed(1)
    : null
  const hasOrig = pl.originalPrice && pl.originalPrice > pl.price
  const priceLabel = `NT$${pl.price.toLocaleString()}${hasOrig ? `（原${pl.originalPrice.toLocaleString()}）` : ''}`
  return (
    <td className="price-cell">
      {pl.productUrl ? (
        <a href={pl.productUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div className={`price-num${isMin ? ' lowest' : isMax ? ' highest' : ''}`} style={{ cursor: 'pointer', borderBottom: '1px dashed currentColor', display: 'inline-block' }}>
            {priceLabel}
          </div>
        </a>
      ) : (
        <div className={`price-num${isMin ? ' lowest' : isMax ? ' highest' : ''}`}>
          {priceLabel}
        </div>
      )}
      {pct && (
        <div className={`price-change ${pl.price < pl.prevPrice ? 'down' : 'up'}`}>
          {pl.price < pl.prevPrice ? '▼' : '▲'} {Math.abs(pct)}%
        </div>
      )}
    </td>
  )
}

// 多選下拉元件
function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(val) {
    const next = new Set(selected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    onChange(next)
  }

  const count = selected.size
  const btnLabel = count === 0 ? `全部${label}` : `${label}（${count}）`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="select-styled"
        onClick={() => setOpen(v => !v)}
        style={{
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          background: count > 0 ? 'rgba(139,92,246,0.15)' : undefined,
          borderColor: count > 0 ? 'var(--accent)' : undefined,
        }}
      >
        {btnLabel} <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 200,
          background: '#1a1728', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 0', minWidth: 140,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {count > 0 && (
            <div
              onClick={() => { onChange(new Set()); setOpen(false) }}
              style={{
                padding: '5px 14px', fontSize: 11, color: 'var(--accent)',
                cursor: 'pointer', borderBottom: '1px solid var(--border)', marginBottom: 4,
              }}
            >
              清除篩選
            </div>
          )}
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 14px', cursor: 'pointer', fontSize: 13,
                color: selected.has(opt) ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: selected.has(opt) ? 'rgba(139,92,246,0.12)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = selected.has(opt) ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = selected.has(opt) ? 'rgba(139,92,246,0.12)' : 'transparent'}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${selected.has(opt) ? '#8b5cf6' : '#3d3558'}`,
                background: selected.has(opt) ? '#8b5cf6' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {selected.has(opt) && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
              </span>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 把同 base_name 的商品合併成一列（取各平台最低價）
function groupProducts(products) {
  const map = new Map()
  for (const p of products) {
    const key = p.base_name || p.name || p.id
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(p)
  }

  return [...map.entries()].map(([key, items]) => {
    if (items.length === 1) return { key, rep: items[0], merged: null }

    const rep = items[0]
    const merged = {}
    for (const pf of ['watsons', 'cosmed', 'poya']) {
      const candidates = items.map(p => p[pf]).filter(pl => pl?.price > 0)
      if (candidates.length === 0) { merged[pf] = null; continue }
      const best = candidates.reduce((a, b) => a.price <= b.price ? a : b)
      merged[pf] = best
    }
    merged.variantCount = items.length

    return { key, rep, merged }
  })
}

function getProductType(p) {
  const brand = p.brand || ''
  const base  = p.base_name || p.name || ''
  const type  = brand && base.startsWith(brand) ? base.slice(brand.length).trim() : base
  // 去掉末尾規格（如 700ml、100g、120抽、2.5g）
  const stripped = type.replace(/[\d.]+\s*(ml|l|g|mg|kg|oz|抽|片|包|入|顆|條)\s*$/i, '').trim()
  // 歸一化：去掉前綴描述詞，只留核心品類
  if (stripped.includes('唇')) {
    const huIdx = stripped.lastIndexOf('護唇')
    if (huIdx >= 0) return stripped.slice(huIdx)    // 保濕潤色護唇膏 → 護唇膏
    const chunIdx = stripped.lastIndexOf('唇')
    if (chunIdx > 0) return stripped.slice(chunIdx) // 水光唇膏 → 唇膏
  }
  return stripped
}

// 找到最匹配的自有商品
function findClientMatch(key, clientProducts) {
  if (!clientProducts?.length || !key) return null
  const normalize = s => (s || '').toLowerCase().replace(/\s+/g, '')
  const keyN = normalize(key)
  let best = null, bestScore = 0
  for (const cp of clientProducts) {
    const cpN = normalize(cp.name || '')
    if (!cpN) continue
    let score = 0
    // 優先：子字串包含（最可靠）
    if (keyN.includes(cpN)) {
      score = cpN.length / keyN.length + 1   // 加 1 確保高於字元相似度
    } else if (cpN.includes(keyN)) {
      score = keyN.length / cpN.length + 1
    } else {
      // 備用：字元集交集 / 較短字串長度
      const setA = new Set(keyN), setB = new Set(cpN)
      const inter = [...setA].filter(c => setB.has(c)).length
      score = inter / Math.min(setA.size, setB.size)
    }
    if (score > bestScore) { bestScore = score; best = cp }
  }
  return bestScore >= 0.5 ? best : null
}

export default function PriceTable({ products, onDelete, onStar, onDeleteAll, onRename, ownBrands = [], clientProducts: clientProductsProp = [] }) {
  const [filter, setFilter] = useState('all')
  const [editingKey, setEditingKey] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [selectedBrands, setSelectedBrands] = useState(new Set())
  const [selectedTypes, setSelectedTypes] = useState(new Set())
  const [keyword, setKeyword] = useState('')
  const [clientProducts, setClientProducts] = useState(clientProductsProp)

  // 每次渲染時直接抓最新的自有商品，不依賴父層傳入
  useEffect(() => {
    apiFetch('/api/my-products').then(data => { if (data) setClientProducts(data) }).catch(() => {})
  }, [])

  const kw = keyword.trim().toLowerCase()

  const allBrands = [...new Set([
    ...products.map(p => p.brand),
    ...clientProducts.map(p => p.brand),
  ].filter(Boolean))].sort()

  const allTypes = [...new Set([
    ...products.map(getProductType),
    ...clientProducts.map(p => CATEGORY_LABEL[p.category] || p.category),
  ].filter(Boolean))].sort()

  const filtered = products
    .filter(p => selectedBrands.size === 0 || selectedBrands.has(p.brand))
    .filter(p => selectedTypes.size === 0 || selectedTypes.has(getProductType(p)))
    .filter(p => {
      if (filter === 'drops') {
        return ['watsons', 'cosmed', 'poya'].some(k =>
          p[k]?.price && p[k]?.prevPrice && p[k].price < p[k].prevPrice
        )
      }
      if (filter === 'starred') return p.is_starred
      return true
    })
    .filter(p => {
      if (!kw) return true
      return (p.name || '').toLowerCase().includes(kw) || (p.brand || '').toLowerCase().includes(kw)
    })

  const groups = groupProducts(filtered)

  // 找出尚未配對到任何競品列的自有商品 → 獨立顯示一列
  const matchedClientIds = new Set(
    groups.map(g => findClientMatch(g.key, clientProducts)?.id).filter(Boolean)
  )
  const ownOnlyRows = clientProducts.filter(cp => {
    if (matchedClientIds.has(cp.id)) return false
    if (selectedBrands.size > 0 && !selectedBrands.has(cp.brand)) return false
    const cpType = CATEGORY_LABEL[cp.category] || cp.category
    if (selectedTypes.size > 0 && !selectedTypes.has(cpType)) return false
    if (kw && !(cp.name || '').toLowerCase().includes(kw) && !(cp.brand || '').toLowerCase().includes(kw)) return false
    return true
  })

  return (
    <div>
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="section-title">即時比價總覽</div>
          <input
            type="text"
            placeholder="搜尋商品或品牌…"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', fontSize: 12,
              color: 'var(--text-primary)', outline: 'none', width: 160,
            }}
          />
        </div>
        <div className="section-actions">
          {onDeleteAll && (
            <button className="btn" style={{ fontSize: 12, padding: '5px 12px', background: 'var(--red)', color: '#fff', border: 'none' }} onClick={onDeleteAll}>
              ✕ 刪除所有追蹤商品
            </button>
          )}
          <MultiSelectDropdown
            label="品牌"
            options={allBrands}
            selected={selectedBrands}
            onChange={setSelectedBrands}
          />
          <MultiSelectDropdown
            label="產品項"
            options={allTypes}
            selected={selectedTypes}
            onChange={setSelectedTypes}
          />
          <div className="tab-bar">
            {[['all','全部'],['drops','降價中'],['starred','⭐ 重點']].map(([k,l]) => (
              <button key={k} className={`tab${filter===k?' active':''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="price-table">
          <thead>
            <tr>
              <th style={{ width: 260 }}>商品</th>
              {Object.entries(PF_LABEL).map(([k, l]) => (
                <th key={k} className="platform-col">
                  <span className={`platform-badge ${PF_CLASS[k]}`}>{l}</span>
                </th>
              ))}
              <th style={{ minWidth: 120, textAlign: 'center' }}>自有售價</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {groups.map(({ key, rep, merged }) => {
              const pData = merged ?? {
                watsons: rep.watsons,
                cosmed:  rep.cosmed,
                poya:    rep.poya,
              }
              const prices = ['watsons', 'cosmed', 'poya'].map(k => pData[k]?.price).filter(v => v > 0)
              const minP = prices.length ? Math.min(...prices) : 0
              const maxP = prices.length ? Math.max(...prices) : 0

              return (
                <tr key={key}>
                  <td>
                    <div className="product-cell">
                      <div className="product-img">
                        {rep.image_url
                          ? <img src={rep.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} onError={e => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.textContent = rep.emoji || '✨' }} />
                          : (rep.emoji || '✨')
                        }
                      </div>
                      <div
                        className="product-name-wrap"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: onRename ? 'pointer' : 'default' }}
                        onClick={() => { if (onRename && editingKey !== key) { setEditingKey(key); setEditValue(key) } }}
                        title={onRename ? '點擊編輯名稱' : undefined}
                      >
                        {editingKey === key ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && editValue.trim()) {
                                onRename(rep.id, editValue.trim())
                                setEditingKey(null)
                              }
                              if (e.key === 'Escape') setEditingKey(null)
                            }}
                            onBlur={() => {
                              if (editValue.trim()) onRename(rep.id, editValue.trim())
                              setEditingKey(null)
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--accent)',
                              borderRadius: 5, padding: '3px 8px', fontSize: 13,
                              color: 'var(--text-primary)', outline: 'none', width: 180,
                            }}
                          />
                        ) : (
                          <div className="product-name product-name-editable">{key}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <PriceCell pl={pData.watsons} isMin={pData.watsons?.price === minP && minP > 0} isMax={pData.watsons?.price === maxP && maxP > minP} />
                  <PriceCell pl={pData.cosmed}  isMin={pData.cosmed?.price  === minP && minP > 0} isMax={pData.cosmed?.price  === maxP && maxP > minP} />
                  <PriceCell pl={pData.poya}    isMin={pData.poya?.price    === minP && minP > 0} isMax={pData.poya?.price    === maxP && maxP > minP} />
                  <td style={{ textAlign: 'center' }}>
                    {(() => {
                      const isOwn = ownBrands.length > 0 && ownBrands.some(b => b && rep.brand && rep.brand.toLowerCase().includes(b.toLowerCase()))
                      const match = findClientMatch(key, clientProducts)
                      if (isOwn) return <span style={{ fontSize: 11, background: 'rgba(139,92,246,0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(139,92,246,0.3)' }}>自有品牌</span>
                      if (match?.price) return (
                        <div>
                          <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 500, color: '#4ade80' }}>NT${Number(match.price).toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{match.name.slice(0, 12)}</div>
                        </div>
                      )
                      return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    })()}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {onStar && (
                      <button
                        onClick={() => onStar(rep.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '4px 5px', borderRadius: 4, lineHeight: 1, color: rep.is_starred ? '#facc15' : 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#facc15'}
                        onMouseLeave={e => e.currentTarget.style.color = rep.is_starred ? '#facc15' : 'var(--text-muted)'}
                        title={rep.is_starred ? '取消重點' : '加入重點'}
                      >{rep.is_starred ? '★' : '☆'}</button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(rep.id, key)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15, padding: '4px 5px', borderRadius: 4, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="刪除商品"
                      >✕</button>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* 自有商品獨立列（無對應競品） */}
            {ownOnlyRows.map(cp => (
              <tr key={`own-${cp.id}`} style={{ borderLeft: '3px solid rgba(139,92,246,0.6)' }}>
                <td>
                  <div className="product-cell">
                    <div className="product-img" style={{ fontSize: 22 }}>
                      {cp.image_url?.startsWith('http')
                        ? <img src={cp.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} onError={e => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.textContent='✨' }} />
                        : '✨'}
                    </div>
                    <div className="product-name-wrap">
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{cp.brand || ''}</div>
                      <div className="product-name">{cp.name}</div>
                      <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.2)', color: '#c084fc', padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>自有商品</span>
                    </div>
                  </div>
                </td>
                {/* 競品平台欄位 */}
                <td className="price-cell"><div className="price-num" style={{ color: 'var(--text-muted)' }}>—</div></td>
                <td className="price-cell"><div className="price-num" style={{ color: 'var(--text-muted)' }}>—</div></td>
                <td className="price-cell"><div className="price-num" style={{ color: 'var(--text-muted)' }}>—</div></td>
                {/* 自有售價 */}
                <td style={{ textAlign: 'center' }}>
                  {cp.price
                    ? <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 600, color: '#c084fc' }}>NT${Number(cp.price).toLocaleString()}</div>
                    : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>未設定</span>
                  }
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
