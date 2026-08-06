/* 進入點 */
(function () {
  // 套用 DEV 工具存下的版面
  try {
    const saved = localStorage.getItem('troyDefense.layout');
    if (saved) {
      const j = JSON.parse(saved);
      Object.keys(j).forEach(sec => {
        if (!TD.LAYOUT[sec]) return;
        Object.keys(j[sec]).forEach(k => {
          const d = Object.getOwnPropertyDescriptor(TD.LAYOUT[sec], k);
          if (d && d.get) return;               // 跳過計算屬性（如 wall.x）
          TD.LAYOUT[sec][k] = j[sec][k];
        });
      });
      console.info('[TD] 已套用 DEV 存檔版面');
    }
  } catch (e) { console.warn('[TD] 版面存檔讀取失敗', e); }

  const config = {
    type: Phaser.AUTO,
    parent: 'app',
    width: TD.GAME_W,
    height: TD.GAME_H,
    backgroundColor: '#2FA8E0',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 3 },
    scene: [TD.BootScene, TD.TitleScene, TD.CodexScene, TD.GameScene],
  };

  TD.game = new Phaser.Game(config);

  // 首次觸控解鎖音訊
  const unlock = () => { TD.audio.init(); TD.audio.resume(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
})();
