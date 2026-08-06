/* 英雄：每關可帶 2 位 */
window.TD = window.TD || {};

TD.HEROES = {
  hector: {
    name: '赫克托爾', title: '特洛伊之盾', tex: 'H_hector', unlock: 1,
    skill: { name: '守護之怒', effect: 'aegis', cd: 32000, dur: 6000,
             desc: '城牆前展開金光壁壘，6 秒內完全格擋' },
    passive: { name: '城牆 HP +25%', effect: 'wallHp', v: 0.25 },
    color: 0xFFE066,
  },
  paris: {
    name: '帕里斯', title: '命運之箭', tex: 'H_paris', unlock: 1,
    skill: { name: '阿波羅之引', effect: 'fateArrow', cd: 28000,
             desc: '三發神箭貫穿全場，優先射向血量最高者' },
    passive: { name: '弓兵暴擊 +15%', effect: 'archerCrit', v: 0.15 },
    color: 0x81D4FA,
  },
  cassandra: {
    name: '卡珊德拉', title: '不被相信的預言', tex: 'H_cassandra', unlock: 3,
    skill: { name: '預視', effect: 'foresee', cd: 26000, dur: 7000,
             desc: '全場敵人減速 40%，並預告接下來的波次' },
    passive: { name: '波次準備時間 +5 秒', effect: 'prepTime', v: 5 },
    color: 0xCE93D8,
  },
  aeneas: {
    name: '埃涅阿斯', title: '未來的火種', tex: 'H_aeneas', unlock: 5,
    skill: { name: '血脈不絕', effect: 'revive', cd: 99000,
             desc: '城牆破碎時自動免死一次並回復 20%' },
    passive: { name: '開場 +200 金幣', effect: 'startGold', v: 200 },
    color: 0xFF8A65,
  },
  penthesilea: {
    name: '彭忒西勒亞', title: '亞馬遜女王', tex: 'H_penthesilea', unlock: 8,
    skill: { name: '狂戰衝鋒', effect: 'charge', cd: 30000,
             desc: '騎兵橫掃三條路徑，擊退並重創所有敵人' },
    passive: { name: '擊殺金幣 +20%', effect: 'goldGain', v: 0.20 },
    color: 0xFFAB91,
  },
  memnon: {
    name: '門農', title: '黎明之子', tex: 'H_hector', unlock: 8,
    skill: { name: '曙光審判', effect: 'dawn', cd: 34000,
             desc: '天降光柱，對全場造成無視護甲的真實傷害' },
    passive: { name: '神恩累積 +30%', effect: 'manaGain', v: 0.30 },
    color: 0xFFF176,
  },
  priam: {
    name: '普里阿摩斯', title: '老王的懇求', tex: 'H_hector', unlock: 6,
    skill: { name: '王之號令', effect: 'rally', cd: 30000, dur: 10000,
             desc: '全塔攻速 +80%，持續 10 秒' },
    passive: { name: '徵兵費用 -15%', effect: 'recruitCost', v: -0.15 },
    color: 0xFFC72C,
  },
};

TD.heroList = () => Object.keys(TD.HEROES);
