/* 防守特洛伊 — 版面常數
 * 邏輯解析度 1080×1920（9:16 直屏），Phaser Scale.FIT 自動縮放
 * 戰場是一張 1:1 的空拍俯視地圖，路徑與塔位座標都用「相對於戰場的 0~1 比例」定義，
 * 所以調整戰場大小時，路徑與塔位會自動跟著對齊背景圖。
 * 這裡所有數值都是 DEV 微調工具（按 D）的調整目標。
 */
window.TD = window.TD || {};

TD.GAME_W = 1080;
TD.GAME_H = 1920;

TD.LAYOUT = {
  // ── 頂部 HUD ──
  hud: {
    h: 150,
    levelX: 34, levelY: 44, levelSize: 34,
    timerX: 540, timerY: 34, timerSize: 58,
    scoreX: 1046, scoreY: 44, scoreSize: 34,
    hpBarX: 34, hpBarY: 108, hpBarW: 1012, hpBarH: 22,
  },

  // ── 戰場（空拍俯視地圖，維持 1:1 才不會變形）──
  battle: {
    x: 0, y: 150, w: 1080, h: 1080,
    goalT: 1.0,          // 敵人走到路徑此進度即抵達城門
  },

  // ── 戰場網格：玩家可在任意空格建塔，敵人自動繞路 ──
  // inset 是網格在地圖圖片中的可用範圍（避開兩側岩石、上方海灣、下方城牆）
  grid: {
    cols: 9, rows: 9,     // 最後一列是「城牆列」：敵人不能通行，但可以佈署守軍
    entries: [1, 4, 7],   // 頂部入口所在的欄
    exitCol: 4,           // 城門所在的欄
    insetL: 0.135, insetR: 0.135, insetT: 0.150, insetB: 0.060,
  },

  // ── 波次進度條 ──
  waveBar: { x: 30, y: 1244, w: 1020, h: 12 },

  // ── 合成台（2 列 × 6 欄，緊湊不佔空間）──
  bench: {
    x: 108, y: 1284, cols: 6, rows: 2, cell: 144, gap: 8,
  },

  // ── 底部操作列 ──
  bottom: {
    y: 1706,
    coinX: 148, coinSize: 40,
    recruitX: 540, recruitW: 330, recruitH: 92,
    skillX: 952, skillR: 52,
  },

  // ── 單位顯示 ──
  unit: {
    imgScale: 0.98,      // 相對於格子大小
    fieldScale: 1.18,    // 放到戰場上時再放大一點，讓塔有存在感
    badgeSize: 26,
    yOffset: -4,
  },
};

// ── 比例座標 → 畫面座標 ──
TD.fieldPoint = (nx, ny) => {
  const B = TD.LAYOUT.battle;
  return { x: B.x + nx * B.w, y: B.y + ny * B.h };
};

// ── 配色（希臘黑繪陶器）──
TD.PALETTE = {
  grass: 0x7CC93B, grassDark: 0x5FA22B,
  wood: 0x8B5A2B, woodLight: 0xB57C42, woodDark: 0x5E3A18,
  gold: 0xFFC72C, goldLight: 0xFFE066, sky: 0x2FA8E0,
  cream: 0xFFF6E0, ink: 0x3A2416,
  danger: 0xFF4D4D, heal: 0x4CD97B, mana: 0x5B8FF9, purple: 0xB06CD8,
};
TD.CSS = {
  grass: '#7CC93B', wood: '#8B5A2B', woodDark: '#5E3A18',
  gold: '#FFC72C', goldLight: '#FFE066', cream: '#FFF6E0',
  ivory: '#FFF6E0',              // 舊名保留，避免顏色變成 undefined
  ink: '#3A2416', danger: '#FF4D4D',
};

TD.FONT = '"PingFang TC","Hiragino Sans TC","Microsoft JhengHei",serif';

// ── 繪製層級 ──
TD.DEPTH = {
  BG: 0, PATH: 5, POOL: 8,
  SLOT: 10, SHADOW: 14,
  ENEMY: 20, TOWER: 40, PROJ: 50,
  FX: 60, FX_TOP: 70,
  PANEL: 100, BENCH_SLOT: 105, UNIT: 110, DRAG: 130,
  HUD: 200, BANNER: 300, FLASH: 320, DIALOG: 400, DEV: 500,
};
