// 防守特洛伊 v4 — 進入點
window.addEventListener('load', () => {
  window.gameV4 = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#12100E',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: LAYOUT_V4.W,
      height: LAYOUT_V4.H,
    },
    scene: [BootV4, TitleV4, GameV4],
  });
});
