// 圖像資源集中載入。檔案若還沒生成也不會報錯（Phaser 只印警告），
// 使用端一律先用 this.textures.exists(key) 判斷，缺圖時退回純文字/圖形。

(function () {
  const IMAGES = [
    { key: 'title', url: 'assets/title.png' },
    { key: 'avatar_a', url: 'assets/avatar_a.png' },
    { key: 'avatar_b', url: 'assets/avatar_b.png' },
    { key: 'avatar_c', url: 'assets/avatar_c.png' }
  ];

  // 對手座位 1/2/3 對應的頭像 key
  const SEAT_AVATAR = [null, 'avatar_a', 'avatar_b', 'avatar_c'];

  // 音效（來源：小森平 taira-komori.net 免費音效）
  // key → 檔名，語意化命名，播放時用 key
  const SOUNDS = [
    { key: 'sfx_deal', url: 'assets/sfx/shuffling_cards.mp3' },
    { key: 'sfx_play', url: 'assets/sfx/dealing_cards1.mp3' },
    { key: 'sfx_select', url: 'assets/sfx/select01.mp3' },
    { key: 'sfx_button', url: 'assets/sfx/button01a.mp3' },
    { key: 'sfx_pass', url: 'assets/sfx/poka01.mp3' },
    { key: 'sfx_turn', url: 'assets/sfx/blip03.mp3' },
    { key: 'sfx_win', url: 'assets/sfx/powerup01.mp3' },
    { key: 'sfx_lose', url: 'assets/sfx/powerdown01.mp3' },
    { key: 'sfx_finish', url: 'assets/sfx/powerup02.mp3' },
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

  window.BigTwoAssets = { load, SEAT_AVATAR, SOUNDS };
})();
