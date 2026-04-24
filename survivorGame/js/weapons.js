// 武器與升級定義
const WEAPONS = {
  pistol: {
    name: '手槍',
    desc: '自動射擊最近敵人',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 6 + level * 3,
        cooldown: Math.max(180, 500 - level * 60), // ms
        speed: 520,
        pierce: 0,
        count: 1
      };
    }
  },
  shotgun: {
    name: '散彈槍',
    desc: '扇形三發',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 4 + level * 2,
        cooldown: Math.max(500, 1000 - level * 100),
        speed: 480,
        pierce: 0,
        count: 3 + Math.floor(level / 2),
        spread: 0.35
      };
    }
  },
  laser: {
    name: '雷射',
    desc: '高速穿透彈',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 3 + level * 2,
        cooldown: Math.max(220, 700 - level * 100),
        speed: 900,
        pierce: 1 + Math.floor(level / 2),
        count: 1
      };
    }
  }
};

// 被動升級
const PASSIVES = {
  hp: { name: '體質', desc: '最大生命 +20', maxLevel: 5, apply(p) { p.maxHp += 20; p.hp += 20; } },
  speed: { name: '迅捷', desc: '移動速度 +12%', maxLevel: 5, apply(p) { p.speed *= 1.12; } },
  regen: { name: '回復', desc: '每秒 +1 HP', maxLevel: 5, apply(p) { p.regen += 1; } },
  magnet: { name: '磁力', desc: '寶石拾取範圍 +30', maxLevel: 5, apply(p) { p.magnet += 30; } }
};
