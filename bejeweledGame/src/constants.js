// 遊戲常數設定
export const GRID_W = 8;
export const GRID_H = 8;
export const CELL = 64;              // 單格像素大小
export const GEM_TYPES = 7;          // 寶石種類
export const GRID_OFFSET_X = 260;    // 棋盤左上 x
export const GRID_OFFSET_Y = 60;     // 棋盤左上 y
export const CANVAS_W = 820;
export const CANVAS_H = 620;

// 計分
export const SCORE_PER_GEM = 50;
export const COMBO_BONUS = 1.5;      // 每次連鎖累乘

// 時間模式
export const TIMED_SECONDS = 60;
export const TIMED_BONUS_SECONDS = 2;  // 每次成功配對補時

// 排行榜
export const TOP_N = 10;
export const STORAGE_KEY = "bejeweled_scores_v1";

// 寶石配色（飽和寶石色）
export const GEM_COLORS = [
  [230, 70,  80 ],   // 0 紅 ruby
  [245, 150, 40 ],   // 1 橘 topaz
  [245, 220, 60 ],   // 2 黃 citrine
  [80,  210, 110],   // 3 綠 emerald
  [80,  200, 240],   // 4 藍 sapphire (淡藍)
  [170, 100, 230],   // 5 紫 amethyst
  [240, 240, 250],   // 6 白 pearl
];

// 寶石形狀名稱（給繪製用）
export const GEM_SHAPES = [
  "square",   // 0 紅
  "hex",      // 1 橘
  "kite",     // 2 黃（風箏/菱形）
  "octagon",  // 3 綠
  "gem4",     // 4 藍（長菱形）
  "triangle", // 5 紫
  "circle",   // 6 白
];
