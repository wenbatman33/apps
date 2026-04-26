// Phaser 3 入口 — 直屏 540 × 1066 (對齊 gameArea.png 比例 988:1950)
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 1066;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0e1a',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    roundPixels: true
  },
  // 不使用 physics — 所有移動 / 碰撞由各 entity 自行手動處理
  scene: [BootScene, MenuScene, GameScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
