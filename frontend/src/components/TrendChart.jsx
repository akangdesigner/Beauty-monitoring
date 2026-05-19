import { useState, useEffect, useMemo, useCallback } from 'react'
import { Chart, LineElement, LineController, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { api } from '../api'

Chart.register(LineElement, LineController, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

const UNIT_RE = /[\d.]+\s*(ml|l|g|mg|kg|oz|抽|片|包|入|顆|條)\s*$/i

const COLORS = [
  '#c084fc','#60a5fa','#f472b6','#34d399','#fbbf24',
  '#f87171','#38bdf8','#4ade80','#fb923c','#a78bfa',
  '#e879f9','#94a3b8','#f9a8d4','#86efac',
]

const DAYS_OPTIONS = [
  { value: 30, label: '30天' },
  { value: 60, label: '60天' },
  { value: 90, label: '90天' },
]

// 取商品「類型」：去掉規格後的最後一個詞
function typeOf(p) {
  const n = (p.base_name || p.name || '').replace(UNIT_RE, '').trim()
  const last = n.split(/[\s　]+/).pop() || ''
  return last.length >= 2 ? last : n
}

export default function TrendChart({ products }) {
  const [mode,     setMode]     = useState('brand')   // 'brand' | 'type'
  const [selected, setSelected] = useState('')
  const [days,     setDays]     = useState(30)
  const [trends,   setTrends]   = useState({})        // { productId: {watsons:[],cosmed:[],poya:[]} }
  const [loading,  setLoading]  = useState(false)

  // 品牌 / 品項 選項清單
  const options = useMemo(() => {
    if (!products.length) return []
    const set = new Set()
    products.forEach(p => {
      const val = mode === 'brand' ? (p.brand || '') : typeOf(p)
      if (val) set.add(val)
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-TW'))
  }, [products, mode])

  // 切換 mode 時重設選項
  useEffect(() => { setSelected('') }, [mode])
  useEffect(() => { if (options.length && !selected) setSelected(options[0]) }, [options])

  // 依目前選項過濾商品（最多 12 條線）
  const filteredProducts = useMemo(() => {
    if (!selected) return []
    return products
      .filter(p => mode === 'brand' ? (p.brand || '') === selected : typeOf(p) === selected)
      .slice(0, 12)
  }, [products, mode, selected])

  // 商品組改變或天數改變時，批次拉 trend 資料
  useEffect(() => {
    if (!filteredProducts.length) { setTrends({}); return }
    let cancelled = false
    setLoading(true)
    setTrends({})
    Promise.all(
      filteredProducts.map(p =>
        api.getTrend(p.id, days)
          .then(d => ({ id: p.id, data: d }))
          .catch(() => ({ id: p.id, data: {} }))
      )
    ).then(results => {
      if (cancelled) return
      const map = {}
      results.forEach(r => { map[r.id] = r.data })
      setTrends(map)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filteredProducts, days])

  // 合併所有商品的日期 union
  const allDates = useMemo(() => {
    const set = new Set()
    Object.values(trends).forEach(d => {
      ['watsons', 'cosmed', 'poya'].forEach(pf =>
        (d[pf] || []).forEach(r => set.add(r.date))
      )
    })
    return [...set].sort()
  }, [trends])

  const hasData = allDates.length > 0

  // 每個商品一條線：取當天三平台中最低價
  const chartData = useMemo(() => {
    if (!hasData) return null
    const datasets = filteredProducts.map((p, i) => {
      const d = trends[p.id] || {}
      // 建立 date→minPrice map
      const priceMap = new Map()
      ;['watsons', 'cosmed', 'poya'].forEach(pf => {
        ;(d[pf] || []).forEach(r => {
          const cur = priceMap.get(r.date)
          if (cur === undefined || r.price < cur) priceMap.set(r.date, r.price)
        })
      })
      const color = COLORS[i % COLORS.length]
      const label = (p.base_name || p.name || '').replace(UNIT_RE, '').trim() || p.name
      return {
        label: label.length > 14 ? label.slice(0, 14) + '…' : label,
        data: allDates.map(d => priceMap.get(d) ?? null),
        borderColor: color,
        backgroundColor: color + '18',
        pointBackgroundColor: color,
        pointRadius: allDates.length > 20 ? 2 : 3,
        pointHoverRadius: 5,
        borderWidth: 1.8,
        tension: 0.3,
        spanGaps: false,
      }
    })
    return {
      labels: allDates.map(d => d.slice(5).replace('-', '/')),
      datasets,
    }
  }, [filteredProducts, trends, allDates, hasData])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#9d8fba',
          font: { family: 'Noto Sans TC, sans-serif', size: 11 },
          boxWidth: 12, padding: 12,
        }
      },
      tooltip: {
        backgroundColor: '#13102299',
        titleColor: '#f0e8ff',
        bodyColor: '#9d8fba',
        borderColor: '#2a2245',
        borderWidth: 1,
        callbacks: {
          label: c => c.raw == null ? null : ` ${c.dataset.label}  NT$${c.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#5c5075', font: { family: 'DM Mono', size: 10 }, maxTicksLimit: 10 },
        grid: { color: '#ffffff08' }
      },
      y: {
        ticks: {
          color: '#5c5075',
          font: { family: 'DM Mono', size: 10 },
          callback: v => 'NT$' + v.toLocaleString(),
        },
        grid: { color: '#ffffff08' }
      }
    }
  }), [])

  if (!products || products.length === 0) return null

  return (
    <div className="chart-section">
      {/* ── 標題列 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 0, flex: '0 0 auto' }}>趨勢分析</h2>

        {/* 模式切換 */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
          {[['brand','依品牌'],['type','依品項']].map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)} style={{
              padding: '4px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: 'none',
              background: mode === key ? 'rgba(155,109,202,0.3)' : 'transparent',
              color: mode === key ? 'var(--amethyst-light)' : 'var(--text-secondary)',
              fontFamily: 'Noto Sans TC, sans-serif', transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>

        {/* 選單 */}
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{
            flex: '1 1 140px', maxWidth: 240,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '5px 10px',
            color: 'var(--text-primary)', fontSize: 13,
            fontFamily: 'Noto Sans TC, sans-serif',
            cursor: 'pointer', outline: 'none',
          }}
        >
          {options.map(o => (
            <option key={o} value={o} style={{ background: '#1a1630' }}>{o}</option>
          ))}
        </select>

        {/* 天數 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {DAYS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setDays(o.value)} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
              border: days === o.value ? '1px solid rgba(155,109,202,0.6)' : '1px solid rgba(255,255,255,0.1)',
              background: days === o.value ? 'rgba(155,109,202,0.15)' : 'rgba(255,255,255,0.03)',
              color: days === o.value ? 'var(--amethyst-light)' : 'var(--text-secondary)',
              fontFamily: 'DM Mono, monospace', transition: 'all 0.15s',
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* 說明文字 */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        {mode === 'brand'
          ? `品牌「${selected}」旗下所有監控商品的最低價走勢`
          : `品項「${selected}」各商品的最低價走勢（跨品牌比較）`}
        {filteredProducts.length > 0 && `，共 ${filteredProducts.length} 條線`}
      </div>

      {/* 圖表 */}
      <div style={{ height: 320, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            載入中…
          </div>
        )}
        {!loading && !hasData && selected && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>📈</div>
            <div>「{selected}」在 {days} 天內尚無價格記錄</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>請先執行爬蟲以收集歷史資料</div>
          </div>
        )}
        {!loading && hasData && chartData && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  )
}
