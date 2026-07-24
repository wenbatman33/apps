// ============================================================
// 轉址設定 — 把 base 改成你的 API 轉址網址即可
// 點擊機台後會導向：`${REDIRECT.base}?game=<機台id>`
// 若某台機台要用完全自訂的網址，直接在該機台物件加 url 欄位
// ============================================================
export const REDIRECT = {
  base: 'https://your-api.example.com/launch',  // ← 改成你的 API 轉址頁面
  openInNewTab: false,                          // true = 開新分頁；false = 本頁跳轉
};

// 12 台機台：id 會帶進轉址參數，name 顯示在機台頂牌與彈窗
export const MACHINES = [
  { id: 'sengoku',   name: '戰國武神', icon: '⚔️', color: '#e63946', accent: '#ffd166' },
  { id: 'chuhan',    name: '楚漢爭霸', icon: '🏯', color: '#9b5de5', accent: '#f9c74f' },
  { id: 'pachinko',  name: '龍珠爆彈', icon: '🐉', color: '#f72585', accent: '#ffd6ff' },
  { id: 'sonic',     name: '音速快跑', icon: '⚡', color: '#3a86ff', accent: '#a2d2ff' },
  { id: 'stack',     name: '疊疊高塔', icon: '🗼', color: '#2ec4b6', accent: '#cbf3f0' },
  { id: 'bigtwo',    name: '大老二',   icon: '🃏', color: '#43aa8b', accent: '#d8f3dc' },
  { id: 'doudizhu',  name: '鬥地主',   icon: '👑', color: '#f3722c', accent: '#ffe8d6' },
  { id: 'blackjack', name: '黑傑克 21', icon: '♠️', color: '#1b7a4a', accent: '#ffd700' },
  { id: 'roulette',  name: '幸運輪盤', icon: '🎡', color: '#d62828', accent: '#fcbf49' },
  { id: 'rooster',   name: '金雞報喜', icon: '🐔', color: '#e9c46a', accent: '#fff3b0' },
  { id: 'dragon',    name: '海龍王',   icon: '🌊', color: '#00b4d8', accent: '#caf0f8' },
  { id: 'caishen',   name: '財神到',   icon: '🧧', color: '#c1121f', accent: '#ffd700' },
];

// ============================================================
// LAYOUT — DEV 工具（按 D）可即時調整並匯出覆蓋這裡的數值
// ============================================================
export const LAYOUT = {
  room:   { width: 60, depth: 44, height: 10.5 },
  // 賭場式排列：中央圓形島台 + 兩側弧形機列 + 後排機牆
  // 機台總數可超過遊戲數，同一款遊戲會像真賭場一樣佔多台機台
  machines: {
    total: 24,            // 場上機台總數
    carouselCount: 8,     // 中央島台機台數
    carouselRadius: 2.8,  // 島台半徑
    carouselZ: 0,         // 島台中心前後位置
    arcRadius: 8.0,       // 弧形機列的弧半徑
    arcSpacing: 2.5,      // 弧列機台間距（沿弧長）
    arcZ: 4.0,            // 弧列中心前後位置
    aisleHalf: 6.2,       // 弧列離中軸距離
    backRowCount: 6,      // 靠招牌的後排機牆台數
    backRowSpacing: 2.6,  // 後排間距
    backRowOffset: 5.0,   // 後排離後牆距離
    scale: 1.0,
  },
  camera: { fov: 55, startY: 2.2, startZ: 17, minDist: 1.5, maxDist: 19 },
  lights: {
    ambient: 0.6, hemi: 0.85,
    aisleIntensity: 38, aisleColor: '#ffd9a0',
    ceilingPanel: 1.1,
    exposure: 1.4,
  },
  bloom:  { strength: 0.38, radius: 0.35, threshold: 0.82 },
  fog:    { color: '#0a0612', density: 0.008 },
  reels:  { speed: 1.0 },
  sign:   { text: 'ROYAL CASINO', sub: '★ 皇 家 娛 樂 城 ★', color: '#ff2d78' },
  // DEV 拖曳機台後的個別位移（匯出時會寫進來）
  machineOffsets: {},
};
