import { useState, useMemo, useCallback } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, BarElement, BarController, LinearScale, CategoryScale, Tooltip } from 'chart.js'

Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip)

const UNIT_RE = /[\d.]+\s*(ml|l|g|mg|kg|oz|抽|片|包|入|顆|條)\s*$/i

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#13102299',
      titleColor: '#f0e8ff',
      bodyColor: '#9d8fba',
      borderColor: '#2a2245',
      borderWidth: 1,
      callbacks: { label: c => ` ${c.dataset.label}  NT$${c.raw?.toLocaleString() ?? '—'}` }
    }
  },
  scales: {
    x: { ticks: { color: '#5c5075', font: { family: 'DM Mono', size: 10 }, maxRotation: 30 }, grid: { color: '#ffffff08' } },
    y: { ticks: { color: '#5c5075', font: { family: 'DM Mono', size: 10 }, callback: v => 'NT$' + v.toLocaleString() }, grid: { color: '#ffffff08' } }
  }
}

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '—')
}

// 依 brand+base_name 分組，各平台取最低價
function groupByBaseName(products) {
  const map = new Map()
  for (const p of products) {
    const key = `${p.brand || ''}||${p.base_name || p.name || p.id}`
    if (!map.has(key)) {
      map.set(key, { ...p })
    } else {
      const g = map.get(key)
      for (const pf of ['watsons', 'cosmed', 'poya']) {
        if (p[pf]?.price && (!g[pf]?.price || p[pf].price < g[pf].price)) {
          g[pf] = p[pf]
        }
      }
    }
  }
  return [...map.values()]
}

export default function TrendChart({ products }) {
  const [mode, setMode] = useState('brand')
  const [selected, setSelected] = useState('')

  // 先分組，圖表只顯示唯一 base_name
  const grouped = useMemo(() => groupByBaseName(products), [products])

  const brands = useMemo(() => [...new Set(grouped.map(p => p.brand).filter(Boolean))].sort(), [grouped])

  // 剝掉品牌前綴取產品類型
  const typeOf = useCallback((p) => {
    const base = p.base_name || p.name || ''
    const strip = (b) => base.slice(b.length).trim().replace(UNIT_RE, '').trim() || base
    if (p.brand && base.startsWith(p.brand)) return strip(p.brand)
    for (const b of brands) {
      if (b && base.startsWith(b)) return strip(b)
    }
    // 啟發式：英數前綴 + 中文正文 → 把英數部分視為品牌名剝掉
    const latinPrefix = base.match(/^[A-Za-z0-9&\-. ]+/)
    if (latinPrefix) {
      const rest = base.slice(latinPrefix[0].length).trim()
      if (rest && /[一-鿿]/.test(rest[0])) {
        return rest.replace(UNIT_RE, '').trim() || base
      }
    }
    return base.replace(UNIT_RE, '').trim() || base
  }, [brands])

  const categories = useMemo(() => [...new Set(grouped.map(typeOf).filter(Boolean))].sort(), [grouped, typeOf])

  const options = mode === 'brand' ? brands : categories
  const current = selected || options[0] || ''

  const filtered = useMemo(() => {
    return grouped
      .filter(p => mode === 'brand' ? p.brand === current : typeOf(p) === current)
      .sort((a, b) => {
        const maxA = Math.max(a.watsons?.price || 0, a.cosmed?.price || 0, a.poya?.price || 0)
        const maxB = Math.max(b.watsons?.price || 0, b.cosmed?.price || 0, b.poya?.price || 0)
        return maxB - maxA
      })
      .slice(0, 12)
  }, [products, mode, current, typeOf])

  const data = {
    labels: filtered.map(p => truncate(p.base_name || p.name, 8)),
    datasets: [
      { label: '屈臣氏', data: filtered.map(p => p.watsons?.price || null), backgroundColor: '#00a0e380', borderColor: '#00a0e3', borderWidth: 1, borderRadius: 3 },
      { label: '康是美', data: filtered.map(p => p.cosmed?.price  || null), backgroundColor: '#f4792080', borderColor: '#f47920', borderWidth: 1, borderRadius: 3 },
      { label: '寶雅',   data: filtered.map(p => p.poya?.price    || null), backgroundColor: '#16a34a80', borderColor: '#16a34a', borderWidth: 1, borderRadius: 3 },
    ]
  }

  return (
    <div className="chart-card">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div className="section-title">跨平台比價</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="tab-bar">
            <button className={`tab${mode === 'brand' ? ' active' : ''}`} onClick={() => { setMode('brand'); setSelected('') }}>品牌</button>
            <button className={`tab${mode === 'category' ? ' active' : ''}`} onClick={() => { setMode('category'); setSelected('') }}>品項</button>
          </div>
          {options.length > 0 && (
            <select className="select-styled" value={current} onChange={e => setSelected(e.target.value)}>
              {options.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="chart-legend" style={{ marginBottom: 10 }}>
        {[['#00a0e3', '屈臣氏'], ['#f47920', '康是美'], ['#16a34a', '寶雅']].map(([color, label]) => (
          <div key={label} className="legend-item">
            <div className="legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="chart-empty">
          <div className="chart-empty-icon">📊</div>
          <div className="chart-empty-text">此{mode === 'brand' ? '品牌' : '品項'}目前沒有比價資料</div>
        </div>
      ) : (
        <div className="chart-container">
          <Bar data={data} options={chartOptions} />
        </div>
      )}
    </div>
  )
}
