import Phaser from 'phaser';
import { GAME_WIDTH, UI, COLORS, MULTIPLIERS } from '../config';

export class DiceButton {
  scene: Phaser.Scene;
  currentMultiplier: number = 1;
  disabled: boolean = false;

  private buttonContainer: Phaser.GameObjects.Container;
  private multiplierBgs: Phaser.GameObjects.Graphics[] = [];
  private multiplierTexts: Phaser.GameObjects.Text[] = [];
  private buttonBg: Phaser.GameObjects.Graphics;
  private costText: Phaser.GameObjects.Text;
  private glow: Phaser.GameObjects.Graphics;

  onRoll?: () => void;
  onMultiplierChange?: (multiplier: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.createMultiplierButtons();
    this.createRollButton();

    // 消耗提示
    this.costText = scene.add.text(GAME_WIDTH / 2, UI.diceButtonY + UI.diceButtonSize / 2 + 14, '消耗 1 🎲', {
      fontSize: '11px',
      fontFamily: 'Nunito, sans-serif',
      color: '#999999',
    }).setOrigin(0.5).setDepth(15);
  }

  private createRollButton() {
    const cx = GAME_WIDTH / 2;
    const cy = UI.diceButtonY;
    const r = UI.diceButtonSize / 2;

    // 外光暈
    this.glow = this.scene.add.graphics().setDepth(14);
    this.glow.fillStyle(COLORS.warmOrange, 0.15);
    this.glow.fillCircle(cx, cy, r + 10);

    // 陰影
    const shadow = this.scene.add.graphics().setDepth(14);
    shadow.fillStyle(0x000000, 0.1);
    shadow.fillCircle(cx + 2, cy + 4, r);

    // 按鈕底色
    this.buttonBg = this.scene.add.graphics().setDepth(14);
    this.drawButtonBg(false);

    // 骰子圖示
    const icon = this.scene.add.text(cx, cy - 4, '🎲', {
      fontSize: '36px',
    }).setOrigin(0.5).setDepth(15);

    // 「擲骰」文字
    const label = this.scene.add.text(cx, cy + 22, 'ROLL', {
      fontSize: '12px',
      fontFamily: 'Nunito, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(15);

    // 把需要動畫的元素放進容器
    this.buttonContainer = this.scene.add.container(0, 0, [
      this.glow, shadow, this.buttonBg, icon, label,
    ]).setDepth(14);

    // 用 Zone 做互動區域（直接掛在 scene 上，不受 container 嵌套影響）
    const hitZone = this.scene.add.zone(cx, cy, r * 2 + 30, r * 2 + 30)
      .setInteractive({ cursor: 'pointer' })
      .setDepth(16);

    hitZone.on('pointerdown', () => {
      if (this.disabled) return;

      // 按壓動畫（純視覺，不阻塞邏輯）
      this.scene.tweens.add({
        targets: [this.buttonBg, icon, label, this.glow, shadow],
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });

      // 立即觸發擲骰（不等動畫完成）
      this.onRoll?.();
    });

    // 浮動動畫（不包含 hitZone，保持互動區域固定）
    const floatTargets = [this.glow, shadow, this.buttonBg, icon, label];
    const basePositions = floatTargets.map(t => t.y);
    this.scene.tweens.addCounter({
      from: 0, to: Math.PI * 2, duration: 3000, repeat: -1,
      onUpdate: (tw) => {
        const offset = Math.sin(tw.getValue()) * 3;
        floatTargets.forEach((t, i) => { t.y = basePositions[i] + offset; });
      }
    });

    // 光暈脈動
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.5,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawButtonBg(isDisabled: boolean) {
    const cx = GAME_WIDTH / 2;
    const cy = UI.diceButtonY;
    const r = UI.diceButtonSize / 2;
    this.buttonBg.clear();

    if (isDisabled) {
      this.buttonBg.fillStyle(0xCCCCCC, 0.8);
      this.buttonBg.fillCircle(cx, cy, r);
    } else {
      // 亮橘色底
      this.buttonBg.fillStyle(COLORS.warmOrange, 1);
      this.buttonBg.fillCircle(cx, cy, r);
      // 高光
      this.buttonBg.fillStyle(0xFFCE54, 0.4);
      this.buttonBg.fillCircle(cx - 8, cy - 12, r * 0.5);
      // 邊框
      this.buttonBg.lineStyle(3, 0xFFFFFF, 0.5);
      this.buttonBg.strokeCircle(cx, cy, r);
    }
  }

  private createMultiplierButtons() {
    const y = UI.multiplierY;
    const btnWidth = 52;
    const btnHeight = 28;
    const gap = 8;
    const totalWidth = MULTIPLIERS.length * btnWidth + (MULTIPLIERS.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    MULTIPLIERS.forEach((mult, i) => {
      const x = startX + i * (btnWidth + gap) + btnWidth / 2;

      const bg = this.scene.add.graphics().setDepth(15);
      this.drawMultiplierBg(bg, x, y, btnWidth, btnHeight, mult === this.currentMultiplier);
      this.multiplierBgs.push(bg);

      const text = this.scene.add.text(x, y, `x${mult}`, {
        fontSize: '13px',
        fontFamily: 'Nunito, sans-serif',
        color: mult === 1 ? '#FFFFFF' : '#666666',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(15);
      this.multiplierTexts.push(text);

      // Zone 互動
      const zone = this.scene.add.zone(x, y, btnWidth, btnHeight)
        .setInteractive({ cursor: 'pointer' })
        .setDepth(16);

      zone.on('pointerdown', () => {
        this.selectMultiplier(mult);
      });
    });
  }

  private drawMultiplierBg(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, selected: boolean) {
    graphics.clear();
    if (selected) {
      graphics.fillStyle(COLORS.warmOrange, 1);
      graphics.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
    } else {
      graphics.fillStyle(0xFFFFFF, 0.9);
      graphics.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
      graphics.lineStyle(1.5, COLORS.lightGray, 0.8);
      graphics.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
    }
  }

  private selectMultiplier(mult: number) {
    this.currentMultiplier = mult;

    const btnWidth = 52;
    const btnHeight = 28;
    const gap = 8;
    const totalWidth = MULTIPLIERS.length * btnWidth + (MULTIPLIERS.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    MULTIPLIERS.forEach((m, i) => {
      const x = startX + i * (btnWidth + gap) + btnWidth / 2;
      const selected = m === mult;

      this.drawMultiplierBg(this.multiplierBgs[i], x, UI.multiplierY, btnWidth, btnHeight, selected);
      this.multiplierTexts[i].setColor(selected ? '#FFFFFF' : '#666666');

      if (selected) {
        this.scene.tweens.add({
          targets: [this.multiplierBgs[i], this.multiplierTexts[i]],
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 100,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
    });

    this.costText.setText(`消耗 ${mult} 🎲`);
    this.onMultiplierChange?.(mult);
  }

  setDisabled(disabled: boolean) {
    this.disabled = disabled;
    this.drawButtonBg(disabled);
  }

  getMultiplier(): number {
    return this.currentMultiplier;
  }
}
