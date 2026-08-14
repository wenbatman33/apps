/* ============================================================
 * 敵人（喪屍）定義表
 * kind: melee 貼身 / ranged 遠程 / suicide 自爆 / summon 召喚
 * ============================================================ */
(function (H) {
  'use strict';

  H.ENEMY = {
    walker: {
      name: '行屍', kind: 'melee', r: 26, hp: 30, dmg: 8, speed: 62,
      body: 0x7d9b62, head: 0x9ab87c, dark: 0x4a6138, xp: 1,
    },
    crawler: {
      name: '爬屍', kind: 'melee', r: 19, hp: 16, dmg: 6, speed: 108,
      body: 0x8f7d5a, head: 0xb09a73, dark: 0x5b4d33, xp: 1,
    },
    runner: {
      name: '狂奔屍', kind: 'melee', r: 24, hp: 26, dmg: 11, speed: 150,
      body: 0xa25f5f, head: 0xc27b78, dark: 0x6b3636, xp: 2, charge: true,
    },
    spitter: {
      name: '吐酸屍', kind: 'ranged', r: 26, hp: 34, dmg: 10, speed: 52,
      body: 0x6fa06b, head: 0x8fc98a, dark: 0x3f6b3d, xp: 2,
      shootRange: 430, shootCd: 1750, projSpeed: 300, projR: 11, projColor: 0x9dff5c,
      keepDist: 300,
    },
    bloater: {
      name: '爆裂屍', kind: 'suicide', r: 32, hp: 55, dmg: 26, speed: 74,
      body: 0x8a6f9c, head: 0xa98bbd, dark: 0x53406b, xp: 3,
      blastR: 130, fuse: 480,
    },
    brute: {
      name: '暴屍', kind: 'melee', r: 40, hp: 160, dmg: 20, speed: 48,
      body: 0x6b6f7d, head: 0x8a8f9e, dark: 0x3e424d, xp: 5, knockResist: 0.75,
    },
    necro: {
      name: '屍巫', kind: 'summon', r: 29, hp: 90, dmg: 12, speed: 58,
      body: 0x4d4a7a, head: 0x6f6ba6, dark: 0x2e2c50, xp: 5,
      summon: 'crawler', summonCd: 3200, summonN: 2, keepDist: 340,
    },
    armored: {
      name: '裝甲屍', kind: 'melee', r: 34, hp: 220, dmg: 22, speed: 66,
      body: 0x5a6b52, head: 0x7b8c6e, dark: 0x33402d, xp: 6,
      armor: 4, knockResist: 0.85,
    },

    // ---------- BOSS ----------
    tank_boss: {
      name: '重甲屍王', kind: 'boss', r: 62, hp: 900, dmg: 30, speed: 52,
      body: 0x7a6a55, head: 0x9c8a70, dark: 0x463c2f, xp: 40, boss: true,
      knockResist: 1, slamCd: 3000, slamR: 190,
    },
    horde_boss: {
      name: '群屍之母', kind: 'boss', r: 56, hp: 760, dmg: 22, speed: 62,
      body: 0x8a5f7a, head: 0xb07f9c, dark: 0x522f47, xp: 40, boss: true,
      knockResist: 1, summon: 'runner', summonCd: 3400, summonN: 4,
    },
    spitter_boss: {
      name: '劇毒母體', kind: 'boss', r: 58, hp: 820, dmg: 24, speed: 46,
      body: 0x5f9a5c, head: 0x86c47f, dark: 0x33622f, xp: 45, boss: true,
      knockResist: 1, shootRange: 700, shootCd: 1300, projSpeed: 330, projR: 15,
      projColor: 0x9dff5c, spread: 5, keepDist: 340,
    },
    butcher_boss: {
      name: '屠夫', kind: 'boss', r: 60, hp: 1050, dmg: 34, speed: 78,
      body: 0x9c4a4a, head: 0xc06d68, dark: 0x5e2626, xp: 50, boss: true,
      knockResist: 1, dashCd: 2600, dashSpeed: 520,
    },
    necro_boss: {
      name: '腐化祭司', kind: 'boss', r: 56, hp: 980, dmg: 26, speed: 56,
      body: 0x4a4790, head: 0x6f6bc0, dark: 0x2b2960, xp: 50, boss: true,
      knockResist: 1, summon: 'spitter', summonCd: 4200, summonN: 3,
      shootRange: 620, shootCd: 1900, projSpeed: 290, projR: 13, projColor: 0xb07dff, spread: 3,
    },
    mutant_boss: {
      name: '究極變異體', kind: 'boss', r: 68, hp: 1500, dmg: 36, speed: 70,
      body: 0x8f9c3f, head: 0xb8c85c, dark: 0x555f22, xp: 70, boss: true,
      knockResist: 1, dashCd: 3200, dashSpeed: 480, slamCd: 4200, slamR: 210,
      shootRange: 640, shootCd: 2300, projSpeed: 320, projR: 14, projColor: 0xd4ff5c, spread: 7,
    },
    warlord_boss: {
      name: '喪屍領主', kind: 'boss', r: 74, hp: 2400, dmg: 42, speed: 74,
      body: 0x8c2f2f, head: 0xc25050, dark: 0x4d1717, xp: 120, boss: true, final: true,
      knockResist: 1, dashCd: 2800, dashSpeed: 560, slamCd: 3600, slamR: 240,
      summon: 'armored', summonCd: 5200, summonN: 3,
      shootRange: 720, shootCd: 1700, projSpeed: 340, projR: 16, projColor: 0xff6b3d, spread: 9,
    },
  };

  H.enemyDef = function (t) { return H.ENEMY[t] || H.ENEMY.walker; };
})(window.HABBY);
