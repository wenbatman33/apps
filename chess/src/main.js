// HiDPI 處理：先設 __UI_SCALE__ 再 import 場景，否則場景頂層的 S 讀到 undefined
const DPR = Math.min(window.devicePixelRatio || 1, 2);
window.__UI_SCALE__ = DPR;

const v = '?v=' + (window.__BUILD__ || '');
const [{ default: MenuScene }, { default: DifficultyScene }, { default: GameScene }] = await Promise.all([
  import('./scenes/MenuScene.js' + v),
  import('./scenes/DifficultyScene.js' + v),
  import('./scenes/GameScene.js' + v),
]);

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#14090a',
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * DPR,
    height: window.innerHeight * DPR,
    zoom: 1 / DPR,
  },
  scene: [MenuScene, DifficultyScene, GameScene],
};

// 等字型載入，避免 Phaser 第一次 render 抓到 fallback serif
if (document.fonts && document.fonts.ready) {
  await document.fonts.ready;
}
window.game = new Phaser.Game(config);
