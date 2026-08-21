// 全域設定：世界採固定邏輯解析度 720×1280，實際畫面以 letterbox 等比縮放
export const WORLD = { W: 720, H: 1280 };

// 磚塊網格
export const GRID = {
  COLS: 11,
  ROWS: 17,          // 可見行數（超過底線即失敗）
  CELL: 56,          // 每格邊長 → 場地 616×952，共 187 格
  GAP: 4,            // 保留給版面計算
  INSET: 2,          // 磚塊四邊內縮（碰撞與視覺一致）→ 磚間僅 4px，磚塊幾乎相連
};

// 版面：PC 與 Mobile 各一份，DEV 工具可分別微調並匯出
const BASE_LAYOUT = {
  // 遊戲場
  playTop: 178,          // 網格頂端 y
  playLeft: 52,          // 網格左緣 x
  deadLine: 1130,        // 死亡線 y（磚塊觸及即失敗）
  launchY: 1180,         // 發射點 y

  // HUD
  hudTitleY: 46,         // 關卡標題 y
  hudTitleSize: 34,
  hudSubY: 84,           // 副標（章節/目標）y
  hudSubSize: 19,
  ballCountY: 1238,      // 球數文字 y
  ballCountSize: 26,

  // 底部操作鈕（放在遊戲場外，避免遮擋磚塊）
  btnSpeedX: 92,
  btnRecallX: 628,
  btnBottomY: 1238,
  turnInfoY: 148,
  progressY: 118,        // 進度條 y
  progressW: 560,
  progressH: 8,

  // 瞄準
  aimDotGap: 26,         // 瞄準虛線點距
  aimDotSize: 5,
  aimMaxLen: 1800,       // 瞄準線最長長度
  aimMinDrag: 18,        // 觸發瞄準的最小拖曳距離

  // 特效
  glowAlpha: 0.12,
  shakeScale: 0.35,
};

export const LAYOUT_PC = { ...BASE_LAYOUT };

export const LAYOUT_MOBILE = {
  ...BASE_LAYOUT,
  hudTitleSize: 32,
  hudSubSize: 18,
  ballCountSize: 28,
  aimMaxLen: 1700,
};

// 執行期生效的版面（由 main.js 依裝置挑選，DEV 工具直接改這個物件）
export const LAYOUT = { ...BASE_LAYOUT };

export function applyLayout(src) {
  Object.assign(LAYOUT, src);
}

// 玩法數值
export const RULES = {
  ballRadius: 4.5,
  ballSpeed: 1000,        // px/s（邏輯單位）：放慢到看得清彈跳過程，趕時間可按加速鈕
  fireInterval: 0.05,     // 連射間隔上限（實際依球數自動縮短）
  fireBurst: 3.0,         // 全部球射完的目標秒數（球越多射速越快）
  fireIntervalMin: 0.02,  // 連射間隔下限，確保球與球之間看得出間隔
  maxBalls: 800,          // 球數上限
  substepMax: 10,         // 單幀最大物理子步數
  scatter: 0.03,          // 反射擾動（弧度）：球群發散程度，0 = 所有球走同一條路徑
  recallSpeed: 2600,      // 回收動畫速度
  turboAfter: 9.0,        // 回合超過此秒數自動加速（秒）
  turboScale: 2.8,
  forceRecallAfter: 14.0, // 超過此秒數開始把球導向下方，保證回合一定結束
  ballGrowth: 1,          // 撿到 +1 道具增加的球數
};

// 單一霓虹主題
export const THEME = { bg: 0x232c4d, accent: 0x7cc4f5, glow: 0x7cc4f5, grid: 0x2e3860 };

export const TOTAL_LEVELS = 200;
