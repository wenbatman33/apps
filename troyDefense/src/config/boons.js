/* 波次間的 3 選 1 增益（每關重新構築，重玩性來源） */
window.TD = window.TD || {};

// 每關開始時初始化
TD.newBoonState = () => ({
  dmgMul: { archer: 1, spear: 1, stone: 1, oil: 1, priest: 1, all: 1 },
  rateMul: 1, rangeMul: 1, aoeMul: 1, burnMul: 1, auraMul: 1,
  critAdd: 0, goldMul: 1, recruitDisc: 0, heroCdMul: 1,
  groundBurn: 0,        // 走道灼燒 dps
  killHeal: 0,          // 每擊殺 N 個回 1 點城牆
  luckyLv2: 0,          // 徵兵直接出 Lv2 的機率
  timeBonus: 1,         // 剩餘時間分倍率
  taken: [],
});

TD.BOONS = [
  // ── 攻擊 ──
  { id: 'archery', name: '弓術精進', icon: '🏹', tag: '攻擊',
    desc: '弓兵傷害 +35%', apply: b => b.dmgMul.archer *= 1.35 },
  { id: 'phalanx', name: '矛陣操練', icon: '🗡', tag: '攻擊',
    desc: '長矛傷害 +40%', apply: b => b.dmgMul.spear *= 1.40 },
  { id: 'ballistics', name: '投石加固', icon: '🪨', tag: '攻擊',
    desc: '投石傷害 +25%、爆炸範圍 +30%',
    apply: b => { b.dmgMul.stone *= 1.25; b.aoeMul *= 1.30; } },
  { id: 'pitch', name: '沸油配方', icon: '🔥', tag: '攻擊',
    desc: '熱油燃燒傷害翻倍', apply: b => b.burnMul *= 2 },
  { id: 'oracle', name: '神諭祝福', icon: '🕊', tag: '攻擊',
    desc: '祭司光環效果 +60%', apply: b => b.auraMul *= 1.6 },
  { id: 'sharpen', name: '銳利箭簇', icon: '✨', tag: '攻擊',
    desc: '全體暴擊率 +18%', apply: b => b.critAdd += 0.18 },
  { id: 'drill', name: '連射訓練', icon: '⚡', tag: '攻擊',
    desc: '全塔射速 +22%', apply: b => b.rateMul *= 1.22 },
  { id: 'watchtower', name: '遠望塔樓', icon: '🔭', tag: '攻擊',
    desc: '全塔射程 +20%', apply: b => b.rangeMul *= 1.20 },
  { id: 'warcry', name: '全軍突擊', icon: '📯', tag: '攻擊',
    desc: '全兵種傷害 +18%', apply: b => b.dmgMul.all *= 1.18 },

  // ── 經濟 ──
  { id: 'loot', name: '戰利品', icon: '💰', tag: '經濟',
    desc: '擊殺金幣 +35%', apply: b => b.goldMul *= 1.35 },
  { id: 'conscript', name: '徵兵改革', icon: '📜', tag: '經濟',
    desc: '徵兵費用 -25%', apply: b => b.recruitDisc += 0.25 },
  { id: 'treasury', name: '城邦稅收', icon: '🏛', tag: '經濟',
    desc: '立即獲得 400 金幣', instant: (gs) => { gs.gold += 400; } },
  { id: 'elite', name: '精兵政策', icon: '🎖', tag: '經濟',
    desc: '徵兵有 45% 機率直接出 Lv2', apply: b => b.luckyLv2 += 0.45 },

  // ── 城防 ──
  { id: 'masonry', name: '加厚城牆', icon: '🧱', tag: '城防',
    desc: '城牆上限 +35，並補滿這 35 點',
    instant: (gs) => { gs.wallMax += 35; gs.wallHp += 35; } },
  { id: 'mend', name: '城牆修補', icon: '🛠', tag: '城防',
    desc: '每擊殺 8 個敵人回復 1 點城牆', apply: b => b.killHeal += 8 },
  { id: 'grace', name: '神恩庇佑', icon: '🌟', tag: '城防',
    desc: '英雄技能冷卻 -28%', apply: b => b.heroCdMul *= 0.72 },

  // ── 特殊 ──
  { id: 'camp', name: '擴建營地', icon: '⛺', tag: '特殊',
    desc: '合成台增加一整列',
    instant: (gs) => { TD.LAYOUT.bench.rows += 1; gs.relayout(); } },
  { id: 'veterans', name: '老兵歸隊', icon: '🛡', tag: '特殊',
    desc: '立即獲得 2 名 Lv3 守軍',
    instant: (gs) => {
      for (let i = 0; i < 2; i++) {
        const k = TD.RECRUIT_POOL[Phaser.Math.Between(0, TD.RECRUIT_POOL.length - 1)];
        gs.addUnit(k, 3);
      }
    } },
  { id: 'scorched', name: '焦土戰術', icon: '🔥', tag: '特殊',
    desc: '敵人走過的走道會持續灼燒（每秒 14 傷害）',
    apply: b => b.groundBurn += 14 },
  { id: 'haste', name: '兵貴神速', icon: '⏱', tag: '特殊',
    desc: '剩餘時間分數 ×1.6', apply: b => b.timeBonus *= 1.6 },
];

/** 抽 n 張不重複、且未取過的 */
TD.rollBoons = (state, n = 3) => {
  const pool = TD.BOONS.filter(b => {
    if (!state.taken.includes(b.id)) return true;
    return !b.instant && !['camp', 'treasury', 'masonry', 'veterans'].includes(b.id);
  });
  const picked = [];
  const bag = pool.slice();
  while (picked.length < n && bag.length) {
    picked.push(bag.splice(Phaser.Math.Between(0, bag.length - 1), 1)[0]);
  }
  return picked;
};
