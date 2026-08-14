// ===== 可調參數（DEV 面板即時綁定；「匯出」後由 Claude bake 回這裡） =====
export const TUNE = {
  physics: {
    gravity: 8.8,          // 斜面重力（沿檯面往玩家方向）
    wallRestitution: 0.5,  // 一般牆面反彈
    rollDamp: 0.94,        // 每秒滾動保留比例
    maxSpeed: 30,          // 極速限制
    bumperBoost: 15,       // Pop bumper 彈開速度
    slingKick: 9,          // Slingshot 彈射速度
    ballR: 0.22,           // 彈珠半徑
    substeps: 8,           // 物理子步進
    ccdSpeed: 12,          // 超過此速度時 flipper 走高精度掃掠碰撞
  },
  flipper: {
    pivotX: 1.30,          // 樞軸離中線距離
    pivotZ: 4.90,
    len: 1.10,             // 桿長
    r: 0.14,               // 桿半徑（capsule）
    restDeg: 32,           // 靜止下垂角
    upDeg: 30,             // 壓下抬升角
    speed: 1050,           // 旋轉角速度 deg/s
    restitution: 0.45,     // 桿面反彈
  },
  plunger: {
    minSpeed: 15,          // 最小發射速度
    maxSpeed: 26,          // 拉滿發射速度
    pullPx: 200,           // 拉滿所需拖曳像素
  },
  camera: {
    fov: 50,
    tilt: 38,              // 相機傾角（度，0=正俯視）
    lookZ: 0.5,            // 視線落點 z 偏移
    margin: 1.04,          // 邊緣留白倍率
    shake: 1.0,
  },
  fx: {
    trailLen: 20,
    trailWidth: 0.13,
    trailOpacity: 0.5,
    glowSize: 1.9,
    particles: 1.0,
    lightIntensity: 1.1,
  },
  battle: {
    saverSec: 12,          // 球保護時間（落球免費補回）
    vulnSec: 12,           // 破防持續秒數
    chipDmgBase: 12,       // 未破防每次命中傷害底
    chipDmgImpact: 3,      //   +每單位撞速
    vulnDmgBase: 260,      // 破防命中傷害底
    vulnDmgImpact: 46,     //   +每單位撞速
    comboWindow: 2.2,      // Combo 維持秒數
    comboBonus: 0.05,      // 每 Combo 得分加成
  },
  score: {
    bumper: 150, sling: 100, target: 500, sideTarget: 350,
    lane: 200, spinner: 30, rollover: 120, saucer: 2500, ringCore: 400, ramp: 1500,
  },
  post: {
    bloomStrength: 0.42, threshold: 1.05, exposure: 1.05, vignette: 0.45, chroma: 0.005,
  },
};

// 依路徑讀寫（DEV 面板用）
export function getPath(obj, path) { return path.split('.').reduce((o, k) => o?.[k], obj); }
export function setPath(obj, path, v) {
  const ks = path.split('.'); const last = ks.pop();
  ks.reduce((o, k) => o[k], obj)[last] = v;
}
