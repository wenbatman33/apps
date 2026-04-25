// 遊戲常數設定
// 初始化時偵測視窗方向：直向（手機）用寬棋盤 + 下方 HUD；橫向保持原版側欄
const _w = typeof window !== "undefined" ? window.innerWidth : 820;
const _h = typeof window !== "undefined" ? window.innerHeight : 620;
export const IS_PORTRAIT = _h > _w;

export const GRID_W = 8;
export const GRID_H = 8;
export const CELL = 64;              // 單格像素大小
export const GEM_TYPES = 7;          // 寶石種類

// 畫布 + 棋盤位置（依方向切換）
export const CANVAS_W      = IS_PORTRAIT ? 540 : 820;
// 直向：依視窗比例動態算高度，內容整體靠上，下方多出的區域填畫布 bg（與 body 同色）自然延伸
export const CANVAS_H      = IS_PORTRAIT
  ? Math.max(780, Math.round(540 * _h / _w))
  : 620;
export const GRID_OFFSET_X = IS_PORTRAIT ? (CANVAS_W - GRID_W * CELL) / 2 : 260;
export const GRID_OFFSET_Y = IS_PORTRAIT ? 20 : 60;  // 直向緊貼頂部

// 棋盤外框像素範圍（panel 靠這組對齊，左右邊線才會同寬）
const _boardPad = 8;
const _boardX   = GRID_OFFSET_X - _boardPad;               // 直向: 6
const _boardW   = GRID_W * CELL + _boardPad * 2;           // 直向: 528

// HUD 版面（每個元素的座標依方向配置，讓場景直接用）
const _gridBottom = GRID_OFFSET_Y + GRID_H * CELL;    // 直向: 532
export const HUD = IS_PORTRAIT ? {
  // 直向：panel 對齊棋盤框左右邊，高度固定 210；三按鈕橫排
  panel:       { x: _boardX, y: _gridBottom + 12, w: _boardW, h: 210 },
  modeLabel:   { x: CANVAS_W / 2,     y: _gridBottom + 32 },
  scoreLabel:  { x: CANVAS_W * 0.25,  y: _gridBottom + 62,  size: 14 },
  scoreValue:  { x: CANVAS_W * 0.25,  y: _gridBottom + 92,  size: 28 },
  secondLabel: { x: CANVAS_W * 0.75,  y: _gridBottom + 62,  size: 14 },
  secondValue: { x: CANVAS_W * 0.75,  y: _gridBottom + 92,  size: 28 },
  progress:    { x: 40,               y: _gridBottom + 128, w: CANVAS_W - 80, h: 10 },
  // 三顆按鈕同一 y、寬度 140，左右留 18px、兩兩相距 22px
  hintBtn:     { x: CANVAS_W * 0.2,   y: _gridBottom + 175, w: 140, label: "提示" },
  restartBtn:  { x: CANVAS_W * 0.5,   y: _gridBottom + 175, w: 140, label: "重新開始" },
  menuBtn:     { x: CANVAS_W * 0.8,   y: _gridBottom + 175, w: 140, label: "回主選單" },
  aiLabel:     { x: CANVAS_W - 65,    y: _gridBottom + 32 },
} : {
  // 橫向：左側直欄（維持原版）
  panel:       { x: 20,  y: 20,  w: 220, h: CANVAS_H - 40 },
  modeLabel:   { x: 130, y: 50 },
  scoreLabel:  { x: 130, y: 95,  size: 16 },
  scoreValue:  { x: 130, y: 130, size: 36 },
  secondLabel: { x: 130, y: 180, size: 16 },
  secondValue: { x: 130, y: 215, size: 36 },
  progress:    { x: 40,  y: 260, w: 180, h: 10 },
  hintBtn:     { x: 130, y: 430, w: 180, label: "提示 (H)" },
  restartBtn:  { x: 130, y: 480, w: 180, label: "重新開始 (R)" },
  menuBtn:     { x: 130, y: 530, w: 180, label: "回主選單 (ESC)" },
  aiLabel:     { x: GRID_OFFSET_X + GRID_W * CELL - 55, y: 44 },
};

// 計分
export const SCORE_PER_GEM = 50;
export const COMBO_BONUS = 1.5;      // 每次連鎖累乘

// 時間模式
export const TIMED_SECONDS = 60;
export const TIMED_BONUS_SECONDS = 2;  // 每次成功配對補時

// 排行榜
export const TOP_N = 10;
export const STORAGE_KEY = "bejeweled_scores_v1";

// 對應 assets/gems/ 內的圖檔名稱（7 種寶石）
export const GEM_IMAGES = [
  "8.png",   // 0 紅愛心
  "6.png",   // 1 橘長方形
  "2.png",   // 2 白珍珠
  "5.png",   // 3 綠寶石
  "1.png",   // 4 青鑽石
  "4.png",   // 5 紫方形
  "3.png",   // 6 彩虹寶石
];
