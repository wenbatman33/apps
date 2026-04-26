// 武器與升級定義
const WEAPONS = {
  pistol: {
    name: '手槍',
    desc: '自動射擊最近敵人',
    type: 'bullet',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 6 + level * 3,
        cooldown: Math.max(180, 500 - level * 60),
        speed: 520,
        pierce: 0,
        count: 1
      };
    }
  },
  shotgun: {
    name: '散彈槍',
    desc: '扇形多發',
    type: 'bullet',
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
    type: 'bullet',
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
  },
  lightning: {
    name: '閃電',
    desc: '瞬擊敵人並鏈鎖跳躍',
    type: 'lightning',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 14 + level * 6,
        cooldown: Math.max(700, 1600 - level * 180),
        chain: 2 + level,            // 跳躍次數
        chainRange: 180 + level * 10 // 鏈鎖搜尋半徑
      };
    }
  },
  flame: {
    name: '火焰',
    desc: '前方扇形噴射並引燃',
    type: 'flame',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 4 + level * 2,         // 直接命中傷害
        burnDps: 6 + level * 3,        // 燃燒每秒傷害
        burnDuration: 1500 + level * 300,
        cooldown: 120,                 // 高頻噴射
        range: 160 + level * 12,
        arc: 0.7 + level * 0.04,       // 弧度
        particles: 4
      };
    }
  },
  frost: {
    name: '冰霜環',
    desc: '週期性冰爆，傷害並減速',
    type: 'frost',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 10 + level * 5,
        cooldown: Math.max(1400, 2400 - level * 220),
        radius: 120 + level * 22,
        slowFactor: 0.5,              // 速度乘數
        slowDuration: 1200 + level * 200
      };
    }
  },
  homing: {
    name: '追蹤飛彈',
    desc: '自動追蹤並爆炸',
    type: 'homing',
    maxLevel: 5,
    levelStat(level) {
      return {
        damage: 12 + level * 5,
        cooldown: Math.max(900, 1700 - level * 160),
        count: 1 + Math.floor(level / 2),
        speed: 360,
        turnRate: 0.08 + level * 0.01, // 每幀轉向比例
        explodeRadius: 60 + level * 8,
        life: 3500
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
