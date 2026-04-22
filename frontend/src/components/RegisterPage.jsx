import { useState } from 'react'
import { api } from '../api'

const PLATFORMS = [
  {
    key: 'watsons',
    name: '屈臣氏',
    icon: '💧',
    color: '#00b4d8',
    placeholder: 'https://www.watsons.com.tw/category/...',
    hint: '貼上屈臣氏分類頁或搜尋頁網址',
  },
  {
    key: 'cosmed',
    name: '康是美',
    icon: '🌿',
    color: '#52b788',
    placeholder: 'https://www.cosmed.com.tw/category/...',
    hint: '貼上康是美分類頁或搜尋頁網址',
  },
  {
    key: 'poya',
    name: '寶雅',
    icon: '🛍️',
    color: '#f4a261',
    placeholder: 'https://www.poyabuy.com.tw/v2/cms/...',
    hint: '貼上寶雅分類頁網址',
  },
  {
    key: 'momo',
    name: 'momo 購物',
    icon: '🛒',
    color: '#888',
    placeholder: '即將推出…',
    hint: 'momo 平台爬蟲即將推出',
    disabled: true,
  },
]

const DAYS_OPTIONS = [
  { value: 'daily',    label: '每天' },
  { value: 'weekdays', label: '週一至週五' },
  { value: 'weekends', label: '週六、週日' },
]

export default function RegisterPage({ isOnline, toast }) {
  const [selected, setSelected]   = useState([])
  const [urls, setUrls]           = useState({})
  const [lineUid, setLineUid]     = useState('')

  // 排程設定
  const [schedEnabled, setSchedEnabled] = useState(false)
  const [schedTime, setSchedTime]       = useState('08:00')
  const [schedDays, setSchedDays]       = useState('daily')

  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  // 自有品牌
  const [ownBrandsInput, setOwnBrandsInput] = useState('')

  function togglePlatform(key, disabled) {
    if (disabled) return
    setSelected(prev => {
      if (prev.includes(key)) {
        const next = prev.filter(k => k !== key)
        setUrls(u => { const c = { ...u }; delete c[key]; return c })
        return next
      }
      if (prev.length >= 3) return prev
      setUrls(u => ({ ...u, [key]: [''] }))
      return [...prev, key]
    })
  }

  function setUrl(platformKey, idx, value) {
    setUrls(prev => {
      const list = [...(prev[platformKey] || [''])]
      list[idx] = value
      return { ...prev, [platformKey]: list }
    })
  }

  function addUrl(platformKey) {
    setUrls(prev => ({
      ...prev,
      [platformKey]: [...(prev[platformKey] || ['']), ''],
    }))
  }

  function removeUrl(platformKey, idx) {
    setUrls(prev => {
      const list = prev[platformKey].filter((_, i) => i !== idx)
      return { ...prev, [platformKey]: list.length ? list : [''] }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isOnline) { toast('⚠ 後端離線，請稍後再試', 'error'); return }
    if (selected.length === 0) { toast('請至少選擇一個平台', 'error'); return }

    const confirmed = window.confirm(
      '⚠ 初始設定將會清除所有現有的監控商品與爬蟲網址，確定要繼續嗎？'
    )
    if (!confirmed) return

    // 收集所有非空網址
    const entries = []
    for (const key of selected) {
      const platform = PLATFORMS.find(p => p.key === key)
      const list = (urls[key] || []).map(u => u.trim()).filter(Boolean)
      list.forEach((url, i) => {
        entries.push({ url, label: `${platform.name} 分類頁${list.length > 1 ? ` ${i + 1}` : ''}` })
      })
    }

    setLoading(true)
    try {
      // 1. 清除舊資料
      await api.clearAllScraperUrls()
      await api.deleteAllProducts()
      await api.deleteAllClientProducts()

      // 2. 新增爬蟲網址
      for (const { url, label } of entries) {
        await api.addScraperUrl(url, label)
      }

      // 3. 儲存排程設定
      await api.setSchedule({ enabled: schedEnabled, time: schedTime, days: schedDays })

      // 4. 儲存自有品牌
      const brands = ownBrandsInput.split(/[,，\n]/).map(b => b.trim()).filter(Boolean)
      if (brands.length > 0) await api.setOwnBrands(brands)

      // 5. 儲存 LINE UID（若有填）
      if (lineUid.trim()) {
        const current = await api.getLineSettings().catch(() => ({}))
        await api.saveLineSettings({ ...current, user_id: lineUid.trim() })
      }

      setDone(true)
      toast(`✅ 設定完成！共新增 ${entries.length} 筆網址`, 'success')
    } catch (err) {
      toast(`儲存失敗：${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={styles.successWrap}>
        <div style={styles.successIcon}>✅</div>
        <h2 style={styles.successTitle}>設定完成！</h2>
        <p style={styles.successSub}>
          已清除舊資料並儲存新設定。<br />
          可至「爬蟲排程」頁面立即執行爬蟲，開始收集價格資料。
        </p>
        <button style={styles.btnPrimary} onClick={() => { setDone(false); setSelected([]); setUrls({}); setLineUid(''); setSchedEnabled(false) }}>
          重新設定
        </button>
      </div>
    )
  }

  const stepBase = selected.length > 0 ? 1 : 0

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h1 style={styles.title}>初始設定</h1>
        <p style={styles.sub}>選擇最多 3 個要追蹤的電商平台，填入分類頁網址，並設定排程與 LINE 推播。</p>
      </div>

      {/* 警告提示 */}
      <div style={styles.warning}>
        ⚠ 送出後將清除所有現有的監控商品與爬蟲網址，請確認後再執行。
      </div>

      <form onSubmit={handleSubmit}>

        {/* Step 1：平台選擇 */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>
            <span style={styles.step}>1</span> 選擇監控平台
            <span style={styles.limit}>（最多選 3 個，已選 {selected.length} / 3）</span>
          </div>
          <div style={styles.platformGrid}>
            {PLATFORMS.map(p => {
              const isSelected = selected.includes(p.key)
              return (
                <div
                  key={p.key}
                  style={{
                    ...styles.platformCard,
                    ...(isSelected ? { ...styles.platformCardSelected, borderColor: p.color } : {}),
                    ...(p.disabled ? styles.platformCardDisabled : {}),
                  }}
                  onClick={() => togglePlatform(p.key, p.disabled)}
                >
                  <div style={styles.platformIcon}>{p.icon}</div>
                  <div style={styles.platformName}>{p.name}</div>
                  {p.disabled && <div style={styles.comingSoon}>即將推出</div>}
                  {isSelected && <div style={{ ...styles.checkmark, color: p.color }}>✓</div>}
                </div>
              )
            })}
          </div>
        </section>

        {/* Step 2：爬蟲網址（選填，多筆） */}
        {selected.length > 0 && (
          <section style={styles.section}>
            <div style={styles.sectionTitle}>
              <span style={styles.step}>2</span> 填入分類頁網址
              <span style={styles.limit}>（選填，可新增多筆）</span>
            </div>
            <div style={styles.urlList}>
              {selected.map(key => {
                const p = PLATFORMS.find(pl => pl.key === key)
                const list = urls[key] || ['']
                return (
                  <div key={key} style={styles.platformUrlBlock}>
                    <div style={{ ...styles.urlPlatformLabel, color: p.color }}>
                      {p.icon} {p.name}
                    </div>
                    <p style={styles.hint}>{p.hint}</p>
                    {list.map((val, idx) => (
                      <div key={idx} style={styles.urlInputRow}>
                        <input
                          style={styles.input}
                          type="url"
                          placeholder={p.placeholder}
                          value={val}
                          onChange={e => setUrl(key, idx, e.target.value)}
                        />
                        {list.length > 1 && (
                          <button
                            type="button"
                            style={styles.btnRemove}
                            onClick={() => removeUrl(key, idx)}
                            title="移除此網址"
                          >✕</button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      style={styles.btnAddUrl}
                      onClick={() => addUrl(key)}
                    >
                      ＋ 新增一筆 {p.name} 網址
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Step 3：排程設定 */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>
            <span style={styles.step}>{2 + stepBase}</span> 自動排程爬蟲
          </div>

          {/* 開關 */}
          <div style={styles.toggleRow} onClick={() => setSchedEnabled(v => !v)}>
            <div style={{ ...styles.toggle, ...(schedEnabled ? styles.toggleOn : {}) }}>
              <div style={{ ...styles.toggleThumb, ...(schedEnabled ? styles.toggleThumbOn : {}) }} />
            </div>
            <span style={styles.toggleLabel}>
              {schedEnabled ? '已開啟自動排程' : '不需要排程（手動執行即可）'}
            </span>
          </div>

          {schedEnabled && (
            <div style={styles.schedGrid}>
              <div style={styles.schedField}>
                <label style={styles.urlPlatformLabel}>執行時間</label>
                <input
                  type="time"
                  style={styles.input}
                  value={schedTime}
                  onChange={e => setSchedTime(e.target.value)}
                />
              </div>
              <div style={styles.schedField}>
                <label style={styles.urlPlatformLabel}>執行頻率</label>
                <select
                  style={{ ...styles.input, cursor: 'pointer' }}
                  value={schedDays}
                  onChange={e => setSchedDays(e.target.value)}
                >
                  {DAYS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Step 4：自有品牌 */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>
            <span style={styles.step}>{3 + stepBase}</span> 自有品牌設定
            <span style={styles.limit}>（選填）</span>
          </div>
          <label style={styles.urlPlatformLabel}>品牌名稱（多個請用逗號或換行分隔）</label>
          <textarea
            style={{ ...styles.input, marginTop: 8, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="例如：LANEIGE, 蘭芝, ettusais"
            value={ownBrandsInput}
            onChange={e => setOwnBrandsInput(e.target.value)}
          />
          <p style={{ ...styles.hint, marginTop: 6 }}>
            填入後，儀表板將顯示你的品牌商品售價，方便與競品比較。
          </p>
        </section>

        {/* Step 5：LINE UID */}
        <section style={styles.section}>
          <div style={styles.sectionTitle}>
            <span style={styles.step}>{4 + stepBase}</span> LINE 推播設定
            <span style={styles.limit}>（選填）</span>
          </div>
          <label style={styles.urlPlatformLabel}>LINE User ID（UID）</label>
          <input
            style={{ ...styles.input, marginTop: 8 }}
            type="text"
            placeholder="U1234567890abcdef..."
            value={lineUid}
            onChange={e => setLineUid(e.target.value)}
          />
          <p style={{ ...styles.hint, marginTop: 6 }}>
            填入後，降價警示與每日早報將推送至你的 LINE。
          </p>
        </section>

        <div style={styles.footer}>
          <button
            type="submit"
            style={{ ...styles.btnPrimary, ...(loading ? styles.btnLoading : {}) }}
            disabled={loading || selected.length === 0}
          >
            {loading ? '設定中…' : '完成設定 →'}
          </button>
        </div>
      </form>
    </div>
  )
}

const styles = {
  wrap: { padding: '32px 16px' },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px' },
  sub: { color: '#94a3b8', fontSize: 15, margin: 0 },
  warning: {
    background: 'rgba(234,179,8,0.1)',
    border: '1px solid rgba(234,179,8,0.3)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fde68a',
    fontSize: 13,
    marginBottom: 20,
  },
  section: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '24px 24px 20px',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 600, color: '#cbd5e1',
    marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10,
  },
  step: {
    width: 26, height: 26, borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontSize: 13, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  limit: { fontSize: 13, color: '#64748b', fontWeight: 400 },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  platformCard: {
    position: 'relative',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '20px 16px',
    textAlign: 'center', cursor: 'pointer',
    transition: 'all .2s', userSelect: 'none',
  },
  platformCardSelected: {
    background: 'rgba(99,102,241,0.12)',
    boxShadow: '0 0 0 1px rgba(99,102,241,0.3)',
  },
  platformCardDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  platformIcon: { fontSize: 32, marginBottom: 8 },
  platformName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  comingSoon: { marginTop: 6, fontSize: 11, color: '#64748b' },
  checkmark: { position: 'absolute', top: 8, right: 10, fontSize: 18, fontWeight: 700 },
  urlList: { display: 'flex', flexDirection: 'column', gap: 24 },
  platformUrlBlock: { display: 'flex', flexDirection: 'column', gap: 0 },
  urlPlatformLabel: { fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 4 },
  hint: { margin: '0 0 10px', fontSize: 12, color: '#475569' },
  urlInputRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '10px 14px',
    color: '#e2e8f0', fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  btnRemove: {
    flexShrink: 0,
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 6, color: '#f87171',
    padding: '6px 10px', cursor: 'pointer', fontSize: 13,
  },
  btnAddUrl: {
    alignSelf: 'flex-start',
    background: 'rgba(99,102,241,0.1)',
    border: '1px dashed rgba(99,102,241,0.4)',
    borderRadius: 8, color: '#a5b4fc',
    padding: '7px 14px', cursor: 'pointer', fontSize: 13,
    marginTop: 2,
  },
  // 排程開關
  toggleRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', userSelect: 'none', marginBottom: 18,
  },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    background: 'rgba(255,255,255,0.12)',
    position: 'relative', transition: 'background .2s', flexShrink: 0,
  },
  toggleOn: { background: '#6366f1' },
  toggleThumb: {
    position: 'absolute', top: 3, left: 3,
    width: 18, height: 18, borderRadius: '50%',
    background: '#fff', transition: 'left .2s',
  },
  toggleThumbOn: { left: 23 },
  toggleLabel: { fontSize: 14, color: '#cbd5e1' },
  schedGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  schedField: { display: 'flex', flexDirection: 'column', gap: 8 },
  footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
  btnPrimary: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  btnLoading: { opacity: 0.6, cursor: 'not-allowed' },
  successWrap: { maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 16px' },
  successIcon: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px' },
  successSub: { color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 32 },
}
