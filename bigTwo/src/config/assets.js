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

  // 音效來源：
  //  - 牌/籌碼類：Kenney casino-audio（CC0，見 assets/sfx/kenney/License.txt）
  //  - 勝負/介面：小森平 taira-komori.net 免費音效
  // 一個語意 key 可對應多個檔案（變體），播放時隨機挑一個，避免連續聽到同一聲。
  const K = 'assets/sfx/kenney/';
  const SOUNDS = [
    // 洗牌／發牌
    { key: 'sfx_deal', urls: [K + 'card-shuffle.mp3'] },
    // 出牌：牌落桌（4 變體）
    { key: 'sfx_play', urls: [K + 'card-place-1.mp3', K + 'card-place-2.mp3', K + 'card-place-3.mp3', K + 'card-place-4.mp3'] },
    // 選牌：抽牌摩擦聲（8 變體，最常觸發所以變體最多）
    { key: 'sfx_select', urls: [K + 'card-slide-1.mp3', K + 'card-slide-2.mp3', K + 'card-slide-3.mp3', K + 'card-slide-4.mp3', K + 'card-slide-5.mp3', K + 'card-slide-6.mp3', K + 'card-slide-7.mp3', K + 'card-slide-8.mp3'] },
    // 不要（PASS）：把牌推出去
    { key: 'sfx_pass', urls: [K + 'card-shove-1.mp3', K + 'card-shove-2.mp3', K + 'card-shove-3.mp3', K + 'card-shove-4.mp3'] },
    // 攤牌／整理手牌
    { key: 'sfx_fan', urls: [K + 'card-fan-1.mp3', K + 'card-fan-2.mp3'] },
    // 計分：籌碼
    { key: 'sfx_coin', urls: [K + 'chip-lay-1.mp3', K + 'chip-lay-2.mp3', K + 'chip-lay-3.mp3'] },
    { key: 'sfx_chips', urls: [K + 'chips-stack-1.mp3', K + 'chips-stack-2.mp3', K + 'chips-stack-3.mp3', K + 'chips-handle-1.mp3', K + 'chips-handle-2.mp3'] },
    // 介面／勝負（維持原素材）
    { key: 'sfx_button', urls: ['assets/sfx/button01a.mp3'] },
    { key: 'sfx_turn', urls: ['assets/sfx/blip03.mp3'] },
    { key: 'sfx_win', urls: ['assets/sfx/bright_bell1.mp3'] },
    { key: 'sfx_lose', urls: ['assets/sfx/blackout_piano1.mp3'] },
    { key: 'sfx_finish', urls: ['assets/sfx/blackout_harp1.mp3'] }
  ];

  // 語意 key → 實際載入的 Phaser key 清單（單一檔就是 key 本身，多變體為 key#0、key#1…）
  const POOLS = {};
  SOUNDS.forEach(s => {
    POOLS[s.key] = s.urls.map((_, i) => (s.urls.length === 1 ? s.key : s.key + '#' + i));
  });

  function load(scene) {
    IMAGES.forEach(img => {
      if (!scene.textures.exists(img.key)) scene.load.image(img.key, img.url);
    });
    SOUNDS.forEach(s => {
      s.urls.forEach((url, i) => {
        const k = POOLS[s.key][i];
        if (!scene.cache.audio.exists(k)) scene.load.audio(k, url);
      });
    });
  }

  window.BigTwoAssets = { load, SEAT_AVATAR, SOUNDS, POOLS };
})();
