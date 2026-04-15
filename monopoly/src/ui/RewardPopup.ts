import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

interface RewardInfo {
  emoji: string;
  label: string;
  amount: number;
}

export class RewardPopup {
  scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(reward: RewardInfo): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.scene.add.container(0, 0);
      overlay.setDepth(50);

      // 半透明遮罩
      const mask = this.scene.add.graphics();
      mask.fillStyle(0x000000, 0);
      overlay.add(mask);

      this.scene.tweens.add({
        targets: mask,
        alpha: 1,
        duration: 200,
        onUpdate: () => {
          mask.clear();
          mask.fillStyle(0x000000, 0.4 * (mask.alpha));
          mask.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        },
      });

      // 彈窗卡片
      const card = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
      card.setScale(0);
      overlay.add(card);

      // 卡片背景
      const cardBg = this.scene.add.graphics();
      const cardW = 260;
      const cardH = 200;
      cardBg.fillStyle(0xFFFFFF, 1);
      cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
      // 頂部顏色條
      cardBg.fillStyle(COLORS.mintGreen, 1);
      cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 6, { tl: 24, tr: 24, bl: 0, br: 0 });
      card.add(cardBg);

      // 光芒背景（旋轉的星芒）
      const rays = this.scene.add.graphics();
      rays.fillStyle(COLORS.lemonYellow, 0.15);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = Math.cos(angle) * 20;
        const y1 = Math.sin(angle) * 20;
        const x2 = Math.cos(angle + 0.15) * 100;
        const y2 = Math.sin(angle + 0.15) * 100;
        const x3 = Math.cos(angle - 0.15) * 100;
        const y3 = Math.sin(angle - 0.15) * 100;
        rays.fillTriangle(x1, y1, x2, y2, x3, y3);
      }
      rays.setY(-20);
      card.add(rays);

      // 光芒旋轉
      this.scene.tweens.add({
        targets: rays,
        rotation: Math.PI * 2,
        duration: 8000,
        repeat: -1,
        ease: 'Linear',
      });

      // 標題
      const title = this.scene.add.text(0, -cardH / 2 + 28, '✨ 恭喜獲得！', {
        fontSize: '18px',
        fontFamily: 'Nunito, sans-serif',
        color: '#4A3728',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      card.add(title);

      // 獎勵 emoji
      const emojiIcon = this.scene.add.text(0, -15, reward.emoji, {
        fontSize: '42px',
      }).setOrigin(0.5);
      card.add(emojiIcon);

      // 獎勵數量（數字滾動）
      const amountText = this.scene.add.text(0, 32, `+0 ${reward.label}`, {
        fontSize: '22px',
        fontFamily: 'Nunito, sans-serif',
        color: '#D4901E',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      card.add(amountText);

      // 領取按鈕
      const btnBg = this.scene.add.graphics();
      const btnW = 140;
      const btnH = 42;
      btnBg.fillStyle(COLORS.successGreen, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
      // 3D 按壓感底部
      btnBg.fillStyle(0x4AA876, 1);
      btnBg.fillRoundedRect(-btnW / 2, btnH / 2 - 6, btnW, 6, { tl: 0, tr: 0, bl: 16, br: 16 });

      const btnText = this.scene.add.text(0, -2, '領取 ✓', {
        fontSize: '16px',
        fontFamily: 'Nunito, sans-serif',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const btnContainer = this.scene.add.container(0, cardH / 2 - 35, [btnBg, btnText]);
      btnContainer.setSize(btnW, btnH);
      card.add(btnContainer);

      // 按鈕互動
      const hitArea = this.scene.add.rectangle(0, 0, btnW, btnH, 0x000000, 0);
      hitArea.setInteractive({ cursor: 'pointer' });
      btnContainer.add(hitArea);

      hitArea.on('pointerdown', () => {
        // 按鈕下壓
        this.scene.tweens.add({
          targets: btnContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 60,
          yoyo: true,
          ease: 'Quad.easeOut',
        });

        // 關閉彈窗
        this.scene.tweens.add({
          targets: card,
          y: card.y - 40,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 250,
          ease: 'Back.easeIn',
        });

        this.scene.tweens.add({
          targets: mask,
          alpha: 0,
          duration: 200,
          delay: 100,
          onUpdate: () => {
            mask.clear();
            mask.fillStyle(0x000000, 0.4 * mask.alpha);
            mask.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
          },
          onComplete: () => {
            overlay.destroy();
            resolve();
          },
        });
      });

      // 彈窗彈入動畫
      this.scene.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 數字滾動計數
          const counter = { val: 0 };
          this.scene.tweens.add({
            targets: counter,
            val: reward.amount,
            duration: 600,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
              amountText.setText(`+${Math.floor(counter.val)} ${reward.label}`);
            },
          });

          // emoji 彈跳
          this.scene.tweens.add({
            targets: emojiIcon,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut',
          });
        },
      });
    });
  }

  // 顯示浮動文字（格子上方的快速提示）
  showFloatingText(x: number, y: number, text: string, color: string = '#D4901E') {
    const floatText = this.scene.add.text(x, y, text, {
      fontSize: '18px',
      fontFamily: 'Nunito, sans-serif',
      color,
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);

    floatText.setScale(0.5);

    this.scene.tweens.add({
      targets: floatText,
      y: y - 50,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => floatText.destroy(),
    });

    // 先放大再漸隱
    this.scene.tweens.add({
      targets: floatText,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  // 顯示 Toast 提示
  showToast(message: string, emoji: string = '💡') {
    const toast = this.scene.add.container(GAME_WIDTH / 2, 80);
    toast.setDepth(55);

    const bg = this.scene.add.graphics();
    const text = this.scene.add.text(14, 0, `${emoji} ${message}`, {
      fontSize: '13px',
      fontFamily: 'Nunito, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const w = text.width + 36;
    bg.fillStyle(COLORS.darkBrown, 0.88);
    bg.fillRoundedRect(-w / 2, -16, w, 32, 16);

    text.setX(0);
    toast.add([bg, text]);

    toast.setAlpha(0);
    toast.setY(60);

    this.scene.tweens.add({
      targets: toast,
      alpha: 1,
      y: 80,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1500, () => {
          this.scene.tweens.add({
            targets: toast,
            alpha: 0,
            y: 60,
            duration: 200,
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }
}
