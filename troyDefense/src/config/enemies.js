/* v2 敵方攻城體系 — 每種敵人是一種攻城行為＋一種戰火演出
 * behavior:
 *  gate    = 走到城下 → 移向城門 → 揮武器砍門（金屬火花）
 *  torch   = 走到中場停下 → 對城門投擲火把（火焰拋物線）
 *  ladder  = 走到城下 → 架雲梯 → 爬上垛口與守軍肉搏
 *  ram     = 攻城槌：沿中路推進 → 重撞城門（大震屏）
 *  tower   = 攻城塔：緩慢推進 → 抵牆放兵（可被燒垮）
 *  catapult= 停在後場，拋射火球砸城牆/守軍
 */
window.TD = window.TD || {};

TD.ENEMIES = {
  soldier: {
    name: '劍盾步兵', art: 'G_soldier', behavior: 'gate',
    hp: 70, speed: 95, dmg: 6, atkRate: 1000, gold: 14, score: 100, scale: 1.0,
  },
  runner: {
    name: '衝鋒兵', art: 'G_runner', behavior: 'gate',
    hp: 44, speed: 175, dmg: 5, atkRate: 800, gold: 12, score: 120, scale: 0.92,
  },
  shield: {
    name: '重盾兵', art: 'G_shield', behavior: 'gate',
    hp: 240, speed: 62, dmg: 10, atkRate: 1300, gold: 30, score: 220, scale: 1.1,
    blockFront: 0.5,          // 正面（箭）傷害減半；火油/投石不受影響
  },
  torch: {
    name: '火把兵', art: 'G_torch', behavior: 'torch',
    hp: 60, speed: 105, dmg: 9, atkRate: 2200, gold: 18, score: 150, scale: 0.96,
    throwY: 950,              // 走到這個 Y 就停下開始丟火把
  },
  ladder: {
    name: '雲梯兵', art: 'G_ladderman', behavior: 'ladder',
    hp: 95, speed: 88, dmg: 24, atkRate: 900, gold: 26, score: 200, scale: 1.0,
    climbSec: 2.6,            // 爬牆秒數（期間長矛剋制）
  },
  ram: {
    name: '攻城槌', sprite: 'G_ram', behavior: 'ram',
    hp: 520, speed: 40, dmg: 55, atkRate: 2400, gold: 70, score: 500, scale: 1.0, dispH: 175,
    laneLock: 1,              // 只走中路（城門）
  },
  siegetower: {
    name: '攻城塔', sprite: 'G_siegetower', behavior: 'tower',
    hp: 760, speed: 30, dmg: 0, atkRate: 3200, gold: 100, score: 700, scale: 1.0, dispH: 300,
    spawnEvery: 3200, spawnMax: 6,   // 抵牆後定期放兵上垛口
    burnMul: 1.6,             // 火傷加成（燒塔是正解）
  },
  catapult: {
    name: '投石機', sprite: 'G_catapult', behavior: 'catapult',
    hp: 300, speed: 34, dmg: 30, atkRate: 5200, gold: 80, score: 600, scale: 0.9, dispH: 200,
    stopY: 620,               // 停在後場
  },
  // ── BOSS ──
  diomedes: {
    name: '狄俄墨得斯', art: 'G_diomedes', behavior: 'gate', boss: true,
    hp: 1600, speed: 80, dmg: 40, atkRate: 1100, gold: 300, score: 5000, scale: 1.45,
    dashEvery: 5200, dashMul: 4.2,   // 週期衝刺，無視減速
  },
};
