import { useState, useEffect } from 'react'
import { api } from '../api'

export default function LineSettings({ isOnline, toast }) {
  const [token,       setToken]       = useState('')
  const [secret,      setSecret]      = useState('')
  const [userId,      setUserId]      = useState('')
  const [threshold,   setThreshold]   = useState(5)
  const [priceDrop,   setPriceDrop]   = useState(true)
  const [giftChange,  setGiftChange]  = useState(true)
  const [dailyReport, setDailyReport] = useState(true)
  const [status,      setStatus]      = useState('disconnected') // 'connected' | 'disconnected'
  const [statusText,  setStatusText]  = useState('未設定')
  const [saving,      setSaving]      = useState(false)
  const [testing,     setTesting]     = useState(false)

  useEffect(() => { if (isOnline) loadSettings() }, [isOnline])

  async function loadSettings() {
    try {
      const s = await api.getLineSettings()
      setToken(s.hasToken ? '••••••••' : '')
      setSecret(s.hasSecret ? '••••••••' : '')
      setUserId(s.user_id || '')
      setThreshold(s.price_drop_threshold ?? 5)
      setPriceDrop(!!s.notify_price_drop)
      setGiftChange(!!s.notify_gift_change)
      setDailyReport(!!s.daily_report_enabled)
      if (s.hasToken && s.user_id) { setStatus('connected'); setStatusText('已連線') }
      else { setStatus('disconnected'); setStatusText(s.hasToken ? '缺少 User ID' : '未設定') }
    } catch {}
  }

  async function handleSave() {
    if (!userId) return toast('請填寫 LINE User ID', 'error')
    setSaving(true)
    try {
      await api.saveLineSettings({
        channel_access_token: token,
        channel_secret: secret,
        user_id: userId,
        price_drop_threshold: parseFloat(threshold),
        notify_price_drop:    priceDrop   ? 1 : 0,
        notify_gift_change:   giftChange  ? 1 : 0,
        daily_report_enabled: dailyReport ? 1 : 0,
      })
      toast('✅ LINE 通知設定已儲存', 'success')
      await loadSettings()
    } catch (err) {
      toast(`儲存失敗：${err.message}`, 'error')
    }
    setSaving(false)
  }

  async function handleTest() {
    if (!token || token.startsWith('••')) return toast('請先輸入 LINE Channel Access Token', 'error')
    if (!userId) return toast('請填寫推播目標 User ID', 'error')
    setTesting(true)
    try {
      await api.testLine(token, userId)
      toast('✅ 測試訊息已發送！請查看您的 LINE', 'success', 6000)
    } catch (err) {
      toast(`LINE 測試失敗：${err.message}`, 'error')
    }
    setTesting(false)
  }

  const markDirty = () => { setStatus('disconnected'); setStatusText('未儲存') }

  return (
    <div className="settings-card">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div className="section-title">
          LINE 通知設定
          <span className={`line-status ${status}`}>
            <span className="dot" />
            {statusText}
          </span>
        </div>
        <button className={`btn btn-ghost${testing ? ' loading' : ''}`} style={{ fontSize: 11, padding: '5px 10px' }} onClick={handleTest} disabled={testing}>
          📩 發送測試訊息
        </button>
      </div>

      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Channel Access Token</label>
          <input type="password" className="form-input" placeholder="輸入 LINE Channel Token…" value={token}
            onChange={e => { setToken(e.target.value); markDirty() }} />
        </div>
        <div className="form-group">
          <label className="form-label">Channel Secret</label>
          <input type="password" className="form-input" placeholder="輸入 Channel Secret…" value={secret}
            onChange={e => { setSecret(e.target.value); markDirty() }} />
        </div>
        <div className="form-group">
          <label className="form-label">推播目標 User ID</label>
          <input type="text" className="form-input" placeholder="U1234abcd…" value={userId}
            onChange={e => setUserId(e.target.value)} />
          <span className="form-hint">取得方式：LINE Developers Console → Basic settings → Your user ID</span>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
          {[
            ['降價通知',       priceDrop,   setPriceDrop],
            ['贈品異動通知',   giftChange,  setGiftChange],
            ['每日早報（09:00）', dailyReport, setDailyReport],
          ].map(([label, val, set]) => (
            <div key={label} className="toggle-row">
              <span className="toggle-label">{label}</span>
              <button className={`toggle${val ? ' on' : ''}`} onClick={() => set(v => !v)} />
            </div>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">降價觸發門檻（%）</label>
          <input type="number" className="form-input" min="1" max="50" value={threshold}
            onChange={e => setThreshold(e.target.value)} />
          <span className="form-hint">對手降價超過此比例才發出 LINE 警報</span>
        </div>

        <div className="form-group">
          <label className="form-label">LINE Flex Message 預覽</label>
          <div style={{ background:'#06c75510', border:'1px solid #06c75530', borderRadius:8, overflow:'hidden' }}>
            <div style={{ background:'#ff4d6d', padding:'8px 12px' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>🚨 降價警報</span>
            </div>
            <div style={{ padding:'10px 12px', fontSize:11, lineHeight:1.8, color:'var(--text-secondary)' }}>
              <strong style={{ color:'var(--text-primary)', fontSize:13 }}>SK-II 神仙水 230ml</strong><br/>
              <span style={{ color:'var(--momo)' }}>MOMO 購物網</span><br/>
              <hr style={{ borderColor:'var(--border)', margin:'6px 0' }} />
              原價 <span style={{ textDecoration:'line-through', color:'var(--text-muted)' }}>NT$3,960</span><br/>
              現價 <strong style={{ color:'var(--red)', fontSize:14 }}>NT$3,480</strong><br/>
              <span style={{ background:'var(--red-dim)', color:'var(--red)', padding:'2px 8px', borderRadius:4, fontSize:10 }}>↓ 降價 12.1% | 省 NT$480</span>
            </div>
            <div style={{ padding:'6px 12px 10px', fontSize:10, color:'var(--text-muted)' }}>建議跟進調整定價策略</div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-ghost" onClick={loadSettings}>重置</button>
        <button className={`btn btn-primary${saving ? ' loading' : ''}`} onClick={handleSave} disabled={saving}>
          儲存設定
        </button>
      </div>
    </div>
  )
}
