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
    x: 0, y: 146, w: 1080, h: 1190,   // 比 1:1 更高，地圖以 cover 裁掉兩側裝飾
    goalT: 1.0,
  },

  // ── 戰場網格：玩家可在任意空格建塔，敵人自動繞路 ──
  // inset 是網格在地圖圖片中的可用範圍（避開兩側岩石、上方海灣、下方城牆）
  grid: {
    cols: 9, rows: 9,     // 最後一列是「城牆列」：敵人不能通行，但可以佈署守軍
    entries: [1, 4, 7],   // 頂部入口所在的欄
    exitCol: 4,           // 城門所在的欄
    insetL: 0.102, insetR: 0.102, insetT: 0.150, insetB: 0.060,
    // 城牆守備位「居高臨下」加成：站得高、看得遠、打得準
    wallRangeMul: 1.45,
    wallDmgMul: 1.20,
  },

  // ── 波次進度條 ──
  waveBar: { x: 30, y: 1350, w: 1020, h: 12 },

  // ── 合成台（2 列 × 6 欄，緊湊不佔空間）──
  bench: {
    x: 95, y: 1372, cols: 8, rows: 2, cell: 106, gap: 6,
  },

  // ── 底部操作列 ──
  bottom: {
    y: 1712,
    coinX: 132, coinSize: 38,
    recruitX: 520, recruitW: 250, recruitH: 92,
    barricadeX: 742,          // 路障鈕
    skillX: 962, skillR: 50,
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
  // ── 結構藍（UI 主色）──
  blue: 0x1E5FA8, blueDark: 0x123E70, blueLight: 0x3E8FD4,
  // ── 大理石白 ──
  marble: 0xF2EFE4, marbleDim: 0xD8D3C4,
  // ── 強調金 ──
  gold: 0xFFC83D, goldDark: 0xC8901A, goldLight: 0xFFE08A,
  // ── 戰場地磚（Clash Royale 式鮮綠草皮，深淺交替）──
  tileA: 0x8CC63F, tileB: 0x79B233, tileLine: 0x5E9130,
  lane: 0xD9BE86, laneDark: 0xB99C64,   // 草地中的淺色石板路
  // ── 城牆地磚（大理石）──
  wallTileA: 0xE4EDF5, wallTileB: 0xCFDEEC, wallLine: 0x9FB6CC,
  // ── 狀態 ──
  ok: 0x6FE08A, danger: 0xFF5C5C, heal: 0x4CD97B, mana: 0x5B8FF9,
  ink: 0x1A2A3A, purple: 0xB06CD8,
  // 舊名保留，避免既有引用變成 undefined
  wood: 0x1E5FA8, woodLight: 0x3E8FD4, woodDark: 0x123E70, cream: 0xF2EFE4,
};
TD.CSS = {
  blue: '#1E5FA8', blueDark: '#123E70', blueLight: '#3E8FD4',
  marble: '#F2EFE4', gold: '#FFC83D', goldLight: '#FFE08A',
  ok: '#6FE08A', danger: '#FF5C5C',
  ivory: '#F2EFE4', cream: '#F2EFE4', ink: '#1A2A3A',
  wood: '#1E5FA8', woodDark: '#123E70',
};

// 文字統一描邊色（深藍，比黑色柔和且與 UI 同調）
TD.STROKE = '#0E2B4D';

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
