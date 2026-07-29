// 版面配置（手機直屏 720x1280）— 所有數值可由 DEV 面板即時調整後匯出
const GAME_W = 720;
const GAME_H = 1280;

// 全域字體（設計統一）
const FONT_UI = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
const FONT_TITLE = '"Songti TC","Noto Serif TC","PingFang TC",serif';

// 全域色票
const COLORS = {
  gold: 0xe8c766,
  goldDim: 0xcaa23f,
  feltLight: '#0f4d33',
  feltDark: '#0a3020',
  bgLight: '#142e25',
  bgDark: '#081410',
  ink: '#101d17',
};

const LAYOUT = {
  header: { y: 46, size: 20 },
  // 牌桌（中心點 + 尺寸）
  table: { x: 360, y: 545, w: 698, h: 906, radius: 64 },
  // 對手區（上排四人：賭聖 / 龍五 / 賭俠 / 賭神）
  opp: {
    y: 188,             // 頭像中心 y
    xs: [102, 274, 446, 618],
    avatarR: 46,
    pillW: 150,
    pillH: 62,
    pillDy: 66,         // 膠囊中心相對頭像中心
    nameSize: 20,
    chipsSize: 17,
    cardDy: 166,        // 手牌中心相對頭像中心的偏移
    cardScale: 0.42,
    cardGap: 26,
    cardTilt: 6,        // 扇形角度（度）
    betDy: 240,
    betSize: 19,
  },
  // 彩池（挑戰賽核心 — 大而醒目）
  pot: { x: 360, y: 480, size: 38, labelSize: 18 },
  // 公共牌
  community: { x: 360, y: 592, gap: 114, scale: 0.78 },
  // 玩家
  player: {
    cardsX: 400,
    cardsY: 848,
    cardGap: 78,
    cardScale: 1.04,
    cardTilt: 5,
    avatarX: 100,
    avatarY: 838,
    avatarR: 50,
    pillDy: 80,
    nameSize: 18,
    chipsSize: 24,
    betY: 712,
    betSize: 22,
    handNameY: 984,
    handNameSize: 21,
  },
  // 操作按鈕
  buttons: { y: 1148, xs: [128, 360, 592], w: 212, h: 92, fontSize: 29 },
  // 加注面板（四行式：標題 / 快捷 / 滑桿 / 按鈕）
  raise: { y: 968, h: 320, titleDy: 42, quickDy: 110, sliderDy: 186, btnDy: 264, trackW: 560, fontSize: 26 },
  // 訊息橫幅
  banner: { y: 566, size: 34 },
  dealerBtn: { r: 15, size: 14 },
  fx: {
    dealMs: 100,
    actionMs: 550,
    showdownMs: 1600,
    aiThinkMin: 500,
    aiThinkMax: 1200,
  },
};

// 遊戲規則常數
const RULES = {
  startChips: 100000,
  smallBlind: 500,
  bigBlind: 1000,
};
