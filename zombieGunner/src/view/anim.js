/* ============================================================
 * AI 生成的俯視角 sprite 動畫接入層
 * 素材未就緒時自動退回程式生成的靜態貼圖，遊戲照常可玩
 * ============================================================ */
(function (H) {
  'use strict';

  // atlas 名稱 → 動畫設定（素材位於 assets/anim/<key>/<key>.png|json）
  H.ANIM_DEFS = [
    { key: 'player_walk', anim: 'p_walk', frames: 6, rate: 13, repeat: -1 },
    { key: 'player_shoot', anim: 'p_shoot', frames: 6, rate: 20, repeat: 0 },
    { key: 'zombie_walk', anim: 'z_walk', frames: 6, rate: 8, repeat: -1 },
    { key: 'zombie_runner', anim: 'z_run', frames: 6, rate: 15, repeat: -1 },
    { key: 'zombie_brute', anim: 'z_brute', frames: 6, rate: 6, repeat: -1 },
  ];

  // 敵種 → 使用哪組 sprite 動畫（未列出者沿用程式生成貼圖）
  H.ENEMY_ANIM = {
    walker: { key: 'zombie_walk', anim: 'z_walk' },
    crawler: { key: 'zombie_walk', anim: 'z_walk', tint: 0xe0c98f },
    runner: { key: 'zombie_runner', anim: 'z_run' },
    spitter: { key: 'zombie_walk', anim: 'z_walk', tint: 0x8fe07a },
    bloater: { key: 'zombie_brute', anim: 'z_brute', tint: 0xc79ae0 },
    brute: { key: 'zombie_brute', anim: 'z_brute' },
    necro: { key: 'zombie_walk', anim: 'z_walk', tint: 0x9d8fe0 },
    armored: { key: 'zombie_brute', anim: 'z_brute', tint: 0x9fb88a },

    tank_boss: { key: 'zombie_brute', anim: 'z_brute', tint: 0xc9b78f },
    horde_boss: { key: 'zombie_brute', anim: 'z_brute', tint: 0xdba5c8 },
    spitter_boss: { key: 'zombie_brute', anim: 'z_brute', tint: 0x8fe07a },
    butcher_boss: { key: 'zombie_runner', anim: 'z_run', tint: 0xff9d9d },
    necro_boss: { key: 'zombie_brute', anim: 'z_brute', tint: 0xa08fe0 },
    mutant_boss: { key: 'zombie_brute', anim: 'z_brute', tint: 0xd8e07a },
    warlord_boss: { key: 'zombie_brute', anim: 'z_brute', tint: 0xff7a6b },
  };

  H.Anim = {
    /** BootScene preload 期間呼叫 */
    preload: function (sc) {
      H.ANIM_DEFS.forEach(function (d) {
        sc.load.atlas(d.key, 'assets/anim/' + d.key + '/' + d.key + '.png',
          'assets/anim/' + d.key + '/' + d.key + '.json');
      });
    },

    /** 素材載入後建立 Phaser 動畫 */
    create: function (sc) {
      H.ANIM_DEFS.forEach(function (d) {
        if (!sc.textures.exists(d.key) || sc.anims.exists(d.anim)) return;
        sc.anims.create({
          key: d.anim,
          frames: sc.anims.generateFrameNames(d.key, {
            prefix: 'frame_', start: 0, end: d.frames - 1, zeroPad: 3, suffix: '.png',
          }),
          frameRate: d.rate,
          repeat: d.repeat,
        });
      });
    },

    has: function (sc, key) { return sc.textures.exists(key); },

    /** 取得敵種可用的 sprite 動畫設定，沒有就回傳 null */
    forEnemy: function (sc, type) {
      var m = H.ENEMY_ANIM[type];
      if (!m || !sc.textures.exists(m.key)) return null;
      return m;
    },
  };
})(window.HABBY);
