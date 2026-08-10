/* 防守特洛伊 v2 — 版面常數
 * 邏輯解析度 1080×1920（9:16 直向），Phaser Scale.FIT
 * 場景全部由獨立模組件組裝（海/灘/地/牆段/垛口/城門/擺設），
 * 每一件的座標都在這裡，DEV 工具（按 D）可即時調整。
 */
window.TD = window.TD || {};

TD.GAME_W = 1080;
TD.GAME_H = 1920;

TD.LAYOUT = {
  // ── 頂部 HUD（半透明、不遮戰場）──
  hud: {
    h: 108,
    levelX: 30, levelY: 26, levelSize: 32,
    waveX: 540, waveY: 26, waveSize: 34,
    scoreX: 1050, scoreY: 26, scoreSize: 32,
  },

  // ── 場景分帶（戰場美術圖以 cover 方式鋪滿到城牆線）──
  field: { y: 110, h: 950 },           // 敵軍推進區（顯示範圍）

  // ── 三條進攻路徑（X 座標，對齊戰場圖的三條泥土路）──
  lanes: { xs: [320, 540, 760], spawnY: 250, jitter: 42 },

  // ── 城牆（真實實體；美術圖自帶五個部署槽位）──
  wall: {
    topY: 1060,        // 城牆圖頂端（敵人停在這條線上方攻城）
    faceH: 350,        // 城牆顯示高度
    stopGap: 46,       // 敵人停下的位置與接觸線的距離
    merlonH: 56,
    slotXs: [186, 357, 536, 704, 880],   // 對齊美術圖的 5 個凹槽
    slotY: 1232,       // 守軍站立 Y（牆頂走道的槽位）
    slotR: 62,
    unitScale: 1.0,    // 守軍體型倍率（基準高 TD.BASE_DEF_H）
  },

  // ── 城門（主目標，位於牆基中央）──
  gate: {
    x: 540, w: 286, topY: 1248, h: 162,
    hpBarW: 230, hpBarH: 15, hpBarDy: 30,
  },

  city: { y: 1420, h: 60, houseXs: [] },

  // ── 合成台 ──
  bench: {
    x: 52, y: 1470, cols: 4, rows: 2, cell: 132, gap: 10,
  },

  // ── 主動技能鈕（合成台右側一列）──
  skills: {
    xs: [706, 848, 990], y: 1600, r: 58,
  },

  // ── 底部操作列 ──
  bottom: {
    y: 1848,
    coinX: 120, coinSize: 40,
    recruitX: 500, recruitW: 300, recruitH: 84,
    mergeX: 790, mergeW: 156,
  },

  // ── 單位顯示 ──
  unit: {
    enemyScale: 1.0,       // 敵人體型倍率（基準高 TD.BASE_ENEMY_H）
    badgeSize: 30,
  },
};

// 單位顯示基準高（邏輯 px）——實際 scale = 目標高 ÷ 圖檔原始高，與素材解析度脫鉤
TD.BASE_ENEMY_H = 132;
TD.BASE_DEF_H = 126;

// ── 二次貝茲（拋物線彈道）──
TD.qBezier = (p0, p1, p2, t) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

// ── 戰火特效參數（DEV 可調）──
TD.FXP = {
  sparkMul: 1.0,       // 火花數量倍率
  emberRate: 0.55,     // 全場漂浮餘燼密度（顆/秒）
  shakeMul: 1.0,       // 震屏倍率
  fireScale: 1.0,      // 火焰大小倍率
  maxParticles: 600,   // 全域粒子上限
  hitStop: 1.0,        // 慢動作倍率
};

// ── 配色 ──
TD.PALETTE = {
  gold: 0xFFC83D, goldDark: 0xC8901A, goldLight: 0xFFE08A,
  marble: 0xF2EFE4, marbleDim: 0xD8D3C4,
  fire: 0xFF7A1A, fireHot: 0xFFD23C, fireDeep: 0xC8321E,
  smoke: 0x5A5048,
  ok: 0x6FE08A, danger: 0xFF5C5C, mana: 0x5B8FF9,
  ink: 0x1A140E, night: 0x101823,
  uiBg: 0x241A10, uiEdge: 0x8B5A2B, uiPanel: 0x332414,
  grass: 0x79B233, sand: 0xD9BE86, sea: 0x1E5FA8,
};
TD.CSS = {
  gold: '#FFC83D', goldLight: '#FFE08A', marble: '#F2EFE4',
  fire: '#FF7A1A', fireHot: '#FFD23C', danger: '#FF5C5C',
  ok: '#6FE08A', ink: '#1A140E', dim: '#C9B08A',
};
TD.STROKE = '#1A0E06';
TD.FONT = '"PingFang TC","Hiragino Sans TC","Microsoft JhengHei",serif';

// ── 繪製層級 ──
TD.DEPTH = {
  SKY: 0, SEA: 2, BEACH: 4, FIELD: 6, PROP: 8,
  DECAL: 10,                 // 地面焦痕、油漬
  GROUNDFIRE: 14,
  ENEMY: 20,                 // 敵人依 y 再加權
  SIEGE: 22,
  WALL: 40, GATE: 42, MERLON: 44, CITY: 38,
  DEFENDER: 48, LADDER: 46,
  PROJ: 55, FX: 60, FX_TOP: 70,
  PANEL: 100, BENCH: 105, UNIT: 110,
  HUD: 200, BANNER: 300, VIGNETTE: 310, FLASH: 320, DIALOG: 400, DEV: 500,
};
