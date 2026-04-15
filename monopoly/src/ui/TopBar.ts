import Phaser from 'phaser';
import { GAME_WIDTH, UI, COLORS } from '../config';

export class TopBar {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  private coinText: Phaser.GameObjects.Text;
  private diceText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;

  private coins: number = 0;
  private diceCount: number = 0;
  private level: number = 1;

  constructor(scene: Phaser.Scene, initialCoins: number, initialDice: number) {
    this.scene = scene;
    this.coins = initialCoins;
    this.diceCount = initialDice;

    // 背景毛玻璃效果（用半透明白色模擬）
    const bg = scene.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.92);
    bg.fillRoundedRect(8, 6, GAME_WIDTH - 16, UI.topBarHeight - 8, 16);
    // 底部微陰影線
    bg.fillStyle(0x000000, 0.04);
    bg.fillRoundedRect(8, UI.topBarHeight - 4, GAME_WIDTH - 16, 4, { bl: 16, br: 16, tl: 0, tr: 0 });

    // 等級徽章
    const badge = scene.add.graphics();
    badge.fillStyle(COLORS.warmOrange, 1);
    badge.fillCircle(32, UI.topBarHeight / 2 + 1, 16);
    badge.lineStyle(2, 0xFFFFFF, 0.9);
    badge.strokeCircle(32, UI.topBarHeight / 2 + 1, 16);

    this.levelText = scene.add.text(32, UI.topBarHeight / 2 + 1, '1', {
      fontSize: '14px',
      fontFamily: 'Nunito, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 暱稱
    const nickname = scene.add.text(56, UI.topBarHeight / 2 - 2, '玩家', {
      fontSize: '14px',
      fontFamily: 'Nunito, sans-serif',
      color: '#4A3728',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 金幣區塊
    const coinIcon = scene.add.text(GAME_WIDTH - 170, UI.topBarHeight / 2 + 1, '💰', {
      fontSize: '16px',
    }).setOrigin(0.5);

    this.coinText = scene.add.text(GAME_WIDTH - 148, UI.topBarHeight / 2 + 1, this.formatNumber(initialCoins), {
      fontSize: '14px',
      fontFamily: 'Nunito, sans-serif',
      color: '#D4901E',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 骰子區塊
    const diceIcon = scene.add.text(GAME_WIDTH - 75, UI.topBarHeight / 2 + 1, '🎲', {
      fontSize: '16px',
    }).setOrigin(0.5);

    this.diceText = scene.add.text(GAME_WIDTH - 55, UI.topBarHeight / 2 + 1, String(initialDice), {
      fontSize: '14px',
      fontFamily: 'Nunito, sans-serif',
      color: '#5B9BD5',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.container = scene.add.container(0, 0, [
      bg, badge, this.levelText, nickname,
      coinIcon, this.coinText,
      diceIcon, this.diceText,
    ]);
    this.container.setDepth(20);
  }

  private formatNumber(n: number): string {
    if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  // 更新金幣並播放動畫
  updateCoins(newValue: number) {
    const oldValue = this.coins;
    this.coins = newValue;

    // 數字滾動動畫
    const counter = { val: oldValue };
    this.scene.tweens.add({
      targets: counter,
      val: newValue,
      duration: 600,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.coinText.setText(this.formatNumber(Math.floor(counter.val)));
      },
    });

    // 放大閃爍
    this.scene.tweens.add({
      targets: this.coinText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  // 更新骰子數量
  updateDice(newValue: number) {
    this.diceCount = newValue;
    this.diceText.setText(String(newValue));

    this.scene.tweens.add({
      targets: this.diceText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  getCoins(): number { return this.coins; }
  getDiceCount(): number { return this.diceCount; }
}
