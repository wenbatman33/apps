import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // 漸層天空背景（用多條矩形模擬漸層）
    const bg = this.add.graphics();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(0xB3 + (0xE1 - 0xB3) * t);
      const g = Math.floor(0xE5 + (0xF5 - 0xE5) * t);
      const b = Math.floor(0xFC + (0xFE - 0xFC) * t);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, (GAME_HEIGHT / steps) * i, GAME_WIDTH, GAME_HEIGHT / steps + 1);
    }

    // 遊戲標題
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '🎲', {
      fontSize: '72px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'Monopoly Party', {
      fontSize: '32px',
      fontFamily: 'Nunito, sans-serif',
      color: '#4A3728',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, '載入中...', {
      fontSize: '16px',
      fontFamily: 'Nunito, sans-serif',
      color: '#999999',
    }).setOrigin(0.5);

    // 標題彈跳動畫
    this.tweens.add({
      targets: title,
      y: title.y - 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 載入完成後切換場景（用 setTimeout 確保背景分頁也能觸發）
    const scene = this;
    setTimeout(() => {
      scene.scene.start('GameBoardScene');
    }, 1500);
  }
}
