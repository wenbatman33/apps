// 圖像資源集中載入。檔案若還沒生成也不會報錯（Phaser 只印警告），
// 使用端一律先用 this.textures.exists(key) 判斷，缺圖時退回純文字/圖形。

(function () {
  const IMAGES = [
    { key: 'title', url: 'assets/title.png' },
    { key: 'avatar_a', url: 'assets/avatar_a.png' },
    { key: 'avatar_b', url: 'assets/avatar_b.png' },
    { key: 'fx_rocket', url: 'assets/fx_rocket.png' },       // 王炸：大火箭
    { key: 'fx_boom', url: 'assets/fx_boom.png' },           // 炸弹：爆炸图
    { key: 'fx_win_lord', url: 'assets/fx_win_lord.png' },   // 地主获胜：庆祝图
    { key: 'fx_win_farmer', url: 'assets/fx_win_farmer.png' } // 农民获胜：庆祝图
  ];

  // 對手座位 1/2 對應的頭像 key
  const SEAT_AVATAR = [null, 'avatar_a', 'avatar_b'];

  // 音效（來源：小森平 taira-komori.net 免費音效）
  const SOUNDS = [
    { key: 'sfx_deal', url: 'assets/sfx/shuffling_cards.mp3' },
    { key: 'sfx_play', url: 'assets/sfx/dealing_cards1.mp3' },
    { key: 'sfx_select', url: 'assets/sfx/select01.mp3' },
    { key: 'sfx_button', url: 'assets/sfx/button01a.mp3' },
    { key: 'sfx_pass', url: 'assets/sfx/poka01.mp3' },
    { key: 'sfx_turn', url: 'assets/sfx/blip03.mp3' },
    { key: 'sfx_win', url: 'assets/sfx/bright_bell1.mp3' },
    { key: 'sfx_lose', url: 'assets/sfx/blackout_piano1.mp3' },
    { key: 'sfx_finish', url: 'assets/sfx/blackout_harp1.mp3' },
    { key: 'sfx_coin', url: 'assets/sfx/coin01.mp3' }
  ];

  function load(scene) {
    IMAGES.forEach(img => {
      if (!scene.textures.exists(img.key)) scene.load.image(img.key, img.url);
    });
    SOUNDS.forEach(s => {
      if (!scene.cache.audio.exists(s.key)) scene.load.audio(s.key, s.url);
    });
  }

  window.DdzAssets = { load, SEAT_AVATAR, SOUNDS };
})();
