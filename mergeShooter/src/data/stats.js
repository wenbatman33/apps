// 所有可調數值 — 對齊 doc/merge_shooter_balance_analysis.md 官方表格

// ---------- 砲塔 (照抄官方表) ----------
// [間隔(秒), 主砲傷害, 副砲傷害, 副砲數]
const CANNON_TABLE = [
  [2.0,  10, 0,  0], // Lv1
  [2.0,  15, 0,  0],
  [2.0,  20, 0,  0],
  [1.8,  25, 0,  0],
  [1.7,  30, 0,  0],
  [1.6,  35, 0,  0],
  [1.5,  40, 0,  0],
  [1.4,  45, 0,  0],
  [1.3,  45, 45, 1], // Lv9 雙管
  [1.2,  50, 50, 1],
  [1.2,  55, 55, 1],
  [1.2,  70, 60, 2], // Lv12 三管
  [1.2,  80, 70, 2],
  [1.2,  90, 80, 2],
  [1.0, 120, 90, 2],
  [0.9, 150,100, 2],
  [0.9, 200,110, 2],
  [0.8, 250,120, 2],
  [0.7, 300,130, 2],
  [0.6, 500,150, 2], // Lv20
];

export const MAX_CANNON_LEVEL = CANNON_TABLE.length;

export function cannonInterval(level) { return CANNON_TABLE[level - 1][0]; }    // 秒
export function cannonFireRate(level) { return 1 / CANNON_TABLE[level - 1][0]; } // 發/秒
export function cannonDamage(level)   {
  const [, m, s, n] = CANNON_TABLE[level - 1];
  return m + s * n;
}
export function cannonRange(level)     { return 700 + (level - 1) * 12; }
export function cannonProjSpeed(level) { return 700 + (level - 1) * 15; }
export function cannonGunIndex(level)  { return Math.min(10, Math.ceil(level / 2)); }
export function cannonTint(level) {
  if (level <= 5)       return [0xffffff, 0xfff0c0, 0xffd070, 0xff9a40, 0xff5a30][level - 1];
  if (level <= 10)      return [0x80ffaa, 0x60e0ff, 0x40b0ff, 0x4080ff, 0x4060ff][level - 6];
  if (level <= 15)      return [0xc060ff, 0xa040ff, 0x8030ff, 0x7020e0, 0x6010c0][level - 11];
  return [0xffd700, 0xffc040, 0xffa020, 0xff8000, 0xff6000][level - 16];
}

// ---------- 購買成本(照抄官方) ----------
const BUY_COST = [100,200,500,1000,5000,10000,50000,100000,200000,250000,
                  300000,350000,400000,450000,500000,600000,700000,800000,900000,1000000];

export function buyCost(highestLv) {
  return BUY_COST[Math.max(1, Math.min(MAX_CANNON_LEVEL, highestLv)) - 1];
}

// ---------- 城牆升級表(照抄官方,Lv0→Lv15) ----------
const WALL_TABLE = [
  { hp: 1000,        cost: 1000 },        // Lv0(初始 1000),升 Lv1 花 1000
  { hp: 2000,        cost: 5000 },
  { hp: 3000,        cost: 10000 },
  { hp: 4000,        cost: 20000 },
  { hp: 5000,        cost: 30000 },
  { hp: 6000,        cost: 50000 },
  { hp: 7000,        cost: 100000 },
  { hp: 8000,        cost: 200000 },
  { hp: 9000,        cost: 400000 },
  { hp: 10000,       cost: 800000 },
  { hp: 11000,       cost: 1000000 },
  { hp: 12000,       cost: 15000000 },
  { hp: 13000,       cost: 30000000 },
  { hp: 15000,       cost: 100000000 },
  { hp: 20000,       cost: 1000000000 },
  { hp: 50000,       cost: 9999999999 },
];

export function wallUpgradeCost(upgradeLv) {
  const i = Math.min(WALL_TABLE.length - 1, upgradeLv);
  return WALL_TABLE[i].cost;
}
export function wallMaxHp(upgradeLv) {
  const i = Math.min(WALL_TABLE.length - 1, upgradeLv);
  return WALL_TABLE[i].hp;
}

// ---------- 敵人 ----------
// HP 公式 (§平衡分析§6.2):
//   enemyHP(stage, wave) = hpMul × 10 × 1.18^(stage-1) × 1.05^(wave-1)
// 第 1 關第 1 隻 minion = 4.0 × 10 = 40 HP (符合文件 30~50 區間)
//
// 金幣公式 (§金幣補充§三):
//   小怪 HP×1, 金×1 / 中怪 HP×4, 金×3.5 / 精英 HP×10, 金×8 / Boss HP×25, 金×12
//   Boss 金幣倍率 < HP 倍率 (玩家不會故意慢殺 Boss 刷錢)
export const ENEMY_TYPES = {
  // 類型               HP 倍率  速度  攻擊力  金幣倍率  scale  怪物編號
  minion: { hpMul: 1.0,  speed: 60,  attack: 80,  goldTypeMul: 1.0,  scale: 0.55, monster: 1 },
  swarm:  { hpMul: 0.6,  speed: 70,  attack: 40,  goldTypeMul: 0.8,  scale: 0.40, monster: 4 },
  runner: { hpMul: 1.5,  speed: 110, attack: 60,  goldTypeMul: 1.5,  scale: 0.45, monster: 2 },
  tank:   { hpMul: 4.0,  speed: 30,  attack: 200, goldTypeMul: 3.5,  scale: 0.75, monster: 3 },
  elite:  { hpMul: 10,   speed: 45,  attack: 300, goldTypeMul: 8.0,  scale: 0.85, monster: 9  },
  boss:   { hpMul: 25,   speed: 25,  attack: 500, goldTypeMul: 12,   scale: 1.00, monster: 10 },
};

export function enemyHP(type, stage, wave) {
  const def = ENEMY_TYPES[type];
  // 第 1 關小怪 base = 40,所以 hpMul=1 對應 40 HP
  return Math.ceil(def.hpMul * 40 * Math.pow(1.18, stage - 1) * Math.pow(1.05, wave - 1));
}

// 金幣 — 對齊原版「Wave Clean」popup 顯示的單波 1.6k 收益感
// 殺敵 base = 100 × 1.4^(stage-1) → stage1=100, stage10=2900, stage20=84000, stage40=29.7M
export function enemyGold(type, stage, wave) {
  const def = ENEMY_TYPES[type];
  const base = 100 * Math.pow(1.4, stage - 1) * Math.pow(1.04, wave - 1);
  const jitter = 0.9 + Math.random() * 0.2;
  return Math.max(1, Math.floor(base * def.goldTypeMul * jitter));
}

// 每波結束 Coin Bonus — 對應截圖 1k 起跳
export function waveClearBonus(stage) {
  return Math.floor(1000 * Math.pow(1.4, stage - 1));
}

// 整關通關額外獎勵
export function stageClearReward(stage) {
  return Math.floor(500 * Math.pow(1.4, stage - 1));
}

// ---------- 波次 ----------
function buildStage(stageIdx) {
  const isBoss = stageIdx % 5 === 0;
  const waveCount = Math.min(8, 3 + Math.floor(stageIdx / 3));
  const waves = [];
  for (let w = 1; w <= waveCount; w++) {
    const isLast = w === waveCount;
    if (isLast && isBoss) {
      waves.push({ spawns: [{ type: 'boss', count: 1, interval: 1000, delay: 500 }] });
    } else if (w === 2) {
      waves.push({ spawns: [
        { type: 'runner', count: 4, interval: 600, delay: 0 },
        { type: 'minion', count: 3, interval: 700, delay: 1500 }
      ]});
    } else if (w % 3 === 0) {
      waves.push({ spawns: [
        { type: 'minion', count: 4, interval: 700, delay: 0 },
        { type: 'tank',   count: 1, interval: 500, delay: 2000 }
      ]});
    } else if (w % 4 === 0) {
      waves.push({ spawns: [{ type: 'swarm', count: 8, interval: 250, delay: 0 }] });
    } else {
      waves.push({ spawns: [{ type: 'minion', count: 3 + Math.floor(stageIdx / 2), interval: 800, delay: 0 }] });
    }
  }
  return { waves };
}

export const STAGES = Array.from({ length: 40 }, (_, i) => buildStage(i + 1));
export const getStage = (idx) => STAGES[Math.min(STAGES.length - 1, Math.max(0, idx - 1))];
