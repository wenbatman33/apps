// 單位：公尺
export const TABLE_LEN = 2.54;         // 長軸
export const TABLE_WID = 1.27;         // 短軸
export const CUSHION_H = 0.04;         // 枱邊高
export const BALL_R = 0.029;           // 球半徑
export const POCKET_R = 0.075;         // 袋口（偵測半徑）
export const POCKET_OPENING = 0.12;    // 枱邊留給袋口的缺口寬

export const FRAME_THICK = 0.08;       // 木框厚度
export const FRAME_H = 0.10;           // 木框高度

// 物理參數（參考真實撞球）
export const BALL_MASS = 0.17;         // 撞球約 170g
export const BALL_RESTITUTION = 0.95;  // 球-球接近彈性碰撞
export const BALL_FRICTION = 0.04;     // 球-球接觸幾乎無摩擦
export const GROUND_FRICTION = 0.18;   // 毛氈滑動摩擦係數
export const CUSHION_RESTITUTION = 0.80; // 海綿條吸收約 20% 能量
export const LINEAR_DAMPING = 0.2;     // 滾動阻力（主要靠毛氈摩擦收球）
export const ANGULAR_DAMPING = 0.15;   // 讓旋轉可持續
export const MIN_SPEED = 0.05;

// 擊球
export const MAX_SHOT_IMPULSE = 0.9;   // 最大衝量 (N·s)
export const AIM_MAX_DRAG_PX = 320;    // 拖曳最大像素

// 搶局
export const RACE_OPTIONS = [7, 9, 11];

// 球顏色 (1-9)
export const BALL_COLORS = {
  1: 0xf7c300,
  2: 0x1f3fb8,
  3: 0xd9212e,
  4: 0x6b2cbf,
  5: 0xee7b2c,
  6: 0x1a7a3c,
  7: 0x7b1e1e,
  8: 0x111111,
  9: 0xf7c300,
};
export const STRIPED = new Set([9]);
