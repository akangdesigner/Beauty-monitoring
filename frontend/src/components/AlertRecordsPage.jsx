import { useEffect, useState } from 'react'
import { api } from '../api'

function fmtPrice(v) {
  return typeof v === 'number' && v > 0 ? `NT$${v.toLocaleString()}` : '—'
}

const TYPE_MAP = {
  price_drop:    { icon: '↓', cls: 'ai-red',    label: '降價' },
  price_surge:   { icon: '↑', cls: 'ai-yellow', label: '漲價' },
  gift_added:    { icon: '🎁', cls: 'ai-violet', label: '新增贈品' },
  gift_removed:  { icon: '⚠', cls: 'ai-yellow', label: '移除贈品' },
  back_in_stock: { icon: '✓', cls: 'ai-green',  label: '補貨' },
}
const PF_LABEL = { watsons: '屈臣氏', cosmed: '康是美', poya: '寶雅', pchome: 'PChome' }
const PF_CLASS = { watsons: 'pb-watsons', cosmed: 'pb-cosmed', poya: 'pb-poya', pchome: 'pb-watsons' }

export default function AlertRecordsPage({ isOnline, toast }) {
  const [activeTab, setActiveTab] = useState('gaps')

  // Tab 1 — 價差分析
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [gapsLoading, setGapsLoading] = useState(false)
  const [gapsData, setGapsData] = useState({ items: [], page: 1, totalPages: 1, total: 0 })

  // Tab 2 — 價格異動
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!isOnline || activeTab !== 'gaps') return
    async function load() {
      setGapsLoading(true)
      try {
        const res = await api.getAlertGaps(page, limit)
        setGapsData(res || { items: [], page, totalPages: 1, total: 0 })
      } catch (err) {
        toast?.(`載入價差警示失敗：${err.message}`, 'error')
      } finally {
        setGapsLoading(false)
      }
    }
    load()
  }, [isOnline, activeTab, page, limit, toast])

  useEffect(() => {
    if (!isOnline || activeTab !== 'alerts') return
    async function load() {
      setAlertsLoading(true)
      try {
        const res = await api.getAlerts(50)
        setAlerts(res || [])
      } catch (err) {
        toast?.(`載入價格異動失敗：${err.message}`, 'error')
      } finally {
        setAlertsLoading(false)
      }
    }
    load()
  }, [isOnline, activeTab, toast])

  async function handleMarkAllRead() {
    try {
      await api.markAllRead()
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })))
      toast?.('所有警示已標記為已讀', 'success')
    } catch {}
  }

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div className="section-title">價差警示</div>
        <div className="tab-bar">
          <button className={`tab${activeTab === 'gaps' ? ' active' : ''}`} onClick={() => setActiveTab('gaps')}>📊 價差分析</button>
          <button className={`tab${activeTab === 'alerts' ? ' active' : ''}`} onClick={() => setActiveTab('alerts')}>📋 價格異動</button>
        </div>
      </div>

      {activeTab === 'gaps' && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {gapsLoading ? '載入中…' : `共 ${gapsData.total || 0} 筆`}
          </div>
          {gapsData.items?.length ? (
            <>
              <div className="table-wrap">
                <table className="price-table">
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>屈臣氏</th>
                      <th>康是美</th>
                      <th>寶雅</th>
                      <th>最高價</th>
                      <th>價差</th>
                      <th>更新時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapsData.items.map(row => (
                      <tr key={row.product_id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{row.product_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.brand || '—'}</div>
                        </td>
                        <td>{fmtPrice(row.watsons_price)}</td>
                        <td>{fmtPrice(row.cosmed_price)}</td>
                        <td>{fmtPrice(row.poya_price)}</td>
                        <td style={{ color: 'var(--red)' }}>{fmtPrice(row.max_price)}</td>
                        <td style={{ fontWeight: 600 }}>NT${(row.gap || 0).toLocaleString()}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                          {row.latest_at || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-ghost" disabled={page <= 1 || gapsLoading} onClick={() => setPage(p => Math.max(1, p - 1))}>← 上一頁</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>第 {gapsData.page || page} / {gapsData.totalPages || 1} 頁</div>
                <button className="btn btn-ghost" disabled={page >= (gapsData.totalPages || 1) || gapsLoading} onClick={() => setPage(p => p + 1)}>下一頁 →</button>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
              {gapsLoading ? '載入中…' : '目前沒有跨平台價差警示'}
            </div>
          )}
        </>
      )}

      {activeTab === 'alerts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {alertsLoading ? '載入中…' : `最新 ${alerts.length} 筆`}
            </div>
            {alerts.length > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={handleMarkAllRead}>
                全部已讀
              </button>
            )}
          </div>

          {alerts.length === 0 && !alertsLoading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
              目前沒有價格異動記錄
            </div>
          ) : (
            <div className="alert-list" style={{ maxHeight: 'none' }}>
              {alerts.map(a => {
                const t = TYPE_MAP[a.type] ?? { icon: '●', cls: 'ai-violet', label: '' }
                const isCritical = a.type === 'price_drop' && !a.is_read
                const timeFmt = a.created_at
                  ? new Date(a.created_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : ''
                let diffText = ''
                if (['price_drop', 'price_surge'].includes(a.type) && a.old_value && a.new_value) {
                  const diff = parseInt(a.new_value) - parseInt(a.old_value)
                  diffText = `${diff > 0 ? '+' : '-'}NT$${Math.abs(diff).toLocaleString()}`
                } else if (a.type === 'gift_added') diffText = '+贈品'
                else if (a.type === 'gift_removed') diffText = '-贈品'

                return (
                  <div key={a.id} className={`alert-item${!a.is_read ? ' unread' : ''}${isCritical ? ' critical' : ''}`}>
                    <div className={`alert-icon ${t.cls}`}>{t.icon}</div>
                    <div className="alert-body">
                      <div className="alert-title">{a.title || a.message}</div>
                      <div className="alert-meta">
                        <span className={`platform-badge ${PF_CLASS[a.platform] ?? 'pb-watsons'}`}>
                          {PF_LABEL[a.platform] ?? a.platform}
                        </span>
                        {diffText && <span className={`alert-diff ${a.type === 'price_drop' ? 'neg' : 'pos'}`}>{diffText}</span>}
                        <span className="alert-time">{timeFmt}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
