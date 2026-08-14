/* ============================================================
 * 三大章節 × 50 小關 的主題與關卡生成
 * ============================================================ */
(function (H) {
  'use strict';

  H.CHAPTERS = [
    {
      id: 1,
      name: '第一章 · 淪陷街區',
      sub: 'DOWNTOWN OUTBREAK',
      // 場景配色
      ground: 0x3d4453, groundAlt: 0x474f61, grid: 0x59627a,
      accent: 0xff8a3d, fog: 0x1a1d24,
      propTint: 0x8494ad,
      // 出場敵種（依關卡深度逐步解鎖）
      pool: [
        { t: 'walker', from: 1 },
        { t: 'crawler', from: 4 },
        { t: 'runner', from: 8 },
        { t: 'spitter', from: 14 },
        { t: 'bloater', from: 22 },
        { t: 'brute', from: 32 },
      ],
      bosses: ['tank_boss', 'horde_boss', 'tank_boss', 'spitter_boss', 'butcher_boss'],
    },
    {
      id: 2,
      name: '第二章 · 汙染實驗室',
      sub: 'BIOHAZARD LAB',
      ground: 0x28423f, groundAlt: 0x2f4f4c, grid: 0x3d6360,
      accent: 0x3dffb0, fog: 0x101c1c,
      propTint: 0x6d9694,
      pool: [
        { t: 'walker', from: 1 },
        { t: 'runner', from: 1 },
        { t: 'crawler', from: 3 },
        { t: 'spitter', from: 6 },
        { t: 'bloater', from: 10 },
        { t: 'brute', from: 16 },
        { t: 'necro', from: 24 },
      ],
      bosses: ['spitter_boss', 'necro_boss', 'butcher_boss', 'necro_boss', 'mutant_boss'],
    },
    {
      id: 3,
      name: '第三章 · 軍事禁區',
      sub: 'MILITARY QUARANTINE',
      ground: 0x3d322c, groundAlt: 0x483a32, grid: 0x5c483d,
      accent: 0xff4d4d, fog: 0x1c1512,
      propTint: 0x94766a,
      pool: [
        { t: 'runner', from: 1 },
        { t: 'walker', from: 1 },
        { t: 'spitter', from: 2 },
        { t: 'crawler', from: 4 },
        { t: 'bloater', from: 7 },
        { t: 'brute', from: 10 },
        { t: 'necro', from: 15 },
        { t: 'armored', from: 20 },
      ],
      bosses: ['butcher_boss', 'mutant_boss', 'necro_boss', 'mutant_boss', 'warlord_boss'],
    },
  ];

  H.LEVELS_PER_CHAPTER = 50;

  /** 全域關卡序號 1..150 */
  H.globalLevel = function (ch, lv) { return (ch - 1) * H.LEVELS_PER_CHAPTER + lv; };

  /**
   * 產生單一關卡的完整資料
   * @param {number} ch 章節 1..3
   * @param {number} lv 章節內關卡 1..50
   */
  H.buildLevel = function (ch, lv) {
    var chap = H.CHAPTERS[ch - 1];
    var g = H.globalLevel(ch, lv);
    var boss = H.isBoss(lv);
    var elite = H.isElite(lv);

    // 依關卡深度過濾可用敵種
    var avail = chap.pool.filter(function (p) { return lv >= p.from; }).map(function (p) { return p.t; });
    if (!avail.length) avail = ['walker'];

    var total = boss ? Math.floor(H.BALANCE.count(g) * 0.45) : H.BALANCE.count(g);
    if (elite) total = Math.floor(total * 1.15);

    // 波次：每波 3~7 隻，血量倍率沿用全域曲線
    var waves = [];
    var perWave = Math.min(8, 3 + Math.floor(lv / 12));
    var left = total;
    var rngSeed = g * 7919;
    function rnd() { rngSeed = (rngSeed * 1103515245 + 12345) & 0x7fffffff; return rngSeed / 0x7fffffff; }

    while (left > 0) {
      var n = Math.min(left, perWave + Math.floor(rnd() * 3));
      var list = [];
      for (var i = 0; i < n; i++) {
        // 後期敵種權重提高
        var idx = Math.floor(Math.pow(rnd(), 0.75) * avail.length);
        list.push(avail[Math.min(idx, avail.length - 1)]);
      }
      waves.push(list);
      left -= n;
    }

    return {
      chapter: ch,
      level: lv,
      global: g,
      theme: chap,
      isBoss: boss,
      isElite: elite,
      boss: boss ? chap.bosses[Math.floor((lv - 1) / 10) % chap.bosses.length] : null,
      waves: waves,
      hpMul: H.BALANCE.enemyHp(g) * (elite ? 1.25 : 1),
      dmgMul: H.BALANCE.enemyDmg(g) * (elite ? 1.15 : 1),
      spdMul: H.BALANCE.enemySpd(g),
      coin: H.BALANCE.coin(g) * (boss ? 4 : elite ? 2 : 1),
      obstacles: 2 + Math.floor((g % 7) * 0.8),
    };
  };
})(window.HABBY);
