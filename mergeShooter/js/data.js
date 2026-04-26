/**
 * 數值表 — 直接照抄官方 GDD §2/§3/§4/§6 與 balance analysis
 * 文件來源:
 *   doc/merge_shooter_gdd.md
 *   doc/merge_shooter_balance_analysis.md (官方 plays.org 規格)
 */
window.MSData = (function () {
  // ========== 鎖死參數（不可動） ==========
  const MAX_LEVEL = 20;
  const FRONT_SLOTS = 6;
  const RESERVE_COLS = 6;
  const RESERVE_ROWS = 2;
  const RESERVE_SLOTS = 12;
  const TOTAL_STAGES = 40;

  // ========== 砲塔完整屬性表（balance analysis §2） ==========
  // [pipes, fireInterval(秒), damage1, damage2, damage3, projSpeed1, projSpeed2,
  //  upgradeCost1, upgradeCost2, upgradeCost3, upgradeCost4]
  const CANNON_TABLE = [
    null, // index 0 unused
    [1, 2.0, 10,  null, null, 400, null, 500,    1000,    2000,    4000],     // Lv1
    [1, 2.0, 15,  null, null, 400, null, 500,    1000,    2000,    4000],     // Lv2
    [1, 2.0, 20,  null, null, 500, null, 500,    1000,    2000,    4000],     // Lv3
    [1, 1.8, 25,  null, null, 500, null, 1000,   2000,    4000,    8000],     // Lv4
    [1, 1.7, 30,  null, null, 500, null, 4000,   16000,   32000,   64000],    // Lv5
    [1, 1.6, 35,  null, null, 500, null, 16000,  32000,   64000,   128000],   // Lv6
    [1, 1.5, 40,  null, null, 500, null, 100000, 140000,  180000,  200000],   // Lv7
    [1, 1.4, 45,  null, null, 500, null, 150000, 200000,  250000,  300000],   // Lv8
    [2, 1.3, 45,  45,   null, 500, null, 250000, 300000,  350000,  400000],   // Lv9 雙管
    [2, 1.2, 50,  50,   null, 500, null, 400000, 450000,  500000,  550000],   // Lv10
    [2, 1.2, 55,  55,   null, 500, null, 550000, 600000,  650000,  700000],   // Lv11
    [3, 1.2, 70,  60,   60,   500, 450,  700000, 750000,  800000,  850000],   // Lv12 三管
    [3, 1.2, 80,  70,   70,   520, 500,  900000, 950000,  1000000, 1100000],  // Lv13
    [3, 1.2, 90,  80,   80,   600, 550,  1200000,1400000, 1600000, 1800000],  // Lv14
    [3, 1.0, 120, 90,   90,   600, 550,  1800000,2000000, 2500000, 3000000],  // Lv15
    [3, 0.9, 150, 100,  100,  700, 600,  4000000,8000000, 12000000,20000000], // Lv16
    [3, 0.9, 200, 110,  110,  700, 600,  25000000,30000000,35000000,40000000],// Lv17
    [3, 0.8, 250, 120,  120,  700, 650,  45000000,50000000,55000000,60000000],// Lv18
    [3, 0.7, 300, 130,  130,  800, 600,  70000000,80000000,90000000,100000000],//Lv19
    [3, 0.6, 500, 150,  150,  1000,800,  100000000,500000000,700000000,1000000000],//Lv20
  ];

  function cannonStat(level) {
    const lv = Math.max(1, Math.min(MAX_LEVEL, level | 0));
    const t = CANNON_TABLE[lv];
    return {
      level: lv,
      pipes: t[0],
      fireInterval: t[1] * 1000,           // 轉成毫秒
      damages: [t[2], t[3] || 0, t[4] || 0],
      speeds:  [t[5], t[6] || t[5], t[6] || t[5]],
      upgrades: [t[7], t[8], t[9], t[10]],
    };
  }

  // ========== 城牆升級表（balance analysis §3） ==========
  // 城牆等級 0~15，每級對應 [升級花費, 升級後 maxHP]
  const WALL_TABLE = [
    [0,            1000],     // Lv0 初始
    [1000,         2000],     // Lv1
    [5000,         3000],     // Lv2
    [10000,        4000],     // Lv3
    [20000,        5000],     // Lv4
    [30000,        6000],     // Lv5
    [50000,        7000],     // Lv6
    [100000,       8000],     // Lv7
    [200000,       9000],     // Lv8
    [400000,       10000],    // Lv9
    [800000,       11000],    // Lv10
    [1000000,      12000],    // Lv11
    [15000000,     13000],    // Lv12
    [30000000,     15000],    // Lv13
    [100000000,    20000],    // Lv14
    [1000000000,   50000],    // Lv15
  ];
  const WALL_MAX_LEVEL = WALL_TABLE.length - 1;
  function wallUpgradeCost(currentUpgradeLevel) {
    const next = currentUpgradeLevel + 1;
    if (next > WALL_MAX_LEVEL) return Infinity;
    return WALL_TABLE[next][0];
  }
  function wallMaxHpAtLevel(level) {
    const lv = Math.max(0, Math.min(WALL_MAX_LEVEL, level));
    return WALL_TABLE[lv][1];
  }

  // ========== 砲塔購買成本表（依最高解鎖等級，§4） ==========
  const BUY_COST_TABLE = [
    100, 200, 500, 1000, 5000, 10000, 50000, 100000, 200000, 250000,
    300000, 350000, 400000, 450000, 500000, 600000, 700000, 800000, 900000, 1000000,
  ];
  function buyCost(highestLv) {
    const idx = Math.max(0, Math.min(BUY_COST_TABLE.length - 1, (highestLv || 1) - 1));
    return BUY_COST_TABLE[idx];
  }

  // ========== 抽卡邏輯（balance analysis §1.1） ==========
  // 依玩家最高解鎖等級決定抽卡 pool，pool 內隨機選一級
  function rollPurchasedLevel(highestLv) {
    let pool;
    if (highestLv <= 2)      pool = [1, 1, 1, 1, 2];
    else if (highestLv <= 4) pool = [1, 1, 2, 2, 3];
    else if (highestLv <= 6) pool = [1, 2, 2, 3, 3, 4];
    else if (highestLv <= 8) pool = [2, 3, 3, 4, 4, 5];
    else if (highestLv <=10) pool = [3, 4, 4, 5, 5, 6];
    else if (highestLv <=12) pool = [4, 5, 5, 6, 6, 7];
    else if (highestLv <=14) pool = [5, 6, 6, 7, 7, 8];
    else if (highestLv <=16) pool = [6, 7, 7, 8, 8, 9];
    else if (highestLv <=18) pool = [7, 8, 8, 9, 9, 10];
    else                     pool = [8, 9, 9, 10, 10, 11];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ========== 砲塔貼圖：每 2 級復用同一張 (Lv1-2→gun1, Lv3-4→gun2, ..., Lv19-20→gun10) ==========
  function gunTextureKey(lv) {
    const idx = Math.max(1, Math.min(10, Math.ceil(lv / 2)));
    return 'gun' + idx + '-idle';
  }

  // ========== 敵人 HP 公式（balance analysis §6.2） ==========
  function enemyHp(stage, wave, baseHp = 10) {
    return Math.floor(baseHp * Math.pow(1.18, stage - 1) * Math.pow(1.05, wave - 1));
  }

  // 金幣掉落 = HP × 0.15 ± 20%
  function enemyReward(hp) {
    const base = hp * 0.15;
    const jitter = base * (0.8 + Math.random() * 0.4);
    return Math.max(1, Math.floor(jitter));
  }

  // ========== 敵人類型（balance analysis §6.3） ==========
  const ENEMY_TYPES = [
    { key: 'minion', hpMul: 1.0,  speedMul: 1.0,  sprite: 1 },
    { key: 'runner', hpMul: 0.6,  speedMul: 1.8,  sprite: 2 },
    { key: 'tank',   hpMul: 4.0,  speedMul: 0.55, sprite: 3 },
    { key: 'swarm',  hpMul: 0.4,  speedMul: 1.0,  sprite: 4 },
    { key: 'boss',   hpMul: 50,   speedMul: 0.45, sprite: 5 },
  ];

  // 關卡敵人組成（依 §6.3 比例）
  function buildStage(stage) {
    const isBossStage = stage % 5 === 0;
    const wavesCount = Math.min(8, 3 + Math.floor(stage / 6));
    const waves = [];

    function pickType() {
      const r = Math.random() * 100;
      if (stage <= 10) {
        if (r < 90) return 0;          // minion
        return 1;                      // runner
      } else if (stage <= 20) {
        if (r < 60) return 0;
        if (r < 85) return 1;
        return 2;
      } else if (stage <= 30) {
        if (r < 40) return 0;
        if (r < 70) return 1;
        if (r < 90) return 2;
        return 3;
      } else {
        if (r < 30) return 0;
        if (r < 55) return 1;
        if (r < 75) return 2;
        return 3;
      }
    }

    for (let w = 1; w <= wavesCount; w++) {
      const isLast = w === wavesCount;
      if (isBossStage && isLast) {
        waves.push({ stage, wave: w, isBoss: true, composition: [{ type: 4, count: 1 }] });
        continue;
      }
      const count = 5 + Math.floor(stage / 4) + w;
      const composition = [];
      let remaining = count;
      while (remaining > 0) {
        const type = pickType();
        const groupCount = type === 3 ? Math.min(remaining, 6) : 1; // swarm 一次出 6 隻
        composition.push({ type, count: groupCount });
        remaining -= groupCount;
      }
      waves.push({ stage, wave: w, isBoss: false, composition });
    }
    return waves;
  }

  return {
    MAX_LEVEL, FRONT_SLOTS, RESERVE_COLS, RESERVE_ROWS, RESERVE_SLOTS, TOTAL_STAGES,
    WALL_MAX_LEVEL,
    cannonStat, wallUpgradeCost, wallMaxHpAtLevel,
    buyCost, rollPurchasedLevel, gunTextureKey,
    enemyHp, enemyReward, ENEMY_TYPES, buildStage,
  };
})();

/**
 * 存檔系統
 */
window.MSSave = (function () {
  const KEY = 'mergeShooterSave_v3';
  const DEFAULT = {
    currentStage: 1,
    currentWave: 1,
    gold: 1000,
    wall: { currentHP: 1000, maxHP: 1000, upgradeLevel: 0 },
    cannons: [],
    highestUnlockedCannonLevel: 1,
    settings: { sound: true, music: true },
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      return Object.assign({}, JSON.parse(JSON.stringify(DEFAULT)), JSON.parse(raw));
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULT)); }
  }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function reset() { localStorage.removeItem(KEY); }
  return { load, save, reset, DEFAULT };
})();
