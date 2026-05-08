import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { StageResult } from '../types';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(result: StageResult): void {
    // 背景改用新的 parallax-far（保留動感氛圍），fallback 到 menu 背景
    const farKey = `parallax-${result.stageId}-far`;
    const bgKey = this.textures.exists(farKey) ? farKey : 'menu-background-premium';
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
    // 縮放填滿畫面寬度
    if (bg.width > 0) {
      const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(scale).setAlpha(0.55);
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040711, 0.62);

    // 主標題（shutter 文字效果）
    const titleText = result.cleared ? 'STAGE CLEAR' : 'MISSION FAILED';
    const titleColor = result.cleared ? '#fff4b8' : '#ff9a9a';
    const titleGlow = result.cleared ? '#ffe184' : '#ff5a5a';
    this.shutterText(
      titleText,
      GAME_WIDTH / 2,
      210,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: titleColor,
        fontStyle: 'bold',
        shadow: { offsetX: 0, offsetY: 0, color: titleGlow, blur: 18, fill: true },
      },
      0,
      28,
    );

    // 副標：關卡編號
    this.shutterText(
      `STAGE ${result.stageId}`,
      GAME_WIDTH / 2,
      258,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#bfefff',
        fontStyle: 'bold',
      },
      450,
      22,
    );

    // 分割線（用 scaleX 動畫從中央展開，避免 width tween 在 Phaser Shape 上的渲染怪異）
    const divider = this.add.rectangle(GAME_WIDTH / 2, 296, 280, 2, 0x73eeff, 0.7);
    divider.setScale(0, 1);
    this.tweens.add({ targets: divider, scaleX: 1, duration: 500, delay: 700, ease: 'Cubic.easeOut' });

    // 戰績條目：依序滑入並 count-up
    const baseY = 350;
    const lineGap = 50;
    type Row = { label: string; value: string | number; isCount?: boolean; color?: string };
    const rows: Row[] = [
      { label: 'SCORE', value: result.score, isCount: true, color: '#fff4b8' },
      { label: 'MAX COMBO', value: result.combo, isCount: true, color: '#ffd166' },
      { label: 'LIVES', value: `× ${result.lives}`, color: '#9eeeff' },
      { label: 'BOMBS', value: `× ${result.bombs}`, color: '#ffe184' },
    ];

    rows.forEach((row, idx) => {
      const y = baseY + idx * lineGap;
      const enterDelay = 950 + idx * 220;

      // Label（左對齊靠左）
      const label = this.add
        .text(GAME_WIDTH / 2 - 110, y, row.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: '#9eeeff',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);

      // Value（右對齊靠右）
      const valueText = this.add
        .text(GAME_WIDTH / 2 + 110, y, row.isCount ? '0' : String(row.value), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: row.color ?? '#ffffff',
          fontStyle: 'bold',
          shadow: { offsetX: 0, offsetY: 0, color: row.color ?? '#ffffff', blur: 8, fill: true },
        })
        .setOrigin(1, 0.5)
        .setAlpha(0);

      // Label 從左滑入
      this.tweens.add({
        targets: label,
        alpha: 1,
        x: GAME_WIDTH / 2 - 110,
        duration: 280,
        delay: enterDelay,
        ease: 'Cubic.easeOut',
      });
      label.x = GAME_WIDTH / 2 - 130;

      // Value 從右滑入
      this.tweens.add({
        targets: valueText,
        alpha: 1,
        x: GAME_WIDTH / 2 + 110,
        duration: 280,
        delay: enterDelay,
        ease: 'Cubic.easeOut',
      });
      valueText.x = GAME_WIDTH / 2 + 130;

      // 數字滾動（count-up）
      if (row.isCount) {
        const target = Number(row.value) || 0;
        const counter = { v: 0 };
        this.tweens.add({
          targets: counter,
          v: target,
          duration: 900,
          delay: enterDelay + 200,
          ease: 'Cubic.easeOut',
          onUpdate: () => {
            valueText.setText(Math.floor(counter.v).toLocaleString());
          },
          onComplete: () => valueText.setText(target.toLocaleString()),
        });
      }
    });

    // CONTINUE prompt（最後出現）
    const promptText = result.cleared
      ? `Tap for Stage ${result.nextStageId}`
      : 'Tap to retry';
    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 140, promptText, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#bfe8ff',
        fontStyle: 'bold',
        backgroundColor: '#020611aa',
        padding: { left: 18, right: 18, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const promptDelay = 950 + rows.length * 220 + 400;
    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 320,
      delay: promptDelay,
    });
    this.tweens.add({
      targets: prompt,
      alpha: 0.45,
      yoyo: true,
      repeat: -1,
      duration: 700,
      delay: promptDelay + 320,
    });

    // 延遲一點才接受點擊（避免進場時誤觸跳關）
    this.time.delayedCall(promptDelay + 200, () => {
      this.input.once('pointerdown', () =>
        this.scene.start('GameScene', {
          stageId: result.cleared ? result.nextStageId : result.stageId,
          score: result.cleared ? result.score : 0,
          lives: result.cleared ? Math.max(1, result.lives) : 3,
          bombs: result.cleared ? result.bombs : 3,
          power: result.cleared ? result.power : 1,
          weapon: result.cleared ? result.weapon : 'vulcan',
        }),
      );
    });
  }

  // tha 風 shutter 文字進場（橫向滑入 + 雙色殘影）
  private shutterText(
    text: string,
    x: number,
    y: number,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    delayMs: number,
    stepMs: number,
  ): void {
    // 量測整體寬度
    const tempLetters = [...text].map((ch) => this.add.text(0, 0, ch, style).setOrigin(0.5));
    const widths = tempLetters.map((t) => t.width);
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    let cursor = x - totalWidth / 2;
    tempLetters.forEach((letter, idx) => {
      const w = widths[idx];
      const finalX = cursor + w / 2;
      cursor += w;
      letter.setPosition(finalX + 28, y);
      letter.setAlpha(0);

      // 殘影
      const ghost = this.add
        .text(finalX + 28, y, letter.text, style)
        .setOrigin(0.5)
        .setAlpha(0)
        .setTint(0x9eeeff);

      this.tweens.add({
        targets: letter,
        x: finalX,
        alpha: 1,
        delay: delayMs + idx * stepMs,
        duration: 200,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: ghost,
        x: finalX,
        alpha: { from: 0, to: 0.4 },
        delay: delayMs + idx * stepMs,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 110,
            onComplete: () => ghost.destroy(),
          });
        },
      });
    });
  }
}
