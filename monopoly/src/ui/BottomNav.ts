import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI, COLORS } from '../config';

interface NavTab {
  emoji: string;
  label: string;
  active: boolean;
}

export class BottomNav {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;

  private tabs: NavTab[] = [
    { emoji: '🏠', label: '首頁', active: true },
    { emoji: '📋', label: '任務', active: false },
    { emoji: '🎁', label: '活動', active: false },
    { emoji: '👥', label: '好友', active: false },
    { emoji: '🛒', label: '商店', active: false },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const navY = GAME_HEIGHT - UI.bottomNavHeight;
    const tabWidth = GAME_WIDTH / this.tabs.length;

    // 背景
    const bg = scene.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.95);
    bg.fillRoundedRect(0, navY, GAME_WIDTH, UI.bottomNavHeight + 20, { tl: 20, tr: 20, bl: 0, br: 0 });
    // 頂部陰影
    bg.fillStyle(0x000000, 0.04);
    bg.fillRect(0, navY, GAME_WIDTH, 2);

    const items: Phaser.GameObjects.GameObject[] = [bg];

    this.tabs.forEach((tab, i) => {
      const x = tabWidth * i + tabWidth / 2;
      const y = navY + UI.bottomNavHeight / 2 - 2;

      // Tab emoji
      const icon = scene.add.text(x, y - 10, tab.emoji, {
        fontSize: '22px',
      }).setOrigin(0.5);

      // Tab 文字
      const label = scene.add.text(x, y + 16, tab.label, {
        fontSize: '10px',
        fontFamily: 'Nunito, sans-serif',
        color: tab.active ? '#F5A623' : '#999999',
        fontStyle: tab.active ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // 選中指示器（小圓點）
      if (tab.active) {
        const dot = scene.add.graphics();
        dot.fillStyle(COLORS.warmOrange, 1);
        dot.fillCircle(x, navY + 4, 3);
        items.push(dot);
      }

      // 非首頁 Tab 半透明
      if (!tab.active) {
        icon.setAlpha(0.5);
      }

      // 點擊區域
      const hitArea = scene.add.rectangle(x, y, tabWidth, UI.bottomNavHeight, 0x000000, 0);
      hitArea.setInteractive({ cursor: 'pointer' });
      hitArea.on('pointerdown', () => {
        if (!tab.active) {
          this.showComingSoon(x, navY - 30);
        }
      });

      items.push(icon, label, hitArea);
    });

    this.container = scene.add.container(0, 0, items);
    this.container.setDepth(20);
  }

  private showComingSoon(x: number, y: number) {
    const toast = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.darkBrown, 0.85);
    bg.fillRoundedRect(-50, -14, 100, 28, 14);

    const text = this.scene.add.text(0, 0, '即將推出', {
      fontSize: '12px',
      fontFamily: 'Nunito, sans-serif',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    toast.add([bg, text]);
    toast.setDepth(30);
    toast.setAlpha(0);
    toast.setScale(0.8);

    this.scene.tweens.add({
      targets: toast,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: y - 10,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1000, () => {
          this.scene.tweens.add({
            targets: toast,
            alpha: 0,
            y: y - 25,
            duration: 300,
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }
}
