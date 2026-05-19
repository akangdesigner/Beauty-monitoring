import { useState, useMemo, useCallback } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, BarElement, BarController, LinearScale, CategoryScale, Tooltip } from 'chart.js'

Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip)

const UNIT_RE = /[\d.]+\s*(ml|l|g|mg|kg|oz|抽|片|包|入|顆|條)\s*$/i


function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '—')
}

// 依 base_name 分組，各平台取最低價
function groupByBaseName(products) {
  const map = new Map()
  for (const p of products) {
    const key = p.base_name || p.name || p.id
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

const PF_COLOR = { watsons: '#00a0e3', cosmed: '#f47920', poya: '#16a34a' }

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
    const label = (p) => mode === 'brand' ? typeOf(p) : (p.brand || p.base_name || '')
    return grouped
      .filter(p => mode === 'brand' ? p.brand === current : typeOf(p) === current)
      .sort((a, b) => label(a).localeCompare(label(b), 'zh-TW'))
      .slice(0, 20)
  }, [grouped, mode, current, typeOf])

  // 每個商品一條柱子（最低價），顏色代表最便宜的平台
  const barColors = filtered.map(p => {
    const pfs = ['watsons', 'cosmed', 'poya'].filter(pf => p[pf]?.price)
    if (!pfs.length) return '#8b5cf699'
    const best = pfs.reduce((a, b) => p[a].price <= p[b].price ? a : b)
    return PF_COLOR[best] + '99'
  })
  const borderColors = filtered.map(p => {
    const pfs = ['watsons', 'cosmed', 'poya'].filter(pf => p[pf]?.price)
    if (!pfs.length) return '#8b5cf6'
    const best = pfs.reduce((a, b) => p[a].price <= p[b].price ? a : b)
    return PF_COLOR[best]
  })

  const data = {
    labels: filtered.map(p => truncate(p.base_name || p.name, 12)),
    datasets: [{
      label: '最低價',
      data: filtered.map(p => {
        const prices = ['watsons', 'cosmed', 'poya'].map(pf => p[pf]?.price).filter(Boolean)
        return prices.length ? Math.min(...prices) : null
      }),
      backgroundColor: barColors,
      borderColor: borderColors,
      borderWidth: 1,
      borderRadius: 3,
      barThickness: 28,
    }]
  }

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
        callbacks: {
          label: (c) => {
            const p = filtered[c.dataIndex]
            const lines = []
            if (p.watsons?.price) lines.push(` 屈臣氏  NT$${p.watsons.price.toLocaleString()}`)
            if (p.cosmed?.price)  lines.push(` 康是美  NT$${p.cosmed.price.toLocaleString()}`)
            if (p.poya?.price)    lines.push(` 寶雅    NT$${p.poya.price.toLocaleString()}`)
            return lines
          }
        }
      }
    },
    scales: {
      x: { ticks: { color: '#5c5075', font: { family: 'DM Mono', size: 10 }, maxRotation: 30 }, grid: { color: '#ffffff08' } },
      y: { ticks: { color: '#5c5075', font: { family: 'DM Mono', size: 10 }, callback: v => 'NT$' + v.toLocaleString() }, grid: { color: '#ffffff08' } }
    }
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
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>柱色 = 最低價平台：</span>
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
