import Phaser from 'phaser';
import './styles.css';
import { setupDevPanel } from './devPanel';
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { MenuScene } from './game/scenes/MenuScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { ResultScene } from './game/scenes/ResultScene';

const devModeEnabled = new URLSearchParams(window.location.search).get('dev') === '1';
document.documentElement.classList.toggle('dev-mode', devModeEnabled);

// 判定是否為手機直立 ENVELOP 模式（給 GameScene 調整 HUD 位置用）
const fillMode =
  window.innerWidth < window.innerHeight && window.innerWidth < 700;
(window as unknown as { __SR_FILL_MODE__: boolean }).__SR_FILL_MODE__ = fillMode;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#050816',
  pixelArt: false,
  roundPixels: false,
  // 反鋸齒 + mipmap，降低高解析度紋理大幅縮小時的閃爍/鋸齒
  antialias: true,
  antialiasGL: true,
  mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
  render: {
    antialias: true,
    antialiasGL: true,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    powerPreference: 'high-performance',
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scale: {
    // 手機直立（窄寬 + 高 > 寬）用 ENVELOP 填滿；PC / 寬螢幕用 FIT
    mode:
      typeof window !== 'undefined' &&
      window.innerWidth < window.innerHeight &&
      window.innerWidth < 700
        ? Phaser.Scale.ENVELOP
        : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  dom: {
    createContainer: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      fps: 60,
    },
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, ResultScene],
};

new Phaser.Game(config);
if (devModeEnabled) {
  setupDevPanel();
}
