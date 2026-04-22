const SECTIONS = [
  {
    id: 'intro',
    icon: '📡',
    title: '這是什麼系統？',
    content: [
      {
        type: 'text',
        value: '競品監控台是一套自動追蹤美妝電商價格的工具。它會定期自動爬取屈臣氏、康是美、寶雅等平台的商品售價，並在競品降價時即時通知你。',
      },
      {
        type: 'cards',
        items: [
          { icon: '🔍', title: '自動爬蟲', desc: '定時抓取各平台商品價格，不需手動查詢' },
          { icon: '📊', title: '比價儀表板', desc: '一眼看出各平台售價高低，找出差異' },
          { icon: '🔔', title: 'LINE 即時推播', desc: '競品降價超過設定門檻時，自動傳訊給你' },
          { icon: '📋', title: '商品管理', desc: '建立自家商品目錄，作為比價基準' },
        ],
      },
    ],
  },
  {
    id: 'start',
    icon: '🚀',
    title: '快速開始',
    content: [
      {
        type: 'steps',
        items: [
          {
            step: '1',
            title: '完成初始設定',
            desc: '前往「初始設定」頁，選擇 1～3 個要追蹤的平台，貼上分類頁網址，並選填 LINE User ID。',
          },
          {
            step: '2',
            title: '執行第一次爬蟲',
            desc: '前往「爬蟲排程」頁，點「立即執行」，系統會馬上抓取各平台商品資料（約需 1～3 分鐘）。',
          },
          {
            step: '3',
            title: '查看儀表板',
            desc: '回到「監控儀表板」，就能看到各平台商品的最新售價與漲跌狀況。',
          },
          {
            step: '4',
            title: '設定 LINE 通知',
            desc: '前往「LINE 通知」頁，填入 Channel Access Token 與 User ID，開啟降價警示開關。',
          },
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: '看懂儀表板',
    content: [
      {
        type: 'text',
        value: '儀表板上方有 4 個數字卡片，下方是各商品的跨平台比價表格。',
      },
      {
        type: 'table',
        rows: [
          { label: '監控商品數', desc: '目前系統追蹤中的商品總數' },
          { label: '今日比較筆數', desc: '今天爬蟲抓到的價格記錄數量' },
          { label: '今日降價數', desc: '與上次爬蟲相比，今日降價的商品數' },
          { label: '未讀警示', desc: '尚未查看的價差警示數量' },
        ],
      },
      {
        type: 'text',
        value: '比價表格中，綠色 ▼ 代表降價，紅色 ▲ 代表漲價。點擊商品可查看歷史趨勢圖。',
      },
    ],
  },
  {
    id: 'scraper',
    icon: '⚙️',
    title: '爬蟲排程設定',
    content: [
      {
        type: 'text',
        value: '系統支援自動排程，可以設定每隔幾小時自動爬取一次。也可以隨時手動觸發。',
      },
      {
        type: 'tips',
        items: [
          '建議頻率：每 4～8 小時執行一次，避免對目標網站造成過大負荷',
          '每次執行大約需要 1～5 分鐘（視商品數量與網路狀況而定）',
          '執行記錄會顯示在排程頁下方，可確認是否成功',
          '若某次爬蟲失敗，系統會自動記錄錯誤，不影響下次排程',
        ],
      },
    ],
  },
  {
    id: 'line',
    icon: '💬',
    title: 'LINE 通知設定',
    content: [
      {
        type: 'text',
        value: '系統使用 LINE Messaging API 發送通知，需要準備以下資訊：',
      },
      {
        type: 'table',
        rows: [
          { label: 'Channel Access Token', desc: '在 LINE Developers 後台建立 Messaging API Channel 後取得' },
          { label: 'Channel Secret', desc: '同上，位於 Channel 設定頁的 Basic Settings' },
          { label: 'User ID（UID）', desc: '以 LINE 帳號傳訊給 Bot 後，可在 Webhook 收到的事件中取得' },
        ],
      },
      {
        type: 'tips',
        items: [
          '降價通知：競品售價下降超過設定門檻（預設 5%）時發送',
          '每日早報：每天早上 8:00 自動彙整前一日所有降價商品',
          '價差報告：可手動從儀表板觸發，一次傳送所有跨平台價差摘要',
        ],
      },
    ],
  },
  {
    id: 'faq',
    icon: '❓',
    title: '常見問題',
    content: [
      {
        type: 'faq',
        items: [
          {
            q: '爬蟲執行後儀表板沒有資料？',
            a: '請確認填入的網址是分類頁（如「唇膏」類別頁），而非單一商品頁。執行後等待約 1～2 分鐘，再重新整理頁面。',
          },
          {
            q: 'LINE 通知沒有收到？',
            a: '請確認 Channel Access Token 與 User ID 都正確填寫，並已開啟降價通知開關。可在「LINE 通知」頁使用「傳送測試訊息」功能驗證。',
          },
          {
            q: '系統重新部署後資料消失？',
            a: '若部署在 Zeabur 或類似雲端服務，需掛載 Persistent Volume 到 /data 路徑，並設定環境變數 DB_PATH=/data/beauty_monitor.sqlite，才能讓資料庫持久保存。',
          },
          {
            q: '可以同時追蹤多少商品？',
            a: '系統沒有硬性限制，但建議每個平台不超過 200 個商品，以確保爬蟲速度與穩定性。',
          },
          {
            q: '網址填錯了怎麼辦？',
            a: '前往「爬蟲排程」頁，可以看到目前所有監控網址的清單，點擊刪除後重新新增正確網址即可。',
          },
        ],
      },
    ],
  },
]

export default function GuidePage() {
  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h1 style={s.title}>使用說明</h1>
        <p style={s.sub}>第一次使用？這裡有你需要知道的一切。</p>
      </div>

      {/* 目錄 */}
      <div style={s.toc}>
        {SECTIONS.map(sec => (
          <a key={sec.id} href={`#${sec.id}`} style={s.tocItem}>
            <span>{sec.icon}</span> {sec.title}
          </a>
        ))}
      </div>

      {/* 各節內容 */}
      {SECTIONS.map(sec => (
        <section key={sec.id} id={sec.id} style={s.section}>
          <h2 style={s.sectionTitle}>{sec.icon} {sec.title}</h2>
          {sec.content.map((block, i) => <Block key={i} block={block} />)}
        </section>
      ))}
    </div>
  )
}

function Block({ block }) {
  if (block.type === 'text') {
    return <p style={s.text}>{block.value}</p>
  }

  if (block.type === 'cards') {
    return (
      <div style={s.cardGrid}>
        {block.items.map((item, i) => (
          <div key={i} style={s.featureCard}>
            <div style={s.featureIcon}>{item.icon}</div>
            <div style={s.featureTitle}>{item.title}</div>
            <div style={s.featureDesc}>{item.desc}</div>
          </div>
        ))}
      </div>
    )
  }

  if (block.type === 'steps') {
    return (
      <div style={s.stepList}>
        {block.items.map((item, i) => (
          <div key={i} style={s.stepRow}>
            <div style={s.stepBubble}>{item.step}</div>
            <div style={s.stepContent}>
              <div style={s.stepTitle}>{item.title}</div>
              <div style={s.stepDesc}>{item.desc}</div>
            </div>
            {i < block.items.length - 1 && <div style={s.stepLine} />}
          </div>
        ))}
      </div>
    )
  }

  if (block.type === 'table') {
    return (
      <table style={s.table}>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i}>
              <td style={s.tdLabel}>{row.label}</td>
              <td style={s.tdDesc}>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (block.type === 'tips') {
    return (
      <ul style={s.tipList}>
        {block.items.map((tip, i) => (
          <li key={i} style={s.tipItem}>
            <span style={s.tipDot}>›</span> {tip}
          </li>
        ))}
      </ul>
    )
  }

  if (block.type === 'faq') {
    return (
      <div style={s.faqList}>
        {block.items.map((item, i) => (
          <div key={i} style={s.faqItem}>
            <div style={s.faqQ}>Q：{item.q}</div>
            <div style={s.faqA}>A：{item.a}</div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

const s = {
  wrap: {
    padding: '32px 16px 64px',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e2e8f0',
    margin: '0 0 8px',
  },
  sub: {
    color: '#94a3b8',
    fontSize: 15,
    margin: 0,
  },
  toc: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 36,
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.07)',
  },
  tocItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#94a3b8',
    textDecoration: 'none',
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.05)',
    transition: 'color .2s',
  },
  section: {
    marginBottom: 40,
    scrollMarginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e2e8f0',
    margin: '0 0 16px',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  text: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 1.75,
    margin: '0 0 16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '18px 16px',
    textAlign: 'center',
  },
  featureIcon: { fontSize: 28, marginBottom: 8 },
  featureTitle: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 },
  featureDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.5 },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  stepRow: {
    position: 'relative',
    display: 'flex',
    gap: 16,
    paddingBottom: 28,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  stepLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: '100%',
    background: 'rgba(99,102,241,0.25)',
  },
  stepContent: { paddingTop: 4 },
  stepTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 },
  stepDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.6 },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 16,
    fontSize: 14,
  },
  tdLabel: {
    padding: '10px 14px',
    fontWeight: 600,
    color: '#a5b4fc',
    background: 'rgba(99,102,241,0.08)',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  tdDesc: {
    padding: '10px 14px',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.06)',
    lineHeight: 1.6,
  },
  tipList: {
    margin: '0 0 16px',
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  tipItem: {
    display: 'flex',
    gap: 10,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6,
  },
  tipDot: {
    color: '#6366f1',
    fontWeight: 700,
    fontSize: 18,
    lineHeight: 1.3,
    flexShrink: 0,
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  faqItem: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '16px 20px',
  },
  faqQ: {
    fontSize: 14,
    fontWeight: 600,
    color: '#a5b4fc',
    marginBottom: 8,
  },
  faqA: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.7,
  },
}
