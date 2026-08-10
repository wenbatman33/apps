/* v2 守軍：4 系 × 5 階（同種同級點擊合成升階）*/
window.TD = window.TD || {};

TD.GROWTH = 1.8;            // 每階屬性倍率
TD.RECRUIT_BASE = 60;       // 徵兵基價
TD.RECRUIT_STEP = 12;       // 每次徵兵漲價
TD.MAX_LV = 5;

// 攻擊模式（全部是往上掃的持續彈幕，參考合成防線手感）：
//  arrow  = 高頻直射箭流（單體，曳光）
//  spear  = 貫穿標槍（一矛穿一整列，稍慢）
//  stone  = 拋射巨石（AoE 濺射，慢而重）
//  oil    = 火油噴流（短射程持續燒，點燃敵人）
TD.UNITS = {
  archer: {
    name: '弓兵', icon: 'G_def_archer', color: 0xFF8A3C, mode: 'arrow',
    dmg: 10, rate: 340, range: 1050, projSpeed: 1500,
    burnLv: 3,                       // 3 階起火箭（附燃燒）
    names: ['民兵弓手', '城衛弓兵', '精銳射手', '王家弓衛', '神眷射手'],
  },
  spear: {
    name: '長矛', icon: 'G_def_spear', color: 0x6EC6FF, mode: 'spear',
    dmg: 26, rate: 900, range: 1050, projSpeed: 1250,
    pierce: 99,                       // 貫穿整列
    climberMul: 3.0,                  // 對雲梯/爬牆敵人傷害倍率
    names: ['持矛民兵', '城衛矛兵', '精銳矛士', '王家矛衛', '赫克托親衛'],
  },
  stone: {
    name: '投石', icon: 'G_def_stone', color: 0xC9A227, mode: 'stone',
    dmg: 30, rate: 1900, range: 900, aoe: 135,
    names: ['擲石民兵', '投石手', '精銳投石', '破城投手', '巨石泰坦'],
  },
  oil: {
    name: '火油', icon: 'G_def_oil', color: 0xFF5C3C, mode: 'oil',
    dmg: 6, rate: 200, range: 560, projSpeed: 820,   // 高頻火舌噴流
    burnSec: 2.2,
    names: ['澆油僕役', '火油兵', '沸油匠', '烈焰油衛', '煉獄司爐'],
  },
};

TD.unitStat = (type, lv) => {
  const u = TD.UNITS[type];
  const k = Math.pow(TD.GROWTH, lv - 1);
  return {
    dmg: Math.round(u.dmg * k),
    rate: Math.max(240, Math.round(u.rate * Math.pow(0.96, lv - 1))),
    range: u.range * (1 + (lv - 1) * 0.06),
  };
};

// ── 主動技能 ──
TD.SKILLS = {
  oilPour:   { name: '沸油傾瀉', icon: '🔥', cd: 12000, dmg: 14, radius: 190, burnSec: 6 },
  arrowRain: { name: '萬箭齊發', icon: '🏹', cd: 18000, dmg: 22, radius: 240, count: 90 },
  meteor:    { name: '神火隕石', icon: '☄️', cd: 0,     dmg: 120, radius: 230, count: 3 }, // 神恩滿才可放
};
TD.FURY_MAX = 100;          // 神恩上限（擊殺累積）
TD.FURY_PER_KILL = 2.2;
