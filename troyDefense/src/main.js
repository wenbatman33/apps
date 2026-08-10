/* v2 進入點 */
(function () {
  // 套用 DEV 工具存下的版面/特效參數
  try {
    const saved = localStorage.getItem('troyDefense.layout.v2');
    if (saved) {
      const j = JSON.parse(saved);
      const merge = (dst, src) => Object.keys(src || {}).forEach(k => {
        if (typeof src[k] === 'object' && dst[k]) merge(dst[k], src[k]);
        else if (dst[k] !== undefined) dst[k] = src[k];
      });
      merge(TD.LAYOUT, j.LAYOUT);
      merge(TD.FXP, j.FXP);
      console.info('[TD] 已套用 DEV 存檔參數');
    }
  } catch (e) { console.warn('[TD] 參數存檔讀取失敗', e); }

  const config = {
    type: Phaser.AUTO,
    parent: 'app',
    width: TD.GAME_W,
    height: TD.GAME_H,
    backgroundColor: '#14100C',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 3 },
    scene: [TD.BootScene, TD.TitleScene, TD.GameScene],
  };

  TD.game = new Phaser.Game(config);

  // 首次觸控解鎖音訊
  const unlock = () => { TD.audio.init(); TD.audio.resume(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
})();
