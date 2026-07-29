// 版面與視覺參數集中管理
// DEV 面板（按 D 開啟）直接修改這裡的數值並可匯出 JSON，我再 baked 回原始碼

window.THEME = {
  bg: 0x12141a,
  bgAccent: 0x171a22,
  table: 0x1b1f29,
  text: '#e8eaf0',
  textDim: '#6b7280',
  accent: 0x4ade80,        // 輪到玩家 / 可出牌的提示色
  accentHex: '#4ade80',
  danger: '#f87171',
  gold: '#fbbf24',         // 地主標記 / 倍數
  cardFace: 0xf7f8fa,
  cardFaceDim: 0x9aa1ad,   // 出不掉的牌：不透明灰阶卡面（半透明会与下层牌叠出条纹）
  cardBack: 0x2a3040,
  cardBackLine: 0x3d4557,
  suitRed: '#e5484d',
  suitDark: '#1c1f26',
  selected: 0x4ade80
};

window.LAYOUT_MOBILE = {
  name: 'mobile',
  width: 750,
  height: 1334,

  card: { w: 96, h: 134, radius: 12, fontRank: 34, fontSuit: 30, fontCenter: 46 },

  // 玩家手牌（最多 20 張，間距自動計算；張數多時自動分兩排）
  hand: { y: 1112, overlap: 0, liftY: 28, maxWidth: 710, tiltMax: 0, rowGap: 80, twoRowMin: 12 },

  // 中央出牌區
  play: { y: 668, overlap: 40, scale: 0.92, maxWidth: 640 },

  // 座位：0=自己(下) 1=右上（下家） 2=左上（上家）
  // 自己的座位只當作出牌動畫起點與訊息氣泡位置，不畫頭像
  seats: [
    { x: 375, y: 1000, labelY: 0 },
    { x: 664, y: 330,  labelY: 0 },
    { x: 86,  y: 330,  labelY: 0 }
  ],
  seatAvatar: { r: 42, fontName: 24, fontCount: 30 },

  // 底牌展示（頂部中央，3 張小牌）
  bottomCards: { y: 180, scale: 0.62, gap: 66 },

  // 底部按鈕列（出牌階段 3 顆；叫分階段 4 顆共用同一列）
  buttons: { y: 1268, w: 190, h: 88, gap: 18, radius: 44, font: 32 },
  bidButtons: { w: 150, h: 88, gap: 14, font: 30 },

  // 中央提示文字（輪到誰 / 牌型名稱）
  hint: { y: 930, font: 28 },
  toast: { y: 500, font: 34 },

  // 出牌區底板
  table: { x: 60, y: 452, w: 630, h: 420, radius: 36 },

  // 頂部計分列（限時賽）：時間 / 點數 / 局數 / 倍數
  topbar: { y: 66, font: 34, fontLabel: 20, h: 92 },

  ai: { thinkMin: 550, thinkMax: 1000, playAnim: 260, bidDelay: 700 }
};

// 桌機沿用同一份版面（等比縮放置中），僅調整少數手感參數
window.LAYOUT_PC = Object.assign({}, window.LAYOUT_MOBILE, {
  name: 'pc',
  hand: { y: 1112, overlap: 0, liftY: 32, maxWidth: 710, tiltMax: 0 },
  ai: { thinkMin: 420, thinkMax: 800, playAnim: 220, bidDelay: 550 }
});

// 目前生效的版面（GameScene 讀這個；DEV 面板切換時替換）
window.LAYOUT = window.LAYOUT_MOBILE;
