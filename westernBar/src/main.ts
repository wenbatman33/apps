import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { LcdScene } from "./scenes/LcdScene";

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a0f08",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  render: {
    antialias: true,
    antialiasGL: true,
    mipmapFilter: "LINEAR_MIPMAP_LINEAR",
    pixelArt: false,
    roundPixels: false,
    powerPreference: "high-performance",
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene, LcdScene]
});
