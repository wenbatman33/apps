/**
 * Phaser 設定 — portrait 720x1280, FIT scale, 桌機與手機共用
 */
window.addEventListener('load', () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0b0e1a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 720,
      height: 1280,
    },
    render: { pixelArt: false, antialias: true },
    scene: [PreloadScene, LandingScene, GameScene, UIScene, PopupScene],
  };
  window.GAME = new Phaser.Game(config);

  // 任何 user gesture 都嘗試初始化 audio context
  const kick = () => { try { MSAudio.ensureCtx(); } catch (e) {} };
  window.addEventListener('pointerdown', kick, { once: true });
  window.addEventListener('keydown', kick, { once: true });
});
