import { useState } from 'react'

const PF_LABEL = { watsons: '屈臣氏', cosmed: '康是美', momo: 'MOMO' }
const PF_SHORT = { watsons: '屈', cosmed: '康', momo: 'M' }
const PF_CLASS = { watsons: 'pb-watsons', cosmed: 'pb-cosmed', momo: 'pb-momo' }

function PriceCell({ pl, isMin, isMax }) {
  if (!pl?.price) return <td className="price-cell"><div className="price-num" style={{ color: 'var(--text-muted)' }}>—</div></td>
  const pct = pl.prevPrice && pl.price !== pl.prevPrice
    ? ((pl.price - pl.prevPrice) / pl.prevPrice * 100).toFixed(1)
    : null
  return (
    <td className="price-cell">
      <div className={`price-num${isMin ? ' lowest' : isMax ? ' highest' : ''}`}>
        NT${pl.price.toLocaleString()}
      </div>
      {pct && (
        <div className={`price-change ${pl.price < pl.prevPrice ? 'down' : 'up'}`}>
          {pl.price < pl.prevPrice ? '▼' : '▲'} {Math.abs(pct)}%
        </div>
      )}
    </td>
  )
}

export default function PriceTable({ products }) {
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('all')

  const filtered = products
    .filter(p => category === 'all' || p.category === category)
    .filter(p => {
      const pfs = [p.watsons, p.cosmed, p.momo].filter(Boolean)
      if (filter === 'drops') return pfs.some(pl => pl.price && pl.prevPrice && pl.price < pl.prevPrice)
      if (filter === 'gifts') return pfs.some(pl => pl.gift)
      return true
    })

  return (
    <div>
      <div className="section-header">
        <div className="section-title">即時比價總覽</div>
        <div className="section-actions">
          <select className="select-styled" onChange={e => setCategory(e.target.value)}>
            <option value="all">全部品類</option>
            <option value="skincare">保養</option>
            <option value="makeup">彩妝</option>
            <option value="haircare">洗護</option>
          </select>
          <div className="tab-bar">
            {[['all','全部'],['drops','降價中'],['gifts','有贈品']].map(([k,l]) => (
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
              <th className="platform-col" style={{ color: 'var(--text-primary)' }}>最低價</th>
              <th>贈品活動</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const prices = ['watsons','cosmed','momo'].map(k => p[k]?.price).filter(v => v > 0)
              const minP = prices.length ? Math.min(...prices) : 0
              const maxP = prices.length ? Math.max(...prices) : 0
              const lowestPf = ['watsons','cosmed','momo'].find(k => p[k]?.price === minP)

              const gifts = ['watsons','cosmed','momo'].filter(k => p[k]?.gift)

              return (
                <tr key={p.id}>
                  <td>
                    <div className="product-cell">
                      <div className="product-img">{p.emoji || '✨'}</div>
                      <div>
                        <div className="product-name">{p.name}</div>
                        <div className="product-brand">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <PriceCell pl={p.watsons} isMin={p.watsons?.price === minP && minP > 0} isMax={p.watsons?.price === maxP && maxP > minP} />
                  <PriceCell pl={p.cosmed}  isMin={p.cosmed?.price  === minP && minP > 0} isMax={p.cosmed?.price  === maxP && maxP > minP} />
                  <PriceCell pl={p.momo}    isMin={p.momo?.price    === minP && minP > 0} isMax={p.momo?.price    === maxP && maxP > minP} />
                  <td className="price-cell">
                    {minP > 0 ? <>
                      <div className="price-num lowest">NT${minP.toLocaleString()}</div>
                      <div style={{ marginTop: 3 }}>
                        <span className={`platform-badge ${PF_CLASS[lowestPf]}`}>{PF_LABEL[lowestPf]}</span>
                      </div>
                    </> : '—'}
                  </td>
                  <td>
                    {gifts.length > 0
                      ? gifts.map(k => <span key={k} className="gift-tag">{PF_SHORT[k]} {p[k].gift}</span>)
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
