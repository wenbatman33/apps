// 版面与视觉参数集中管理
// DEV 面板（按 D 开启）直接修改这里的数值并可汇出 JSON，我再 baked 回原始码

window.THEME = {
  bg: 0x12141a,
  bgAccent: 0x171a22,
  table: 0x1b1f29,
  text: '#e8eaf0',
  textDim: '#6b7280',
  accent: 0x4ade80,        // 轮到玩家 / 可出牌的提示色
  accentHex: '#4ade80',
  danger: '#f87171',
  cardFace: 0xf7f8fa,
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

  // 玩家手牌
  hand: { y: 1112, overlap: 0, liftY: 28, maxWidth: 690, tiltMax: 0 },

  // 中央出牌区（重叠少一些，牌面看得清楚）
  play: { y: 668, overlap: 22, scale: 0.92 },

  // 座位：0=自己(下) 1=左 2=上 3=右
  // 自己的座位只当作出牌动画起点与讯息气泡位置，不画头像
  seats: [
    { x: 375, y: 1020, labelY: 0 },
    { x: 74,  y: 668,  labelY: 0 },
    { x: 375, y: 200,  labelY: 0 },
    { x: 676, y: 668,  labelY: 0 }
  ],
  seatAvatar: { r: 42, fontName: 24, fontCount: 30, backW: 30, backH: 42, backGap: 7 },

  // 底部按钮列
  buttons: { y: 1268, w: 190, h: 88, gap: 18, radius: 44, font: 32 },

  // 中央提示文字（轮到谁 / 牌型名称）
  hint: { y: 950, font: 28 },
  toast: { y: 500, font: 34 },

  // 出牌区底板
  table: { x: 60, y: 452, w: 630, h: 440, radius: 36 },

  // 顶部计分列（限时赛）
  topbar: { y: 66, font: 34, fontLabel: 20, h: 92 },

  ai: { thinkMin: 550, thinkMax: 1000, playAnim: 260 }
};

// 桌机沿用同一份版面（等比缩放置中），仅调整少数手感参数
window.LAYOUT_PC = Object.assign({}, window.LAYOUT_MOBILE, {
  name: 'pc',
  hand: { y: 1112, overlap: 0, liftY: 32, maxWidth: 700, tiltMax: 0 },
  ai: { thinkMin: 420, thinkMax: 800, playAnim: 220 }
});

// 目前生效的版面（GameScene 读这个；DEV 面板切换时替换）
window.LAYOUT = window.LAYOUT_MOBILE;
