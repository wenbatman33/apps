// 全域可調參數 — DEV 工具（D 鍵）即時調整後可匯出
export const PARAMS = {
  race: {
    laps: 3,          // 比賽圈數
    aiCount: 7,       // AI 對手數
  },
  physics: {
    topSpeed: 92,        // 極速 m/s（約 331 km/h）
    accel: 17,           // 引擎加速度 m/s²
    brakeDecel: 40,      // 煞車減速度 m/s²
    engineBrake: 3.2,    // 放油門時的引擎煞車
    steerLock: 0.32,     // 最大轉向角 rad
    steerFalloff: 0.024, // 速度越快轉向越鈍
    gripLatA: 33,        // 輪胎側向極限加速度 m/s²（含基本下壓力）
    downforce: 0.0042,   // 速度平方下壓力增益
    gripRecover: 10,     // 速度向量貼回車頭方向的速率（越大越不滑）
    steerAssist: 0.45,   // 隱性轉向輔助強度（0 = 純手動）
    grassGrip: 0.5,      // 草地抓地力倍率
    grassDrag: 14,       // 草地阻力 m/s²
  },
  camera: {
    dist: 11.5,    // 攝影機距離
    height: 4.2,   // 攝影機高度
    lookAhead: 9,  // 視線前瞻距離
    lag: 5.5,      // 跟隨平滑度
    fovBase: 62,   // 基礎 FOV
    fovSpeed: 14,  // 高速時 FOV 增量
  },
  ai: {
    speedScale: 0.93,  // AI 整體速度倍率（調難度）
    gripLatA: 27,      // AI 過彎極限
    accel: 15.5,
    brake: 34,
  },
  graphics: {
    shadows: true,
    fogDist: 900,
  },
  hud: {}, // HUD 拖曳位置（dev 工具寫入）
};

// 車隊配色 [車身, 副色]
export const TEAMS = [
  { name: '玩家', body: 0xe10600, accent: 0xffffff },   // 紅
  { name: '橘箭', body: 0xff8000, accent: 0x47c7fc },
  { name: '銀星', body: 0x00d2be, accent: 0xc0c0c0 },
  { name: '深藍', body: 0x1e3cff, accent: 0xffd23f },
  { name: '綠能', body: 0x006f62, accent: 0xb8e62e },
  { name: '粉電', body: 0xf363b9, accent: 0xffffff },
  { name: '白武', body: 0xf0f0f0, accent: 0xd00000 },
  { name: '藍翼', body: 0x37bedd, accent: 0x041e42 },
];
