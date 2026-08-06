/* 敵方單位 */
window.TD = window.TD || {};

TD.ENEMIES = {
  soldier: {
    name: '希臘步兵', tex: 'E_soldier', scale: 0.92,
    hp: 68, spd: 62, gold: 8, score: 100, dmg: 6,
  },
  shield: {
    name: '重裝盾兵', tex: 'E_shield', scale: 1.02,
    hp: 230, spd: 41, gold: 18, score: 240, dmg: 10,
    armor: 0.38,           // 正面減傷；AoE/燃燒無視
    armorNote: '需靠範圍或燃燒破防',
  },
  runner: {
    name: '輕裝衝鋒兵', tex: 'E_runner', scale: 0.86,
    hp: 52, spd: 132, gold: 11, score: 150, dmg: 5,
    dash: { every: 3200, mul: 2.2, dur: 700 },
  },
  fire: {
    name: '縱火兵', tex: 'E_fire', scale: 0.92,
    hp: 105, spd: 78, gold: 15, score: 200, dmg: 8,
    burnTower: true,       // 抵達城牆時使一座塔癱瘓 5 秒
  },
  siege: {
    name: '攻城塔車', tex: 'E_siege', scale: 1.35,
    hp: 1100, spd: 25, gold: 70, score: 1000, dmg: 26,
    armor: 0.25, big: true,
  },
  // ── BOSS ──
  diomedes: {
    name: '狄俄墨得斯', tex: 'E_diomedes', scale: 1.18,
    hp: 1600, spd: 54, gold: 120, score: 3000, dmg: 30,
    boss: true, immuneSlow: true,
    dash: { every: 4000, mul: 2.6, dur: 900 },
    title: '無畏的闖入者 · 無視一切減速',
  },
  ajax: {
    name: '大埃阿斯', tex: 'E_ajax', scale: 1.35,
    hp: 3200, spd: 35, gold: 180, score: 4500, dmg: 40,
    boss: true, armor: 0.72, frontOnly: true,
    title: '七層牛皮巨盾 · 正面幾乎免疫，需範圍與燃燒破之',
  },
  achilles: {
    name: '阿基里斯', tex: 'E_achilles', scale: 1.30,
    hp: 6000, spd: 45, gold: 300, score: 9000, dmg: 60,
    boss: true, invulnerable: true, heelWindow: { every: 5200, dur: 1400 },
    title: '刀槍不入 · 唯有腳踝顯露的瞬間可傷',
  },
  agamemnon: {
    name: '阿伽門農', tex: 'E_agamemnon', scale: 1.25,
    hp: 4200, spd: 40, gold: 220, score: 6000, dmg: 45,
    boss: true, summon: { every: 3500, type: 'soldier', n: 3 },
    title: '萬王之王 · 不斷召喚援兵',
  },
  odysseus: {
    name: '奧德修斯', tex: 'E_odysseus', scale: 1.18,
    hp: 3800, spd: 59, gold: 260, score: 7000, dmg: 50,
    boss: true, stealth: { every: 4200, dur: 2600 },
    title: '詭計之王 · 潛行時無法被鎖定，祭司光環可顯形',
  },
  horse: {
    name: '特洛伊木馬', tex: 'B_horse', scale: 2.30,
    hp: 24000, spd: 0, gold: 0, score: 30000, dmg: 0,
    boss: true, structure: true,
    title: '希臘人的「獻禮」',
  },
};
