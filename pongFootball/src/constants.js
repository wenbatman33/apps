// 邏輯座標：固定 1280×860 （橫向球場）
// 所有物理/狀態都在此座標空間內運算；直向 layout 只是渲染時旋轉 90°
export const LOGIC_W = 1280;
export const LOGIC_H = 860;

// 球場上下內牆（擋板活動範圍上下界、球反彈的邊界）
// 對齊石頭牆的內緣
export const COURT_TOP = 170;
export const COURT_BOTTOM = 690;

// 左右球門（進球判定線）— 球中心越過此 x 判進球
export const GOAL_LEFT_X = 110;
export const GOAL_RIGHT_X = LOGIC_W - 110;

// 球門口 y 範圍（只有這段算進球，上下木樁/石頭要反彈）
export const GOAL_MOUTH_TOP = 240;
export const GOAL_MOUTH_BOTTOM = 620;

// 擋板
export const PADDLE_W = 60;
export const PADDLE_H = 200;
export const PADDLE_LEFT_X = 210;   // 擋板中心 X
export const PADDLE_RIGHT_X = LOGIC_W - 210;
export const PADDLE_SPEED = 900;    // px/sec （鍵盤）

// 球
export const BALL_R = 22;
export const BALL_START_SPEED = 600;
export const BALL_MAX_SPEED = 1400;
export const BALL_SPEEDUP = 1.05;   // 每次被擋板打到加速

// 分數
export const WIN_SCORE = 7;

// 難度參數：AI 反應速度 (px/sec) 與「追球提前預測」比例
export const AI_DIFFICULTY = {
  easy:   { speed: 260, errorPx: 140, reactDelay: 0.38 },
  normal: { speed: 430, errorPx: 75,  reactDelay: 0.20 },
  hard:   { speed: 720, errorPx: 22,  reactDelay: 0.07 },
};

// 數字圖 4 欄 × 3 列 = 12 格，前 10 格為 0-9
export const NUMBER_COLS = 4;
export const NUMBER_ROWS = 3;

// 球動畫 6 幀
export const BALL_FRAMES = 6;
