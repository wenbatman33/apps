// 遊戲主設定：直屏 9:16，自適應縮放
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0a12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 540,
    height: 960
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [GameScene, UpgradeScene, UIScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
