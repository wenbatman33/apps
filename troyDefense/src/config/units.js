/* 兵種、階級成長、戰術融合配方 */
window.TD = window.TD || {};

TD.MAX_LV = 6;

// ── 五大兵系 ──
TD.KINDS = {
  archer: {
    name: '弓兵', icon: '🏹', tint: 0x6EC6FF, target: 'single',
    tex: { 1: 'T_archer_1', 3: 'T_archer_3', 6: 'T_archer_6' },
    lvNames: ['民兵弓手', '城衛弓兵', '精銳射手', '王家弓衛', '阿波羅祭弓', '神眷射手'],
    base: { dmg: 15, cd: 850, range: 430 },
    desc: '射程最遠的單體高頻輸出',
  },
  spear: {
    name: '長矛', icon: '🗡', tint: 0xFFB74D, target: 'pierce',
    tex: { 1: 'T_spear_1', 3: 'T_spear_3', 6: 'T_spear_6' },
    lvNames: ['民兵矛手', '城衛矛兵', '王家矛衛', '青銅矛陣', '聖矛衛隊', '聖矛守護者'],
    base: { dmg: 34, cd: 1450, range: 280 },
    desc: '直線貫穿，一擊命中路徑上所有敵人',
  },
  stone: {
    name: '投石', icon: '🪨', tint: 0xA1887F, target: 'aoe',
    tex: { 1: 'T_stone_1', 3: 'T_stone_3', 6: 'T_stone_6' },
    lvNames: ['投石兵', '投石小隊', '城防投石機', '重型投石機', '烈焰投石機', '希臘火投石機'],
    base: { dmg: 52, cd: 2300, range: 580, aoe: 120 },
    desc: '緩慢但範圍濺射，落地震屏',
  },
  oil: {
    name: '熱油', icon: '🔥', tint: 0xFF7043, target: 'cone',
    tex: { 1: 'T_oil_1', 3: 'T_oil_3', 6: 'T_oil_6' },
    lvNames: ['熱油兵', '油罐陣地', '油鍋陣地', '沸油壁壘', '烈焰油瀑', '煉獄油瀑'],
    base: { dmg: 11, cd: 500, range: 250, burn: 6 },
    desc: '城牆前扇形灼燒，附帶持續燃燒',
  },
  priest: {
    name: '祭司', icon: '🕊', tint: 0xCE93D8, target: 'aura',
    tex: { 1: 'T_priest_1', 3: 'T_priest_3', 6: 'T_priest_6' },
    lvNames: ['祭司', '神殿侍祭', '神殿祭司', '祭司長', '神諭祭司', '神諭大祭司'],
    base: { dmg: 0, cd: 0, range: 340, buff: 0.22, slow: 0.18 },
    desc: '光環增傷友軍、詛咒減速敵人',
  },
};

// ── 融合產物（異種合成）──
TD.FUSED = {
  fireArrow: {
    name: '火矢台', icon: '🔥🏹', tint: 0xFF8A65, target: 'single',
    tex: { 1: 'T_archer_6' }, lvNames: ['火矢台'],
    base: { dmg: 42, cd: 780, range: 460, burn: 8 }, fused: true,
    desc: '箭矢附帶燃燒，可引爆地面油池',
  },
  ballista: {
    name: '攻城弩', icon: '⚔', tint: 0xFFE066, target: 'single', footprint: 2,
    tex: { 1: 'F_ballista' }, lvNames: ['攻城弩'],
    base: { dmg: 150, cd: 2000, range: 700, knock: 90 }, fused: true,
    desc: '超遠程單體巨傷並擊退',
  },
  oracleBow: {
    name: '神諭弓陣', icon: '✨🏹', tint: 0xB39DDB, target: 'aura',
    tex: { 1: 'T_priest_6' }, lvNames: ['神諭弓陣'],
    base: { dmg: 0, cd: 0, range: 999, buff: 0.30, rateBuff: 0.30 }, fused: true,
    desc: '全場弓兵射速 +30%、傷害 +30%',
  },
  greekFire: {
    name: '希臘火投石機', icon: '💥', tint: 0x69F0AE, target: 'aoe', footprint: 2,
    tex: { 1: 'F_greekfire' }, lvNames: ['希臘火投石機'],
    base: { dmg: 90, cd: 2600, range: 620, aoe: 150, pool: 8000 }, fused: true,
    desc: '落點形成持續 8 秒的火海',
  },
  holySpear: {
    name: '聖矛陣', icon: '⚡', tint: 0xFFF176, target: 'pierce',
    tex: { 1: 'T_spear_6' }, lvNames: ['聖矛陣'],
    base: { dmg: 80, cd: 1200, range: 320, bossMul: 3 }, fused: true,
    desc: '對英雄級敵人傷害 ×3',
  },
};

// 統一查表
TD.getKind = (k) => TD.KINDS[k] || TD.FUSED[k];
TD.isFused = (k) => !!TD.FUSED[k];

// ── 融合配方：key 為「兩種類排序後 + 等級」──
TD.FUSIONS = [
  { a: 'archer', b: 'oil',    lv: 3, out: 'fireArrow' },
  { a: 'spear',  b: 'stone',  lv: 3, out: 'ballista' },
  { a: 'archer', b: 'priest', lv: 3, out: 'oracleBow' },
  { a: 'stone',  b: 'oil',    lv: 4, out: 'greekFire' },
  { a: 'spear',  b: 'priest', lv: 4, out: 'holySpear' },
];

TD.findFusion = (k1, lv1, k2, lv2) => {
  if (lv1 !== lv2) return null;
  return TD.FUSIONS.find(f =>
    (f.a === k1 && f.b === k2 || f.a === k2 && f.b === k1) && f.lv === lv1) || null;
};

// ── 等級成長 ──
TD.GROWTH = 1.78;
TD.statsOf = (kind, lv) => {
  const K = TD.getKind(kind);
  if (!K) return null;
  const m = Math.pow(TD.GROWTH, lv - 1);
  const b = K.base;
  return {
    dmg: Math.round((b.dmg || 0) * m),
    cd: Math.max(120, Math.round((b.cd || 1000) / (1 + (lv - 1) * 0.09))),
    range: Math.round((b.range || 300) * (1 + (lv - 1) * 0.05)),
    aoe: b.aoe ? Math.round(b.aoe * (1 + (lv - 1) * 0.08)) : 0,
    burn: b.burn ? +(b.burn * m).toFixed(1) : 0,
    buff: b.buff ? +(b.buff * (1 + (lv - 1) * 0.25)).toFixed(2) : 0,
    rateBuff: b.rateBuff || 0,
    slow: b.slow ? +(b.slow * (1 + (lv - 1) * 0.2)).toFixed(2) : 0,
    knock: b.knock || 0,
    bossMul: b.bossMul || 1,
    pool: b.pool || 0,
  };
};

// 取該階要用的貼圖 key（沒有專屬圖就往下找最近的）
TD.texOf = (kind, lv) => {
  const K = TD.getKind(kind);
  if (!K) return null;
  for (let l = lv; l >= 1; l--) if (K.tex[l]) return K.tex[l];
  return K.tex[Object.keys(K.tex)[0]];
};

TD.nameOf = (kind, lv) => {
  const K = TD.getKind(kind);
  return (K.lvNames && K.lvNames[Math.min(lv, K.lvNames.length) - 1]) || K.name;
};

// ── 單塔升級／賣出 ──
TD.upgradeCost = (lv) => Math.round(70 * Math.pow(1.78, lv - 1));
TD.sellValue = (lv) => Math.round(46 * (Math.pow(1.78, lv) - 1) / 0.78 * 0.65);

// ── 目標優先權 ──
TD.PRIORITIES = [
  { key: 'first',  name: '最前方', desc: '離城門最近的敵人' },
  { key: 'strong', name: '血最多', desc: '優先集火硬目標' },
  { key: 'weak',   name: '血最少', desc: '快速清場、串連擊' },
  { key: 'near',   name: '最靠近', desc: '離這座塔最近的敵人' },
];

// ── 佔位大小：1 = 一格，2 = 2×2 四格 ──
TD.footprintOf = (kind, lv, giant) => {
  if (giant) return 2;
  const K = TD.getKind(kind);
  if (K && K.footprint) return K.footprint;
  return 1;
};

// ── 巨人化：Lv6 專屬的終極升級，變強但吃掉 4 格 ──
TD.GIANT = {
  cost: 520,
  dmgMul: 2.2,
  rangeMul: 1.25,
  rateMul: 1.15,
  desc: '傷害 ×2.2、射程 +25%、攻速 +15%，但佔用 2×2 四格',
};

// ── 路障：純擋路、不攻擊，用來把敵人導向你要的路線 ──
TD.BARRICADE = {
  name: '路障', tex: 'U_barricade',
  baseCost: 35,      // 首個價格
  step: 14,          // 每放一個漲價
  sellRate: 0.7,     // 賣出返還比例
  max: 14,           // 每關上限，避免整場鋪滿
};
TD.barricadeCost = (n) => TD.BARRICADE.baseCost + n * TD.BARRICADE.step;

// ── 徵兵 ──
TD.RECRUIT_BASE = 50;
TD.RECRUIT_STEP = 6;        // 每次徵兵漲價
TD.RECRUIT_POOL = ['archer', 'archer', 'spear', 'spear', 'stone', 'oil', 'priest'];
