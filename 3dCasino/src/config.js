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
  room:   { width: 80, depth: 60, height: 10.5 },
  // ============================================================
  // 樓面配置（參考真實賭場動線圖）：
  // 中央大島（視線穿透焦點）+ 周圍主題島環繞 + 後排機牆
  // 每座島固定一款遊戲（同款機海），點該島任一機台都轉址到該遊戲
  // ============================================================
  islands: [
    { game: 'caishen',  x: 0,    z: -2,  count: 12, radius: 3.6, big: true },  // 中央大島
    { game: 'sengoku',  x: -15,  z: -13, count: 7,  radius: 2.3 },
    { game: 'sonic',    x: 15,   z: -13, count: 7,  radius: 2.3 },
    { game: 'chuhan',   x: -17,  z: 2,   count: 7,  radius: 2.3 },
    { game: 'dragon',   x: 17,   z: 2,   count: 7,  radius: 2.3 },
    { game: 'doudizhu', x: -14,  z: 15,  count: 7,  radius: 2.3 },
    { game: 'rooster',  x: 14,   z: 15,  count: 7,  radius: 2.3 },
  ],
  backRow: { count: 8, spacing: 2.7, offset: 4.6 },   // 後牆機牆（混合遊戲）
  machineScale: 1.0,
  // polarMinDeg/polarMaxDeg：鏡頭俯仰限制（90 = 完全水平），把視角鎖在近水平帶
  camera: { fov: 55, startY: 2.3, startZ: 26, minDist: 1.5, maxDist: 27, polarMinDeg: 76, polarMaxDeg: 88 },
  lights: {
    ambient: 0.6, hemi: 0.85,
    aisleIntensity: 38, aisleColor: '#ffd9a0',
    ceilingPanel: 1.1,
    exposure: 1.4,
  },
  bloom:  { strength: 0.38, radius: 0.35, threshold: 0.82 },
  fog:    { color: '#0a0612', density: 0.007 },
  reels:  { speed: 1.0 },
  sign:   { text: 'ROYAL CASINO', sub: '★ 皇 家 娛 樂 城 ★', color: '#ff2d78' },
  // DEV 拖曳機台後的個別位移（匯出時會寫進來）
  machineOffsets: {},
};
