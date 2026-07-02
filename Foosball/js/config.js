// 全域設定：物理 / 操作 / AI / 版面（DEV 工具可即時調整並匯出）

export const CONFIG = {
  table: {
    length: 30,      // 球桌長（z 軸）
    width: 18,       // 球桌寬（x 軸）
    wallH: 1.7,      // 圍牆高
    goalHalf: 3.6,   // 球門開口半寬
    ballR: 0.45,     // 球半徑
  },
  physics: {
    friction: 0.55,   // 每秒速度衰減比例
    wallRest: 0.82,   // 牆面反彈係數
    blockRest: 0.5,   // 人偶擋球反彈係數
    maxSpeed: 55,     // 球速上限
    stuckNudge: 2.2,  // 卡球幾秒後輕推
    stuckReset: 6.0,  // 卡球幾秒後重新發球
  },
  control: {
    moveSens: 1.0,      // 拖曳移桿靈敏度（拖曳只移動，人偶保持直立）
    tapKickPow: 34,     // 點擊射門力道
    tapMaxTime: 0.3,    // 點擊判定：最長按壓秒數
    tapMaxMove: 1.3,    // 點擊判定：期間最大移動量（桌面單位）
    kickPowMax: 46,     // 射門力道上限
    kickCooldown: 0.25, // 射門冷卻（秒）
    grabRange: 5.0,     // 手指落點找桿的 z 範圍
  },
  ai: {
    easy:   { speed: 6,  react: 0.40, kickPow: 18, aim: 0.22, kickRange: 1.6, kickCd: 1.3 },
    normal: { speed: 10, react: 0.22, kickPow: 26, aim: 0.50, kickRange: 1.9, kickCd: 0.85 },
    hard:   { speed: 16, react: 0.10, kickPow: 36, aim: 0.80, kickRange: 2.1, kickCd: 0.5 },
  },
  rules: { winScore: 5 },
  // 版面（鏡頭）參數：手機直版 / PC 橫版 分開調
  LAYOUT_MOBILE: { camH: 30, camD: 21, fov: 56, lookZ: -1.5, tilt: 0 },
  LAYOUT_PC:     { camH: 25, camD: 15, fov: 46, lookZ: 0,    tilt: 0 },
};

// 8 根桿的規格（side: P=玩家 A=對手；z 為桿位置；count 人偶數；spacing 人偶間距）
export const RODS = [
  { side: 'P', kind: 'GK',  z:  11.55, count: 1, spacing: 0   },
  { side: 'P', kind: 'DEF', z:   8.25, count: 2, spacing: 7.2 },
  { side: 'A', kind: 'ATT', z:   4.95, count: 3, spacing: 4.6 },
  { side: 'P', kind: 'MID', z:   1.65, count: 5, spacing: 3.3 },
  { side: 'A', kind: 'MID', z:  -1.65, count: 5, spacing: 3.3 },
  { side: 'P', kind: 'ATT', z:  -4.95, count: 3, spacing: 4.6 },
  { side: 'A', kind: 'DEF', z:  -8.25, count: 2, spacing: 7.2 },
  { side: 'A', kind: 'GK',  z: -11.55, count: 1, spacing: 0   },
];

// 每根桿可滑動的半行程
export function rodHalfTravel(rod) {
  if (rod.kind === 'GK') return CONFIG.table.goalHalf + 0.8;
  const halfSpan = (rod.count - 1) * rod.spacing / 2;
  return CONFIG.table.width / 2 - 1.0 - halfSpan;
}
