import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

/* ── sessionStorage keys ── */
const SS_QUERY  = 'sp_current_query'
const SS_RESULT = 'sp_current_result'
const LS_SAVED  = 'sp_saved_searches'

const INJECT_CSS = `
@keyframes sp-fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sp-gradFlow {
  0%,100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@keyframes sp-shimmer {
  0%   { transform: translateX(-120%) skewX(-18deg); }
  100% { transform: translateX(220%)  skewX(-18deg); }
}
@keyframes sp-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.4; }
}
@keyframes sp-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.sp-input:focus {
  border-color: rgba(155,109,202,0.6) !important;
  box-shadow: 0 0 0 3px rgba(155,109,202,0.14), 0 0 20px rgba(155,109,202,0.12) !important;
  outline: none;
}
.sp-btn {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #9b6dca 0%, #c084fc 45%, #d4956a 100%);
  background-size: 200% 200%;
  animation: sp-gradFlow 4s ease infinite;
  color: #fff; border: none; border-radius: 12px;
  padding: 0 32px; font-size: 15px; font-weight: 600;
  cursor: pointer; letter-spacing: 0.04em; height: 52px;
  transition: transform 0.2s, box-shadow 0.2s;
  font-family: 'Noto Sans TC', sans-serif;
  white-space: nowrap;
}
.sp-btn::after {
  content: '';
  position: absolute; inset-block: 0; width: 45%; left: -50%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
  transform: skewX(-20deg);
  animation: sp-shimmer 3.5s ease-in-out infinite;
}
.sp-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 36px rgba(155,109,202,0.45);
}
.sp-btn:disabled { opacity: 0.45; cursor: not-allowed; animation: none; }
.sp-chip {
  padding: 5px 14px; border-radius: 20px; font-size: 13px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: var(--text-secondary);
  cursor: pointer; transition: all 0.2s;
  font-family: 'Noto Sans TC', sans-serif;
}
.sp-chip:hover { border-color: rgba(155,109,202,0.4); color: var(--amethyst-light); }
.sp-chip.active {
  background: rgba(155,109,202,0.16);
  border-color: rgba(155,109,202,0.5);
  color: var(--amethyst-light);
}
.sp-row:hover td { background: rgba(255,255,255,0.025); }
.sp-price-link:hover { text-decoration: underline; }
.sp-icon-btn {
  background: none; border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform 0.15s, opacity 0.15s;
  padding: 4px; border-radius: 6px;
}
.sp-icon-btn:hover { transform: scale(1.15); }
.sp-saved-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px 5px 14px; border-radius: 20px; font-size: 13px;
  border: 1px solid rgba(234,179,8,0.3);
  background: rgba(234,179,8,0.06);
  color: #fde68a;
  cursor: pointer; transition: all 0.2s;
  font-family: 'Noto Sans TC', sans-serif;
}
.sp-saved-chip:hover { border-color: rgba(234,179,8,0.6); background: rgba(234,179,8,0.12); }
.sp-saved-chip-del {
  background: none; border: none; cursor: pointer;
  color: rgba(253,230,138,0.45); font-size: 14px; line-height: 1;
  padding: 0 2px; border-radius: 4px; transition: color 0.15s;
}
.sp-saved-chip-del:hover { color: #f87171; }
`

const PLATFORM_COLORS = {
  watsons: '#00a0e3',
  cosmed:  '#f47920',
  poya:    '#16a34a',
}
const PLATFORM_NAMES = { watsons: '屈臣氏', cosmed: '康是美', poya: '寶雅' }

function PlatformDot({ platform }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: PLATFORM_COLORS[platform], marginRight: 5,
      boxShadow: `0 0 6px ${PLATFORM_COLORS[platform]}99`,
    }} />
  )
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '64px 0', animation: 'sp-fadeUp 0.4s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 32 }}>
        {['watsons', 'cosmed', 'poya'].map(p => (
          <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `2px solid ${PLATFORM_COLORS[p]}`,
              borderTopColor: 'transparent',
              animation: 'sp-spin 1s linear infinite',
              animationDelay: p === 'cosmed' ? '0.15s' : p === 'poya' ? '0.3s' : '0s',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
              {PLATFORM_NAMES[p]}
            </span>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, animation: 'sp-pulse 1.5s ease infinite' }}>
        正在爬取三個平台搜尋結果，請稍候（約 30–60 秒）…
      </p>
    </div>
  )
}

function PriceCell({ data, allPrices }) {
  if (!data) return (
    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>—</td>
  )

  const validPrices = allPrices.filter(Boolean)
  const isMin = validPrices.length > 1 && data.price === Math.min(...validPrices)
  const isMax = validPrices.length > 1 && data.price === Math.max(...validPrices)
  const color = isMin ? '#4ade80' : isMax ? '#f87171' : 'var(--text-primary)'

  return (
    <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
      {data.url ? (
        <a href={data.url} target="_blank" rel="noreferrer" className="sp-price-link"
          style={{ color, fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
          ${data.price.toLocaleString()}
        </a>
      ) : (
        <span style={{ color, fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 600 }}>
          ${data.price.toLocaleString()}
        </span>
      )}
      {data.origPrice && data.origPrice > data.price && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontFamily: 'DM Mono, monospace' }}>
          ${data.origPrice.toLocaleString()}
        </div>
      )}
    </td>
  )
}

/* ── 品牌欄顯示邏輯：AI 解析失敗時品牌會等於完整商品名，過濾掉 ── */
const SPEC_RE = /\d+(?:\.\d+)?\s*(?:g|ml|mg|l|kg|oz|入|條|粒|包|支|片|罐|瓶|組|件|副|雙|套)\b/i
function displayBrand(brand, baseName) {
  const isValidBrand = (s) => s && s !== baseName && !SPEC_RE.test(s) && s.length <= 20
  if (isValidBrand(brand)) return brand
  // AI 未給品牌時，取 base_name 第一個詞當輔助顯示（長度≤10 且不含規格）
  const first = baseName.split(/[\s　]/)[0] || ''
  if (first && !SPEC_RE.test(first) && first.length <= 10) return first
  return '—'
}

/* ── 保存的搜尋列表 ── */
function SavedSearchBar({ savedSearches, onLoad, onDelete }) {
  if (savedSearches.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', animation: 'sp-fadeUp 0.4s ease both' }}>
      <span style={{ fontSize: 12, color: '#fde68a', opacity: 0.6, fontFamily: 'Noto Sans TC, sans-serif', whiteSpace: 'nowrap' }}>
        ★ 已儲存：
      </span>
      {savedSearches.map((s, i) => (
        <span key={i} className="sp-saved-chip" onClick={() => onLoad(s)}>
          {s.keyword}
          <button className="sp-saved-chip-del" onClick={e => { e.stopPropagation(); onDelete(i) }} title="刪除此儲存搜尋">×</button>
        </span>
      ))}
    </div>
  )
}

export default function SearchPage() {
  /* ── 從 sessionStorage 還原目前搜尋 ── */
  const [query,   setQuery]   = useState(() => sessionStorage.getItem(SS_QUERY) || '')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SS_RESULT)) } catch { return null }
  })
  const [filter,  setFilter]  = useState('all')
  const [error,   setError]   = useState('')
  const [savedSearches, setSavedSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_SAVED)) || [] } catch { return [] }
  })
  const [starFlash, setStarFlash] = useState(false)
  const inputRef = useRef(null)

  /* ── 同步 savedSearches → localStorage ── */
  useEffect(() => {
    localStorage.setItem(LS_SAVED, JSON.stringify(savedSearches))
  }, [savedSearches])

  const doSearch = async (q) => {
    if (!q) return
    setLoading(true)
    setResult(null)
    setError('')
    setFilter('all')
    sessionStorage.removeItem(SS_RESULT)
    try {
      const data = await api.searchProducts(q)
      setResult(data)
      sessionStorage.setItem(SS_QUERY,  q)
      sessionStorage.setItem(SS_RESULT, JSON.stringify(data))
    } catch (err) {
      setError(err.message || '搜尋失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch  = () => doSearch(query.trim())
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }

  /* ── 手動清除結果 ── */
  const handleClear = () => {
    setResult(null)
    setQuery('')
    setError('')
    setFilter('all')
    sessionStorage.removeItem(SS_QUERY)
    sessionStorage.removeItem(SS_RESULT)
  }

  /* ── 儲存目前搜尋 ── */
  const handleSave = () => {
    if (!result || !query.trim()) return
    const keyword = query.trim()
    // 同關鍵字只保留最新一筆
    setSavedSearches(prev => {
      const filtered = prev.filter(s => s.keyword !== keyword)
      return [{ keyword, result, savedAt: Date.now() }, ...filtered]
    })
    setStarFlash(true)
    setTimeout(() => setStarFlash(false), 800)
  }

  /* ── 載入已儲存搜尋 ── */
  const handleLoadSaved = (s) => {
    setQuery(s.keyword)
    setResult(s.result)
    setFilter('all')
    setError('')
    sessionStorage.setItem(SS_QUERY,  s.keyword)
    sessionStorage.setItem(SS_RESULT, JSON.stringify(s.result))
  }

  /* ── 刪除已儲存搜尋 ── */
  const handleDeleteSaved = (idx) => {
    setSavedSearches(prev => prev.filter((_, i) => i !== idx))
  }

  /* ── 判斷目前搜尋是否已儲存 ── */
  const isAlreadySaved = result && savedSearches.some(s => s.keyword === query.trim())

  const filteredGroups = result?.groups?.filter(g => {
    if (filter === 'all3') return g.watsons && g.cosmed && g.poya
    if (filter === 'sale')  return (g.watsons?.origPrice && g.watsons.origPrice > g.watsons.price)
                                || (g.cosmed?.origPrice  && g.cosmed.origPrice  > g.cosmed.price)
                                || (g.poya?.origPrice    && g.poya.origPrice    > g.poya.price)
    return true
  }) || []

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <style dangerouslySetInnerHTML={{ __html: INJECT_CSS }} />

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: 'sp-fadeUp 0.5s ease both' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: 'var(--amethyst-light)', textTransform: 'uppercase', marginBottom: 12 }}>
          Real-time Search
        </div>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 52px)',
          fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.15, marginBottom: 10,
          background: 'linear-gradient(135deg, #e2d5f5 0%, #d4956a 60%, #c084fc 100%)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
          backgroundSize: '200% 200%', animation: 'sp-gradFlow 6s ease infinite',
        }}>
          搜尋比價
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'Noto Sans TC, sans-serif' }}>
          輸入品牌、商品類別或關鍵字，即時比較屈臣氏、康是美、寶雅三個平台的價格
        </p>
      </div>

      {/* 搜尋框 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, animation: 'sp-fadeUp 0.5s 0.1s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <input
          ref={inputRef}
          className="sp-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例：唇膏、3CE 唇釉、美寶蓮眼影…"
          disabled={loading}
          style={{
            flex: 1, height: 52, padding: '0 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)', fontSize: 15,
            fontFamily: 'Noto Sans TC, sans-serif',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        <button className="sp-btn" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? '搜尋中…' : '搜尋'}
        </button>
      </div>

      {/* 已儲存的搜尋 */}
      <SavedSearchBar
        savedSearches={savedSearches}
        onLoad={handleLoadSaved}
        onDelete={handleDeleteSaved}
      />

      {/* 快速範例（無結果時才顯示） */}
      {!result && !loading && savedSearches.length === 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40, animation: 'sp-fadeUp 0.5s 0.2s ease both', opacity: 0, animationFillMode: 'forwards' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Noto Sans TC, sans-serif', display: 'flex', alignItems: 'center' }}>快速搜尋：</span>
          {['唇膏', '眼影', '卸妝', '防曬', '精華液', '洗髮精'].map(ex => (
            <button key={ex} className="sp-chip" onClick={() => { setQuery(ex); doSearch(ex) }}>{ex}</button>
          ))}
        </div>
      )}

      {/* 載入中 */}
      {loading && <LoadingState />}

      {/* 錯誤 */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12, padding: '14px 20px', color: '#f87171', fontSize: 14,
          fontFamily: 'Noto Sans TC, sans-serif', animation: 'sp-fadeUp 0.4s ease both',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 平台警告 */}
      {result?.warnings?.length > 0 && (
        <div style={{
          background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13,
          color: '#fde68a', fontFamily: 'Noto Sans TC, sans-serif',
          animation: 'sp-fadeUp 0.4s ease both',
        }}>
          {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {/* 搜尋結果 */}
      {result && !loading && (
        <div style={{ animation: 'sp-fadeUp 0.5s ease both' }}>
          {/* 結果統計 + 工具列 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontFamily: 'Noto Sans TC, sans-serif', fontSize: 14, color: 'var(--text-secondary)' }}>
              「<span style={{ color: 'var(--text-primary)' }}>{query}</span>」找到{' '}
              <span style={{ color: 'var(--amethyst-light)', fontWeight: 600 }}>{result.total}</span> 筆商品
              {filter !== 'all' && <span>，篩選後顯示 <span style={{ color: 'var(--rose)', fontWeight: 600 }}>{filteredGroups.length}</span> 筆</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 篩選 chips */}
              {[
                { key: 'all',  label: '全部' },
                { key: 'all3', label: '三平台皆有' },
                { key: 'sale', label: '促銷中' },
              ].map(f => (
                <button key={f.key} className={`sp-chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
                  {f.label}
                </button>
              ))}

              {/* 星號儲存按鈕 */}
              <button
                className="sp-icon-btn"
                onClick={handleSave}
                title={isAlreadySaved ? '已儲存（點擊更新）' : '儲存此搜尋'}
                style={{
                  fontSize: 20, marginLeft: 4,
                  color: isAlreadySaved || starFlash ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  filter: starFlash ? 'drop-shadow(0 0 6px #fbbf24)' : 'none',
                  transition: 'color 0.3s, filter 0.3s',
                }}
              >
                {isAlreadySaved ? '★' : '☆'}
              </button>

              {/* 手動清除按鈕 */}
              <button
                className="sp-icon-btn"
                onClick={handleClear}
                title="清除搜尋結果"
                style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', marginLeft: 0 }}
              >
                ✕
              </button>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)', fontFamily: 'Noto Sans TC, sans-serif' }}>
              此篩選條件下沒有結果
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['品牌', '商品名稱', '規格', '屈臣氏', '康是美', '寶雅'].map((h, i) => (
                      <th key={h} style={{
                        padding: '11px 16px', textAlign: i >= 3 ? 'right' : 'left',
                        fontFamily: 'DM Mono, monospace', fontSize: 11,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.35)', fontWeight: 500,
                      }}>
                        {i >= 3 && <PlatformDot platform={['watsons', 'cosmed', 'poya'][i - 3]} />}
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g, idx) => {
                    const prices = [g.watsons?.price, g.cosmed?.price, g.poya?.price]
                    return (
                      <tr key={idx} className="sp-row"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.045)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Noto Sans TC, sans-serif', whiteSpace: 'nowrap' }}>
                          {displayBrand(g.brand, g.base_name)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Noto Sans TC, sans-serif', maxWidth: 260 }}>
                          {g.base_name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                          {g.variant || '—'}
                        </td>
                        <PriceCell data={g.watsons} allPrices={prices} />
                        <PriceCell data={g.cosmed}  allPrices={prices} />
                        <PriceCell data={g.poya}    allPrices={prices} />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
