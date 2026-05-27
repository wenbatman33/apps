import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";
import { BootScene } from "./scenes/BootScene";
import { LcdScene } from "./scenes/LcdScene";

const game: any = new Phaser.Game({
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
  // 失焦時自動暫停 game loop（含 update / 動畫 / 物理）
  // Phaser 預設 autoPause = true，但要顯式設保險
  autoFocus: true,
  scene: [BootScene, LcdScene]
});
(window as any).WB_GAME = game;  // debug 用，preview eval 拿得到

// 視窗焦點切換時：暫停/恢復場景與音效
document.addEventListener("visibilitychange", () => {
  const hidden = document.hidden;
  if (hidden) {
    game.scene.scenes.forEach((s: any) => {
      if (s.scene.isActive() && !s.scene.isPaused()) s.scene.pause();
    });
    if (game.sound && !game.sound.mute) {
      // 暫存原 mute 狀態，恢復時還原
      (game as any)._mutedByBlur = !game.sound.mute;
      game.sound.mute = true;
    }
  } else {
    game.scene.scenes.forEach((s: any) => {
      if (s.scene.isPaused()) s.scene.resume();
    });
    // 還原 mute（但不覆蓋使用者主動靜音）
    if ((game as any)._mutedByBlur) {
      const userMuted = localStorage.getItem("wb_mute") === "1";
      game.sound.mute = userMuted;
      (game as any)._mutedByBlur = false;
    }
  }
});
