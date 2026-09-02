// ===== 所有可調參數集中於此：DEV 面板即時修改，匯出後由 Claude bake 回這裡 =====

// 球場尺寸（公尺，依 USA Pickleball 標準）
export const COURT = {
  halfW: 3.048,        // 20 ft 寬 → 半寬
  halfL: 6.705,        // 44 ft 長 → 半長
  kitchen: 2.134,      // 非截擊區（廚房）距網 7 ft
  netPost: 0.914,      // 網柱高 36 in
  netCenter: 0.864,    // 網中央高 34 in
  postX: 3.35,         // 網柱 x 位置
  lineW: 0.051,        // 線寬 2 in
};

export const TUNE = {
  physics: {
    gravity: 9.81,
    drag: 0.010,        // 線性空氣阻力係數（每秒速度損失比例 × 速度）
    restitution: 0.56,  // 地面反彈係數（匹克球彈性低）
    friction: 0.78,     // 落地後水平速度保留比
    ballRadius: 0.045,  // 視覺放大一點好辨識（實際 0.037）
    wallRestitution: 0.35,
  },
  shot: {
    driveSpeed: 13.5,   // 平擊球速（m/s，用來推算飛行時間）
    minFlight: 0.55,
    maxFlight: 1.35,
    netClear: 0.18,     // 過網最低餘裕高度
    depthPerfect: 0.86, // 完美擊球落點深度（半場長比例）
    depthWorst: 0.52,   // 最差時機落點深度
    aimHalfW: 2.35,     // 瞄準最大橫向寬度
    serveSpeed: 11.0,
    lobSpeed: 8.5,
  },
  player: {
    speed: 6.5,         // 跑位速度 m/s
    reachX: 1.35,       // 揮拍可及橫向距離
    reachZ: 1.15,       // 揮拍可及縱向距離
    swingWindow: 0.34,  // 揮拍後持續有效的時間窗（秒）
    contactAhead: 0.55, // 理想擊球點在身前的距離
    aimError: 0.9,      // 時機不佳時最大瞄準誤差（m）
    homeZ: 5.6,
    dragSpeed: 0.02,    // 觸控拖曳 → 位移換算（m / px）
    assist: 1,          // 自動跑位（1 開 / 0 關）
  },
  ai: {
    // 三種難度
    // speed 跑速 / error 瞄準誤差 / react 反應延遲 / missRate 主動失誤率 / corner 打角機率 / reach 可及範圍倍率 / posErr 跑位預判誤差 / power 球速倍率
    easy:   { speed: 3.4, error: 1.15, react: 0.34, missRate: 0.16, corner: 0.25, reach: 0.72, posErr: 1.2, power: 0.86 },
    normal: { speed: 4.4, error: 0.75, react: 0.22, missRate: 0.08, corner: 0.45, reach: 0.82, posErr: 0.85, power: 0.95 },
    hard:   { speed: 5.8, error: 0.42, react: 0.12, missRate: 0.03, corner: 0.70, reach: 0.92, posErr: 0.5, power: 1.06 },
    residual: 0.45,     // 球到面前時仍殘留的預判誤差比例
    fatigueAfter: 10,   // 回合超過幾拍後 AI 失誤開始放大
    fatigueRate: 0.09,  // 每多一拍誤差放大比例
    homeZ: -5.4,
  },
  rules: {
    winScore: 11,
    winBy: 2,
    pointPause: 1.5,    // 得分後暫停秒數
    serveDelay: 1.1,    // AI 發球等待
  },
  camera: {
    pc:     { fov: 46, x: 0, y: 4.9, z: 12.6, lookY: 0.35, lookZ: -1.6, followX: 0.28 },
    mobile: { fov: 60, x: 0, y: 7.2, z: 14.6, lookY: 0.0, lookZ: -1.9, followX: 0.22 },
    lerp: 4.0,
  },
  light: {
    exposure: 0.78,
    sunIntensity: 1.9,
    sunX: 3.5, sunY: 13, sunZ: 5,
    hemiIntensity: 0.24,
    pointIntensity: 30,
    envFloor: 0.42,
    envArena: 0.32,
    envChar: 0.45,
    panelEmissive: 3.2,
    shadowBias: -0.00035,
    shadowNormalBias: 0.025,
  },
  post: {
    bloomStrength: 0.32,
    bloomRadius: 0.35,
    bloomThreshold: 1.25,
    vignette: 0.28,
  },
  hud: {
    pc:     { scoreY: -46,  scoreScale: 1.0,  toastY: 90,  hintY: 70, menuX: 34, menuY: -34 },
    mobile: { scoreY: -70,  scoreScale: 0.92, toastY: 120, hintY: 120, menuX: 30, menuY: -56 },
  },
};

// 以 'a.b.c' 路徑讀寫 TUNE（DEV 面板用）
export function getPath(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), TUNE);
}
export function setPath(path, v) {
  const ks = path.split('.');
  let o = TUNE;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = v;
}
