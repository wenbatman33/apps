// v4 數值資料：兵種／敵種／關卡波次
const UNITS_V4 = {
  archer: { name: '弓兵',   tex: 'A_archer', color: 0x3E7FA8, range: 920, cd: 900,  dmg: 22, proj: 'arrow' },
  spear:  { name: '長矛兵', tex: 'A_spear',  color: 0x2FA84F, range: 720, cd: 1150, dmg: 34, proj: 'javelin' },
  stone:  { name: '投石兵', tex: 'A_stone',  color: 0x8A6A42, range: 840, cd: 1650, dmg: 30, proj: 'rock', aoe: 120 },
  oil:    { name: '火油兵', tex: 'A_oil',    color: 0xE85C20, range: 660, cd: 1900, dmg: 10, proj: 'pot',
            burn: { dps: 20, dur: 2600, r: 110 } },
  hector: { name: '赫克托爾', tex: 'A_hector_bow', color: 0xC9A227, range: 1050, cd: 520, dmg: 220, proj: 'gold' },
  zeus:     { name: '宙斯祭司',   tex: 'A_zeus',     color: 0x58A8FF, range: 900, cd: 1500, dmg: 46, magic: 'chain' },
  apollo:   { name: '阿波羅祭司', tex: 'A_apollo',   color: 0xFFA020, range: 860, cd: 1700, dmg: 40, magic: 'sun' },
  poseidon: { name: '波塞頓祭司', tex: 'A_poseidon', color: 0x20C0A8, range: 780, cd: 2100, dmg: 34, magic: 'wave' },
  athena:   { name: '雅典娜女祭司', tex: 'A_athena', color: 0xE8E8FF, range: 940, cd: 1300, dmg: 55, magic: 'holy' },
  paris:    { name: '帕里斯', tex: 'A_paris', color: 0x7AE85A, range: 960, cd: 1100, dmg: 30, magic: 'venom' },
};
const UNIT_LV_DMG = lv => Math.pow(2.3, lv - 1);   // 每階攻擊倍率
const HIRE_TYPES = ['archer', 'spear', 'stone', 'oil'];
const DRAFT_TYPES = ['archer', 'spear', 'stone', 'oil', 'zeus', 'apollo', 'poseidon', 'athena', 'paris'];

const ENEMIES_V4 = {
  sword:    { name: '劍盾步兵', tex: 'E_sword',  hp: 70,  speed: 48, gateDmg: 7,  atkCd: 1600, gold: 12, score: 100 },
  torch:    { name: '火把兵',   tex: 'E_torch',  hp: 55,  speed: 60, gateDmg: 11, atkCd: 1500, gold: 14, score: 120, fire: true },
  shield:   { name: '盾龜兵',   tex: 'E_shield', hp: 300, speed: 30, gateDmg: 12, atkCd: 1800, gold: 26, score: 220 },
  diomedes: { name: '狄俄墨得斯', tex: 'E_sword', hp: 1500, speed: 38, gateDmg: 45, atkCd: 1400, gold: 200, score: 1500, scale: 1.65, boss: true },
  giant:    { name: '獨眼巨人', tex: 'E_giant', hp: 2800, speed: 19, gateDmg: 130, atkCd: 2600, gold: 150, score: 1000, scale: 2.3, giant: true },
};

const LEVELS_V4 = [
  {
    id: 1, name: '第 1 關・搶灘之日',
    story: '黑船搶灘。牆會保護我們——目前是。',
    gateHp: 1600, gold: 300, hireCost: 60, hpScale: 0.4,
    waves: [
      { list: [['sword', 30]], interval: 340 },
      { list: [['sword', 45]], interval: 280 },
      { list: [['sword', 60]], interval: 240 },
      { list: [['sword', 75]], interval: 210 },
      { list: [['sword', 90], ['giant', 1]], interval: 185 },
    ],
    waveHpMult: i => 1 + 0.15 * i,   // 波間敵人 HP 遞增
    waveGap: 8000,
  },
  {
    id: 2, name: '第 2 關・第一把火',
    story: '火把兵燒了垛樓。守城不再是旁觀。',
    gateHp: 1800, gold: 320, hireCost: 60, hpScale: 0.4,
    waves: [
      { list: [['sword', 30], ['torch', 8]],  interval: 320 },
      { list: [['sword', 40], ['torch', 15]], interval: 270 },
      { list: [['sword', 50], ['torch', 22]], interval: 230 },
      { list: [['sword', 60], ['torch', 30]], interval: 200 },
      { list: [['sword', 70], ['torch', 36], ['giant', 1]], interval: 180 },
      { list: [['sword', 80], ['torch', 45], ['giant', 2]], interval: 165 },
    ],
    waveHpMult: i => 1.15 * (1 + 0.15 * i),
    waveGap: 8000,
  },
  {
    id: 3, name: '第 3 關・狄俄墨得斯的挑釁',
    story: '他單騎叫陣：「特洛伊的牆，擋得住我嗎？」',
    gateHp: 2000, gold: 340, hireCost: 60, hpScale: 0.4,
    waves: [
      { list: [['sword', 40], ['torch', 12]], interval: 300 },
      { list: [['shield', 8], ['sword', 45]], interval: 260 },
      { list: [['shield', 12], ['torch', 25], ['sword', 50]], interval: 220 },
      { list: [['shield', 16], ['sword', 60], ['torch', 30], ['giant', 1]], interval: 190 },
      { list: [['diomedes', 1], ['sword', 75], ['shield', 14], ['giant', 2]], interval: 170 },
    ],
    waveHpMult: i => 1.35 * (1 + 0.15 * i),
    waveGap: 9000,
  },
];

// 波間三選一卡池（w=權重，can=出現條件，apply=效果）
const CARDS_V4 = [
  { id: 'oilR', icon: '🔥', name: '沸油擴幅', desc: '沸油範圍 +25%', w: 16,
    can: sc => sc.mods.oilStack < 3,
    apply: sc => { sc.mods.oilR *= 1.25; sc.mods.oilStack++; } },
  { id: 'oilDps', icon: '♨', name: '烈焰精煉', desc: '燃燒傷害 +40%', w: 14,
    can: () => true,
    apply: sc => { sc.mods.oilDps *= 1.4; } },
  { id: 'arrows', icon: '🏹', name: '箭雨增幅', desc: '箭雨 +14 支\n傷害 +30', w: 16,
    can: () => true,
    apply: sc => { sc.mods.arrows += 14; sc.mods.arrowDmg += 30; } },
  { id: 'cd', icon: '⏱', name: '冷卻精通', desc: '技能冷卻 −15%', w: 12,
    can: sc => sc.mods.cdMult > 0.55,
    apply: sc => { sc.mods.cdMult *= 0.85; } },
  { id: 'repair', icon: '🔨', name: '城門搶修', desc: '修復 25% 城門耐久', w: 20,
    can: sc => sc.gate.hp < sc.gate.maxHp * 0.9,
    apply: sc => { sc.gate.hp = Math.min(sc.gate.maxHp, sc.gate.hp + sc.gate.maxHp * 0.25); sc.gate.refresh(); } },
];

// 無盡模式（通關戰役後解鎖）
LEVELS_V4.push({
  id: 99, name: '無盡・十年圍城', endless: true,
  story: '沒有勝利，只有撐到最後一刻。',
  gateHp: 2200, gold: 340, hireCost: 60, waveGap: 6000, hpScale: 0.4,
  waveHpMult: i => 1 + 0.12 * i,
});
function genEndlessWave(i) {
  const comp = [['sword', 34 + i * 8]];
  if (i >= 1) comp.push(['torch', 12 + i * 4]);
  if (i >= 3) comp.push(['shield', 3 + i]);
  if (i >= 2 && i % 3 === 2) comp.push(['giant', 1 + Math.floor(i / 8)]);
  if (i > 0 && i % 6 === 5) comp.push(['diomedes', 1 + Math.floor(i / 12)]);
  return { list: comp, interval: Math.max(150, 420 - i * 18) };
}
